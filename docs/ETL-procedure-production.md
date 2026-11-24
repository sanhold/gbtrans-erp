# Procédure d'import en production (société ETL)

Cette procédure reprend, dans la base Supabase de production, les données de l'ancien logiciel : 2020-2025 puis 2026. Elle est écrite pour la personne qui détient les accès (le propriétaire). L'assistant prépare, simule et contrôle en lecture seule ; il ne lance jamais l'import de production.

**Société cible : `ETL`** (décision du propriétaire du 17/11/2026). GBTRANS est une société de test : on n'y touche pas.

## 0. Règles à ne pas enfreindre

1. **Ne jamais utiliser le fichier `backend/.env` pour l'ETL** (c'est l'ancienne base, voir `ETL_HOTE_ATTENDU` section 5). Il pointe vers un autre hôte (`qlsugwtojxtfmkfbvmaa`) que la production (`sehujboqpihrrkfortte`). Toujours définir `DATABASE_URL` à la main, dans la fenêtre PowerShell, pour la durée de l'opération.
2. **Rien n'est lancé sans sauvegarde testée** (étape 2).
3. **Toujours une simulation avant `--appliquer`**, et relire sa sortie.
4. **Un seul import à la fois.** Ne pas lancer deux scripts en parallèle sur la base.
5. **Ne rien supprimer à la main** dans la base. Il n'existe pas de script de purge : le retour arrière passe par la restauration (section 8).
6. Les scripts écrivent uniquement dans la société cible, ne créent pas de doublon (clés `ETL-<N° Enr.>` et `ETL26-<N° Enr.>`) et refusent toute base non locale sans `ETL_AUTORISER_DISTANT=OUI_PRODUCTION`.

## 1. Avant de commencer (préparation)

| À vérifier | Comment |
|---|---|
| Dépôt à jour sur la bonne branche | `git status` propre (hors `frontend/next-env.d.ts` et `frontend/tsconfig.json`), commits poussés |
| Dépendances installées | `cd backend; npm install` |
| Fichiers sources définitifs | 2020-2025 : `C:\Users\SANOGO\Desktop\ETL` ; 2026 : `C:\Users\SANOGO\Desktop\ETL 2026`. Ne plus les modifier une fois la simulation validée |
| Journal 2026 | Actuellement partiel (sorties de caisse seulement). Il peut être complété **après** l'import : le script du journal se relance sans doublon |
| URL de connexion de production | Supabase, tableau de bord du projet `gbtranserp`, bouton « Connect ». Préférer la **connexion directe** (port 5432) à la connexion poolée : l'import fait de longues écritures par lots. Ne jamais coller l'URL dans un fichier ni dans une conversation |
| Migrations | `052_decisions_fne` et `053_platform_mot_de_passe_oublie` déjà appliquées (constaté le 17/11/2026). À re-vérifier à l'étape 3 |
| Fenêtre d'intervention | Choisir un moment sans saisie : personne ne doit travailler dans ETL pendant l'import |

## 2. Sauvegarde et test de restauration

1. Supabase > Database > Backups : lancer une sauvegarde manuelle (ou noter l'heure de la dernière sauvegarde automatique, plan permettant la restauration à un instant donné).
2. Noter l'heure exacte (fuseau d'Abidjan) : c'est le point de retour.
3. Tester la restauration sur un projet ou une branche de test, pas sur la production. Vérifier qu'on y retrouve la société ETL.
4. Exporter en plus, par précaution : `pg_dump` de la production avec la connexion directe, fichier gardé hors du dépôt.

**Critère de passage** : une sauvegarde existe, son heure est notée, et une restauration de test a réussi.

## 3. État de la production avant import (lecture seule)

À faire avec l'assistant (connecteur Supabase en lecture seule) ou dans l'éditeur SQL de Supabase.

```sql
-- La société ETL existe-t-elle et est-elle vide ?
select s.code, s.id from societes s where s.code in ('ETL','GBTRANS');
select (select count(*) from clients where "societeId" = '<id ETL>') as clients,
       (select count(*) from dossiers where "societeId" = '<id ETL>') as dossiers,
       (select count(*) from factures where "societeId" = '<id ETL>') as factures,
       (select count(*) from utilisateurs where "societeId" = '<id ETL>') as utilisateurs;
-- Migrations appliquées
select migration_name from _prisma_migrations order by finished_at desc limit 5;
```

**Critère de passage** : ETL existe ; elle ne contient que l'exercice 2026 et l'utilisateur ADM-ETL du propriétaire ; les migrations 052 et 053 sont appliquées. Si ETL contient déjà des clients, dossiers ou factures, **on s'arrête** et on analyse avant toute écriture.

## 4. Simulation sur les fichiers définitifs

Depuis `backend/`, en PowerShell. La première commande est purement locale (elle lit les Excel) :

```powershell
npx tsx scripts/etl/simuler-import.ts "C:\Users\SANOGO\Desktop\ETL"
```

Relire `backend/logs/etl-simulation/rejets.csv` : aucun rejet inattendu, aucun cas « manuel ». Comparer les totaux aux chiffres de référence de la section 9.

## 5. Import en production (par le propriétaire)

Ouvrir une fenêtre PowerShell neuve, se placer dans `backend/`, puis :

```powershell
$env:DATABASE_URL = "<url de production, connexion directe>"
$env:ETL_AUTORISER_DISTANT = "OUI_PRODUCTION"
$env:ETL_HOTE_ATTENDU = "sehujboqpihrrkfortte"
```

`ETL_HOTE_ATTENDU` est l'identifiant du projet de production : tout script refuse une base dont l'hôte ne le contient pas. Il évite d'écrire par erreur dans l'ancienne base `qlsugwtojxtfmkfbvmaa` quand `DATABASE_URL` n'est pas définie dans la fenêtre (les scripts liraient alors `backend/.env`). Les variables sont perdues à chaque nouvelle fenêtre PowerShell : les redéfinir.

L'ordre est obligatoire : chaque étape s'appuie sur la précédente. Chaque script affiche d'abord `Base cible : <hôte> / <base>` : **vérifier que l'hôte est `sehujboqpihrrkfortte…`** avant de continuer. Pour chaque étape, lancer d'abord sans `--appliquer` (simulation), lire, puis relancer avec `--appliquer`.

| N° | Étape | Commande (simulation, puis ajouter `--appliquer`) |
|---|---|---|
| 5.1 | **2020-2025** : clients, fournisseurs, dossiers, factures, proformas, paiements, dotations, dépenses, opérations, caisse, banques, utilisateurs de reprise (inactifs) | `npx tsx scripts/etl/importer.ts --societe=ETL "C:\Users\SANOGO\Desktop\ETL"` |
| 5.2 | **2026, documents** : clients, dossiers, factures, proformas, offres, cautions | `npx tsx scripts/etl/importer-2026.ts --societe=ETL` |
| 5.3 | **2026, journal** : dépenses de dossier, paiements de factures, opérations, soldes | `npx tsx scripts/etl/importer-2026-journal.ts --societe=ETL` |
| 5.4 | **Corrections 2026** : 5 factures au TTC modifié, compagnies maritimes | `npx tsx scripts/etl/corriger-2026.ts --societe=ETL` |

Remarques :
- `importer.ts` (5.1) n'a pas de mode simulation propre : sans `--appliquer` il ne fait rien. La vraie simulation est `simuler-import.ts` (section 4). Il se lance donc directement avec `--appliquer` une fois la section 4 validée.
- Les étapes 5.2 à 5.4 se simulent contre la base : elles ne donnent un résultat représentatif qu'une fois 5.1 appliquée.
- Si un script s'arrête en erreur : **ne pas le relancer à l'aveugle**. Noter le message et l'étape, puis faire les contrôles de la section 6. Les scripts sont relançables sans doublon, mais il faut comprendre la cause d'abord.
- Ne pas fermer la fenêtre pendant un import. À la fin, fermer la fenêtre ou effacer les variables (`Remove-Item Env:DATABASE_URL, Env:ETL_AUTORISER_DISTANT`).

## 6. Contrôles après import

À faire immédiatement après chaque étape, en lecture seule. Chiffres attendus :

**Après 5.1 (fin 2025)**

| Élément | Valeur attendue |
|---|---|
| Clients / fournisseurs | 212 / 15 |
| Dossiers | 1 962 |
| Factures (dont 33 avoirs) | 2 060 : TTC 17 771 452 591, payé 12 804 922 882, reste 4 966 529 709 |
| Lignes de facture | 26 166 |
| Proformas | 2 408 |
| Paiements de facture | 1 713 |
| Dotations / dépenses de dossier | 4 045 / 34 408 |
| Opérations financières | 12 819 (dont 22 « à vérifier ») |
| Admissions temporaires | 85 |
| BNI / BRIDGE / UBA | 122 530 788 / 62 159 051 / 24 743 061 |
| Caisse | 211 199 052 |
| Comptes clients (provisions) | 99 comptes, 3 899 384 577 |
| Comptes fournisseurs | 12 comptes, 87 646 109 |
| Pièces à comptabiliser 2025 | 7 084 |
| Utilisateurs de reprise | 40, tous inactifs |

**Après 5.2 à 5.4 (2026, journal partiel)**

| Élément | Valeur attendue |
|---|---|
| Clients / dossiers / factures | 227 / 2 252 / 2 256 |
| Proformas / offres / cautions | 2 635 / 34 / 102 (80 776 978) |
| Factures : TTC / payé / reste | ≈ 20,16 Md / 14 002 896 093 / ≈ 6,16 Md |
| Caisse (provisoire) | 50 048 902 |
| Comptes clients 2026 | 5 soldes négatifs connus (AFRICA TRAILER, IVOIRE TRANSPORT, CHAMOBEL, OTCI, SIRAKONI) ; FF013 à −552 751 825 |
| Opérations « à vérifier » | 22 de 2025 + 28 de 2026 (dont 6 excédents de paiement) |
| Relance des scripts | 0 création (idempotence) |

Contrôles complémentaires :
1. **Doublons** : relancer chaque script en simulation ; il doit annoncer 0 création.
2. **Isolation** : aucune ligne n'a été ajoutée à la société GBTRANS (compter clients, dossiers, factures : 61 / 459 / 264 comme le 17/11/2026).
3. **Connexion** : se connecter à l'ERP avec le compte du propriétaire sur la société ETL, ouvrir un dossier, une facture et la caisse, et comparer à l'ancien logiciel sur 5 dossiers pris au hasard.

**Critère de passage** : tous les chiffres concordent. Un écart, même d'un franc, se note et se traite avant de continuer (rapports dans `backend/logs/etl-*`).

## 7. Après l'import

1. **Utilisateurs.** Créer les vrais comptes avec les profils validés le 17/11/2026 : administrateurs = propriétaire et DG ; agents complets (tout sauf gestion des utilisateurs) = NAOMIE.PRISCILLA, DEME.RAMATOU, MINGNI.ARLHANDIE.LOUISE, TRAORE.KARIDJA, KONE.ABDOULAYE ; profils restreints = EDOUKOU (finance sans action), TRAORE.ABDOUL (aucun accès finance), GUIRA.MAH.MARIAM (finance limitée aux dotations) ; compte générique `admin` supprimé. Les comptes se créent avec `creer-utilisateurs.ts` (simulation, puis `--appliquer`, mêmes variables de connexion qu'à la section 5) : e-mail par défaut `<login>@etl.local`, mot de passe provisoire propre à chaque personne, écrit dans `backend/logs/etl-utilisateurs/comptes-crees-<date>.csv` (hors git ; à remettre en main propre puis supprimer), changement obligatoire à la première connexion. Le propriétaire (`mousproxy`) est déjà le compte ADM-ETL : il n'est pas recréé. Les e-mails par défaut seront remplacés par les vrais dans l'écran Utilisateurs. Puis simuler et appliquer `rapprocher-utilisateurs.ts` avec un fichier de correspondance `reprise;reel` (§ 16 du rapport d'analyse). Les employés ne sont pas importés pour l'instant.
2. **Comptabilité.** Plan comptable, journaux, exercice 2025 (créé par l'import), puis validation des 7 084 pièces à comptabiliser ; à-nouveaux 2026. Aucune écriture n'est créée pour le journal 2026.
3. **Recouvrement.** Compensation des provisions clients sur les factures ouvertes avec l'état de rapprochement, puis traitement des opérations « à vérifier ».
4. **Journal 2026 complet.** Quand l'export sera complété (approvisionnements de caisse, acomptes clients, banque), relancer l'étape 5.3 (simulation, lecture, puis `--appliquer`) et refaire les contrôles de caisse, banques et comptes clients négatifs.
5. **GBTRANS (test).** Décider avec le propriétaire du sort des essais depuis juillet 2026 (3 brouillons, 7 proformas, dossier DOS/2026/000255, etc.) : ressaisie éventuelle dans ETL, jamais d'import automatique.

## 8. En cas de problème : retour arrière

1. **Arrêter** : ne plus lancer aucun script, prévenir les utilisateurs.
2. Noter le message d'erreur, l'étape et l'heure.
3. Si la base est incohérente et que la cause n'est pas évidente : **restaurer** la sauvegarde de l'étape 2 (Supabase > Backups), puis refaire le test complet sur une copie avant de réessayer.
4. Si l'erreur est bénigne (rejet isolé, ligne à corriger dans l'Excel) : corriger la source, relancer le script concerné, vérifier le 0 création sur le reste.

## 9. Liste de contrôle à cocher

- [ ] Sauvegarde faite, heure notée, restauration testée
- [ ] Production lue : ETL vide, migrations 052/053 appliquées, GBTRANS intacte
- [ ] `DATABASE_URL` définie à la main, hôte `sehujboqpihrrkfortte` vérifié
- [ ] Simulation relue (`rejets.csv`) et validée
- [ ] 5.1 appliquée, chiffres fin 2025 conformes
- [ ] 5.2 appliquée, 5.3 appliquée, 5.4 appliquée, chiffres 2026 conformes
- [ ] Relance de chaque script : 0 création
- [ ] Contrôle par sondage dans l'ERP sur 5 dossiers
- [ ] Variables de connexion effacées
- [ ] Étapes de la section 7 planifiées

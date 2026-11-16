# Analyse ETL : migration de l'ancien logiciel vers GBTRANS ERP

Source : `C:\Users\SANOGO\Desktop\ETL` (19 fichiers Excel, une feuille « A » chacun).
Analyse en lecture seule : aucune donnée n'a été importée dans l'application.

## 1. Inventaire et correspondance avec le schéma Prisma

| Fichier | Lignes | Contenu réel | Cible dans l'application |
|---|---|---|---|
| Societe | 1 | Société « ELITE TRANSPORTS & LOGISTICS » | `Societe` (voir point bloquant B1) |
| Liste Compte Bancaire | 3 (+ total) | BNI, BRIDGE BANK, UBA et soldes | `CompteBancaire` |
| Table Client | 217 | Clients | `Client` |
| Table Fournisseur | 15 | Fournisseurs (nom seul) | `Fournisseur` (+ `CompteTiers`) |
| Element | 209 | Catalogue des rubriques de facturation | `PrestationCatalogue` |
| Etape | 16 | Étapes de suivi (PROFORMA, FDI, RFCV, BAE...) | `ProcessusSuivi` + `EtapeProcessus` |
| Dossier 2025 | 1 963 | **Tous** les dossiers 2020 à 2025 (62 colonnes) | `Dossier` (+ `Conteneur`) |
| Liste des Dossiers2025 | 1 963 | Vue réduite du même fichier (31 colonnes) | Aucune : redondant, sert de contrôle croisé |
| Produit 2026 | 247 | Lignes marchandises (châssis, position tarifaire) | `Article` |
| Table Proforma2025 / DetailProforma | 2 412 / 28 827 | Proformas et lignes | `Proforma` / `LigneProforma` |
| Table Facture2025 / FactureN2 2025 / DetailFacture | 1 878 / 184 / 26 315 | Factures et lignes | `Facture` / `LigneFacture` |
| Reglement | 49 002 | **Journal unique** : caisse, banque, comptes clients, comptes fournisseurs | `Paiement`, `PaiementFacture`, `OperationFinanciere`, `Depense`, `CompteTiers` |
| Transaction 2025 | 48 994 | Vue calculée du journal (voir point I3) | Aucune : contrôle croisé |
| Transaction du jour2025 | 5 860 | Extrait de 2025 du même journal | Aucune |
| Dotation2025 | 4 045 | Avances remises aux agents | `Dotation` |
| Table AT2025 | 85 | Admissions temporaires | `AdmissionTemporaire` |

Les noms de fichiers « 2025 » sont trompeurs : ils contiennent les années 2020 à 2025.

## 2. Ce qui est sain (contrôles réussis)

- **Aucun doublon de clé** dans : dossiers (1 963 numéros uniques, y compris sans tenir compte de la casse), proformas (2 412), factures (1 878 + 184, aucun numéro commun aux deux fichiers), clients (217 codes), dotations (4 045), AT (85), détails proforma et facture (identifiants uniques).
- **Les factures sont cohérentes** : pour les 1 877 factures, TTC = HT + TVA et Reste + Payé = TTC, sans écart.
- **Les soldes bancaires se retrouvent au franc près** en rejouant le journal Reglement : BRIDGE BANK 62 159 051, UBA 24 743 061, BNI 122 530 788, soit 209 432 900 au total. Le journal Reglement est donc complet et fiable.
- **Les paiements de factures concordent** : sur 1 485 factures ayant un règlement, 1 454 ont un « Montant Payé » égal à la somme des règlements, et la somme globale est quasi identique (12,757 Md contre 12,876 Md).
- Tous les clients cités dans les factures et dans la liste des dossiers existent dans Table Client. Tous les comptes fournisseurs du journal existent dans Table Fournisseur.

## 3. Points bloquants à trancher avant l'import

**B1. La société du fichier n'est pas GBTRANS.** `Societe.xlsx` décrit « ELITE TRANSPORTS & LOGISTICS » (RCCM CI-ABJ-2016-B-6785, directeur Coulibaly Lassana, Bridge Bank). Les utilisateurs sont aussi « ETL ». Il faut confirmer que ces données doivent bien aller dans la société GBTRANS de l'application (ou créer une société dédiée), puisque l'application est multi-sociétés.

**B2. Pas de lien proforma → facture fiable à 100 %.** 2 085 proformas sont marquées « facturées » mais seules 2 059 références de proforma apparaissent dans les factures. Une proforma peut aussi être liée à deux factures (PRO2021-022 : FACT2021-26 et FACT2021-16). Or `Proforma.factureId` est unique : une seule facture par proforma.

**B3. Le journal Reglement n'a pas de lien direct avec les factures.**
- La colonne `NumFacture` contient en réalité le **numéro de dossier** (36 435 lignes), pas la facture.
- Le numéro de facture est dans `NumCheque` (1 746 règlements), à n'utiliser que pour `PaiementFacture`.
- Les 47 000 autres lignes sont des opérations de caisse/banque/dotation (passage, TS, vacation, carburant...), pas des paiements clients.

Cela impose de classer chaque ligne du journal avant import (voir section 5).

## 4. Anomalies à corriger (par priorité)

### Haute priorité (risque d'erreur de montants ou de doublons)

| # | Anomalie | Volume | Traitement proposé |
|---|---|---|---|
| H1 | **Lignes de total/compteur** noyées dans les données : « Table Facture2025 » (total 16,1 Md), « Transaction 2025 » (lignes `Somme`/`Compteur`, 46,9 Md), « Liste des Dossiers2025 », « Transaction du jour », « Table AT2025 », « Liste Compte Bancaire » (MONTANT TOTAL) | 1 par fichier | Exclure. Sinon les montants sont doublés |
| H2 | Détails de **proforma orphelins** : lignes dont le `NumPro` n'existe pas dans Table Proforma | 2 569 lignes, 182 proformas (2022 à 2024 surtout) | Proformas absentes de l'export. Demander l'export complet, ou ne pas importer ces lignes |
| H3 | Détails de **facture orphelins** | 149 lignes, 13 factures (ex. FACT2021-8, FACT2022-542) | Idem : soit réexport, soit facture reconstituée à partir des détails |
| H4 | **Proformas sans détail** | 496 sur 2 412 (la plupart à TTC = 0) | Importer en-tête seule |
| H5 | Total proforma ≠ somme des lignes | 1 470 sur 1 916 comparables | Écart d'arrondis/remises/TVA ; à valider sur un échantillon avec la comptable. Conserver les totaux de l'en-tête |
| H6 | **Dates aberrantes** dans Reglement : 2000-01-01, 2020-04-02, 2028-05-05, 2052-05-05, 2026-03/04/08/12 alors que la date de saisie est en 2025 | 11 lignes | Jour/mois inversés ou erreurs de saisie. Utiliser `SaisiLe` quand la date est hors période, et lister les 11 lignes pour correction manuelle |
| H7 | `IDRèglement` vaut `0,000000` (texte avec virgule) | 8 068 lignes | Colonne inutilisable comme clé. Utiliser `N° Enr.` |
| H8 | **Comptes bancaires incomplets** : le journal contient un 4e compte `071001225101-29` (13 mouvements, clôturé le 31/10/2024) absent de « Liste Compte Bancaire » | 1 compte | Le créer (inactif) pour ne pas perdre ses mouvements |
| H9 | **Doublon de client** : GEBATEC SARL en double (CL202118 avec 31 dossiers, CL202136 avec 2), même NCC 0505657K | 1 paire | Fusionner vers CL202118 |
| H10 | Doublons probables de clients par nom : CFAO MOTORS (CL2023125 sans dossier, CL2023126 avec 1 dossier), CHARBEL FADDOUL (CL2025174 avec 1 dossier, CL2025175 sans dossier). L'adresse de ce dernier contient un email, pas une adresse | 2 paires | Fusionner. Corriger l'adresse |
| H11 | Client `CL20220` cité dans les dossiers et comptes mais **absent de Table Client** (et `CL20221`) | 5 mouvements, 1 dossier | Créer ces clients ou rattacher manuellement |
| H12 | **Numéros de dossier non conformes** | 13 | `GEBATEC/F1`, `GEBATEC/F2`, `BUREAU`, `i-239/2023`, `i-032/2025`, `e-008/2025`, `0-049/2025` (zéro au lieu de O), `I-305//2023` (double barre), `I-162/2024-bis`, `I-163/2024-bis`, `I-143/2021-B`, `I-154/2021-B`, `O-018` (sans année). À normaliser en majuscules et à corriger |
| H13 | **Année du numéro ≠ année d'ouverture** : I-137/2020 et I-119/2020 ouverts en 2021, etc. | 10 | La contrainte unique de l'application est (société, numéro, **année**). Il faut décider si l'année vient du numéro ou de la date. Recommandation : de la date d'ouverture, sauf numéro explicite |

### Priorité moyenne (qualité des données)

| # | Anomalie | Volume | Traitement proposé |
|---|---|---|---|
| M1 | Factures normalisées (n° DGI) en double : même numéro sur plusieurs factures (ex. `20-319-IO91/N°158` sur 4 factures HP AUTOMOTIVE) | 34 lignes, 16 numéros | Probablement un lot facturé ensemble. Importer tel quel, mais ne pas créer de contrainte unique sur ce champ |
| M2 | Factures négatives = **avoirs** (libellé « AVOIR / FACTURE N°... ») | 13 | Importer en `type = AVOIR` avec `factureOrigineId` retrouvé à partir du libellé, au lieu de montants négatifs sur de fausses factures |
| M3 | 1 facture avec reste à payer négatif et payé > TTC | 1 | Surpaiement à vérifier |
| M4 | Factures sans dossier (2 + 1) ou sans proforma (2) | 5 | Importer avec `dossierId` vide |
| M5 | 2 factures marquées soldées sans règlement retrouvé, 8 numéros de facture payés mais inconnus (`FACT2021-8`, `FACT2021-123`, `FACT2021-248`, `FACTNKH/2024/12-009`...) | ~10 | À vérifier avec la comptabilité |
| M6 | Numéros de proforma irréguliers : `PRO12025-xxxx` (préfixe `PRO1` en 2025), `PRO2021-22-1`, un numéro nu `1225`. Proformas de 2020 absentes | 533 + 3 | Garder le numéro d'origine tel quel |
| M7 | Proformas supprimées (`EtatSupprimer = 1`) | 13 | Importer en `ANNULEE` |
| M8 | Nature de dossier vide | 116 | Déduire du préfixe : `I-` import, `E-`/`O-` export/autre. À confirmer |
| M9 | Mode de transport `-1` | 126 | Valeur à remplacer par la valeur par défaut `MARITIME` (hypothèse à valider) |
| M10 | « TERRESTE » (faute de frappe), « DEDOINEMENT/DEDOUANEMENT », « TTRACTEUR » | nombreux | Normaliser les valeurs d'énumération (`TERRESTRE`) |
| M11 | Transporteurs / déclarants avec variantes : `COTREX-CI`, `COTREXCI`, `COTREX CI` | 3 | Dédupliquer |
| M12 | Catégories de facturation en variantes (« DEBOURS DOUANE& COMPAGNIE », « DEBOURS DOUANE & COMPAGNIE », « DEBOURS & DOUANE & COMPAGNIE »...) et catégorie `.` | 54 + 10 sans catégorie | Fusionner les variantes. 38 libellés de catégorie distincts dans les détails de facture, dont beaucoup de variantes |
| M13 | **Catalogue `Element`** : 76 libellés en double sur 45 libellés (ex. ACCONAGE présent 4 fois dans 4 catégories ; DEPOT DOUANE 3 fois) | 45 | Le code d'une prestation doit être unique par société (`@@unique[societeId, code]`) : générer un code par couple catégorie + libellé |
| M14 | Dotations : montant restant négatif | 176 | Dépassement de dotation. 5 lignes où utilisé + restant ≠ montant. 660 dotations non validées |
| M15 | AT : 2 dossiers avec plusieurs AT (I-258/2025 ×2, I-277/2025), dossiers `i-244/2025` et `i-280/2025` en minuscules, 1 ligne vide (colonne `Etat`) | 4 | Normaliser la casse. Le statut `Non apuré` correspond à `ACTIVE` |
| M16 | Produit 2026 : 247 lignes rattachées via `NumInterneDossier` (jamais `NumDossier`), `TypeLigneProduit` hétérogène (`XF105 4X2`, `SEMI REMORQUE`/`SEMI-REMORQUE`), numéros de châssis dans `NumLigneProduit` avec un doublon (XLRTE47MS0E934461) | 247 | Joindre via `NumInterneDossier`. Normaliser les types |
| M17 | Mode de règlement hétérogène : `Chèque`/`CHEQUE`, `Virement`/`VIREMENT`, `Autres`/`Autre`, vide (166), `-1`, `REPORT`, `RETOUR` | ~700 | Normaliser vers l'énumération `ModePaiement`. `Autres` : à qualifier |
| M18 | Utilisateurs en variantes : `EDOUKOU`/`EDOUKOU.SANDRINE`, `MINGNI ARLHANDIE LOUISE`/`MINGNI.ARLHANDIE.LOUISE`, `SUPERVISEUR`/`superviseur` | 15 comptes | Dédupliquer avant de créer les `Utilisateur` |
| M19 | 12 mouvements sans `Type_Compte` (sorties de 105,7 M au total) | 12 | À classer manuellement |
| M20 | 6 699 règlements non encaissés (`Etat_Encaissement = 0`) dont 413 en banque | 6 699 | Reprendre en `EN_ATTENTE` pour que le rapprochement bancaire reste juste |
| M21 | Règlement supprimé (`supprimer = 1`) : N° 30286, sortie de 10 391 981 | 1 | Ne pas importer |
| M22 | Règlements en doublon fonctionnel strict (mêmes date, heure, montant, pièce, motif) | ~43 lignes, 41 groupes | Souvent des paiements réellement répétés (ex. 2 × 1 000 F transport). Ne pas dédupliquer automatiquement : revue manuelle |
| M23 | Clients : 125 sans NCC, 117 sans téléphone, `Localisation` souvent vide | -- | Importer tel quel |

### Informations (pas d'action immédiate)

- **I1.** Deux colonnes de « Total » sont étiquetées `Unnamed: 11` et `Unnamed: 14` dans les factures (colonnes sans titre) : ce sont des séparateurs vides.
- **I2.** `Total TTC Client` est le **vrai total de la facture**. `TTC Prestation` n'est qu'un sous-ensemble (honoraires du transitaire + leur TVA) déjà inclus. Dans l'application : `montantPrestation` et `tvaPrestation`. Ne pas additionner les deux.
- **I3.** `Transaction 2025` est une vue du journal. Son total (93,8 Md d'entrées) vaut le double du journal (46,9 Md) uniquement à cause de sa ligne `Somme`. Elle contient 221 lignes absentes du journal et le journal 227 lignes absentes de la vue (écarts de dates et d'états). **Reglement reste la source de vérité** : c'est lui qui redonne les soldes bancaires exacts.
- **I4.** Soldes reconstitués par type de compte : caisse 211 199 052 ; banques 260 218 022 (dont 4e compte fermé, 50,8 M) ; comptes fournisseurs 34 848 024 ; **comptes clients -3 817 702 523** (31 clients débiteurs sur 98, aucun créditeur : ce sont des avances consommées sur le compte client plus que déposées. Sens tranché au § 8 : ce sont des provisions, importées en solde positif).
- **I5.** 626 dossiers sont archivés, 1 151 en cours, 184 nouveaux, 1 terminé. Aucun dossier n'est annulé.
- **I6.** Pas de contacts clients ni fournisseurs séparés dans les exports : 15 fournisseurs n'ont que leur nom (ni NCC, ni adresse).
- **I7.** Colonnes très peu remplies dans les dossiers : navire 5 %, bureau de douane 9 %, déclaration 12 %, FDI 17 %, conteneurs 11 % (`NbreTC` est un nombre, pas des numéros de conteneurs : aucun `Conteneur` ne peut être créé).

## 5. Plan de reprise proposé

Ordre d'import (chaque étape dépend de la précédente), dans une transaction par bloc et avec un mode « simulation » qui ne fait que compter et lister les rejets :

1. **Société et utilisateurs** : décision B1, création des utilisateurs dédupliqués (M18), 4 comptes bancaires (H8) et une caisse.
2. **Référentiels** : clients (fusion H9/H10, ajout H11), fournisseurs (15), catalogue des prestations (M13), processus de suivi à partir de `Etape`.
3. **Dossiers** (1 963) : normalisation des numéros (H12/H13), nature (M8), transport (M9/M10), statuts : `1.Nouveau` → NOUVEAU, `2.En cours` → EN_COURS, `3.Terminer` → TERMINE, `4.Archivé` → ARCHIVE. Puis articles (Produit 2026) et AT.
4. **Proformas** (2 412 + lignes) avec les règles H2/H4/M6/M7.
5. **Factures** (2 062 = 1 878 + 184) et lignes, avoirs reconnus (M2), liaison proforma (B2), exclusion de la ligne de total (H1).
6. **Dotations** (4 045).
7. **Journal Reglement** (49 002) classé en : paiements de factures (n° FACT dans `NumCheque`) → `Paiement` + `PaiementFacture` ; encaissements/dépôts → `OperationFinanciere` ; sorties de dossier → `Depense` ; mouvements de comptes clients/fournisseurs → `OperationFinanciere` + `CompteTiers`.
8. **Contrôles de réception** : recalcul automatique et comparaison avec la source.

Contrôles à automatiser après import (tolérance 1 F) :
- Nombre de dossiers = 1 963, proformas = 2 412 (moins rejets documentés), factures = 2 062.
- Somme des factures = somme des fichiers (hors ligne de total) ; reste à payer total à comparer.
- Soldes bancaires : BNI 122 530 788, BRIDGE 62 159 051, UBA 24 743 061.
- Aucun doublon sur (société, numéro) pour dossier et facture.
- Pour chaque facture : montant payé = somme des `PaiementFacture`.

## 6. Écarts entre l'ancien modèle et l'application à anticiper

| Sujet | Ancien logiciel | Application | Conséquence |
|---|---|---|---|
| Multi-société | Une seule société | `societeId` partout | Voir B1 |
| `Proforma` et `Paiement` | -- | **Pas de `societeId`** : isolation uniquement via le client | À garder en tête pour l'import et pour les requêtes multi-sociétés ; recommandé : ajouter `societeId` à ces deux modèles |
| Facture à deux parties | Total client (avec débours) + honoraires | `montantPrestation`, `tvaPrestation` existent | Mapping direct possible (I2) |
| Journal unique | 1 table Reglement | Paiement, OperationFinanciere, Depense séparés | Classement requis (B3) |
| Clients : n° `CLaaaan` | texte libre | `code` unique par société | Conserver tel quel (aucun doublon) |
| N° facture normalisée (DGI) | champ libre | `numeroNormalise` | Mapping direct, sans unicité (M1) |
| Conteneurs | Seul `NbreTC` (nombre) | Table `Conteneur` | Rien à importer |
| Caution de dépôt | Hors des exports | `Caution` | Hors périmètre (les cautions ne figurent pas dans cet ETL) |
| Étapes de dossier | Libellés seuls, pas d'historique par dossier | `EtapeDossier` | On peut déduire les étapes réalisées des dates FDI, RFCV, assurance, tirage, BAE présentes sur le dossier |

## 7. Décisions sur les cas « MANUEL » (validées)

| Cas | Décision | Effet constaté sur la copie |
|---|---|---|
| Société cible | Société ETL de la base de production | -- |
| Lignes « 1 » et « 183 » des factures | Lignes de compteur de l'export : ignorées | -- |
| Clients `CL20220`, `CL20221` absents de la table | Créés sous « CISSE (CL20220) » et « CISSE (CL20221) » (tiers du journal), à compléter | 2 clients |
| 6 paiements de FACT2021-8, -123, -248 (factures absentes) | Importés comme opérations du compte client, n° de facture en libellé, sans créer de facture | 6 opérations |
| Ligne N° 41322 sans type de compte (compte `FF013`) | Rattachée automatiquement au compte fournisseur FF013 | 1 opération, total fournisseurs 29 593 677 |
| 7 autres lignes sans type de compte (39,2 M) | Importées en statut `A_VERIFIER`, sans compte, sans effet sur caisse et banque | 7 opérations |

À noter : N° 47170 et 46310 (10 575 904 chacune, même date et même motif) sont probablement une double saisie.
La vue « Transaction 2025 » ne reprend pas toujours le même numéro que `Reglement` : seul `Reglement` fait foi.

## 8. Sens des soldes des comptes clients et fournisseurs (tranché)

**Constat dans l'ancien logiciel.** Sur un compte client, l'acompte (types ACOMPTE, RETRAIT, REMISE, VIREMENT) est noté en « sortie » (17,7 Md) et la consommation (règlement de facture, recette, ajustement) en « entrée » (13,9 Md). Le solde brut « entrées - sorties » vaut donc -3,82 Md. Aucun des 98 comptes n'est créditeur au sens brut : 31 sont négatifs, 67 à zéro. C'est la signature d'une **provision** : le client dépose d'abord, la société consomme ensuite. Le signe négatif est une convention de l'ancien logiciel, pas une dette du client.

**Convention de l'application.** Un compte tiers est une provision à solde positif : une entrée l'augmente, une sortie la diminue, et `debiterCompteTiers` refuse un débit supérieur au solde.

**Décision appliquée par l'import.**

| Compte | Sens dans l'ancien logiciel | Sens importé | Solde importé |
|---|---|---|---|
| Fournisseur | dépôt = entrée, retrait = sortie | identique | entrées - sorties = **+29 593 677** avant régularisation, **+87 646 109** après (§ 9) |
| Client | acompte = sortie, consommation = entrée | **inversé** : acompte = `ENCAISSEMENT`/`ENTREE`, consommation = `DECAISSEMENT`/`SORTIE` | sorties - entrées = **+3 817 702 523** (30 comptes positifs après fusion des doublons, aucun négatif) |

- Les règlements de factures pris sur le compte client sont importés comme paiements en mode `COMPENSATION` et diminuent ce solde sans opération séparée : 17 708 M (acomptes) - 1 052 M (opérations de consommation) - 12 839 M (paiements de factures) = 3 817 M.
- `Client.solde` reste à zéro : il sert à l'encours de facturation, pas à la provision.
- Les 3,8 Md sont de l'argent que la société détient pour le compte de ses clients (dette envers eux), à rapprocher des soldes bancaires et de la caisse avant la mise en service.
- Le simulateur contrôle ces soldes (`soldesComptesTiers` dans `rapport.json`) et alerte sur tout compte négatif.
- Point à vérifier avec la comptabilité : en rejouant le journal date par date, 67 clients passent brièvement en négatif (jusqu'à 387 M), ce qui indique des consommations saisies avant l'acompte correspondant. Le solde final n'est pas affecté.

## 9. Comptes fournisseurs négatifs (tranché)

Deux comptes fournisseurs sont négatifs dans le journal brut.

| Compte | Solde brut | Cause constatée | Décision | Solde importé |
|---|---|---|---|---|
| FF005 SERENITY SA (assurance) | -47 366 461 | 606 primes d'assurance de dossiers (52,3 M) prélevées sur le compte depuis 2020, pour seulement 4,9 M de dépôts. Les vrais paiements au fournisseur (« acomptes sur production d'assurance ») ont été saisis en retraits **bancaires** (57,1 M, 30 lignes) et **caisse** (0,95 M) libellés « SERENITY SA », sans alimenter le compte. | **Régularisation** : entrée `ETL-REG-FF005` de +58 052 432, datée du dernier paiement, sans effet sur banque ni caisse | **+10 685 971** |
| FF013 IPT | -417 411 | Dernier paiement de douane de 427 401 (29/12/2025) pas encore réapprovisionné. Le compte a déjà été à découvert jusqu'à -63 M (déc. 2023) puis réapprovisionné : fonctionnement habituel avec ce transitaire. | **Laissé tel quel**, signalé en alerte | **-417 411** |

- La régularisation est la somme des retraits banque et caisse dont le tiers ou le motif contient « SEREN ». Elle est recalculée à chaque simulation et à chaque import, et l'écriture n'est créée qu'une fois.
- Une ligne de FF005 porte la date 2052-05-05 (N° 43425, 66 456) : l'import la ramène à sa date de saisie (22/05/2025).
- La ligne N° 41322 (5 254 347), sans type de compte, rattachée à FF013, explique l'essentiel de la différence avec le solde brut de ce compte.
- À confirmer avec la comptabilité : le solde positif de 10,7 M de FF005 est-il bien une avance restant chez SERENITY ?

## 10. Écritures comptables (tranché)

**Constat.** L'export ne contient aucune écriture : `CompteDebit`, `CompteCredit` et `NumfactCompta` sont vides sur les 49 002 lignes de `Reglement`, et `EtatComptabilise` vaut 0 partout. Il reste un indicateur « pris en compte » sur 15 647 lignes (32 %, surtout des dépenses de caisse), avec un code exercice 2021 à 2025. Cet indicateur est irrégulier (2021 : environ deux tiers des lignes, 2023 : 2 %) : il ne prouve pas que ces lignes sont comptabilisées ailleurs. Aucune écriture n'est donc à reprendre, et la copie n'a ni plan comptable ni journaux.

**Décision : pièces à comptabiliser pour l'exercice 2025 uniquement.** L'import suit la file de décision de l'application (`DecisionFne`) :

| Transactions | Traitement | Copie locale |
|---|---|---|
| 2025, factures avec n° de facture normalisée | Décision `FACTURE_NORMALISEE` (n° repris) + pièce `EN_ATTENTE` | 357 |
| 2025, autres factures, paiements validés, dépenses | Décision `RECEVABLE` + pièce `EN_ATTENTE` | 77 factures, 2 paiements, 6 648 dépenses |
| 2020 à 2024 | Décision `CORBEILLE` (motif « exercice antérieur à 2025 »), sans pièce ; réversible depuis la corbeille | 31 073 |
| 2026 | Laissées « à décider » | 0 |

- Total : **7 084 pièces à comptabiliser** (factures 3,80 Md, dépenses 1,44 Md, paiements 13,7 M). L'exercice **2025** (01/01 au 31/12) est créé s'il n'existe pas.
- Le plan comptable, les journaux et les à-nouveaux restent à saisir par le comptable : sans plan, les pièces s'affichent mais l'application ne peut pas proposer d'écriture.
- Les 39 paiements 2025 non encaissés (`EN_ATTENTE`) ne sont pas éligibles à la file : ils y entreront une fois validés.
- L'import est rejouable : une transaction qui a déjà une décision n'est pas retraitée.
- **Prérequis de production** : les migrations `052_decisions_fne` et `053_platform_mot_de_passe_oublie` doivent être appliquées à la base avant l'import (la copie de test en manquait).

**Point à vérifier.** Les 434 factures de 2025 (3,8 Md TTC) n'ont que 6,5 M de paiements rattachés, contre 2,8 à 4,0 Md encaissés pour chacune des années précédentes. Soit les règlements de 2025 n'ont pas été rattachés aux factures dans l'ancien logiciel (acomptes sur compte client), soit l'export est incomplet. À confirmer avant de s'appuyer sur les restes à payer de 2025.

## 11. Paiements 2025 : factures ouvertes et provisions clients (tranché)

**Constat.** Dans l'ancien logiciel lui-même, les 434 factures de 2025 (3 803 429 353 TTC) sont à zéro payé, sauf 2 500 000 sur une facture de janvier. Seuls 43 règlements de facture sont saisis en 2025 (218 M, tous sur compte client), contre 300 à 490 par an de 2021 à 2024. Les banques et la caisse se retrouvent pourtant au franc près : il ne manque pas d'argent, il manque l'**affectation** des règlements aux factures.

**Explication retenue.** Les provisions clients (3 817 702 523) ont le même ordre de grandeur que les restes de 2025 (3,80 Md), et ce rapprochement tient pour les gros comptes (TATA 1,29 Md de provision pour 1,05 Md de reste 2025, SIMAM 0,44 Md pour 0,37 Md). La « compensation » des acomptes sur les factures (règlement de facture pris sur le compte client) n'a pas été saisie en 2025. Après import, la même créance apparaît donc deux fois : en factures impayées et en provisions.

**Décision : importer tel quel, sans inventer de paiement, et fournir un état de rapprochement.** La compensation se fera dans l'application, facture par facture, avec les vraies dates.

Le simulateur écrit deux fichiers dans `backend/logs/etl-simulation/` (non versionnés) :

| Fichier | Contenu |
|---|---|
| `rapprochement-clients.csv` | Par client : provision, reste des factures 2025, reste antérieur, compensation proposée, provision restante, situation |
| `rapprochement-factures.csv` | Par facture ouverte : TTC, reste, compensation proposée (plus anciennes factures d'abord, dans la limite de la provision) |

Chiffres (107 clients concernés) :

| Mesure | Montant |
|---|---|
| Provisions clients | 3 817 702 523 |
| Reste des factures 2025 | 3 804 444 151 |
| Reste des factures antérieures à 2025 | 1 169 600 356 (32 clients environ) |
| Compensation proposée, total | 3 278 084 554 |
| dont sur les factures 2025 | 2 483 086 554 |

Situations : 6 clients dont les factures sont entièrement couvertes, 21 à provision insuffisante, 3 avec provision sans facture ouverte (dont CONSEIL REGIONAL DU GBOKLE : 425 M de provision pour 2,5 M de reste, probablement une avance sur travaux non encore facturés), 77 sans provision.

**Effet à connaître après import.** Tant que la compensation n'est pas saisie, les tableaux de bord et relances affichent 3,8 Md de factures de 2025 à recouvrer (échéance à 30 jours déjà dépassée), alors qu'une grande partie est couverte par des provisions détenues.

## 12. Restes à payer antérieurs à 2025 (tranché)

**Constat.** 163 factures d'avant 2025 restent ouvertes pour **1 169 600 356** (32 clients environ) :

| Année de la facture | Factures | Reste |
|---|---|---|
| 2021 | 7 | 19,1 M |
| 2022 | 12 | 99,5 M |
| 2023 | 24 | 156,2 M |
| 2024 | 120 | 894,8 M |

136 factures sont totalement impayées (1,007 Md), 27 partiellement (163 M). Les restes 2024 sont récents (surtout le dernier trimestre) et relèvent du recouvrement normal. Les restes de 2021 à 2023 (43 factures, 275 M) ont 2 à 4 ans : à classer en créances anciennes ou douteuses par la comptabilité. Principaux clients : TATA AFRICA CI 256 M, RAZEL-BEC 249 M (dont FACT2023-1059 de 99,4 M impayée depuis juin 2023 et FACT2022-604 de 64,1 M), AFRICA TRAILER 144 M (27 factures), UCP-PIF2 125 M, GEBATEC 83 M, JC YARED 79 M, EKDS 60 M. Ces restes sont importés tels quels et figurent dans l'état de rapprochement (§ 11), car plusieurs de ces clients détiennent une provision (RAZEL-BEC 673 M, TATA 1,29 Md).

**Doubles règlements : 15 factures payées au double de leur TTC (surplus de 30 911 154).** Le champ « Montant payé » de l'ancien logiciel vaut bien le TTC, mais le journal contient chaque règlement deux fois : une « RECETTE » de l'époque, puis un « REGLEMENT FACTURE » ressaisi plus tard (2022 ou 2025), tous deux pris sur le compte client (HP AUTOMOTIVE, OKOUNDA BTP, IRIM, TAHA OMAR). Six autres factures ont encore un « Montant payé » différent du journal ; le journal l'emporte, cause non analysée.

**Décision : plafonner au TTC, doublon importé comme opération « à vérifier ».**
- Les règlements d'une facture sont alloués par ordre chronologique jusqu'à son TTC (`allouerReglements`, commun à la simulation et à l'import). Reste de la facture : 0.
- La part au-delà du TTC n'est pas imputée à la facture : elle devient une opération du compte d'origine (compte client pour l'essentiel), statut `A_VERIFIER`, libellé « excédent de règlement de FACT… : doublon probable ». 17 opérations, 30 911 154.
- Les soldes (caisse, banques, comptes clients et fournisseurs) restent identiques au journal : seule l'affectation aux factures change. Si la comptabilité confirme le doublon, elle réintègre 30,9 M dans la provision des clients concernés.
- Effet : payé total 12 804 922 882 (au lieu de 12 835 834 036), reste à payer total 4 966 529 709, plus aucune facture normale à reste négatif.

**Autres anomalies relevées (non corrigées).** Trois factures portent un numéro et une date incohérents (FACT2024-1794 datée du 15/09/2021, FACT2024-1356 du 29/12/2023, FACT2022-443 du 31/12/2021). Onze acomptes de caisse ou de banque (89,6 M) portent un dossier à facture ouverte sans n° de facture : ils sont déjà couverts par le « Montant payé » de la facture et ne changent pas le reste. Les restes résiduels correspondants sont minimes (de 23 k à 2,3 M).

## 13. Les six factures dont le « Montant payé » diffère du journal (tranché)

Après plafonnement des doublons (§ 12), six factures ont un « Montant payé » différent de la somme de leurs règlements. L'import retient le **journal**, pour deux raisons : la fiche facture de l'ancien logiciel n'est pas toujours remise à jour, et dans chacun de ces cas les règlements sont des compensations prises sur le compte client, déjà déduites de la provision. Garder le payé de la fiche laisserait la facture ouverte alors que la provision est consommée (double comptage).

| Facture | Client | TTC | Payé fiche | Payé journal | Constat |
|---|---|---|---|---|---|
| FACT2024-1545 | RAZEL-BEC | 4 408 010 | 0 | 4 408 010 | Règlement du 21/05/2024 sur compte client, saisi le 10/07/2024 ; fiche jamais mise à jour |
| FACT2024-1471 | KLO-AMTCI | 34 461 267 | 0 | 34 438 343 | Deux compensations (33,6 M saisis le 20/11/2024 et 0,85 M), qui consomment les acomptes de caisse du dossier I-030/2024 ; reste 22 924 |
| FACT2021-238 | AFRICA TRAILER | 6 445 785 | 0 | 6 445 785 | Quatre recettes de 2021 qui soldent exactement la facture ; fiche jamais mise à jour |
| FACT2024-1452 | MAIRIE D'ALEPE | 20 099 414 | 0 | 4 000 000 | Compensation partielle du 16/03/2024 ; reste 16,1 M |
| FACT2024-1454 | AFRICA BETON PLUS | 26 849 292 | 26 600 000 | 26 540 000 | Les acomptes de caisse du dossier valent 26,6 M, mais seuls 26,54 M ont été compensés : 60 000 restent en provision ; reste 309 292 |
| FACT2023-973 | OKOUNDA BTP | 3 000 000 | 3 000 000 | 1 500 000 | Seule trace dans le journal : 1,5 M de compensation. Le 1,5 M manquant n'a aucun règlement retrouvé |

Effet net sur le payé total : +47 732 138 par rapport aux fiches.

**À signaler à la comptabilité**
- **FACT2023-973 (OKOUNDA BTP) :** facture soldée dans l'ancien logiciel, mais 1,5 M sans règlement dans le journal. Importée avec un reste de 1,5 M. Le client a d'autres factures du même dossier surpayées en double (§ 12) : le règlement manquant a peut-être été imputé à une autre pièce.
- **FACT2024-1452 et FACT2024-1771 (MAIRIE D'ALEPE) :** datées de juillet 2025 mais saisies en mars et novembre 2024 ; le règlement partiel de la première date du 16/03/2024, soit avant la facture. Les deux factures (26,7 M) entrent donc dans les pièces à comptabiliser de 2025. Leur date est probablement à corriger en 2024. Aucune correction automatique : 191 factures sont datées plus de 31 jours après leur saisie et 14 de plus de 180 jours (31 si l'on compte les antidatées), la plupart légitimes, et rien ne permet de trancher à coup sûr.

## 14. Dates des factures MAIRIE D'ALEPE : réémission en facture normalisée (tranché)

**Constat.** FACT2024-1452, FACT2024-1771 et FACT2025-1811 ont été **modifiées les 17, 18 et 21 juillet 2025** par NAOMIE.PRISCILLA. À chaque modification, l'ancien logiciel a remplacé la date de facture par la date de modification et a attribué un numéro de facture normalisée de la série 2025 (`25-319-Y0101/N°097`, `N°098`, `N°102`). Ces numéros s'insèrent exactement dans la séquence de juillet 2025 (N°094 le 08/07, N°095 le 10/07, N°099 à N°101 le 18/07, N°104 le 21/07) : la date de juillet 2025 est donc la date de la facture normalisée, pas une faute de frappe.

**Ce n'est pas propre à ce client.** 97 factures ont une date égale à leur date de modification, plus de 30 jours après leur saisie (surtout des réémissions 2024 et 2025 par CISSE.BACARI puis NAOMIE.PRISCILLA). Six changent d'exercice du fait de ce décalage :

| Facture | Saisie | Date de facture | N° normalisé | TTC |
|---|---|---|---|---|
| FACT2024-1452 (MAIRIE D'ALEPE) | 16/03/2024 | 17/07/2025 | 25-319-Y0101/N°097 | 20 099 414 |
| FACT2024-1771 (MAIRIE D'ALEPE) | 22/11/2024 | 21/07/2025 | 25-319-Y0101/N°102 | 6 596 881 |
| FACT2024-1799, -1800, -1801 | 23/12/2024 | 08/01/2025 | 24-319-Y0101/N°309 à 311 | 4 021 582 |
| FACT2021-202 (SIMAM CI) | 30/07/2021 | 26/01/2022 | 22-319-IO46/N°011 | 26 649 251 |

**Décision : dates conservées telles que l'ancien logiciel les donne.** La date de la facture normalisée est celle que le client et l'administration fiscale connaissent ; la réécrire à la date de saisie créerait un écart avec le n° normalisé imprimé. Conséquences :
- FACT2024-1452, FACT2024-1771 et FACT2024-1799 à 1801 (30,7 M) entrent dans les pièces à comptabiliser de **2025**. La comptabilité peut les rattacher à 2024 lors de la validation si le service rendu doit l'être (dédouanement de mars 2024 pour la première).
- La date de saisie d'origine est conservée dans la date de création de chaque facture.
- Le règlement partiel de 4 M de FACT2024-1452 date du 16/03/2024, avant la facture : c'est la compensation d'un acompte versé au moment du dédouanement, saisie avant la réémission. Rien à corriger.
- Le simulateur signale ces six cas (`facture-redatee-exercice-suivant`, alerte) dans `rejets.csv`.

**Point de vigilance pour les 1799 à 1801.** Leur numéro normalisé est de la série **24** alors que leur date est de janvier 2025 : si la comptabilité considère le n° normalisé comme référence, ces trois factures (4 M) sont de 2024.

## 15. Données de 2026 : l'export actuel s'arrête fin 2025

**Constat.** Les fichiers ont été exportés le 15/11/2026 mais ne contiennent que la base « 2025 » : dernière facture le 30/12/2025 ; dernier dossier, proforma et dotation entre le 26 et le 30/12/2025 ; dans le journal `Reglement`, seulement deux saisies de 2026 (le 27/04/2026, deux paiements fournisseurs : N° 49004 et 39671) ; une admission temporaire de février 2026. Le fichier « Transaction 2025 » mentionne aussi des dates de 2026 sans lien avec des saisies (vue dérivée). Les tables portent le millésime 2025 : l'ancien logiciel garde une base par année, et les opérations de **janvier à novembre 2026 sont dans une base 2026 qui n'a pas été exportée** (réponse du propriétaire).

**Conséquence.** L'import de 2025 est une reprise **arrêtée au 31/12/2025**, correcte en soi (soldes bancaires au franc près) mais incomplète pour une mise en service en novembre 2026. Aucun import en production ne doit être lancé avant la reprise de 2026, sinon les 11 mois d'activité manqueraient et les soldes seraient faux.

**À exporter de la base 2026** (mêmes noms qu'en 2025, millésime 2026) : `Dossier 2026`, `Liste des Dossiers2026`, `Table Facture2026` (et `Table FactureN2 2026` si elle existe), `Table Proforma2026`, `DetailFacture`, `DetailProforma`, `Dotation2026`, `Table AT2026`, le journal des règlements de 2026, `Table Client`, `Table Fournisseur`, `Liste Compte Bancaire`, et le fichier des soldes d'ouverture s'il existe.

**Points à traiter quand les fichiers seront disponibles.**
1. **Numéros d'enregistrement.** L'import numérote les opérations `ETL-<N° Enr.>`. Une base 2026 repart probablement de 1 : la reprise 2026 doit utiliser un autre préfixe (par exemple `ETL26-`) pour ne pas entrer en collision avec 2025 ou être ignorée comme « déjà présente ».
2. **Soldes d'ouverture.** Les soldes bancaires, la caisse et les comptes clients et fournisseurs en début de 2026 doivent égaler ceux de fin 2025 repris (BNI 122 530 788, BRIDGE 62 159 051, UBA 24 743 061, caisse 211 199 052, provisions clients 3 817 702 523, comptes fournisseurs 87 646 109). Tout écart sera analysé avant import.
3. **Clients, fournisseurs, dossiers.** Un même client, fournisseur ou dossier peut figurer dans les deux bases : la reprise 2026 ne crée que les nouveaux (idempotence par code).
4. **Reports de 2025.** Les factures de 2025 ouvertes et les provisions seront payées ou consommées en 2026 : les règlements de 2026 doivent s'imputer aux factures reprises de 2025, ce qui est possible puisque la clé est le numéro de facture.
5. **Comptabilité.** L'exercice 2026 et ses pièces à comptabiliser seront créés à ce moment, avec la même règle que 2025.
6. **Numérotation de l'application.** Les numéros générés par l'application (`FAC/2026/000001`, `PRO/…`) n'ont pas le même format que ceux de l'ancien logiciel (`FACT2025-2158`, `PRO2024-1681`) : aucune collision possible. Les numéros physiques de dossier (`I-042/2025`) sont proposés par l'application à partir du plus grand `numeroPhysique` existant : l'import le renseigne désormais pour les 1 958 dossiers au format standard (les 4 autres ont un numéro non standard), et l'application proposerait `I-398/2025` après le dernier dossier repris. Aucun compteur à ajuster.

## 16. Utilisateurs de reprise : rapprochement avec les vrais utilisateurs

**Ce que crée l'import.** 40 utilisateurs de reprise (inactifs, mot de passe inutilisable, e-mail `…@etl-import.local`) pour conserver l'auteur de chaque pièce :

| Catégorie | Nombre | Détail |
|---|---|---|
| Compte technique `etl-import` | 1 | Auteur des 1 962 dossiers et des 4 045 dotations (le fichier n'a pas de créateur) |
| Saisisseurs de factures, paiements et proformas | 9 | KOFFI.AKASSI (1 037 factures, 70 paiements), NAOMIE.PRISCILLA (668), CISSE.BACARI (185 factures, 638 paiements), SUPERVISEUR (123, 235), MINGNI ARLHANDIE LOUISE (28), KONE.ABDOULAYE (10), TRAORE.KARIDJA (5), EDOUKOU.SANDRINE (2 factures, 656 paiements), DEME.RAMATOU (2, 114) |
| Identifiants sans pièce visible | 4 | NULL, TRAORE.ABDUL, ADMIN, LASSANA (présents comme auteurs de proformas ou de lignes du journal) |
| Agents bénéficiaires de dotations | 26 | Matricules `0xx/DG/TMS` (de 888 dotations pour 010/DG/TMS à 1 pour 017/DG/TMS) et `1` |

**Défaut corrigé dans l'import.** Le matricule d'un utilisateur est unique dans **toute la base**, pas par société. Les agents de reprise portaient le matricule brut de l'ancien logiciel (`010/DG/TMS`) : si un vrai utilisateur a déjà ce matricule en production, l'insertion (qui ignore silencieusement les doublons) aurait écarté l'agent et fait échouer les dotations. Les matricules des agents sont désormais préfixés `ETL-` (`ETL-010/DG/TMS`), comme ceux des saisisseurs ; le matricule d'origine reste lisible dans le prénom.

**Outil de rapprochement : `backend/scripts/etl/rapprocher-utilisateurs.ts`.** Il remplace un utilisateur de reprise par le vrai utilisateur dans **toutes** les tables qui le référencent (les colonnes sont déduites du schéma Prisma, aucune liste à maintenir), puis laisse le compte de reprise inactif, ou le supprime s'il n'a plus aucune référence (`--supprimer-orphelins`).
- **Simulation par défaut** : il écrit `backend/logs/etl-utilisateurs/propositions.csv` (nom, nombre de références, proposition, méthode) et ne modifie rien.
- **Propositions automatiques** : même matricule (agents), ou mêmes nom et prénoms dans un ordre quelconque (saisisseurs). Elles ne sont appliquées qu'avec `--accepter-propositions`. S'il y a plusieurs candidats, aucune proposition n'est faite.
- **Fichier de correspondance** (`--correspondance=fichier.csv`, lignes `reprise;reel`, par exemple `superviseur;chef@gbtrans.ci`) : toujours appliqué.
- **Garde-fous** : base non locale refusée sans `ETL_AUTORISER_DISTANT=OUI_PRODUCTION` pour l'écriture ; le compte technique n'est jamais touché ; relançable.
- **Test sur la copie** : avec trois vrais utilisateurs fictifs (un par nom, un par matricule, un par fichier), 1 914 lignes ont été réaffectées sans erreur ; la relance ne déplace plus rien et supprime les trois comptes devenus orphelins.

**À faire pour la production** : après l'import et la création des vrais comptes, lancer la simulation, vérifier `propositions.csv` avec la direction (qui est qui), compléter le fichier de correspondance pour les cas sans proposition (SUPERVISEUR, ADMIN, les agents de dotation sans compte), puis appliquer. Un utilisateur de reprise sans correspondance reste inactif et garde son historique : c'est acceptable, ces agents (chauffeurs, convoyeurs) n'ont pas forcément de compte.

## 17. Écritures N° 46310 et 47170 (doublon) et lignes « à vérifier » (tranché)

**Constat.** Le virement UBA de 10 575 904 du 25/09/2025 (« paiement suivant budget I-224/2025 », COASTWIN) n'existe qu'**une fois** en banque (N° 46309). Sa moitié « compte client » existe **deux fois**, sans type de compte : N° 46310 (saisie le 25/09, chèque 4471076) et N° 47170 (ressaisie le 23/10 avec la faute « BUDEGET » et le chèque 4471016, mêmes saisisseur, date, montant et motif que l'entrée bancaire, qui a été saisie le même jour). Le client COASTWIN (CL2025197) n'a aucune ligne de compte dans le journal : son crédit manquait. N° 48768 (8 617 491, dossier I-132/2025, jumelle de l'entrée bancaire 48767) est dans le même cas, sans doublon. Sur 90 entrées bancaires « paiement suivant budget » de 2025, 82 ont leur moitié compte client ; ces trois lignes sont des moitiés restées sans compte.

**Décision : créditer COASTWIN une seule fois.**
- N° 46310 et N° 48768 deviennent des acomptes du compte client COASTWIN (CL2025197) : provision **+19 193 395**.
- N° 47170 est écartée comme doublon de N° 46310 : opération « à vérifier », libellée « (doublon de N° 46310) », sans effet sur les soldes.
- Règles dans `commun.ts` (`COMPTE_CLIENT_IMPOSE`, `DOUBLON_DE`), appliquées par l'import et la simulation (alertes `compte-client-impose` et `doublon-declare`).

**Effets.** Provisions clients : 3 836 895 918 (au lieu de 3 817 702 523), 99 comptes dont 31 positifs et aucun négatif. Lignes « à vérifier » sans compte : 5 pour 20 047 904 (au lieu de 7 pour 39 241 299). Les soldes bancaires et la caisse sont inchangés. Les chiffres des § 8 et § 11 se lisent donc avec ce supplément de 19 193 395 sur la provision de COASTWIN.

**Les 5 lignes encore « à vérifier »** ont toutes leur moitié bancaire, mais aucune indication de client : N° 41654 (3 000 000, « premier versement sur le compte », UBA 41653), N° 42215 (2 200 000, remboursement de caution, 42216), N° 42419 (2 772 000, « transfert interne », 42418, déjà repris dans la paire 42876 et 42877 du 16/04), N° 47582 (1 500 000, motif illisible, 47581) et N° 47170 (doublon). À rattacher par la comptabilité si le client est identifié.

**À examiner avec la comptabilité.** Six autres entrées bancaires « paiement suivant budget » de 2025 n'ont pas de moitié compte client du même montant (3 569 366 ; 8 771 099 AFRICA TRAILER I-245/2025 ; 15 000 000 ISOSIGN I-026/2025 ; 16 517 913 ; 19 450 431 ; 43 038 228 I-183/2025), soit 106,3 M. Elles ont peut-être été ventilées en plusieurs lignes de montants différents ; sinon la provision des clients concernés est sous-évaluée.

## 18. Les six entrées bancaires « paiement suivant budget » sans moitié compte client (tranché)

**Méthode.** Les six entrées bancaires de 2025 sans moitié compte client de même montant et de même motif ont été reprises une à une, en cherchant sur le même jour, le même client et les mêmes dossiers.

| N° | Date | Montant | Dossier | Résultat |
|---|---|---|---|---|
| 42196 | 11/03/2025 | 15 000 000 | I-026/2025 ISOSIGN | Moitié trouvée : N° 42197, motif illisible (« ??? »). Rien à faire |
| 47574 | 03/11/2025 | 8 771 099 | I-245/2025 | Moitié trouvée : N° 47575 sur le compte EKDS (le motif précise « AFRICA TRAILER p/c EKDS »). Rien à faire |
| 45421 | 19/08/2025 | 16 517 913 | I-136/2025 (12 582 530) et I-132 (3 935 383) | Moitié trouvée : N° 45420, motif fautif. **Mais elle est sur le compte CL202122 (AFRICA TRAILER INDUSTRIE)**, alors que les dossiers cités sont ceux de FOURNITURE INDUSTRIELLE ET MAINTENANCE (I-136) et de COASTWIN (I-132) : compte probablement erroné, à confirmer |
| 44260 | 01/07/2025 | 3 569 366 | I-097/2025 | Moitié trouvée : N° 43477 de **3 596 366** : inversion de chiffres, 27 000 de plus au compte client (AFRICA TRAILER) qu'en banque |
| 45210 | 12/08/2025 | 43 038 228 | I-183/2025 EKDS NOUVELLE | **Aucune moitié compte client** |
| 47344 | 24/10/2025 | 19 450 431 | I-286/2025 TATA AFRICA CI | **Aucune moitié compte client** |

**Décision : régulariser N° 45210 et N° 47344.** L'argent est bien en banque, mais la provision du client n'a jamais enregistré ces deux acomptes. Une entrée de régularisation (`ETL-REG-45210`, `ETL-REG-47344`) crédite le compte client du dossier, sans toucher à la banque ni à la caisse. Même logique que SERENITY (§ 9). Règles dans `commun.ts` (`REGULARISATION_CLIENT`), appliquées par l'import et par la simulation (alerte `regularisation-compte-client`).

| Compte client | Régularisation | Provision après |
|---|---|---|
| EKDS NOUVELLE (CL202120) | +43 038 228 | 281 437 931 |
| TATA AFRICA CI (CL2023132) | +19 450 431 | 1 310 706 715 |

**Effets.** Provisions clients : **3 899 384 577** (3 836 895 918 + 62 488 659), 99 comptes dont 31 positifs et aucun négatif. Banques et caisse inchangées. Compensation proposée dans l'état de rapprochement (§ 11) : 3 300 334 563 au total, dont 2 505 336 563 sur les factures 2025. L'import reste relançable : une régularisation n'est créée qu'une fois.

**À confirmer par la comptabilité.** (1) Le compte crédité par N° 45420 (16,5 M, AFRICA TRAILER INDUSTRIE au lieu des clients des dossiers I-136 et I-132). (2) L'écart de 27 000 entre N° 44260 et N° 43477 : montant bancaire exact ou montant du compte client, non corrigé ici. (3) Que ces deux acomptes n'ont pas été consommés par un autre moyen que le compte client.

## 19. Le compte crédité par N° 45420 (tranché) et doublon client ETMD

**N° 45420 : le compte est le bon.** Le motif de l'entrée bancaire (« budget I-136/25 (12 582 530) et I-132 (3 935 383) ») cite deux dossiers de 2025 qui appartiennent à FOURNITURE INDUSTRIELLE ET MAINTENANCE et à COASTWIN, alors que le compte crédité est celui d'AFRICA TRAILER INDUSTRIE. L'année du motif est fautive : **I-136/2024 et I-132/2024 sont deux dossiers d'AFRICA TRAILER INDUSTRIE**, ouverts le 30/04/2024, dont les dépenses sont engagées juste après ce versement :

| Dossier (2024) | Dépenses retrouvées (caisse, D&T FF013, assurance FF005) | Budget du motif |
|---|---|---|
| I-136/2024 | environ 12,3 M, du 10 au 18/09/2025 (dont 7 944 568 de droits et taxes) | 12 582 530 |
| I-132/2024 | environ 3,8 M, du 13 au 27/08/2025 | 3 935 383 |

Les deux factures correspondantes (FACT2025-2081 et FACT2025-2059, 14,3 M et 4,6 M TTC) sont au nom d'AFRICA TRAILER INDUSTRIE. **Aucune correction** : l'acompte de 16 517 913 reste sur le compte d'AFRICA TRAILER INDUSTRIE.

**Les autres écarts entre compte crédité et client du dossier.** Sur 99 acomptes « budget » de 2025 qui citent un dossier, 10 ont un compte différent du client du dossier (218,7 M). Une fois N° 45420 expliqué, il reste des paiements faits par un tiers ou des références de dossier fautives, sans erreur démontrable : le motif est un texte libre et le compte crédité est celui qui a payé. Importés tels quels, à titre d'information : RAZEL-BEC pour des dossiers d'AFRICA TRAILER (N° 41324 et 41326, 41,2 M), UCP-PIF2 pour I-105/2025 (N° 43384, 10,8 M), GENICI GROUPE pour un dossier TATA (N° 42109, 7,3 M), SUCRIVOIRE pour I-281/2024 de SIMAM CI (N° 41652, 24,7 M), SIMAM CI pour I-292/2025 de TATA (N° 48891, 18,9 M), et **TATA AFRICA CI pour « I-132/2025 », 90 059 725 (N° 46037)** : ce dossier est celui de COASTWIN (vêtements), le numéro cité est donc très probablement faux ; le compte crédité (le payeur) n'est pas en cause.

**Défaut corrigé : doublon client ETMD.** « ETMD » (CL2025196) et « ENTREPRISE DE TRANSPORT DE MANUTENTION ET DIVERS » (CL2023128) ont le même NCC, écrit « 1503333 Z » dans un cas et « 1503333Z » dans l'autre : la fusion ne les voyait pas. Le NCC est maintenant comparé sans espaces ni ponctuation (dans `commun.ts` et dans le simulateur) : ETMD est fusionné vers CL2023128 (clients : 212 au lieu de 213). C'était le seul doublon manqué ; les deux autres fusions par NCC (GEBATEC) sont inchangées. Par ailleurs, l'import crédite désormais toujours le compte du client **survivant** d'une fusion, comme le simulateur. Les provisions restent à 3 899 384 577.

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
- **I4.** Soldes reconstitués par type de compte : caisse 211 199 052 ; banques 260 218 022 (dont 4e compte fermé, 50,8 M) ; comptes fournisseurs 34 848 024 ; **comptes clients -3 817 702 523** (31 clients débiteurs sur 98, aucun créditeur : ce sont des avances consommées sur le compte client plus que déposées. Attention, l'application stocke un `Client.solde`, il faudra décider du sens).
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

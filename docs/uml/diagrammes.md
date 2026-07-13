# GBTRANS ERP - Diagrammes UML

## 1. Diagramme de Cas d'Utilisation

```
┌─────────────────────────────────────────────────────────┐
│                     GBTRANS ERP                          │
│                                                          │
│  ┌─────────────────────┐   ┌──────────────────────┐     │
│  │   Gestion Dossiers  │   │  Gestion Financière  │     │
│  │  ○ Créer dossier    │   │  ○ Facturer          │     │
│  │  ○ Suivre statut    │   │  ○ Encaisser         │     │
│  │  ○ Déclarer douane  │   │  ○ Rapprocher banque │     │
│  │  ○ Livrer           │   │  ○ Clôturer exercice │     │
│  │  ○ Archiver         │   │  ○ Éditer bilan      │     │
│  └─────────┬───────────┘   └──────────┬───────────┘     │
│            │                           │                 │
│  ┌─────────┴───────────┐   ┌──────────┴───────────┐     │
│  │  Gestion Clients    │   │  Gestion AT/Cautions  │     │
│  │  ○ Créer client     │   │  ○ Créer AT           │     │
│  │  ○ Consulter solde  │   │  ○ Alerter expiration │     │
│  │  ○ Historique       │   │  ○ Renouveler         │     │
│  │  ○ Bloquer/Débloq.  │   │  ○ Apurer             │     │
│  └─────────────────────┘   └──────────────────────┘     │
└─────────────────────────────────────────────────────────┘

Acteurs:
  👤 Administrateur - Accès complet
  👤 Transitaire    - Dossiers, Clients, Courriers
  👤 Comptable      - Finance, Comptabilité, Factures
  👤 Commercial     - Clients, Offres, Proformas
  👤 Direction      - Dashboard, Statistiques, Rapports
  👤 Client (Web)   - Portail client, suivi dossier
```

## 2. Diagramme de Classes (Modèle Principal)

```
┌──────────────┐     1..*  ┌──────────────┐
│   Societe    │──────────>│    Agence     │
├──────────────┤           ├──────────────┤
│ code         │           │ code         │
│ raisonSociale│           │ nom          │
│ ncc          │           │ ville        │
│ devise       │           └──────────────┘
│ tauxTVA      │
└──────┬───────┘
       │ 1..*
       ▼
┌──────────────┐    *..* ┌──────────────┐
│ Utilisateur  │────────>│    Profil     │
├──────────────┤         ├──────────────┤
│ matricule    │         │ code         │
│ nom, prenom  │         │ nom          │
│ email        │         │ estAdmin     │
│ motDePasse   │         │ permissions[]│
│ doubleAuth   │         └──────────────┘
└──────────────┘

┌──────────────┐     *    ┌──────────────┐
│   Client     │<─────────│   Dossier    │
├──────────────┤          ├──────────────┤
│ code         │          │ numero       │
│ raisonSociale│          │ nature       │
│ ncc          │          │ type         │
│ rccm         │          │ statut       │
│ solde        │          │ numeroBL     │
│ plafondCredit│          │ valeurCAF    │
└──────────────┘          │ conteneurs[] │
       │                  │ documents[]  │
       │ 1..*             └──────┬───────┘
       ▼                         │ 1..*
┌──────────────┐                 ▼
│   Facture    │          ┌──────────────┐
├──────────────┤          │  Conteneur   │
│ numero       │          ├──────────────┤
│ type         │          │ numero       │
│ montantTTC   │          │ type (20/40) │
│ resteAPayer  │          │ poids        │
│ statut       │          │ scelle       │
│ lignes[]     │          └──────────────┘
│ paiements[]  │
└──────────────┘

┌────────────────────┐    ┌──────────────┐
│ AdmissionTemporaire│    │   Caution    │
├────────────────────┤    ├──────────────┤
│ numero             │    │ numero       │
│ dateExpiration     │    │ montant      │
│ montantCaution     │    │ banque       │
│ statut             │    │ dateExpir.   │
│ alertes[]          │    │ statut       │
└────────────────────┘    └──────────────┘

┌──────────────┐    ┌──────────────────┐
│   Courrier   │    │ CompteComptable  │
├──────────────┤    ├──────────────────┤
│ numero       │    │ numero (OHADA)   │
│ type (E/S)   │    │ libelle          │
│ objet        │    │ classe (1-9)     │
│ statut       │    │ type             │
│ pièces[]     │    │ nature           │
└──────────────┘    └──────────────────┘
```

## 3. Diagramme de Séquence - Création Dossier

```
Client    Transitaire    Système       BDD        Douane
  │           │             │           │           │
  │──Demande──>│             │           │           │
  │           │──Créer───────>│           │           │
  │           │             │──Générer──>│           │
  │           │             │  numéro   │           │
  │           │             │<──────────│           │
  │           │             │           │           │
  │           │──Saisir BL──>│           │           │
  │           │──Conteneurs──>│           │           │
  │           │──Documents───>│           │           │
  │           │             │──Sauver───>│           │
  │           │             │<──────────│           │
  │           │             │           │           │
  │           │──Déclaration─>│───────────────────>│
  │           │             │           │           │
  │           │<─Liquidation─│<─────────────────── │
  │           │             │           │           │
  │<─Facture──│──Facturer───>│──Écriture─>│         │
  │           │             │ comptable  │           │
  │──Paiement─>│             │           │           │
  │           │──Encaisser──>│──Mettre───>│           │
  │           │             │  à jour    │           │
  │           │             │           │           │
  │           │──Main levée──>│           │           │
  │<─Livraison│──Clôturer───>│──Archive──>│         │
  │           │             │           │           │
```

## 4. Diagramme d'Activité - Workflow Dossier

```
        ┌───────────┐
        │  NOUVEAU  │
        └─────┬─────┘
              │ Début traitement
              ▼
        ┌───────────┐
        │ EN_COURS  │◄──────────┐
        └─────┬─────┘           │
              │                 │
        ┌─────┴─────┐    Informations
        ▼           ▼    reçues
  ┌───────────┐ ┌──────────────┐
  │ATT_CLIENT │ │ ATT_DOUANE   │
  └─────┬─────┘ └──────┬───────┘
        │               │
        └───────┬───────┘
                ▼
        ┌───────────────┐
        │  LIQUIDATION  │
        └───────┬───────┘
                │ Droits calculés
                ▼
        ┌───────────────┐
        │   PAIEMENT    │
        └───────┬───────┘
                │ Droits payés
                ▼
        ┌───────────────┐
        │  MAIN_LEVEE   │
        └───────┬───────┘
                │ BAE obtenu
                ▼
        ┌───────────────┐
        │  LIVRAISON    │
        └───────┬───────┘
                │ Marchandise livrée
                ▼
        ┌───────────────┐
        │   CLÔTURÉ     │
        └───────────────┘
                │
                ▼
        ┌───────────────┐
        │   ARCHIVÉ     │
        └───────────────┘
```

## 5. Diagramme de Composants

```
┌─────────────────────────────────────────────────────┐
│                    FRONTEND                          │
│  ┌──────────┐ ┌──────────┐ ┌────────────────────┐  │
│  │Dashboard │ │ Modules  │ │   Composants UI    │  │
│  │  Page    │ │  Pages   │ │ (Sidebar, Header,  │  │
│  │         │ │          │ │  Tables, Forms,    │  │
│  │         │ │          │ │  Charts, Modals)   │  │
│  └────┬─────┘ └────┬─────┘ └────────┬───────────┘  │
│       └─────────────┼───────────────┘               │
│                     │ API Calls (Axios)              │
└─────────────────────┼───────────────────────────────┘
                      │ HTTP/JSON
┌─────────────────────┼───────────────────────────────┐
│                  BACKEND API                         │
│                     │                                │
│  ┌──────────────────┼──────────────────────────┐    │
│  │            Express Router                    │    │
│  │  ┌────┐ ┌────────┐ ┌──────────┐ ┌───────┐  │    │
│  │  │Auth│ │Dossiers│ │Facturat° │ │Compta │  │    │
│  │  └──┬─┘ └───┬────┘ └────┬─────┘ └───┬───┘  │    │
│  └─────┼───────┼───────────┼───────────┼───────┘    │
│        │       │           │           │             │
│  ┌─────┼───────┼───────────┼───────────┼───────┐    │
│  │     │    Services (Couche Métier)   │       │    │
│  │  ┌──┴─┐ ┌──┴────┐ ┌────┴─────┐ ┌──┴───┐  │    │
│  │  │Auth│ │Dossier│ │Facture   │ │Compta│  │    │
│  │  │Svc │ │Service│ │Service   │ │Svc   │  │    │
│  │  └──┬─┘ └───┬───┘ └────┬─────┘ └──┬───┘  │    │
│  └─────┼───────┼──────────┼──────────┼──────┘    │
│        └───────┼──────────┼──────────┘            │
│                │  Prisma ORM  │                    │
│                └──────┬───────┘                    │
└───────────────────────┼────────────────────────────┘
                        │ SQL
┌───────────────────────┼────────────────────────────┐
│                 PostgreSQL 16                       │
│  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────────┐  │
│  │Sociétés│ │Dossiers│ │Factures│ │Comptabilité│  │
│  │Agences │ │Clients │ │Paiem.  │ │  OHADA     │  │
│  │Users   │ │Fourn.  │ │        │ │            │  │
│  └────────┘ └────────┘ └────────┘ └────────────┘  │
└────────────────────────────────────────────────────┘
```

-- CreateEnum
CREATE TYPE "NatureDossier" AS ENUM ('IMPORT', 'EXPORT', 'TRANSIT', 'REEXPORT', 'CABOTAGE', 'TRANSBORDEMENT');

-- CreateEnum
CREATE TYPE "TypeDossier" AS ENUM ('MARITIME', 'AERIEN', 'TERRESTRE', 'MULTIMODAL');

-- CreateEnum
CREATE TYPE "StatutDossier" AS ENUM ('NOUVEAU', 'EN_COURS', 'ATTENTE_CLIENT', 'ATTENTE_DOUANE', 'LIQUIDATION', 'PAIEMENT', 'MAIN_LEVEE', 'LIVRAISON', 'CLOTURE', 'ANNULE', 'ARCHIVE');

-- CreateEnum
CREATE TYPE "TypeClient" AS ENUM ('ENTREPRISE', 'PARTICULIER', 'ADMINISTRATION', 'ONG', 'DIPLOMATIQUE');

-- CreateEnum
CREATE TYPE "TypeFournisseur" AS ENUM ('PRESTATAIRE', 'TRANSPORTEUR', 'COMPAGNIE_MARITIME', 'COMPAGNIE_AERIENNE', 'ACCONIER', 'MAGASIN', 'BANQUE', 'DOUANE', 'ASSURANCE', 'TRANSITAIRE', 'MANUTENTION', 'AUTRE');

-- CreateEnum
CREATE TYPE "StatutOffre" AS ENUM ('BROUILLON', 'ENVOYEE', 'ACCEPTEE', 'REFUSEE', 'EXPIREE', 'TRANSFORMEE', 'ANNULEE');

-- CreateEnum
CREATE TYPE "StatutProforma" AS ENUM ('BROUILLON', 'VALIDEE', 'ENVOYEE', 'ACCEPTEE', 'TRANSFORMEE', 'EXPIREE', 'ANNULEE');

-- CreateEnum
CREATE TYPE "TypeFacture" AS ENUM ('FACTURE', 'AVOIR', 'PROFORMA', 'DUPLICATA', 'DIVERSE');

-- CreateEnum
CREATE TYPE "StatutFacture" AS ENUM ('BROUILLON', 'VALIDEE', 'ENVOYEE', 'PARTIELLEMENT_PAYEE', 'PAYEE', 'EN_RETARD', 'ANNULEE', 'CONTENTIEUX');

-- CreateEnum
CREATE TYPE "ModePaiement" AS ENUM ('ESPECES', 'CHEQUE', 'VIREMENT', 'TRAITE', 'MOBILE_MONEY', 'ORANGE_MONEY', 'MTN_MONEY', 'WAVE', 'MOOV_MONEY', 'CARTE_BANCAIRE', 'COMPENSATION');

-- CreateEnum
CREATE TYPE "StatutPaiement" AS ENUM ('EN_ATTENTE', 'VALIDE', 'REJETE', 'ANNULE');

-- CreateEnum
CREATE TYPE "TypeCompte" AS ENUM ('BILAN', 'GESTION', 'HORS_BILAN');

-- CreateEnum
CREATE TYPE "NatureCompte" AS ENUM ('ACTIF', 'PASSIF', 'CHARGE', 'PRODUIT');

-- CreateEnum
CREATE TYPE "SensCompte" AS ENUM ('DEBITEUR', 'CREDITEUR');

-- CreateEnum
CREATE TYPE "TypeJournal" AS ENUM ('ACHAT', 'VENTE', 'BANQUE', 'CAISSE', 'OD', 'SITUATION', 'TRESORERIE');

-- CreateEnum
CREATE TYPE "TypeOperationFin" AS ENUM ('ENCAISSEMENT', 'DECAISSEMENT', 'VIREMENT_INTERNE', 'DOTATION', 'RETRAIT');

-- CreateEnum
CREATE TYPE "SensOperation" AS ENUM ('ENTREE', 'SORTIE');

-- CreateEnum
CREATE TYPE "StatutAT" AS ENUM ('ACTIVE', 'EXPIREE', 'RENOUVELEE', 'APUREE', 'ANNULEE', 'EN_CONTENTIEUX');

-- CreateEnum
CREATE TYPE "TypeCaution" AS ENUM ('DOUANIERE', 'BANCAIRE', 'PROVISOIRE', 'DEFINITIVE', 'SOUMISSION', 'BONNE_EXECUTION');

-- CreateEnum
CREATE TYPE "StatutCaution" AS ENUM ('NON_DEPOSEE', 'DEPOSEE', 'RESTITUEE', 'EXPIREE', 'SAISIE');

-- CreateEnum
CREATE TYPE "TypeCourrier" AS ENUM ('ENTRANT', 'SORTANT', 'INTERNE');

-- CreateEnum
CREATE TYPE "Priorite" AS ENUM ('BASSE', 'NORMALE', 'HAUTE', 'URGENTE');

-- CreateEnum
CREATE TYPE "StatutCourrier" AS ENUM ('BROUILLON', 'ENVOYE', 'RECU', 'TRAITE', 'ARCHIVE', 'ANNULE');

-- CreateEnum
CREATE TYPE "CategorieDocument" AS ENUM ('BL', 'FACTURE_COMMERCIALE', 'PACKING_LIST', 'CERTIFICAT_ORIGINE', 'CERTIFICAT_CONFORMITE', 'DECLARATION_DOUANE', 'BON_LIVRAISON', 'CONNAISSEMENT', 'LETTRE_VOITURE', 'ASSURANCE', 'LICENCE_IMPORT', 'LICENCE_EXPORT', 'AUTORISATION', 'CONTRAT', 'CORRESPONDANCE', 'PHOTO', 'AUTRE');

-- CreateEnum
CREATE TYPE "TypeNotification" AS ENUM ('INFO', 'ALERTE', 'AVERTISSEMENT', 'ERREUR', 'SUCCES', 'RAPPEL', 'ECHEANCE', 'PAIEMENT', 'AT_EXPIRATION', 'CAUTION_EXPIRATION', 'DOSSIER_STATUT', 'FACTURE', 'COURRIER');

-- CreateEnum
CREATE TYPE "CanalNotification" AS ENUM ('APP', 'EMAIL', 'SMS', 'WHATSAPP', 'PUSH');

-- CreateEnum
CREATE TYPE "OperateurMobileMoney" AS ENUM ('ORANGE_MONEY', 'MTN_MONEY', 'WAVE', 'MOOV_MONEY');

-- CreateEnum
CREATE TYPE "TypeTransactionMM" AS ENUM ('PAIEMENT', 'ENCAISSEMENT', 'REMBOURSEMENT');

-- CreateEnum
CREATE TYPE "StatutTransactionMM" AS ENUM ('EN_ATTENTE', 'CONFIRMEE', 'ECHOUEE', 'ANNULEE', 'EXPIREE');

-- CreateTable
CREATE TABLE "societes" (
    "id" TEXT NOT NULL,
    "code" VARCHAR(20) NOT NULL,
    "raisonSociale" VARCHAR(200) NOT NULL,
    "formeJuridique" VARCHAR(50),
    "capital" DECIMAL(18,2),
    "rccm" VARCHAR(50),
    "ncc" VARCHAR(50),
    "regime" VARCHAR(50),
    "adresse" VARCHAR(500),
    "ville" VARCHAR(100),
    "pays" VARCHAR(100) NOT NULL DEFAULT 'Côte d''Ivoire',
    "telephone" VARCHAR(50),
    "mobile" VARCHAR(50),
    "email" VARCHAR(200),
    "siteWeb" VARCHAR(200),
    "logo" TEXT,
    "devise" VARCHAR(10) NOT NULL DEFAULT 'XOF',
    "tauxTVA" DECIMAL(5,2) NOT NULL DEFAULT 18,
    "timbreFiscal" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "exerciceDebut" INTEGER NOT NULL DEFAULT 1,
    "exerciceFin" INTEGER NOT NULL DEFAULT 12,
    "smtpHost" VARCHAR(200),
    "smtpPort" INTEGER,
    "smtpUser" VARCHAR(200),
    "smtpPass" VARCHAR(200),
    "smtpSecure" BOOLEAN NOT NULL DEFAULT true,
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "societes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agences" (
    "id" TEXT NOT NULL,
    "societeId" TEXT NOT NULL,
    "code" VARCHAR(20) NOT NULL,
    "nom" VARCHAR(200) NOT NULL,
    "adresse" VARCHAR(500),
    "ville" VARCHAR(100),
    "telephone" VARCHAR(50),
    "email" VARCHAR(200),
    "responsable" VARCHAR(200),
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "agences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "utilisateurs" (
    "id" TEXT NOT NULL,
    "societeId" TEXT NOT NULL,
    "agenceId" TEXT,
    "matricule" VARCHAR(50) NOT NULL,
    "nom" VARCHAR(100) NOT NULL,
    "prenom" VARCHAR(100) NOT NULL,
    "email" VARCHAR(200) NOT NULL,
    "telephone" VARCHAR(50),
    "motDePasse" VARCHAR(255) NOT NULL,
    "avatar" TEXT,
    "doubleAuth" BOOLEAN NOT NULL DEFAULT false,
    "secretDoubleAuth" VARCHAR(255),
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "verrouille" BOOLEAN NOT NULL DEFAULT false,
    "tentativesEchouees" INTEGER NOT NULL DEFAULT 0,
    "derniereConnexion" TIMESTAMP(3),
    "expirationMdp" TIMESTAMP(3),
    "doitChangerMdp" BOOLEAN NOT NULL DEFAULT false,
    "tokenReset" VARCHAR(255),
    "tokenResetExpire" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "profilId" TEXT,

    CONSTRAINT "utilisateurs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "profils" (
    "id" TEXT NOT NULL,
    "code" VARCHAR(50) NOT NULL,
    "nom" VARCHAR(100) NOT NULL,
    "description" VARCHAR(500),
    "estAdmin" BOOLEAN NOT NULL DEFAULT false,
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "profils_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "permissions" (
    "id" TEXT NOT NULL,
    "module" VARCHAR(100) NOT NULL,
    "action" VARCHAR(100) NOT NULL,
    "libelle" VARCHAR(200) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "profils_permissions" (
    "id" TEXT NOT NULL,
    "profilId" TEXT NOT NULL,
    "permissionId" TEXT NOT NULL,

    CONSTRAINT "profils_permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" TEXT NOT NULL,
    "utilisateurId" TEXT NOT NULL,
    "token" VARCHAR(500) NOT NULL,
    "ipAdresse" VARCHAR(50),
    "userAgent" VARCHAR(500),
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "historique_connexions" (
    "id" TEXT NOT NULL,
    "utilisateurId" TEXT NOT NULL,
    "ipAdresse" VARCHAR(50),
    "userAgent" VARCHAR(500),
    "statut" VARCHAR(20) NOT NULL,
    "motif" VARCHAR(200),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "historique_connexions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "journal_audit" (
    "id" TEXT NOT NULL,
    "utilisateurId" TEXT,
    "action" VARCHAR(100) NOT NULL,
    "module" VARCHAR(100) NOT NULL,
    "entite" VARCHAR(100),
    "entiteId" VARCHAR(100),
    "donneesAvant" JSONB,
    "donneesApres" JSONB,
    "ipAdresse" VARCHAR(50),
    "userAgent" VARCHAR(500),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "journal_audit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dossiers" (
    "id" TEXT NOT NULL,
    "societeId" TEXT NOT NULL,
    "agenceId" TEXT,
    "createurId" TEXT NOT NULL,
    "agentId" TEXT,
    "numero" VARCHAR(50) NOT NULL,
    "annee" INTEGER NOT NULL,
    "nature" "NatureDossier" NOT NULL,
    "type" "TypeDossier" NOT NULL,
    "statut" "StatutDossier" NOT NULL DEFAULT 'NOUVEAU',
    "clientId" TEXT NOT NULL,
    "referenceClient" VARCHAR(100),
    "compagnieMaritime" VARCHAR(200),
    "navire" VARCHAR(200),
    "voyage" VARCHAR(100),
    "numeroBL" VARCHAR(100),
    "portOrigine" VARCHAR(200),
    "portDestination" VARCHAR(200),
    "dateArrivee" TIMESTAMP(3),
    "dateDepart" TIMESTAMP(3),
    "designation" TEXT,
    "poidsBrut" DECIMAL(18,3),
    "poidsNet" DECIMAL(18,3),
    "volume" DECIMAL(18,3),
    "nombreColis" INTEGER,
    "emballage" VARCHAR(100),
    "valeurFOB" DECIMAL(18,2),
    "fret" DECIMAL(18,2),
    "assurance" DECIMAL(18,2),
    "valeurCAF" DECIMAL(18,2),
    "incoterm" VARCHAR(10),
    "devise" VARCHAR(10) NOT NULL DEFAULT 'XOF',
    "tauxChange" DECIMAL(18,6) NOT NULL DEFAULT 1,
    "numeroDeclaration" VARCHAR(100),
    "dateDeclaration" TIMESTAMP(3),
    "regimeDouanier" VARCHAR(100),
    "bureauDouane" VARCHAR(200),
    "positionTarifaire" VARCHAR(50),
    "droitDouane" DECIMAL(18,2),
    "tva" DECIMAL(18,2),
    "autresTaxes" DECIMAL(18,2),
    "totalDroits" DECIMAL(18,2),
    "dateLivraison" TIMESTAMP(3),
    "lieuLivraison" VARCHAR(500),
    "bonLivraison" VARCHAR(100),
    "admissionTemporaireId" TEXT,
    "observations" TEXT,
    "dateCreation" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dateModification" TIMESTAMP(3) NOT NULL,
    "dateCloture" TIMESTAMP(3),
    "dateAnnulation" TIMESTAMP(3),
    "motifAnnulation" VARCHAR(500),

    CONSTRAINT "dossiers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "conteneurs" (
    "id" TEXT NOT NULL,
    "dossierId" TEXT NOT NULL,
    "numero" VARCHAR(50) NOT NULL,
    "type" VARCHAR(20),
    "taille" VARCHAR(10),
    "poids" DECIMAL(18,3),
    "scelle" VARCHAR(50),
    "etat" VARCHAR(50),

    CONSTRAINT "conteneurs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "historique_dossiers" (
    "id" TEXT NOT NULL,
    "dossierId" TEXT NOT NULL,
    "action" VARCHAR(100) NOT NULL,
    "statutAvant" "StatutDossier",
    "statutApres" "StatutDossier",
    "commentaire" TEXT,
    "utilisateur" VARCHAR(200),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "historique_dossiers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clients" (
    "id" TEXT NOT NULL,
    "societeId" TEXT NOT NULL,
    "code" VARCHAR(20) NOT NULL,
    "type" "TypeClient" NOT NULL DEFAULT 'ENTREPRISE',
    "raisonSociale" VARCHAR(200) NOT NULL,
    "sigle" VARCHAR(50),
    "ncc" VARCHAR(50),
    "rccm" VARCHAR(50),
    "regimeFiscal" VARCHAR(50),
    "adresse" VARCHAR(500),
    "ville" VARCHAR(100),
    "pays" VARCHAR(100) NOT NULL DEFAULT 'Côte d''Ivoire',
    "telephone" VARCHAR(50),
    "mobile" VARCHAR(50),
    "email" VARCHAR(200),
    "siteWeb" VARCHAR(200),
    "conditionPaiement" INTEGER NOT NULL DEFAULT 30,
    "plafondCredit" DECIMAL(18,2),
    "tauxRemise" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "devise" VARCHAR(10) NOT NULL DEFAULT 'XOF',
    "exonere" BOOLEAN NOT NULL DEFAULT false,
    "bloque" BOOLEAN NOT NULL DEFAULT false,
    "motifBlocage" VARCHAR(500),
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "archive" BOOLEAN NOT NULL DEFAULT false,
    "solde" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "clients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contacts_clients" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "nom" VARCHAR(100) NOT NULL,
    "prenom" VARCHAR(100),
    "fonction" VARCHAR(100),
    "telephone" VARCHAR(50),
    "mobile" VARCHAR(50),
    "email" VARCHAR(200),
    "principal" BOOLEAN NOT NULL DEFAULT false,
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "contacts_clients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fournisseurs" (
    "id" TEXT NOT NULL,
    "societeId" TEXT NOT NULL,
    "code" VARCHAR(20) NOT NULL,
    "type" "TypeFournisseur" NOT NULL DEFAULT 'PRESTATAIRE',
    "raisonSociale" VARCHAR(200) NOT NULL,
    "sigle" VARCHAR(50),
    "ncc" VARCHAR(50),
    "rccm" VARCHAR(50),
    "adresse" VARCHAR(500),
    "ville" VARCHAR(100),
    "pays" VARCHAR(100) NOT NULL DEFAULT 'Côte d''Ivoire',
    "telephone" VARCHAR(50),
    "mobile" VARCHAR(50),
    "email" VARCHAR(200),
    "siteWeb" VARCHAR(200),
    "conditionPaiement" INTEGER NOT NULL DEFAULT 30,
    "devise" VARCHAR(10) NOT NULL DEFAULT 'XOF',
    "rib" VARCHAR(100),
    "banque" VARCHAR(200),
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "solde" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fournisseurs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contacts_fournisseurs" (
    "id" TEXT NOT NULL,
    "fournisseurId" TEXT NOT NULL,
    "nom" VARCHAR(100) NOT NULL,
    "prenom" VARCHAR(100),
    "fonction" VARCHAR(100),
    "telephone" VARCHAR(50),
    "email" VARCHAR(200),
    "principal" BOOLEAN NOT NULL DEFAULT false,
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "contacts_fournisseurs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "offres_commerciales" (
    "id" TEXT NOT NULL,
    "numero" VARCHAR(50) NOT NULL,
    "dossierId" TEXT,
    "clientId" TEXT NOT NULL,
    "dateOffre" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dateValidite" TIMESTAMP(3) NOT NULL,
    "objet" VARCHAR(500) NOT NULL,
    "description" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "statut" "StatutOffre" NOT NULL DEFAULT 'BROUILLON',
    "montantHT" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "montantTVA" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "montantTTC" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "remise" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "conditions" TEXT,
    "observations" TEXT,
    "proformaId" TEXT,
    "factureId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "offres_commerciales_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lignes_offres" (
    "id" TEXT NOT NULL,
    "offreId" TEXT NOT NULL,
    "ordre" INTEGER NOT NULL,
    "designation" VARCHAR(500) NOT NULL,
    "quantite" DECIMAL(18,3) NOT NULL DEFAULT 1,
    "unite" VARCHAR(50),
    "prixUnitaire" DECIMAL(18,2) NOT NULL,
    "montantHT" DECIMAL(18,2) NOT NULL,
    "tauxTVA" DECIMAL(5,2) NOT NULL DEFAULT 18,
    "montantTVA" DECIMAL(18,2) NOT NULL,
    "remise" DECIMAL(18,2) NOT NULL DEFAULT 0,

    CONSTRAINT "lignes_offres_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "proformas" (
    "id" TEXT NOT NULL,
    "numero" VARCHAR(50) NOT NULL,
    "dossierId" TEXT,
    "clientId" TEXT NOT NULL,
    "dateProforma" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dateValidite" TIMESTAMP(3) NOT NULL,
    "objet" VARCHAR(500),
    "statut" "StatutProforma" NOT NULL DEFAULT 'BROUILLON',
    "montantHT" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "montantTVA" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "timbreFiscal" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "montantTTC" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "remise" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "conditions" TEXT,
    "observations" TEXT,
    "factureId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "proformas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lignes_proformas" (
    "id" TEXT NOT NULL,
    "proformaId" TEXT NOT NULL,
    "ordre" INTEGER NOT NULL,
    "codePrestation" VARCHAR(50),
    "designation" VARCHAR(500) NOT NULL,
    "quantite" DECIMAL(18,3) NOT NULL DEFAULT 1,
    "unite" VARCHAR(50),
    "prixUnitaire" DECIMAL(18,2) NOT NULL,
    "montantHT" DECIMAL(18,2) NOT NULL,
    "tauxTVA" DECIMAL(5,2) NOT NULL DEFAULT 18,
    "montantTVA" DECIMAL(18,2) NOT NULL,
    "remise" DECIMAL(18,2) NOT NULL DEFAULT 0,

    CONSTRAINT "lignes_proformas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "factures" (
    "id" TEXT NOT NULL,
    "societeId" TEXT NOT NULL,
    "numero" VARCHAR(50) NOT NULL,
    "type" "TypeFacture" NOT NULL DEFAULT 'FACTURE',
    "dossierId" TEXT,
    "clientId" TEXT NOT NULL,
    "createurId" TEXT NOT NULL,
    "dateFacture" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dateEcheance" TIMESTAMP(3) NOT NULL,
    "objet" VARCHAR(500),
    "statut" "StatutFacture" NOT NULL DEFAULT 'BROUILLON',
    "montantHT" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "montantTVA" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "timbreFiscal" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "retenue" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "montantTTC" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "montantPaye" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "resteAPayer" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "remise" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "tauxTVA" DECIMAL(5,2) NOT NULL DEFAULT 18,
    "devise" VARCHAR(10) NOT NULL DEFAULT 'XOF',
    "tauxChange" DECIMAL(18,6) NOT NULL DEFAULT 1,
    "factureOrigineId" TEXT,
    "motifAvoir" VARCHAR(500),
    "qrCode" TEXT,
    "signature" TEXT,
    "conditions" TEXT,
    "observations" TEXT,
    "cheminPDF" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "factures_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lignes_factures" (
    "id" TEXT NOT NULL,
    "factureId" TEXT NOT NULL,
    "ordre" INTEGER NOT NULL,
    "codePrestation" VARCHAR(50),
    "designation" VARCHAR(500) NOT NULL,
    "quantite" DECIMAL(18,3) NOT NULL DEFAULT 1,
    "unite" VARCHAR(50),
    "prixUnitaire" DECIMAL(18,2) NOT NULL,
    "montantHT" DECIMAL(18,2) NOT NULL,
    "tauxTVA" DECIMAL(5,2) NOT NULL DEFAULT 18,
    "montantTVA" DECIMAL(18,2) NOT NULL,
    "remise" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "compteComptable" VARCHAR(20),

    CONSTRAINT "lignes_factures_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "factures_fournisseurs" (
    "id" TEXT NOT NULL,
    "numero" VARCHAR(50) NOT NULL,
    "fournisseurId" TEXT NOT NULL,
    "dossierId" TEXT,
    "dateFacture" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dateEcheance" TIMESTAMP(3) NOT NULL,
    "reference" VARCHAR(100),
    "objet" VARCHAR(500),
    "statut" "StatutFacture" NOT NULL DEFAULT 'BROUILLON',
    "montantHT" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "montantTVA" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "montantTTC" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "montantPaye" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "resteAPayer" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "observations" TEXT,
    "cheminPDF" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "factures_fournisseurs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lignes_factures_fournisseurs" (
    "id" TEXT NOT NULL,
    "factureFournisseurId" TEXT NOT NULL,
    "ordre" INTEGER NOT NULL,
    "designation" VARCHAR(500) NOT NULL,
    "quantite" DECIMAL(18,3) NOT NULL DEFAULT 1,
    "prixUnitaire" DECIMAL(18,2) NOT NULL,
    "montantHT" DECIMAL(18,2) NOT NULL,
    "tauxTVA" DECIMAL(5,2) NOT NULL DEFAULT 18,
    "montantTVA" DECIMAL(18,2) NOT NULL,

    CONSTRAINT "lignes_factures_fournisseurs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "paiements" (
    "id" TEXT NOT NULL,
    "numero" VARCHAR(50) NOT NULL,
    "clientId" TEXT,
    "datePaiement" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "montant" DECIMAL(18,2) NOT NULL,
    "modePaiement" "ModePaiement" NOT NULL,
    "reference" VARCHAR(100),
    "banque" VARCHAR(200),
    "observations" TEXT,
    "statut" "StatutPaiement" NOT NULL DEFAULT 'EN_ATTENTE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "paiements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "paiements_factures" (
    "id" TEXT NOT NULL,
    "paiementId" TEXT NOT NULL,
    "factureId" TEXT NOT NULL,
    "montant" DECIMAL(18,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "paiements_factures_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "exercices" (
    "id" TEXT NOT NULL,
    "societeId" TEXT NOT NULL,
    "code" VARCHAR(20) NOT NULL,
    "libelle" VARCHAR(200) NOT NULL,
    "dateDebut" TIMESTAMP(3) NOT NULL,
    "dateFin" TIMESTAMP(3) NOT NULL,
    "cloture" BOOLEAN NOT NULL DEFAULT false,
    "dateCloture" TIMESTAMP(3),
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "exercices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "comptes_comptables" (
    "id" TEXT NOT NULL,
    "societeId" TEXT NOT NULL,
    "numero" VARCHAR(20) NOT NULL,
    "libelle" VARCHAR(200) NOT NULL,
    "classe" INTEGER NOT NULL,
    "type" "TypeCompte" NOT NULL,
    "nature" "NatureCompte" NOT NULL,
    "sens" "SensCompte" NOT NULL DEFAULT 'DEBITEUR',
    "parent" VARCHAR(20),
    "niveau" INTEGER NOT NULL DEFAULT 1,
    "collectif" BOOLEAN NOT NULL DEFAULT false,
    "lettrable" BOOLEAN NOT NULL DEFAULT false,
    "rapprochable" BOOLEAN NOT NULL DEFAULT false,
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "comptes_comptables_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "journaux_comptables" (
    "id" TEXT NOT NULL,
    "societeId" TEXT NOT NULL,
    "code" VARCHAR(10) NOT NULL,
    "libelle" VARCHAR(200) NOT NULL,
    "type" "TypeJournal" NOT NULL,
    "compteContrepartie" VARCHAR(20),
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "journaux_comptables_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ecritures_comptables" (
    "id" TEXT NOT NULL,
    "exerciceId" TEXT NOT NULL,
    "journalId" TEXT NOT NULL,
    "numero" VARCHAR(50) NOT NULL,
    "dateEcriture" TIMESTAMP(3) NOT NULL,
    "dateSaisie" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "libelle" VARCHAR(500) NOT NULL,
    "reference" VARCHAR(100),
    "piece" VARCHAR(100),
    "factureId" TEXT,
    "paiementId" TEXT,
    "createurId" TEXT NOT NULL,
    "validee" BOOLEAN NOT NULL DEFAULT false,
    "dateValidation" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ecritures_comptables_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mouvements_comptables" (
    "id" TEXT NOT NULL,
    "ecritureId" TEXT NOT NULL,
    "compteId" TEXT NOT NULL,
    "libelle" VARCHAR(500),
    "debit" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "credit" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "lettrage" VARCHAR(20),
    "dateLettrage" TIMESTAMP(3),
    "rapprochement" VARCHAR(50),
    "dateRapprochement" TIMESTAMP(3),

    CONSTRAINT "mouvements_comptables_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "comptes_bancaires" (
    "id" TEXT NOT NULL,
    "code" VARCHAR(20) NOT NULL,
    "libelle" VARCHAR(200) NOT NULL,
    "banque" VARCHAR(200) NOT NULL,
    "rib" VARCHAR(100),
    "iban" VARCHAR(50),
    "swift" VARCHAR(20),
    "devise" VARCHAR(10) NOT NULL DEFAULT 'XOF',
    "solde" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "compteComptable" VARCHAR(20),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "comptes_bancaires_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "caisses" (
    "id" TEXT NOT NULL,
    "code" VARCHAR(20) NOT NULL,
    "libelle" VARCHAR(200) NOT NULL,
    "devise" VARCHAR(10) NOT NULL DEFAULT 'XOF',
    "solde" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "plafond" DECIMAL(18,2),
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "compteComptable" VARCHAR(20),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "caisses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "operations_financieres" (
    "id" TEXT NOT NULL,
    "numero" VARCHAR(50) NOT NULL,
    "type" "TypeOperationFin" NOT NULL,
    "sens" "SensOperation" NOT NULL,
    "compteBancaireId" TEXT,
    "caisseId" TEXT,
    "dateOperation" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "montant" DECIMAL(18,2) NOT NULL,
    "libelle" VARCHAR(500) NOT NULL,
    "reference" VARCHAR(100),
    "beneficiaire" VARCHAR(200),
    "observations" TEXT,
    "statut" VARCHAR(20) NOT NULL DEFAULT 'VALIDE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "operations_financieres_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rapprochements" (
    "id" TEXT NOT NULL,
    "compteBancaireId" TEXT NOT NULL,
    "dateBancaire" TIMESTAMP(3) NOT NULL,
    "dateComptable" TIMESTAMP(3) NOT NULL,
    "soldeReleve" DECIMAL(18,2) NOT NULL,
    "soldeComptable" DECIMAL(18,2) NOT NULL,
    "ecart" DECIMAL(18,2) NOT NULL,
    "statut" VARCHAR(20) NOT NULL DEFAULT 'EN_COURS',
    "observations" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rapprochements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "depenses" (
    "id" TEXT NOT NULL,
    "numero" VARCHAR(50) NOT NULL,
    "dossierId" TEXT,
    "fournisseurId" TEXT,
    "dateDepense" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "categorie" VARCHAR(100) NOT NULL,
    "designation" VARCHAR(500) NOT NULL,
    "montant" DECIMAL(18,2) NOT NULL,
    "modePaiement" "ModePaiement" NOT NULL,
    "reference" VARCHAR(100),
    "observations" TEXT,
    "statut" VARCHAR(20) NOT NULL DEFAULT 'VALIDE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "depenses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admissions_temporaires" (
    "id" TEXT NOT NULL,
    "numero" VARCHAR(50) NOT NULL,
    "clientId" TEXT,
    "dateCreation" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dateExpiration" TIMESTAMP(3) NOT NULL,
    "dateRenouvellement" TIMESTAMP(3),
    "dureeInitiale" INTEGER NOT NULL,
    "dureeProlongation" INTEGER,
    "typeGarantie" VARCHAR(100),
    "montantCaution" DECIMAL(18,2),
    "banqueCaution" VARCHAR(200),
    "referenceCaution" VARCHAR(100),
    "designation" VARCHAR(500) NOT NULL,
    "valeur" DECIMAL(18,2),
    "quantite" DECIMAL(18,3),
    "regimeDouanier" VARCHAR(100),
    "bureauEntree" VARCHAR(200),
    "bureauSortie" VARCHAR(200),
    "declarationEntree" VARCHAR(100),
    "dateApurement" TIMESTAMP(3),
    "montantApure" DECIMAL(18,2),
    "referenceApurement" VARCHAR(100),
    "statut" "StatutAT" NOT NULL DEFAULT 'ACTIVE',
    "observations" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "admissions_temporaires_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "alertes_at" (
    "id" TEXT NOT NULL,
    "admissionTemporaireId" TEXT NOT NULL,
    "type" VARCHAR(50) NOT NULL,
    "dateAlerte" TIMESTAMP(3) NOT NULL,
    "message" VARCHAR(500) NOT NULL,
    "envoyee" BOOLEAN NOT NULL DEFAULT false,
    "dateEnvoi" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "alertes_at_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cautions" (
    "id" TEXT NOT NULL,
    "numero" VARCHAR(50) NOT NULL,
    "type" "TypeCaution" NOT NULL,
    "fournisseurId" TEXT,
    "montant" DECIMAL(18,2) NOT NULL,
    "devise" VARCHAR(10) NOT NULL DEFAULT 'XOF',
    "banque" VARCHAR(200) NOT NULL,
    "reference" VARCHAR(100),
    "dateDepot" TIMESTAMP(3),
    "dateRestitution" TIMESTAMP(3),
    "dateExpiration" TIMESTAMP(3),
    "beneficiaire" VARCHAR(200),
    "objet" VARCHAR(500),
    "statut" "StatutCaution" NOT NULL DEFAULT 'NON_DEPOSEE',
    "observations" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cautions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "alertes_cautions" (
    "id" TEXT NOT NULL,
    "cautionId" TEXT NOT NULL,
    "type" VARCHAR(50) NOT NULL,
    "dateAlerte" TIMESTAMP(3) NOT NULL,
    "message" VARCHAR(500) NOT NULL,
    "envoyee" BOOLEAN NOT NULL DEFAULT false,
    "dateEnvoi" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "alertes_cautions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "courriers" (
    "id" TEXT NOT NULL,
    "numero" VARCHAR(50) NOT NULL,
    "type" "TypeCourrier" NOT NULL,
    "dateCreation" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dateEnvoi" TIMESTAMP(3),
    "dateReception" TIMESTAMP(3),
    "objet" VARCHAR(500) NOT NULL,
    "expediteur" VARCHAR(200),
    "destinataire" VARCHAR(200),
    "contenu" TEXT,
    "reference" VARCHAR(100),
    "priorite" "Priorite" NOT NULL DEFAULT 'NORMALE',
    "statut" "StatutCourrier" NOT NULL DEFAULT 'BROUILLON',
    "createurId" TEXT NOT NULL,
    "classement" VARCHAR(100),
    "accuseReception" BOOLEAN NOT NULL DEFAULT false,
    "dateAccuse" TIMESTAMP(3),
    "signature" TEXT,
    "cheminPDF" TEXT,
    "observations" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "courriers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pieces_jointes_courriers" (
    "id" TEXT NOT NULL,
    "courrierId" TEXT NOT NULL,
    "nom" VARCHAR(200) NOT NULL,
    "chemin" VARCHAR(500) NOT NULL,
    "taille" INTEGER NOT NULL,
    "typeMime" VARCHAR(100) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pieces_jointes_courriers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "courriers_dossiers" (
    "id" TEXT NOT NULL,
    "courrierId" TEXT NOT NULL,
    "dossierId" TEXT NOT NULL,

    CONSTRAINT "courriers_dossiers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "documents" (
    "id" TEXT NOT NULL,
    "nom" VARCHAR(200) NOT NULL,
    "nomOriginal" VARCHAR(200) NOT NULL,
    "chemin" VARCHAR(500) NOT NULL,
    "taille" INTEGER NOT NULL,
    "typeMime" VARCHAR(100) NOT NULL,
    "extension" VARCHAR(20) NOT NULL,
    "categorie" "CategorieDocument" NOT NULL,
    "description" VARCHAR(500),
    "dossierId" TEXT,
    "clientId" TEXT,
    "fournisseurId" TEXT,
    "admissionTemporaireId" TEXT,
    "cautionId" TEXT,
    "contenuOCR" TEXT,
    "ocrTraite" BOOLEAN NOT NULL DEFAULT false,
    "version" INTEGER NOT NULL DEFAULT 1,
    "versionParent" TEXT,
    "signe" BOOLEAN NOT NULL DEFAULT false,
    "signePar" VARCHAR(200),
    "dateSignature" TIMESTAMP(3),
    "qrCode" TEXT,
    "archive" BOOLEAN NOT NULL DEFAULT false,
    "tags" VARCHAR(500),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "utilisateurId" TEXT NOT NULL,
    "type" "TypeNotification" NOT NULL,
    "titre" VARCHAR(200) NOT NULL,
    "message" TEXT NOT NULL,
    "lien" VARCHAR(500),
    "module" VARCHAR(100),
    "entiteId" VARCHAR(100),
    "canal" "CanalNotification" NOT NULL DEFAULT 'APP',
    "lue" BOOLEAN NOT NULL DEFAULT false,
    "dateLecture" TIMESTAMP(3),
    "envoyee" BOOLEAN NOT NULL DEFAULT false,
    "dateEnvoi" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "numerotations" (
    "id" TEXT NOT NULL,
    "societeId" TEXT NOT NULL,
    "module" VARCHAR(50) NOT NULL,
    "prefixe" VARCHAR(20) NOT NULL,
    "suffixe" VARCHAR(20),
    "compteur" INTEGER NOT NULL DEFAULT 0,
    "longueur" INTEGER NOT NULL DEFAULT 6,
    "annuel" BOOLEAN NOT NULL DEFAULT true,
    "annee" INTEGER,
    "format" VARCHAR(100),
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "numerotations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "parametres" (
    "id" TEXT NOT NULL,
    "societeId" TEXT,
    "cle" VARCHAR(100) NOT NULL,
    "valeur" TEXT NOT NULL,
    "type" VARCHAR(20) NOT NULL DEFAULT 'STRING',
    "module" VARCHAR(50),
    "description" VARCHAR(500),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "parametres_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transactions_mobile_money" (
    "id" TEXT NOT NULL,
    "operateur" "OperateurMobileMoney" NOT NULL,
    "type" "TypeTransactionMM" NOT NULL,
    "montant" DECIMAL(18,2) NOT NULL,
    "telephone" VARCHAR(20) NOT NULL,
    "reference" VARCHAR(100) NOT NULL,
    "referenceExterne" VARCHAR(100),
    "statut" "StatutTransactionMM" NOT NULL DEFAULT 'EN_ATTENTE',
    "dateTransaction" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dateConfirmation" TIMESTAMP(3),
    "factureId" TEXT,
    "clientId" TEXT,
    "observations" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "transactions_mobile_money_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "societes_code_key" ON "societes"("code");

-- CreateIndex
CREATE UNIQUE INDEX "agences_societeId_code_key" ON "agences"("societeId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "utilisateurs_matricule_key" ON "utilisateurs"("matricule");

-- CreateIndex
CREATE UNIQUE INDEX "utilisateurs_email_key" ON "utilisateurs"("email");

-- CreateIndex
CREATE INDEX "utilisateurs_societeId_idx" ON "utilisateurs"("societeId");

-- CreateIndex
CREATE INDEX "utilisateurs_email_idx" ON "utilisateurs"("email");

-- CreateIndex
CREATE INDEX "utilisateurs_matricule_idx" ON "utilisateurs"("matricule");

-- CreateIndex
CREATE UNIQUE INDEX "profils_code_key" ON "profils"("code");

-- CreateIndex
CREATE UNIQUE INDEX "permissions_module_action_key" ON "permissions"("module", "action");

-- CreateIndex
CREATE UNIQUE INDEX "profils_permissions_profilId_permissionId_key" ON "profils_permissions"("profilId", "permissionId");

-- CreateIndex
CREATE UNIQUE INDEX "sessions_token_key" ON "sessions"("token");

-- CreateIndex
CREATE INDEX "sessions_token_idx" ON "sessions"("token");

-- CreateIndex
CREATE INDEX "sessions_utilisateurId_idx" ON "sessions"("utilisateurId");

-- CreateIndex
CREATE INDEX "historique_connexions_utilisateurId_idx" ON "historique_connexions"("utilisateurId");

-- CreateIndex
CREATE INDEX "historique_connexions_createdAt_idx" ON "historique_connexions"("createdAt");

-- CreateIndex
CREATE INDEX "journal_audit_utilisateurId_idx" ON "journal_audit"("utilisateurId");

-- CreateIndex
CREATE INDEX "journal_audit_module_idx" ON "journal_audit"("module");

-- CreateIndex
CREATE INDEX "journal_audit_action_idx" ON "journal_audit"("action");

-- CreateIndex
CREATE INDEX "journal_audit_createdAt_idx" ON "journal_audit"("createdAt");

-- CreateIndex
CREATE INDEX "journal_audit_entite_entiteId_idx" ON "journal_audit"("entite", "entiteId");

-- CreateIndex
CREATE INDEX "dossiers_societeId_idx" ON "dossiers"("societeId");

-- CreateIndex
CREATE INDEX "dossiers_clientId_idx" ON "dossiers"("clientId");

-- CreateIndex
CREATE INDEX "dossiers_statut_idx" ON "dossiers"("statut");

-- CreateIndex
CREATE INDEX "dossiers_nature_idx" ON "dossiers"("nature");

-- CreateIndex
CREATE INDEX "dossiers_annee_idx" ON "dossiers"("annee");

-- CreateIndex
CREATE INDEX "dossiers_dateCreation_idx" ON "dossiers"("dateCreation");

-- CreateIndex
CREATE INDEX "dossiers_numero_idx" ON "dossiers"("numero");

-- CreateIndex
CREATE INDEX "dossiers_numeroBL_idx" ON "dossiers"("numeroBL");

-- CreateIndex
CREATE INDEX "dossiers_numeroDeclaration_idx" ON "dossiers"("numeroDeclaration");

-- CreateIndex
CREATE UNIQUE INDEX "dossiers_societeId_numero_annee_key" ON "dossiers"("societeId", "numero", "annee");

-- CreateIndex
CREATE INDEX "conteneurs_dossierId_idx" ON "conteneurs"("dossierId");

-- CreateIndex
CREATE INDEX "conteneurs_numero_idx" ON "conteneurs"("numero");

-- CreateIndex
CREATE INDEX "historique_dossiers_dossierId_idx" ON "historique_dossiers"("dossierId");

-- CreateIndex
CREATE INDEX "historique_dossiers_createdAt_idx" ON "historique_dossiers"("createdAt");

-- CreateIndex
CREATE INDEX "clients_societeId_idx" ON "clients"("societeId");

-- CreateIndex
CREATE INDEX "clients_raisonSociale_idx" ON "clients"("raisonSociale");

-- CreateIndex
CREATE INDEX "clients_ncc_idx" ON "clients"("ncc");

-- CreateIndex
CREATE INDEX "clients_code_idx" ON "clients"("code");

-- CreateIndex
CREATE UNIQUE INDEX "clients_societeId_code_key" ON "clients"("societeId", "code");

-- CreateIndex
CREATE INDEX "contacts_clients_clientId_idx" ON "contacts_clients"("clientId");

-- CreateIndex
CREATE INDEX "fournisseurs_societeId_idx" ON "fournisseurs"("societeId");

-- CreateIndex
CREATE INDEX "fournisseurs_raisonSociale_idx" ON "fournisseurs"("raisonSociale");

-- CreateIndex
CREATE INDEX "fournisseurs_type_idx" ON "fournisseurs"("type");

-- CreateIndex
CREATE UNIQUE INDEX "fournisseurs_societeId_code_key" ON "fournisseurs"("societeId", "code");

-- CreateIndex
CREATE INDEX "contacts_fournisseurs_fournisseurId_idx" ON "contacts_fournisseurs"("fournisseurId");

-- CreateIndex
CREATE INDEX "offres_commerciales_clientId_idx" ON "offres_commerciales"("clientId");

-- CreateIndex
CREATE INDEX "offres_commerciales_numero_idx" ON "offres_commerciales"("numero");

-- CreateIndex
CREATE INDEX "offres_commerciales_statut_idx" ON "offres_commerciales"("statut");

-- CreateIndex
CREATE INDEX "lignes_offres_offreId_idx" ON "lignes_offres"("offreId");

-- CreateIndex
CREATE UNIQUE INDEX "proformas_factureId_key" ON "proformas"("factureId");

-- CreateIndex
CREATE INDEX "proformas_clientId_idx" ON "proformas"("clientId");

-- CreateIndex
CREATE INDEX "proformas_dossierId_idx" ON "proformas"("dossierId");

-- CreateIndex
CREATE INDEX "proformas_numero_idx" ON "proformas"("numero");

-- CreateIndex
CREATE INDEX "proformas_statut_idx" ON "proformas"("statut");

-- CreateIndex
CREATE INDEX "lignes_proformas_proformaId_idx" ON "lignes_proformas"("proformaId");

-- CreateIndex
CREATE INDEX "factures_societeId_idx" ON "factures"("societeId");

-- CreateIndex
CREATE INDEX "factures_clientId_idx" ON "factures"("clientId");

-- CreateIndex
CREATE INDEX "factures_dossierId_idx" ON "factures"("dossierId");

-- CreateIndex
CREATE INDEX "factures_statut_idx" ON "factures"("statut");

-- CreateIndex
CREATE INDEX "factures_dateFacture_idx" ON "factures"("dateFacture");

-- CreateIndex
CREATE INDEX "factures_dateEcheance_idx" ON "factures"("dateEcheance");

-- CreateIndex
CREATE UNIQUE INDEX "factures_societeId_numero_key" ON "factures"("societeId", "numero");

-- CreateIndex
CREATE INDEX "lignes_factures_factureId_idx" ON "lignes_factures"("factureId");

-- CreateIndex
CREATE INDEX "factures_fournisseurs_fournisseurId_idx" ON "factures_fournisseurs"("fournisseurId");

-- CreateIndex
CREATE INDEX "factures_fournisseurs_statut_idx" ON "factures_fournisseurs"("statut");

-- CreateIndex
CREATE INDEX "factures_fournisseurs_dateFacture_idx" ON "factures_fournisseurs"("dateFacture");

-- CreateIndex
CREATE INDEX "lignes_factures_fournisseurs_factureFournisseurId_idx" ON "lignes_factures_fournisseurs"("factureFournisseurId");

-- CreateIndex
CREATE INDEX "paiements_clientId_idx" ON "paiements"("clientId");

-- CreateIndex
CREATE INDEX "paiements_datePaiement_idx" ON "paiements"("datePaiement");

-- CreateIndex
CREATE INDEX "paiements_statut_idx" ON "paiements"("statut");

-- CreateIndex
CREATE UNIQUE INDEX "paiements_factures_paiementId_factureId_key" ON "paiements_factures"("paiementId", "factureId");

-- CreateIndex
CREATE INDEX "exercices_societeId_idx" ON "exercices"("societeId");

-- CreateIndex
CREATE UNIQUE INDEX "exercices_societeId_code_key" ON "exercices"("societeId", "code");

-- CreateIndex
CREATE INDEX "comptes_comptables_societeId_idx" ON "comptes_comptables"("societeId");

-- CreateIndex
CREATE INDEX "comptes_comptables_classe_idx" ON "comptes_comptables"("classe");

-- CreateIndex
CREATE INDEX "comptes_comptables_numero_idx" ON "comptes_comptables"("numero");

-- CreateIndex
CREATE UNIQUE INDEX "comptes_comptables_societeId_numero_key" ON "comptes_comptables"("societeId", "numero");

-- CreateIndex
CREATE INDEX "journaux_comptables_societeId_idx" ON "journaux_comptables"("societeId");

-- CreateIndex
CREATE UNIQUE INDEX "journaux_comptables_societeId_code_key" ON "journaux_comptables"("societeId", "code");

-- CreateIndex
CREATE INDEX "ecritures_comptables_exerciceId_idx" ON "ecritures_comptables"("exerciceId");

-- CreateIndex
CREATE INDEX "ecritures_comptables_journalId_idx" ON "ecritures_comptables"("journalId");

-- CreateIndex
CREATE INDEX "ecritures_comptables_dateEcriture_idx" ON "ecritures_comptables"("dateEcriture");

-- CreateIndex
CREATE INDEX "ecritures_comptables_numero_idx" ON "ecritures_comptables"("numero");

-- CreateIndex
CREATE INDEX "mouvements_comptables_ecritureId_idx" ON "mouvements_comptables"("ecritureId");

-- CreateIndex
CREATE INDEX "mouvements_comptables_compteId_idx" ON "mouvements_comptables"("compteId");

-- CreateIndex
CREATE INDEX "mouvements_comptables_lettrage_idx" ON "mouvements_comptables"("lettrage");

-- CreateIndex
CREATE INDEX "comptes_bancaires_code_idx" ON "comptes_bancaires"("code");

-- CreateIndex
CREATE INDEX "caisses_code_idx" ON "caisses"("code");

-- CreateIndex
CREATE INDEX "operations_financieres_compteBancaireId_idx" ON "operations_financieres"("compteBancaireId");

-- CreateIndex
CREATE INDEX "operations_financieres_caisseId_idx" ON "operations_financieres"("caisseId");

-- CreateIndex
CREATE INDEX "operations_financieres_dateOperation_idx" ON "operations_financieres"("dateOperation");

-- CreateIndex
CREATE INDEX "operations_financieres_type_idx" ON "operations_financieres"("type");

-- CreateIndex
CREATE INDEX "rapprochements_compteBancaireId_idx" ON "rapprochements"("compteBancaireId");

-- CreateIndex
CREATE INDEX "depenses_dossierId_idx" ON "depenses"("dossierId");

-- CreateIndex
CREATE INDEX "depenses_fournisseurId_idx" ON "depenses"("fournisseurId");

-- CreateIndex
CREATE INDEX "depenses_dateDepense_idx" ON "depenses"("dateDepense");

-- CreateIndex
CREATE INDEX "depenses_categorie_idx" ON "depenses"("categorie");

-- CreateIndex
CREATE INDEX "admissions_temporaires_numero_idx" ON "admissions_temporaires"("numero");

-- CreateIndex
CREATE INDEX "admissions_temporaires_statut_idx" ON "admissions_temporaires"("statut");

-- CreateIndex
CREATE INDEX "admissions_temporaires_dateExpiration_idx" ON "admissions_temporaires"("dateExpiration");

-- CreateIndex
CREATE INDEX "alertes_at_admissionTemporaireId_idx" ON "alertes_at"("admissionTemporaireId");

-- CreateIndex
CREATE INDEX "alertes_at_dateAlerte_idx" ON "alertes_at"("dateAlerte");

-- CreateIndex
CREATE INDEX "cautions_numero_idx" ON "cautions"("numero");

-- CreateIndex
CREATE INDEX "cautions_statut_idx" ON "cautions"("statut");

-- CreateIndex
CREATE INDEX "cautions_dateExpiration_idx" ON "cautions"("dateExpiration");

-- CreateIndex
CREATE INDEX "alertes_cautions_cautionId_idx" ON "alertes_cautions"("cautionId");

-- CreateIndex
CREATE INDEX "alertes_cautions_dateAlerte_idx" ON "alertes_cautions"("dateAlerte");

-- CreateIndex
CREATE INDEX "courriers_numero_idx" ON "courriers"("numero");

-- CreateIndex
CREATE INDEX "courriers_type_idx" ON "courriers"("type");

-- CreateIndex
CREATE INDEX "courriers_statut_idx" ON "courriers"("statut");

-- CreateIndex
CREATE INDEX "courriers_dateCreation_idx" ON "courriers"("dateCreation");

-- CreateIndex
CREATE INDEX "pieces_jointes_courriers_courrierId_idx" ON "pieces_jointes_courriers"("courrierId");

-- CreateIndex
CREATE UNIQUE INDEX "courriers_dossiers_courrierId_dossierId_key" ON "courriers_dossiers"("courrierId", "dossierId");

-- CreateIndex
CREATE INDEX "documents_dossierId_idx" ON "documents"("dossierId");

-- CreateIndex
CREATE INDEX "documents_clientId_idx" ON "documents"("clientId");

-- CreateIndex
CREATE INDEX "documents_categorie_idx" ON "documents"("categorie");

-- CreateIndex
CREATE INDEX "documents_createdAt_idx" ON "documents"("createdAt");

-- CreateIndex
CREATE INDEX "notifications_utilisateurId_idx" ON "notifications"("utilisateurId");

-- CreateIndex
CREATE INDEX "notifications_lue_idx" ON "notifications"("lue");

-- CreateIndex
CREATE INDEX "notifications_createdAt_idx" ON "notifications"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "numerotations_societeId_module_annee_key" ON "numerotations"("societeId", "module", "annee");

-- CreateIndex
CREATE UNIQUE INDEX "parametres_societeId_cle_key" ON "parametres"("societeId", "cle");

-- CreateIndex
CREATE INDEX "transactions_mobile_money_reference_idx" ON "transactions_mobile_money"("reference");

-- CreateIndex
CREATE INDEX "transactions_mobile_money_operateur_idx" ON "transactions_mobile_money"("operateur");

-- CreateIndex
CREATE INDEX "transactions_mobile_money_statut_idx" ON "transactions_mobile_money"("statut");

-- CreateIndex
CREATE INDEX "transactions_mobile_money_dateTransaction_idx" ON "transactions_mobile_money"("dateTransaction");

-- AddForeignKey
ALTER TABLE "agences" ADD CONSTRAINT "agences_societeId_fkey" FOREIGN KEY ("societeId") REFERENCES "societes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "utilisateurs" ADD CONSTRAINT "utilisateurs_societeId_fkey" FOREIGN KEY ("societeId") REFERENCES "societes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "utilisateurs" ADD CONSTRAINT "utilisateurs_agenceId_fkey" FOREIGN KEY ("agenceId") REFERENCES "agences"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "utilisateurs" ADD CONSTRAINT "utilisateurs_profilId_fkey" FOREIGN KEY ("profilId") REFERENCES "profils"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "profils_permissions" ADD CONSTRAINT "profils_permissions_profilId_fkey" FOREIGN KEY ("profilId") REFERENCES "profils"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "profils_permissions" ADD CONSTRAINT "profils_permissions_permissionId_fkey" FOREIGN KEY ("permissionId") REFERENCES "permissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_utilisateurId_fkey" FOREIGN KEY ("utilisateurId") REFERENCES "utilisateurs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "historique_connexions" ADD CONSTRAINT "historique_connexions_utilisateurId_fkey" FOREIGN KEY ("utilisateurId") REFERENCES "utilisateurs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "journal_audit" ADD CONSTRAINT "journal_audit_utilisateurId_fkey" FOREIGN KEY ("utilisateurId") REFERENCES "utilisateurs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dossiers" ADD CONSTRAINT "dossiers_societeId_fkey" FOREIGN KEY ("societeId") REFERENCES "societes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dossiers" ADD CONSTRAINT "dossiers_agenceId_fkey" FOREIGN KEY ("agenceId") REFERENCES "agences"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dossiers" ADD CONSTRAINT "dossiers_createurId_fkey" FOREIGN KEY ("createurId") REFERENCES "utilisateurs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dossiers" ADD CONSTRAINT "dossiers_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "utilisateurs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dossiers" ADD CONSTRAINT "dossiers_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dossiers" ADD CONSTRAINT "dossiers_admissionTemporaireId_fkey" FOREIGN KEY ("admissionTemporaireId") REFERENCES "admissions_temporaires"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conteneurs" ADD CONSTRAINT "conteneurs_dossierId_fkey" FOREIGN KEY ("dossierId") REFERENCES "dossiers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "historique_dossiers" ADD CONSTRAINT "historique_dossiers_dossierId_fkey" FOREIGN KEY ("dossierId") REFERENCES "dossiers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clients" ADD CONSTRAINT "clients_societeId_fkey" FOREIGN KEY ("societeId") REFERENCES "societes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contacts_clients" ADD CONSTRAINT "contacts_clients_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fournisseurs" ADD CONSTRAINT "fournisseurs_societeId_fkey" FOREIGN KEY ("societeId") REFERENCES "societes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contacts_fournisseurs" ADD CONSTRAINT "contacts_fournisseurs_fournisseurId_fkey" FOREIGN KEY ("fournisseurId") REFERENCES "fournisseurs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "offres_commerciales" ADD CONSTRAINT "offres_commerciales_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "offres_commerciales" ADD CONSTRAINT "offres_commerciales_dossierId_fkey" FOREIGN KEY ("dossierId") REFERENCES "dossiers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lignes_offres" ADD CONSTRAINT "lignes_offres_offreId_fkey" FOREIGN KEY ("offreId") REFERENCES "offres_commerciales"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "proformas" ADD CONSTRAINT "proformas_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "proformas" ADD CONSTRAINT "proformas_dossierId_fkey" FOREIGN KEY ("dossierId") REFERENCES "dossiers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "proformas" ADD CONSTRAINT "proformas_factureId_fkey" FOREIGN KEY ("factureId") REFERENCES "factures"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lignes_proformas" ADD CONSTRAINT "lignes_proformas_proformaId_fkey" FOREIGN KEY ("proformaId") REFERENCES "proformas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "factures" ADD CONSTRAINT "factures_societeId_fkey" FOREIGN KEY ("societeId") REFERENCES "societes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "factures" ADD CONSTRAINT "factures_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "factures" ADD CONSTRAINT "factures_dossierId_fkey" FOREIGN KEY ("dossierId") REFERENCES "dossiers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "factures" ADD CONSTRAINT "factures_createurId_fkey" FOREIGN KEY ("createurId") REFERENCES "utilisateurs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "factures" ADD CONSTRAINT "factures_factureOrigineId_fkey" FOREIGN KEY ("factureOrigineId") REFERENCES "factures"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lignes_factures" ADD CONSTRAINT "lignes_factures_factureId_fkey" FOREIGN KEY ("factureId") REFERENCES "factures"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "factures_fournisseurs" ADD CONSTRAINT "factures_fournisseurs_fournisseurId_fkey" FOREIGN KEY ("fournisseurId") REFERENCES "fournisseurs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lignes_factures_fournisseurs" ADD CONSTRAINT "lignes_factures_fournisseurs_factureFournisseurId_fkey" FOREIGN KEY ("factureFournisseurId") REFERENCES "factures_fournisseurs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "paiements" ADD CONSTRAINT "paiements_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "paiements_factures" ADD CONSTRAINT "paiements_factures_paiementId_fkey" FOREIGN KEY ("paiementId") REFERENCES "paiements"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "paiements_factures" ADD CONSTRAINT "paiements_factures_factureId_fkey" FOREIGN KEY ("factureId") REFERENCES "factures"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exercices" ADD CONSTRAINT "exercices_societeId_fkey" FOREIGN KEY ("societeId") REFERENCES "societes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comptes_comptables" ADD CONSTRAINT "comptes_comptables_societeId_fkey" FOREIGN KEY ("societeId") REFERENCES "societes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "journaux_comptables" ADD CONSTRAINT "journaux_comptables_societeId_fkey" FOREIGN KEY ("societeId") REFERENCES "societes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ecritures_comptables" ADD CONSTRAINT "ecritures_comptables_exerciceId_fkey" FOREIGN KEY ("exerciceId") REFERENCES "exercices"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ecritures_comptables" ADD CONSTRAINT "ecritures_comptables_journalId_fkey" FOREIGN KEY ("journalId") REFERENCES "journaux_comptables"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ecritures_comptables" ADD CONSTRAINT "ecritures_comptables_factureId_fkey" FOREIGN KEY ("factureId") REFERENCES "factures"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ecritures_comptables" ADD CONSTRAINT "ecritures_comptables_paiementId_fkey" FOREIGN KEY ("paiementId") REFERENCES "paiements"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ecritures_comptables" ADD CONSTRAINT "ecritures_comptables_createurId_fkey" FOREIGN KEY ("createurId") REFERENCES "utilisateurs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mouvements_comptables" ADD CONSTRAINT "mouvements_comptables_ecritureId_fkey" FOREIGN KEY ("ecritureId") REFERENCES "ecritures_comptables"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mouvements_comptables" ADD CONSTRAINT "mouvements_comptables_compteId_fkey" FOREIGN KEY ("compteId") REFERENCES "comptes_comptables"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "operations_financieres" ADD CONSTRAINT "operations_financieres_compteBancaireId_fkey" FOREIGN KEY ("compteBancaireId") REFERENCES "comptes_bancaires"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "operations_financieres" ADD CONSTRAINT "operations_financieres_caisseId_fkey" FOREIGN KEY ("caisseId") REFERENCES "caisses"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rapprochements" ADD CONSTRAINT "rapprochements_compteBancaireId_fkey" FOREIGN KEY ("compteBancaireId") REFERENCES "comptes_bancaires"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "depenses" ADD CONSTRAINT "depenses_dossierId_fkey" FOREIGN KEY ("dossierId") REFERENCES "dossiers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "depenses" ADD CONSTRAINT "depenses_fournisseurId_fkey" FOREIGN KEY ("fournisseurId") REFERENCES "fournisseurs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alertes_at" ADD CONSTRAINT "alertes_at_admissionTemporaireId_fkey" FOREIGN KEY ("admissionTemporaireId") REFERENCES "admissions_temporaires"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cautions" ADD CONSTRAINT "cautions_fournisseurId_fkey" FOREIGN KEY ("fournisseurId") REFERENCES "fournisseurs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alertes_cautions" ADD CONSTRAINT "alertes_cautions_cautionId_fkey" FOREIGN KEY ("cautionId") REFERENCES "cautions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "courriers" ADD CONSTRAINT "courriers_createurId_fkey" FOREIGN KEY ("createurId") REFERENCES "utilisateurs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pieces_jointes_courriers" ADD CONSTRAINT "pieces_jointes_courriers_courrierId_fkey" FOREIGN KEY ("courrierId") REFERENCES "courriers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "courriers_dossiers" ADD CONSTRAINT "courriers_dossiers_courrierId_fkey" FOREIGN KEY ("courrierId") REFERENCES "courriers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "courriers_dossiers" ADD CONSTRAINT "courriers_dossiers_dossierId_fkey" FOREIGN KEY ("dossierId") REFERENCES "dossiers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_dossierId_fkey" FOREIGN KEY ("dossierId") REFERENCES "dossiers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_fournisseurId_fkey" FOREIGN KEY ("fournisseurId") REFERENCES "fournisseurs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_admissionTemporaireId_fkey" FOREIGN KEY ("admissionTemporaireId") REFERENCES "admissions_temporaires"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_cautionId_fkey" FOREIGN KEY ("cautionId") REFERENCES "cautions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_utilisateurId_fkey" FOREIGN KEY ("utilisateurId") REFERENCES "utilisateurs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "numerotations" ADD CONSTRAINT "numerotations_societeId_fkey" FOREIGN KEY ("societeId") REFERENCES "societes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "parametres" ADD CONSTRAINT "parametres_societeId_fkey" FOREIGN KEY ("societeId") REFERENCES "societes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

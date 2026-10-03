-- Fondations SaaS : formules d'abonnement, abonnement par societe, paiements PawaPay,
-- sous-domaine par tenant, et comptes super-admin de la plateforme (distincts des
-- comptes Utilisateur de chaque societe cliente).

-- CreateEnum
CREATE TYPE "StatutAbonnement" AS ENUM ('ESSAI', 'ACTIF', 'IMPAYE', 'SUSPENDU', 'ANNULE', 'EXPIRE');

-- CreateEnum
CREATE TYPE "Periodicite" AS ENUM ('MENSUEL', 'ANNUEL');

-- CreateEnum
CREATE TYPE "StatutPaiementAbonnement" AS ENUM ('EN_ATTENTE', 'REUSSI', 'ECHEC', 'ANNULE');

-- AlterTable
ALTER TABLE "societes" ADD COLUMN     "sousDomaine" VARCHAR(63);

-- CreateTable
CREATE TABLE "plans" (
    "id" TEXT NOT NULL,
    "code" VARCHAR(30) NOT NULL,
    "nom" VARCHAR(100) NOT NULL,
    "description" TEXT,
    "prixMensuel" DECIMAL(12,2) NOT NULL,
    "prixAnnuel" DECIMAL(12,2),
    "devise" VARCHAR(10) NOT NULL DEFAULT 'XOF',
    "maxUtilisateurs" INTEGER,
    "maxDossiersParMois" INTEGER,
    "fonctionnalites" JSONB,
    "essaiJours" INTEGER NOT NULL DEFAULT 14,
    "misEnAvant" BOOLEAN NOT NULL DEFAULT false,
    "ordre" INTEGER NOT NULL DEFAULT 0,
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "abonnements" (
    "id" TEXT NOT NULL,
    "societeId" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "statut" "StatutAbonnement" NOT NULL DEFAULT 'ESSAI',
    "periodicite" "Periodicite" NOT NULL DEFAULT 'MENSUEL',
    "dateDebut" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dateFinEssai" TIMESTAMP(3),
    "dateProchainPaiement" TIMESTAMP(3),
    "dateFin" TIMESTAMP(3),
    "renouvellementAuto" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "abonnements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "paiements_abonnements" (
    "id" TEXT NOT NULL,
    "abonnementId" TEXT NOT NULL,
    "societeId" TEXT NOT NULL,
    "montant" DECIMAL(12,2) NOT NULL,
    "devise" VARCHAR(10) NOT NULL DEFAULT 'XOF',
    "statut" "StatutPaiementAbonnement" NOT NULL DEFAULT 'EN_ATTENTE',
    "fournisseur" VARCHAR(30) NOT NULL DEFAULT 'PAWAPAY',
    "referenceExterne" VARCHAR(100),
    "moyenPaiement" VARCHAR(30),
    "numeroTelephone" VARCHAR(30),
    "payloadBrut" JSONB,
    "datePaiement" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "paiements_abonnements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "platform_admins" (
    "id" TEXT NOT NULL,
    "email" VARCHAR(200) NOT NULL,
    "motDePasse" VARCHAR(255) NOT NULL,
    "nom" VARCHAR(100) NOT NULL,
    "prenom" VARCHAR(100) NOT NULL,
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "platform_admins_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "plans_code_key" ON "plans"("code");

-- CreateIndex
CREATE UNIQUE INDEX "abonnements_societeId_key" ON "abonnements"("societeId");

-- CreateIndex
CREATE INDEX "paiements_abonnements_societeId_idx" ON "paiements_abonnements"("societeId");

-- CreateIndex
CREATE INDEX "paiements_abonnements_referenceExterne_idx" ON "paiements_abonnements"("referenceExterne");

-- CreateIndex
CREATE UNIQUE INDEX "platform_admins_email_key" ON "platform_admins"("email");

-- CreateIndex
CREATE UNIQUE INDEX "societes_sousDomaine_key" ON "societes"("sousDomaine");

-- AddForeignKey
ALTER TABLE "abonnements" ADD CONSTRAINT "abonnements_societeId_fkey" FOREIGN KEY ("societeId") REFERENCES "societes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "abonnements" ADD CONSTRAINT "abonnements_planId_fkey" FOREIGN KEY ("planId") REFERENCES "plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "paiements_abonnements" ADD CONSTRAINT "paiements_abonnements_abonnementId_fkey" FOREIGN KEY ("abonnementId") REFERENCES "abonnements"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "paiements_abonnements" ADD CONSTRAINT "paiements_abonnements_societeId_fkey" FOREIGN KEY ("societeId") REFERENCES "societes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

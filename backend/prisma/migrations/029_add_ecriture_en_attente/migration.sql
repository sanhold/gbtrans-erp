-- CreateEnum
CREATE TYPE "StatutEcritureAttente" AS ENUM ('EN_ATTENTE', 'COMPTABILISEE', 'REJETEE');

-- CreateEnum
CREATE TYPE "SourceEcritureAttente" AS ENUM ('FACTURE', 'FACTURE_FOURNISSEUR', 'PAIEMENT', 'PAIEMENT_FOURNISSEUR', 'DEPENSE', 'MANUEL');

-- CreateTable
CREATE TABLE "ecritures_en_attente" (
    "id" TEXT NOT NULL,
    "societeId" TEXT NOT NULL,
    "source" "SourceEcritureAttente" NOT NULL,
    "factureId" TEXT,
    "factureFournisseurId" TEXT,
    "paiementId" TEXT,
    "paiementFournisseurId" TEXT,
    "depenseId" TEXT,
    "libelle" VARCHAR(500) NOT NULL,
    "montant" DECIMAL(18,2) NOT NULL,
    "dateOperation" TIMESTAMP(3) NOT NULL,
    "statut" "StatutEcritureAttente" NOT NULL DEFAULT 'EN_ATTENTE',
    "ecritureId" TEXT,
    "motifRejet" VARCHAR(500),
    "createurNom" VARCHAR(200),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ecritures_en_attente_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ecritures_en_attente_societeId_idx" ON "ecritures_en_attente"("societeId");

-- CreateIndex
CREATE INDEX "ecritures_en_attente_statut_idx" ON "ecritures_en_attente"("statut");

-- AddForeignKey
ALTER TABLE "ecritures_en_attente" ADD CONSTRAINT "ecritures_en_attente_societeId_fkey" FOREIGN KEY ("societeId") REFERENCES "societes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ecritures_en_attente" ADD CONSTRAINT "ecritures_en_attente_factureId_fkey" FOREIGN KEY ("factureId") REFERENCES "factures"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ecritures_en_attente" ADD CONSTRAINT "ecritures_en_attente_factureFournisseurId_fkey" FOREIGN KEY ("factureFournisseurId") REFERENCES "factures_fournisseurs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ecritures_en_attente" ADD CONSTRAINT "ecritures_en_attente_paiementId_fkey" FOREIGN KEY ("paiementId") REFERENCES "paiements"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ecritures_en_attente" ADD CONSTRAINT "ecritures_en_attente_paiementFournisseurId_fkey" FOREIGN KEY ("paiementFournisseurId") REFERENCES "paiements_fournisseurs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ecritures_en_attente" ADD CONSTRAINT "ecritures_en_attente_depenseId_fkey" FOREIGN KEY ("depenseId") REFERENCES "depenses"("id") ON DELETE SET NULL ON UPDATE CASCADE;

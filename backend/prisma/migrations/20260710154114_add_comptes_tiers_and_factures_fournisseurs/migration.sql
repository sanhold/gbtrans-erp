-- AlterTable
ALTER TABLE "factures_fournisseurs" ADD COLUMN     "createurId" TEXT NOT NULL,
ADD COLUMN     "societeId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "operations_financieres" ADD COLUMN     "compteTiersId" TEXT;

-- CreateTable
CREATE TABLE "paiements_fournisseurs" (
    "id" TEXT NOT NULL,
    "societeId" TEXT NOT NULL,
    "numero" VARCHAR(50) NOT NULL,
    "fournisseurId" TEXT,
    "datePaiement" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "montant" DECIMAL(18,2) NOT NULL,
    "modePaiement" "ModePaiement" NOT NULL,
    "reference" VARCHAR(100),
    "banque" VARCHAR(200),
    "observations" TEXT,
    "statut" "StatutPaiement" NOT NULL DEFAULT 'EN_ATTENTE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "paiements_fournisseurs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "paiements_factures_fournisseurs" (
    "id" TEXT NOT NULL,
    "paiementFournisseurId" TEXT NOT NULL,
    "factureFournisseurId" TEXT NOT NULL,
    "montant" DECIMAL(18,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "paiements_factures_fournisseurs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "comptes_tiers" (
    "id" TEXT NOT NULL,
    "societeId" TEXT NOT NULL,
    "code" VARCHAR(20) NOT NULL,
    "libelle" VARCHAR(200) NOT NULL,
    "type" VARCHAR(50) NOT NULL,
    "devise" VARCHAR(10) NOT NULL DEFAULT 'XOF',
    "solde" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "compteComptable" VARCHAR(20),
    "observations" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "comptes_tiers_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "paiements_fournisseurs_societeId_idx" ON "paiements_fournisseurs"("societeId");

-- CreateIndex
CREATE INDEX "paiements_fournisseurs_fournisseurId_idx" ON "paiements_fournisseurs"("fournisseurId");

-- CreateIndex
CREATE UNIQUE INDEX "paiements_factures_fournisseurs_paiementFournisseurId_factu_key" ON "paiements_factures_fournisseurs"("paiementFournisseurId", "factureFournisseurId");

-- CreateIndex
CREATE INDEX "comptes_tiers_societeId_idx" ON "comptes_tiers"("societeId");

-- CreateIndex
CREATE INDEX "comptes_tiers_type_idx" ON "comptes_tiers"("type");

-- CreateIndex
CREATE UNIQUE INDEX "comptes_tiers_societeId_code_key" ON "comptes_tiers"("societeId", "code");

-- CreateIndex
CREATE INDEX "factures_fournisseurs_societeId_idx" ON "factures_fournisseurs"("societeId");

-- CreateIndex
CREATE INDEX "factures_fournisseurs_dossierId_idx" ON "factures_fournisseurs"("dossierId");

-- CreateIndex
CREATE UNIQUE INDEX "factures_fournisseurs_societeId_numero_key" ON "factures_fournisseurs"("societeId", "numero");

-- CreateIndex
CREATE INDEX "operations_financieres_compteTiersId_idx" ON "operations_financieres"("compteTiersId");

-- AddForeignKey
ALTER TABLE "factures_fournisseurs" ADD CONSTRAINT "factures_fournisseurs_societeId_fkey" FOREIGN KEY ("societeId") REFERENCES "societes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "factures_fournisseurs" ADD CONSTRAINT "factures_fournisseurs_dossierId_fkey" FOREIGN KEY ("dossierId") REFERENCES "dossiers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "factures_fournisseurs" ADD CONSTRAINT "factures_fournisseurs_createurId_fkey" FOREIGN KEY ("createurId") REFERENCES "utilisateurs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "paiements_fournisseurs" ADD CONSTRAINT "paiements_fournisseurs_societeId_fkey" FOREIGN KEY ("societeId") REFERENCES "societes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "paiements_fournisseurs" ADD CONSTRAINT "paiements_fournisseurs_fournisseurId_fkey" FOREIGN KEY ("fournisseurId") REFERENCES "fournisseurs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "paiements_factures_fournisseurs" ADD CONSTRAINT "paiements_factures_fournisseurs_paiementFournisseurId_fkey" FOREIGN KEY ("paiementFournisseurId") REFERENCES "paiements_fournisseurs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "paiements_factures_fournisseurs" ADD CONSTRAINT "paiements_factures_fournisseurs_factureFournisseurId_fkey" FOREIGN KEY ("factureFournisseurId") REFERENCES "factures_fournisseurs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "operations_financieres" ADD CONSTRAINT "operations_financieres_compteTiersId_fkey" FOREIGN KEY ("compteTiersId") REFERENCES "comptes_tiers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comptes_tiers" ADD CONSTRAINT "comptes_tiers_societeId_fkey" FOREIGN KEY ("societeId") REFERENCES "societes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


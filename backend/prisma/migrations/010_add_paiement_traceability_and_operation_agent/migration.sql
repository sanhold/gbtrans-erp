-- AlterTable
ALTER TABLE "operations_financieres" ADD COLUMN     "agentId" TEXT;

-- AlterTable
ALTER TABLE "paiements" ADD COLUMN     "caisseId" TEXT,
ADD COLUMN     "compteBancaireId" TEXT,
ADD COLUMN     "createurId" TEXT;

-- AlterTable
ALTER TABLE "paiements_fournisseurs" ADD COLUMN     "caisseId" TEXT,
ADD COLUMN     "compteBancaireId" TEXT,
ADD COLUMN     "compteTiersId" TEXT,
ADD COLUMN     "createurId" TEXT;

-- CreateIndex
CREATE INDEX "operations_financieres_agentId_idx" ON "operations_financieres"("agentId");

-- CreateIndex
CREATE INDEX "paiements_caisseId_idx" ON "paiements"("caisseId");

-- CreateIndex
CREATE INDEX "paiements_compteBancaireId_idx" ON "paiements"("compteBancaireId");

-- CreateIndex
CREATE INDEX "paiements_fournisseurs_caisseId_idx" ON "paiements_fournisseurs"("caisseId");

-- CreateIndex
CREATE INDEX "paiements_fournisseurs_compteBancaireId_idx" ON "paiements_fournisseurs"("compteBancaireId");

-- CreateIndex
CREATE INDEX "paiements_fournisseurs_compteTiersId_idx" ON "paiements_fournisseurs"("compteTiersId");

-- AddForeignKey
ALTER TABLE "paiements_fournisseurs" ADD CONSTRAINT "paiements_fournisseurs_caisseId_fkey" FOREIGN KEY ("caisseId") REFERENCES "caisses"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "paiements_fournisseurs" ADD CONSTRAINT "paiements_fournisseurs_compteBancaireId_fkey" FOREIGN KEY ("compteBancaireId") REFERENCES "comptes_bancaires"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "paiements_fournisseurs" ADD CONSTRAINT "paiements_fournisseurs_compteTiersId_fkey" FOREIGN KEY ("compteTiersId") REFERENCES "comptes_tiers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "paiements_fournisseurs" ADD CONSTRAINT "paiements_fournisseurs_createurId_fkey" FOREIGN KEY ("createurId") REFERENCES "utilisateurs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "paiements" ADD CONSTRAINT "paiements_caisseId_fkey" FOREIGN KEY ("caisseId") REFERENCES "caisses"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "paiements" ADD CONSTRAINT "paiements_compteBancaireId_fkey" FOREIGN KEY ("compteBancaireId") REFERENCES "comptes_bancaires"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "paiements" ADD CONSTRAINT "paiements_createurId_fkey" FOREIGN KEY ("createurId") REFERENCES "utilisateurs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "operations_financieres" ADD CONSTRAINT "operations_financieres_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "utilisateurs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

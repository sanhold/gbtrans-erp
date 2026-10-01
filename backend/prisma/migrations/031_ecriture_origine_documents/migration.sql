-- Tracabilite des ecritures generees par Compta Auto (anti-doublons)
ALTER TABLE "ecritures_comptables" ADD COLUMN "factureFournisseurId" TEXT;
ALTER TABLE "ecritures_comptables" ADD COLUMN "paiementFournisseurId" TEXT;
ALTER TABLE "ecritures_comptables" ADD COLUMN "depenseId" TEXT;
CREATE INDEX "ecritures_comptables_factureFournisseurId_idx" ON "ecritures_comptables"("factureFournisseurId");
CREATE INDEX "ecritures_comptables_paiementFournisseurId_idx" ON "ecritures_comptables"("paiementFournisseurId");
CREATE INDEX "ecritures_comptables_depenseId_idx" ON "ecritures_comptables"("depenseId");

-- AlterTable: add societeId as nullable first (depenses has 30 existing rows)
ALTER TABLE "caisses" ADD COLUMN "societeId" TEXT;
ALTER TABLE "comptes_bancaires" ADD COLUMN "societeId" TEXT;
ALTER TABLE "operations_financieres" ADD COLUMN "societeId" TEXT;
ALTER TABLE "rapprochements" ADD COLUMN "societeId" TEXT;
ALTER TABLE "depenses" ADD COLUMN "societeId" TEXT,
ADD COLUMN "caisseId" TEXT,
ADD COLUMN "compteBancaireId" TEXT;

-- Backfill existing rows to the single existing société (GBTRANS SARL)
UPDATE "caisses" SET "societeId" = '26643732-ce49-402d-a6da-a3e6c384f66e' WHERE "societeId" IS NULL;
UPDATE "comptes_bancaires" SET "societeId" = '26643732-ce49-402d-a6da-a3e6c384f66e' WHERE "societeId" IS NULL;
UPDATE "operations_financieres" SET "societeId" = '26643732-ce49-402d-a6da-a3e6c384f66e' WHERE "societeId" IS NULL;
UPDATE "rapprochements" SET "societeId" = '26643732-ce49-402d-a6da-a3e6c384f66e' WHERE "societeId" IS NULL;
UPDATE "depenses" SET "societeId" = '26643732-ce49-402d-a6da-a3e6c384f66e' WHERE "societeId" IS NULL;

-- Now enforce NOT NULL (caisseId/compteBancaireId on depenses stay nullable)
ALTER TABLE "caisses" ALTER COLUMN "societeId" SET NOT NULL;
ALTER TABLE "comptes_bancaires" ALTER COLUMN "societeId" SET NOT NULL;
ALTER TABLE "operations_financieres" ALTER COLUMN "societeId" SET NOT NULL;
ALTER TABLE "rapprochements" ALTER COLUMN "societeId" SET NOT NULL;
ALTER TABLE "depenses" ALTER COLUMN "societeId" SET NOT NULL;

-- CreateIndex
CREATE INDEX "caisses_societeId_idx" ON "caisses"("societeId");
CREATE INDEX "comptes_bancaires_societeId_idx" ON "comptes_bancaires"("societeId");
CREATE INDEX "depenses_societeId_idx" ON "depenses"("societeId");
CREATE INDEX "depenses_caisseId_idx" ON "depenses"("caisseId");
CREATE INDEX "depenses_compteBancaireId_idx" ON "depenses"("compteBancaireId");
CREATE INDEX "operations_financieres_societeId_idx" ON "operations_financieres"("societeId");
CREATE INDEX "rapprochements_societeId_idx" ON "rapprochements"("societeId");

-- AddForeignKey
ALTER TABLE "comptes_bancaires" ADD CONSTRAINT "comptes_bancaires_societeId_fkey" FOREIGN KEY ("societeId") REFERENCES "societes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "caisses" ADD CONSTRAINT "caisses_societeId_fkey" FOREIGN KEY ("societeId") REFERENCES "societes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "operations_financieres" ADD CONSTRAINT "operations_financieres_societeId_fkey" FOREIGN KEY ("societeId") REFERENCES "societes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "rapprochements" ADD CONSTRAINT "rapprochements_societeId_fkey" FOREIGN KEY ("societeId") REFERENCES "societes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "depenses" ADD CONSTRAINT "depenses_societeId_fkey" FOREIGN KEY ("societeId") REFERENCES "societes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "depenses" ADD CONSTRAINT "depenses_caisseId_fkey" FOREIGN KEY ("caisseId") REFERENCES "caisses"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "depenses" ADD CONSTRAINT "depenses_compteBancaireId_fkey" FOREIGN KEY ("compteBancaireId") REFERENCES "comptes_bancaires"("id") ON DELETE SET NULL ON UPDATE CASCADE;

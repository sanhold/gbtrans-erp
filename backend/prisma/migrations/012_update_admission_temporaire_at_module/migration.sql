-- AlterTable
ALTER TABLE "admissions_temporaires" ADD COLUMN     "alerteJours" INTEGER DEFAULT 90,
ADD COLUMN     "dateDeclaration" TIMESTAMP(3),
ADD COLUMN     "declarant" VARCHAR(200),
ADD COLUMN     "delaiMois" INTEGER,
ADD COLUMN     "nature" VARCHAR(200),
ADD COLUMN     "societeId" TEXT;

-- Backfill existing rows onto the single société currently in use
UPDATE "admissions_temporaires" SET "societeId" = (SELECT id FROM "societes" LIMIT 1) WHERE "societeId" IS NULL;

-- Now enforce NOT NULL
ALTER TABLE "admissions_temporaires" ALTER COLUMN "societeId" SET NOT NULL;

-- CreateIndex
CREATE INDEX "admissions_temporaires_societeId_idx" ON "admissions_temporaires"("societeId");

-- AddForeignKey
ALTER TABLE "admissions_temporaires" ADD CONSTRAINT "admissions_temporaires_societeId_fkey" FOREIGN KEY ("societeId") REFERENCES "societes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admissions_temporaires" ADD CONSTRAINT "admissions_temporaires_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE SET NULL ON UPDATE CASCADE;

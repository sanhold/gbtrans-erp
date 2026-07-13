-- Le modèle Caution change de sens (garantie douane/banque -> dépôt conteneur compagnie maritime).
-- Données de démonstration uniquement (10 lignes) : on vide la table avant de changer l'enum/les colonnes NOT NULL.
UPDATE "documents" SET "cautionId" = NULL WHERE "cautionId" IS NOT NULL;
DELETE FROM "alertes_cautions";
DELETE FROM "cautions";

-- AlterEnum
BEGIN;
CREATE TYPE "StatutCaution_new" AS ENUM ('NON_ACTIVE', 'EN_ATTENTE', 'PAYEE');
ALTER TABLE "cautions" ALTER COLUMN "statut" DROP DEFAULT;
ALTER TABLE "cautions" ALTER COLUMN "statut" TYPE "StatutCaution_new" USING ("statut"::text::"StatutCaution_new");
ALTER TYPE "StatutCaution" RENAME TO "StatutCaution_old";
ALTER TYPE "StatutCaution_new" RENAME TO "StatutCaution";
DROP TYPE "StatutCaution_old";
ALTER TABLE "cautions" ALTER COLUMN "statut" SET DEFAULT 'EN_ATTENTE';
COMMIT;

-- DropForeignKey
ALTER TABLE "alertes_cautions" DROP CONSTRAINT "alertes_cautions_cautionId_fkey";

-- DropForeignKey
ALTER TABLE "cautions" DROP CONSTRAINT "cautions_fournisseurId_fkey";

-- DropIndex
DROP INDEX "cautions_dateExpiration_idx";

-- DropIndex
DROP INDEX "cautions_numero_idx";

-- AlterTable
ALTER TABLE "cautions" DROP COLUMN "banque",
DROP COLUMN "beneficiaire",
DROP COLUMN "dateDepot",
DROP COLUMN "dateExpiration",
DROP COLUMN "dateRestitution",
DROP COLUMN "devise",
DROP COLUMN "fournisseurId",
DROP COLUMN "objet",
DROP COLUMN "reference",
DROP COLUMN "type",
ADD COLUMN     "clientId" TEXT,
ADD COLUMN     "compagnie" VARCHAR(100),
ADD COLUMN     "dateCaution" TIMESTAMP(3),
ADD COLUMN     "dateDepotCourrier" TIMESTAMP(3),
ADD COLUMN     "datePaiement" TIMESTAMP(3),
ADD COLUMN     "dossierId" TEXT,
ADD COLUMN     "numeroBL" VARCHAR(100),
ADD COLUMN     "quantite" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "societeId" TEXT NOT NULL,
DROP COLUMN "numero",
ADD COLUMN     "numero" SERIAL NOT NULL,
ALTER COLUMN "statut" SET DEFAULT 'EN_ATTENTE';

-- DropTable
DROP TABLE "alertes_cautions";

-- DropEnum
DROP TYPE "TypeCaution";

-- CreateIndex
CREATE UNIQUE INDEX "cautions_numero_key" ON "cautions"("numero");

-- CreateIndex
CREATE INDEX "cautions_societeId_idx" ON "cautions"("societeId");

-- CreateIndex
CREATE INDEX "cautions_dossierId_idx" ON "cautions"("dossierId");

-- CreateIndex
CREATE INDEX "cautions_clientId_idx" ON "cautions"("clientId");

-- AddForeignKey
ALTER TABLE "cautions" ADD CONSTRAINT "cautions_societeId_fkey" FOREIGN KEY ("societeId") REFERENCES "societes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cautions" ADD CONSTRAINT "cautions_dossierId_fkey" FOREIGN KEY ("dossierId") REFERENCES "dossiers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cautions" ADD CONSTRAINT "cautions_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE SET NULL ON UPDATE CASCADE;


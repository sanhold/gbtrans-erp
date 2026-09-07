-- AlterTable
ALTER TABLE "etapes_dossiers" ADD COLUMN     "description" VARCHAR(500),
ADD COLUMN     "nom" VARCHAR(200),
ADD COLUMN     "obligatoire" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "ordre" INTEGER NOT NULL DEFAULT 0,
ALTER COLUMN "etapeProcessusId" DROP NOT NULL;

-- Backfill ordre for existing rows from their template step's ordre
UPDATE "etapes_dossiers" ed
SET "ordre" = ep."ordre"
FROM "etapes_processus" ep
WHERE ed."etapeProcessusId" = ep.id;

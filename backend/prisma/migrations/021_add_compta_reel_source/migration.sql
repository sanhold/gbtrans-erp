-- CreateEnum
CREATE TYPE "SourceCompta" AS ENUM ('AUTO', 'REEL');

-- AlterTable
ALTER TABLE "exercices" ADD COLUMN "source" "SourceCompta" NOT NULL DEFAULT 'AUTO';

-- DropIndex
DROP INDEX "exercices_societeId_code_key";

-- CreateIndex
CREATE UNIQUE INDEX "exercices_societeId_code_source_key" ON "exercices"("societeId", "code", "source");

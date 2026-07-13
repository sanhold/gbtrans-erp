-- AlterTable
ALTER TABLE "dossiers" ADD COLUMN     "numeroPhysique" VARCHAR(50);

-- CreateIndex
CREATE UNIQUE INDEX "dossiers_societeId_numeroPhysique_key" ON "dossiers"("societeId", "numeroPhysique");


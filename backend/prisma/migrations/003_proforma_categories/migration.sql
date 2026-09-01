-- AlterTable
ALTER TABLE "lignes_proformas" ADD COLUMN     "categorie" VARCHAR(100),
ADD COLUMN     "estTVA" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "proformas" ADD COLUMN     "assurance" DECIMAL(18,2),
ADD COLUMN     "fobUnitaire" DECIMAL(18,2),
ADD COLUMN     "fraisDivers" DECIMAL(18,2),
ADD COLUMN     "fretUnitaire" DECIMAL(18,2),
ADD COLUMN     "nombreUnites" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "titre" VARCHAR(500),
ADD COLUMN     "valeurCAF" DECIMAL(18,2);

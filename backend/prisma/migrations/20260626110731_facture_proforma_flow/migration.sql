-- AlterEnum
ALTER TYPE "StatutProforma" ADD VALUE 'EN_ATTENTE_FACTURATION';

-- AlterTable
ALTER TABLE "factures" ADD COLUMN     "acompte" DECIMAL(18,2) NOT NULL DEFAULT 0,
ADD COLUMN     "montantPrestation" DECIMAL(18,2),
ADD COLUMN     "proformaSourceId" TEXT,
ADD COLUMN     "titre" VARCHAR(500),
ADD COLUMN     "tvaPrestation" DECIMAL(18,2);

-- AlterTable
ALTER TABLE "lignes_factures" ADD COLUMN     "categorie" VARCHAR(100),
ADD COLUMN     "estTVA" BOOLEAN NOT NULL DEFAULT false;

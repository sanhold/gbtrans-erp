/*
  Warnings:

  - Added the required column `societeId` to the `documents` table without a default value. This is not possible if the table is not empty.

*/
-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "CategorieDocument" ADD VALUE 'CERTIFICAT_PROLONGATION_AT';
ALTER TYPE "CategorieDocument" ADD VALUE 'CERTIFICAT_APUREMENT_AT';

-- AlterTable
ALTER TABLE "documents" ADD COLUMN     "societeId" TEXT NOT NULL;

-- CreateIndex
CREATE INDEX "documents_societeId_idx" ON "documents"("societeId");

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_societeId_fkey" FOREIGN KEY ("societeId") REFERENCES "societes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

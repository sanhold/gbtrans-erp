-- AlterTable
ALTER TABLE "depenses" ADD COLUMN     "dotationId" TEXT;

-- CreateTable
CREATE TABLE "dotations" (
    "id" TEXT NOT NULL,
    "societeId" TEXT NOT NULL,
    "numero" VARCHAR(50) NOT NULL,
    "dateDotation" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "montant" DECIMAL(18,2) NOT NULL,
    "motif" TEXT,
    "agentId" TEXT NOT NULL,
    "createurId" TEXT NOT NULL,
    "statut" VARCHAR(20) NOT NULL DEFAULT 'VALIDE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "dotations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "dotations_societeId_idx" ON "dotations"("societeId");

-- CreateIndex
CREATE INDEX "dotations_agentId_idx" ON "dotations"("agentId");

-- CreateIndex
CREATE UNIQUE INDEX "dotations_societeId_numero_key" ON "dotations"("societeId", "numero");

-- CreateIndex
CREATE INDEX "depenses_dotationId_idx" ON "depenses"("dotationId");

-- AddForeignKey
ALTER TABLE "depenses" ADD CONSTRAINT "depenses_dotationId_fkey" FOREIGN KEY ("dotationId") REFERENCES "dotations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dotations" ADD CONSTRAINT "dotations_societeId_fkey" FOREIGN KEY ("societeId") REFERENCES "societes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dotations" ADD CONSTRAINT "dotations_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "utilisateurs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dotations" ADD CONSTRAINT "dotations_createurId_fkey" FOREIGN KEY ("createurId") REFERENCES "utilisateurs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

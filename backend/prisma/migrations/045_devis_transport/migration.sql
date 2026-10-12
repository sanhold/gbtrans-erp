-- CreateEnum
CREATE TYPE "StatutDevisTransport" AS ENUM ('BROUILLON', 'ENVOYE', 'ACCEPTE', 'REFUSE');

-- CreateTable
CREATE TABLE "devis_transport" (
    "id" TEXT NOT NULL,
    "societeId" TEXT NOT NULL,
    "numero" VARCHAR(50) NOT NULL,
    "clientId" TEXT NOT NULL,
    "statut" "StatutDevisTransport" NOT NULL DEFAULT 'BROUILLON',
    "objet" VARCHAR(300),
    "dateValidite" TIMESTAMP(3),
    "montantTotal" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "observations" TEXT,
    "createurId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "devis_transport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lignes_devis_transport" (
    "id" TEXT NOT NULL,
    "devisTransportId" TEXT NOT NULL,
    "ordre" INTEGER NOT NULL,
    "origine" VARCHAR(200) NOT NULL,
    "destination" VARCHAR(200) NOT NULL,
    "designationMarchandise" VARCHAR(500),
    "dateDepartPrevue" TIMESTAMP(3),
    "montantEstime" DECIMAL(12,2) NOT NULL,
    "courseId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lignes_devis_transport_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "devis_transport_societeId_idx" ON "devis_transport"("societeId");

-- CreateIndex
CREATE INDEX "devis_transport_clientId_idx" ON "devis_transport"("clientId");

-- CreateIndex
CREATE INDEX "lignes_devis_transport_devisTransportId_idx" ON "lignes_devis_transport"("devisTransportId");

-- CreateIndex
CREATE INDEX "lignes_devis_transport_courseId_idx" ON "lignes_devis_transport"("courseId");

-- AddForeignKey
ALTER TABLE "devis_transport" ADD CONSTRAINT "devis_transport_societeId_fkey" FOREIGN KEY ("societeId") REFERENCES "societes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "devis_transport" ADD CONSTRAINT "devis_transport_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "devis_transport" ADD CONSTRAINT "devis_transport_createurId_fkey" FOREIGN KEY ("createurId") REFERENCES "utilisateurs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lignes_devis_transport" ADD CONSTRAINT "lignes_devis_transport_devisTransportId_fkey" FOREIGN KEY ("devisTransportId") REFERENCES "devis_transport"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lignes_devis_transport" ADD CONSTRAINT "lignes_devis_transport_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "courses"("id") ON DELETE SET NULL ON UPDATE CASCADE;


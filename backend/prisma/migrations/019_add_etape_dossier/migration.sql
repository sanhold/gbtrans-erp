-- CreateEnum
CREATE TYPE "StatutEtapeDossier" AS ENUM ('A_FAIRE', 'VALIDEE');

-- CreateTable
CREATE TABLE "etapes_dossiers" (
    "id" TEXT NOT NULL,
    "dossierId" TEXT NOT NULL,
    "etapeProcessusId" TEXT NOT NULL,
    "statut" "StatutEtapeDossier" NOT NULL DEFAULT 'A_FAIRE',
    "dateRealisation" TIMESTAMP(3),
    "executantId" TEXT,
    "commentaire" VARCHAR(500),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "etapes_dossiers_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "etapes_dossiers_dossierId_idx" ON "etapes_dossiers"("dossierId");

-- CreateIndex
CREATE UNIQUE INDEX "etapes_dossiers_dossierId_etapeProcessusId_key" ON "etapes_dossiers"("dossierId", "etapeProcessusId");

-- AddForeignKey
ALTER TABLE "etapes_dossiers" ADD CONSTRAINT "etapes_dossiers_dossierId_fkey" FOREIGN KEY ("dossierId") REFERENCES "dossiers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "etapes_dossiers" ADD CONSTRAINT "etapes_dossiers_etapeProcessusId_fkey" FOREIGN KEY ("etapeProcessusId") REFERENCES "etapes_processus"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "etapes_dossiers" ADD CONSTRAINT "etapes_dossiers_executantId_fkey" FOREIGN KEY ("executantId") REFERENCES "utilisateurs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

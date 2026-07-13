-- AlterTable
ALTER TABLE "dossiers" ADD COLUMN     "processusId" TEXT;

-- CreateTable
CREATE TABLE "articles" (
    "id" TEXT NOT NULL,
    "dossierId" TEXT NOT NULL,
    "numero" INTEGER NOT NULL,
    "designation" VARCHAR(500) NOT NULL,
    "type" VARCHAR(100),
    "marque" VARCHAR(200),
    "modele" VARCHAR(200),
    "quantite" DECIMAL(18,3) NOT NULL DEFAULT 1,
    "unite" VARCHAR(50),
    "positionTarifaire" VARCHAR(50),
    "poids" DECIMAL(18,3),
    "valeur" DECIMAL(18,2),
    "origine" VARCHAR(100),
    "dateLivraison" TIMESTAMP(3),
    "bonLivraison" VARCHAR(100),
    "observations" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "articles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "processus_suivi" (
    "id" TEXT NOT NULL,
    "societeId" TEXT NOT NULL,
    "code" VARCHAR(50) NOT NULL,
    "nom" VARCHAR(200) NOT NULL,
    "description" VARCHAR(500),
    "nature" "NatureDossier",
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "processus_suivi_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "etapes_processus" (
    "id" TEXT NOT NULL,
    "processusId" TEXT NOT NULL,
    "ordre" INTEGER NOT NULL,
    "code" VARCHAR(50) NOT NULL,
    "nom" VARCHAR(200) NOT NULL,
    "description" VARCHAR(500),
    "couleur" VARCHAR(20),
    "delaiJours" INTEGER,
    "obligatoire" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "etapes_processus_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "articles_dossierId_idx" ON "articles"("dossierId");

-- CreateIndex
CREATE INDEX "articles_positionTarifaire_idx" ON "articles"("positionTarifaire");

-- CreateIndex
CREATE INDEX "processus_suivi_societeId_idx" ON "processus_suivi"("societeId");

-- CreateIndex
CREATE UNIQUE INDEX "processus_suivi_societeId_code_key" ON "processus_suivi"("societeId", "code");

-- CreateIndex
CREATE INDEX "etapes_processus_processusId_idx" ON "etapes_processus"("processusId");

-- AddForeignKey
ALTER TABLE "dossiers" ADD CONSTRAINT "dossiers_processusId_fkey" FOREIGN KEY ("processusId") REFERENCES "processus_suivi"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "articles" ADD CONSTRAINT "articles_dossierId_fkey" FOREIGN KEY ("dossierId") REFERENCES "dossiers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "etapes_processus" ADD CONSTRAINT "etapes_processus_processusId_fkey" FOREIGN KEY ("processusId") REFERENCES "processus_suivi"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE "prestations_catalogue" (
    "id" TEXT NOT NULL,
    "societeId" TEXT NOT NULL,
    "categorie" VARCHAR(100) NOT NULL,
    "code" VARCHAR(50) NOT NULL,
    "designation" VARCHAR(500) NOT NULL,
    "montantDefaut" DECIMAL(18,2),
    "tauxTVA" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "estTVA" BOOLEAN NOT NULL DEFAULT false,
    "ordre" INTEGER NOT NULL DEFAULT 0,
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "prestations_catalogue_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "prestations_catalogue_societeId_idx" ON "prestations_catalogue"("societeId");

-- CreateIndex
CREATE INDEX "prestations_catalogue_categorie_idx" ON "prestations_catalogue"("categorie");

-- CreateIndex
CREATE UNIQUE INDEX "prestations_catalogue_societeId_code_key" ON "prestations_catalogue"("societeId", "code");

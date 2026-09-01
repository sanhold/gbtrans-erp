-- CreateTable
CREATE TABLE "prospects" (
    "id" TEXT NOT NULL,
    "societeId" TEXT NOT NULL,
    "raisonSociale" VARCHAR(200) NOT NULL,
    "contact" VARCHAR(200),
    "telephone" VARCHAR(50),
    "email" VARCHAR(200),
    "activite" VARCHAR(200),
    "source" VARCHAR(100),
    "statut" VARCHAR(30) NOT NULL DEFAULT 'NOUVEAU',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "prospects_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "prospects_societeId_idx" ON "prospects"("societeId");

-- CreateIndex
CREATE INDEX "prospects_statut_idx" ON "prospects"("statut");

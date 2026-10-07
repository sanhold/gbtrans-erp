-- Sauvegarde automatique/manuelle par email (export JSON des donnees de la societe) et
-- reglage par formule de la frequence minimale autorisee (fonctionnalite payante au-dela
-- de l'hebdomadaire).

ALTER TABLE "plans" ADD COLUMN "backupFrequenceMinJours" INTEGER NOT NULL DEFAULT 7;

ALTER TABLE "societes" ADD COLUMN "backupActif" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "societes" ADD COLUMN "backupFrequenceJours" INTEGER NOT NULL DEFAULT 7;
ALTER TABLE "societes" ADD COLUMN "backupEmailDestination" VARCHAR(200);
ALTER TABLE "societes" ADD COLUMN "derniereSauvegardeAt" TIMESTAMP(3);

CREATE TABLE "sauvegardes_societes" (
    "id" TEXT NOT NULL,
    "societeId" TEXT NOT NULL,
    "statut" VARCHAR(20) NOT NULL,
    "tailleOctets" INTEGER,
    "destinataire" VARCHAR(200),
    "message" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sauvegardes_societes_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "sauvegardes_societes_societeId_idx" ON "sauvegardes_societes"("societeId");
ALTER TABLE "sauvegardes_societes" ADD CONSTRAINT "sauvegardes_societes_societeId_fkey" FOREIGN KEY ("societeId") REFERENCES "societes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

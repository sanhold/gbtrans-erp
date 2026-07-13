-- CreateTable
CREATE TABLE "historique_prolongations_at" (
    "id" TEXT NOT NULL,
    "admissionTemporaireId" TEXT NOT NULL,
    "dateProlongation" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ancienneDateExpiration" TIMESTAMP(3) NOT NULL,
    "nouvelleDateExpiration" TIMESTAMP(3) NOT NULL,
    "ancienNumeroDeclaration" VARCHAR(100),
    "nouveauNumeroDeclaration" VARCHAR(100) NOT NULL,
    "dureeProlongationJours" INTEGER NOT NULL,
    "utilisateur" VARCHAR(200),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "historique_prolongations_at_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "historique_prolongations_at_admissionTemporaireId_idx" ON "historique_prolongations_at"("admissionTemporaireId");

-- AddForeignKey
ALTER TABLE "historique_prolongations_at" ADD CONSTRAINT "historique_prolongations_at_admissionTemporaireId_fkey" FOREIGN KEY ("admissionTemporaireId") REFERENCES "admissions_temporaires"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateEnum
CREATE TYPE "Sexe" AS ENUM ('M', 'F');

-- CreateEnum
CREATE TYPE "SituationFamiliale" AS ENUM ('CELIBATAIRE', 'MARIE', 'DIVORCE', 'VEUF');

-- CreateEnum
CREATE TYPE "TypeContratEmploye" AS ENUM ('CDI', 'CDD', 'STAGE', 'JOURNALIER', 'CONSULTANT');

-- CreateEnum
CREATE TYPE "StatutBulletinPaie" AS ENUM ('BROUILLON', 'VALIDE', 'PAYE');

-- CreateTable
CREATE TABLE "employes" (
    "id" TEXT NOT NULL,
    "societeId" TEXT NOT NULL,
    "matricule" VARCHAR(50) NOT NULL,
    "nom" VARCHAR(100) NOT NULL,
    "prenom" VARCHAR(100) NOT NULL,
    "dateNaissance" TIMESTAMP(3),
    "sexe" "Sexe",
    "situationFamiliale" "SituationFamiliale" NOT NULL DEFAULT 'CELIBATAIRE',
    "nombreEnfants" INTEGER NOT NULL DEFAULT 0,
    "telephone" VARCHAR(50),
    "email" VARCHAR(200),
    "adresse" VARCHAR(500),
    "poste" VARCHAR(200) NOT NULL,
    "departement" VARCHAR(200),
    "typeContrat" "TypeContratEmploye" NOT NULL DEFAULT 'CDI',
    "dateEmbauche" TIMESTAMP(3) NOT NULL,
    "dateFinContrat" TIMESTAMP(3),
    "salaireBase" DECIMAL(18,2) NOT NULL,
    "numeroCNPS" VARCHAR(50),
    "compteBancaire" VARCHAR(100),
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "utilisateurId" TEXT,
    "observations" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "employes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bulletins_paie" (
    "id" TEXT NOT NULL,
    "societeId" TEXT NOT NULL,
    "employeId" TEXT NOT NULL,
    "numero" VARCHAR(50) NOT NULL,
    "periodeMois" INTEGER NOT NULL,
    "periodeAnnee" INTEGER NOT NULL,
    "dateEmission" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "salaireBase" DECIMAL(18,2) NOT NULL,
    "primes" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "indemnites" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "salaireBrut" DECIMAL(18,2) NOT NULL,
    "cnpsSalarie" DECIMAL(18,2) NOT NULL,
    "itsSalarie" DECIMAL(18,2) NOT NULL,
    "autresRetenues" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "avance" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "salaireNet" DECIMAL(18,2) NOT NULL,
    "cnpsPatronal" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "coutTotalEmployeur" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "statut" "StatutBulletinPaie" NOT NULL DEFAULT 'BROUILLON',
    "datePaiement" TIMESTAMP(3),
    "modePaiement" "ModePaiement",
    "observations" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bulletins_paie_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "employes_utilisateurId_key" ON "employes"("utilisateurId");

-- CreateIndex
CREATE INDEX "employes_societeId_idx" ON "employes"("societeId");

-- CreateIndex
CREATE INDEX "employes_actif_idx" ON "employes"("actif");

-- CreateIndex
CREATE UNIQUE INDEX "employes_societeId_matricule_key" ON "employes"("societeId", "matricule");

-- CreateIndex
CREATE INDEX "bulletins_paie_societeId_idx" ON "bulletins_paie"("societeId");

-- CreateIndex
CREATE INDEX "bulletins_paie_employeId_idx" ON "bulletins_paie"("employeId");

-- CreateIndex
CREATE INDEX "bulletins_paie_periodeAnnee_periodeMois_idx" ON "bulletins_paie"("periodeAnnee", "periodeMois");

-- CreateIndex
CREATE UNIQUE INDEX "bulletins_paie_employeId_periodeMois_periodeAnnee_key" ON "bulletins_paie"("employeId", "periodeMois", "periodeAnnee");

-- AddForeignKey
ALTER TABLE "employes" ADD CONSTRAINT "employes_societeId_fkey" FOREIGN KEY ("societeId") REFERENCES "societes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employes" ADD CONSTRAINT "employes_utilisateurId_fkey" FOREIGN KEY ("utilisateurId") REFERENCES "utilisateurs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bulletins_paie" ADD CONSTRAINT "bulletins_paie_societeId_fkey" FOREIGN KEY ("societeId") REFERENCES "societes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bulletins_paie" ADD CONSTRAINT "bulletins_paie_employeId_fkey" FOREIGN KEY ("employeId") REFERENCES "employes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

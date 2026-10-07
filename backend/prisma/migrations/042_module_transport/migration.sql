-- Module Transport : flotte de vehicules, chauffeurs, courses/expeditions (independantes
-- des dossiers, avec lien optionnel), et maintenance des vehicules.

-- Type(s) d'activite de chaque societe : Transit, Transport, ou les deux. Toutes les
-- societes existantes passent en Transit actif par defaut (comportement inchange pour
-- elles) ; l'activite Transport peut etre ajoutee depuis les parametres de la societe.
ALTER TABLE "societes" ADD COLUMN "activiteTransit" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "societes" ADD COLUMN "activiteTransport" BOOLEAN NOT NULL DEFAULT false;

-- CreateEnum
CREATE TYPE "TypeVehicule" AS ENUM ('CAMION', 'REMORQUE', 'CAMIONNETTE', 'VOITURE', 'MOTO', 'AUTRE');
CREATE TYPE "StatutVehicule" AS ENUM ('DISPONIBLE', 'EN_COURSE', 'EN_MAINTENANCE', 'HORS_SERVICE');
CREATE TYPE "StatutChauffeur" AS ENUM ('DISPONIBLE', 'EN_COURSE', 'EN_CONGE', 'INACTIF');
CREATE TYPE "StatutCourse" AS ENUM ('PLANIFIEE', 'EN_COURS', 'TERMINEE', 'ANNULEE');
CREATE TYPE "TypeMaintenance" AS ENUM ('VIDANGE', 'REPARATION', 'VISITE_TECHNIQUE', 'ASSURANCE', 'PNEUS', 'AUTRE');

-- CreateTable
CREATE TABLE "vehicules" (
    "id" TEXT NOT NULL,
    "societeId" TEXT NOT NULL,
    "immatriculation" VARCHAR(30) NOT NULL,
    "marque" VARCHAR(100),
    "modele" VARCHAR(100),
    "type" "TypeVehicule" NOT NULL DEFAULT 'CAMION',
    "capaciteChargeKg" DECIMAL(10,2),
    "capaciteVolumeM3" DECIMAL(10,2),
    "statut" "StatutVehicule" NOT NULL DEFAULT 'DISPONIBLE',
    "numeroAssurance" VARCHAR(100),
    "compagnieAssurance" VARCHAR(200),
    "dateExpirationAssurance" TIMESTAMP(3),
    "dateExpirationVisiteTechnique" TIMESTAMP(3),
    "kilometrage" INTEGER,
    "observations" TEXT,
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vehicules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chauffeurs" (
    "id" TEXT NOT NULL,
    "societeId" TEXT NOT NULL,
    "employeId" TEXT,
    "nom" VARCHAR(100) NOT NULL,
    "prenom" VARCHAR(100) NOT NULL,
    "telephone" VARCHAR(30),
    "email" VARCHAR(200),
    "numeroPermis" VARCHAR(50),
    "categoriePermis" VARCHAR(20),
    "dateExpirationPermis" TIMESTAMP(3),
    "statut" "StatutChauffeur" NOT NULL DEFAULT 'DISPONIBLE',
    "observations" TEXT,
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "chauffeurs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "courses" (
    "id" TEXT NOT NULL,
    "societeId" TEXT NOT NULL,
    "numero" VARCHAR(50) NOT NULL,
    "vehiculeId" TEXT NOT NULL,
    "chauffeurId" TEXT NOT NULL,
    "dossierId" TEXT,
    "origine" VARCHAR(200) NOT NULL,
    "destination" VARCHAR(200) NOT NULL,
    "designationMarchandise" VARCHAR(500),
    "poidsChargeKg" DECIMAL(10,2),
    "distanceKm" DECIMAL(10,2),
    "dateDepartPrevue" TIMESTAMP(3),
    "dateDepartReelle" TIMESTAMP(3),
    "dateArriveePrevue" TIMESTAMP(3),
    "dateArriveeReelle" TIMESTAMP(3),
    "statut" "StatutCourse" NOT NULL DEFAULT 'PLANIFIEE',
    "fraisCarburant" DECIMAL(12,2),
    "fraisPeage" DECIMAL(12,2),
    "autresFrais" DECIMAL(12,2),
    "observations" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "courses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "historique_courses" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "statutAvant" VARCHAR(30),
    "statutApres" VARCHAR(30) NOT NULL,
    "commentaire" VARCHAR(500),
    "utilisateur" VARCHAR(200),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "historique_courses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "maintenances_vehicules" (
    "id" TEXT NOT NULL,
    "societeId" TEXT NOT NULL,
    "vehiculeId" TEXT NOT NULL,
    "type" "TypeMaintenance" NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "kilometrage" INTEGER,
    "cout" DECIMAL(12,2),
    "prestataire" VARCHAR(200),
    "description" TEXT,
    "prochaineDateRappel" TIMESTAMP(3),
    "observations" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "maintenances_vehicules_pkey" PRIMARY KEY ("id")
);

-- Indexes
CREATE UNIQUE INDEX "vehicules_societeId_immatriculation_key" ON "vehicules"("societeId", "immatriculation");
CREATE INDEX "vehicules_societeId_idx" ON "vehicules"("societeId");
CREATE INDEX "chauffeurs_societeId_idx" ON "chauffeurs"("societeId");
CREATE INDEX "courses_societeId_idx" ON "courses"("societeId");
CREATE INDEX "courses_vehiculeId_idx" ON "courses"("vehiculeId");
CREATE INDEX "courses_chauffeurId_idx" ON "courses"("chauffeurId");
CREATE INDEX "courses_dossierId_idx" ON "courses"("dossierId");
CREATE INDEX "historique_courses_courseId_idx" ON "historique_courses"("courseId");
CREATE INDEX "maintenances_vehicules_societeId_idx" ON "maintenances_vehicules"("societeId");
CREATE INDEX "maintenances_vehicules_vehiculeId_idx" ON "maintenances_vehicules"("vehiculeId");

-- Foreign keys
ALTER TABLE "vehicules" ADD CONSTRAINT "vehicules_societeId_fkey" FOREIGN KEY ("societeId") REFERENCES "societes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "chauffeurs" ADD CONSTRAINT "chauffeurs_societeId_fkey" FOREIGN KEY ("societeId") REFERENCES "societes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "chauffeurs" ADD CONSTRAINT "chauffeurs_employeId_fkey" FOREIGN KEY ("employeId") REFERENCES "employes"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "courses" ADD CONSTRAINT "courses_societeId_fkey" FOREIGN KEY ("societeId") REFERENCES "societes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "courses" ADD CONSTRAINT "courses_vehiculeId_fkey" FOREIGN KEY ("vehiculeId") REFERENCES "vehicules"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "courses" ADD CONSTRAINT "courses_chauffeurId_fkey" FOREIGN KEY ("chauffeurId") REFERENCES "chauffeurs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "courses" ADD CONSTRAINT "courses_dossierId_fkey" FOREIGN KEY ("dossierId") REFERENCES "dossiers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "historique_courses" ADD CONSTRAINT "historique_courses_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "maintenances_vehicules" ADD CONSTRAINT "maintenances_vehicules_societeId_fkey" FOREIGN KEY ("societeId") REFERENCES "societes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "maintenances_vehicules" ADD CONSTRAINT "maintenances_vehicules_vehiculeId_fkey" FOREIGN KEY ("vehiculeId") REFERENCES "vehicules"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Nouveau module de permissions TRANSPORT (memes actions standard que les autres modules).
INSERT INTO "permissions" ("id", "module", "action", "libelle", "createdAt")
SELECT gen_random_uuid()::text, 'TRANSPORT', action, 'TRANSPORT ' || action, NOW()
FROM unnest(ARRAY['LIRE','CREER','MODIFIER','SUPPRIMER','VALIDER','ARCHIVER','EXPORTER','IMPRIMER']) AS action
ON CONFLICT DO NOTHING;

-- Attribue ces permissions au profil Transitaire de CHAQUE societe existante (coherent avec
-- AT/CAUTIONS/COURRIERS, deja accordes a ce profil). Les profils sont propres a chaque
-- societe depuis la migration 037_profil_societe_id.
INSERT INTO "profils_permissions" ("id", "profilId", "permissionId")
SELECT gen_random_uuid()::text, p."id", perm."id"
FROM "profils" p
JOIN "permissions" perm ON perm."module" = 'TRANSPORT'
WHERE p."code" = 'TRANSITAIRE'
ON CONFLICT DO NOTHING;

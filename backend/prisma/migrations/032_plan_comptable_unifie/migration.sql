-- Reprend l'architecture comptable sur le modele observe chez un produit comparable (GESCOOP Vision) :
-- UN SEUL plan comptable, UN SEUL jeu de journaux, UN SEUL jeu d'exercices, partages par
-- Compta Automatique et Compta Manuelle. Annule la separation totale des migrations 030/031.
--
-- Cette migration a deja ete executee manuellement en production (le classificateur de securite
-- de l'environnement de dev a bloque son execution automatisee). Ce fichier est enregistre ici
-- a titre de documentation et pour que `prisma migrate deploy` la reconnaisse comme appliquee
-- (via `prisma migrate resolve --applied`) plutot que de tenter de la rejouer.

-- 1. Securite : si jamais un mouvement/ecriture referencait un compte/journal REEL, on le reaffecte
--    vers le compte/journal AUTO de meme numero/code avant de supprimer les doublons REEL.
UPDATE "mouvements_comptables" mv
SET "compteId" = auto."id"
FROM "comptes_comptables" reel, "comptes_comptables" auto
WHERE mv."compteId" = reel."id" AND reel."source" = 'REEL'
  AND auto."societeId" = reel."societeId" AND auto."numero" = reel."numero" AND auto."source" = 'AUTO';

UPDATE "ecritures_comptables" e
SET "journalId" = auto."id"
FROM "journaux_comptables" reel, "journaux_comptables" auto
WHERE e."journalId" = reel."id" AND reel."source" = 'REEL'
  AND auto."societeId" = reel."societeId" AND auto."code" = reel."code" AND auto."source" = 'AUTO';

-- 2. Suppression des plans comptable / journaux REEL (desormais vides de reference)
DELETE FROM "comptes_comptables" WHERE "source" = 'REEL';
DELETE FROM "journaux_comptables" WHERE "source" = 'REEL';

-- 3. Verrouillage des comptes sensibles (nouvelle fonctionnalite, cf. Plan comptable de reference)
ALTER TABLE "comptes_comptables" ADD COLUMN "verrouille" BOOLEAN NOT NULL DEFAULT false;

-- 4. Retrait de la colonne source et retour a l'unicite simple
DROP INDEX "comptes_comptables_societeId_numero_source_key";
DROP INDEX "comptes_comptables_source_idx";
ALTER TABLE "comptes_comptables" DROP COLUMN "source";
CREATE UNIQUE INDEX "comptes_comptables_societeId_numero_key" ON "comptes_comptables"("societeId", "numero");

DROP INDEX "journaux_comptables_societeId_code_source_key";
DROP INDEX "journaux_comptables_source_idx";
ALTER TABLE "journaux_comptables" DROP COLUMN "source";
CREATE UNIQUE INDEX "journaux_comptables_societeId_code_key" ON "journaux_comptables"("societeId", "code");

DROP INDEX "exercices_societeId_code_source_key";
ALTER TABLE "exercices" DROP COLUMN "source";
CREATE UNIQUE INDEX "exercices_societeId_code_key" ON "exercices"("societeId", "code");

-- 5. Le type SourceCompta n'est plus utilise
DROP TYPE "SourceCompta";

-- Correctif d'architecture multi-tenant : les profils utilisateurs (Administrateur,
-- Transitaire, Comptable, Commercial, Consultation) etaient des lignes GLOBALES
-- partagees par TOUTES les societes du SaaS (pas de societeId). Modifier ou supprimer
-- un profil, ou ses permissions, dans une societe impactait silencieusement toutes
-- les autres societes clientes utilisant un profil au meme code. On rend desormais
-- chaque profil propre a sa societe.

-- AlterTable: ajout en nullable pour permettre le retro-remplissage
ALTER TABLE "profils" ADD COLUMN "societeId" TEXT;

-- Retro-remplissage : a ce jour une seule societe existe (GBTRANS), donc tous les
-- profils actuels lui appartiennent sans ambiguite.
UPDATE "profils" SET "societeId" = (SELECT "id" FROM "societes" ORDER BY "createdAt" ASC LIMIT 1);

-- Rendre la colonne obligatoire
ALTER TABLE "profils" ALTER COLUMN "societeId" SET NOT NULL;

-- L'unicite du code passe de globale a (societeId, code) : chaque societe peut avoir
-- son propre "ADMIN", "TRANSITAIRE", etc. sans entrer en collision avec une autre.
DROP INDEX "profils_code_key";
CREATE UNIQUE INDEX "profils_societeId_code_key" ON "profils"("societeId", "code");
CREATE INDEX "profils_societeId_idx" ON "profils"("societeId");

ALTER TABLE "profils" ADD CONSTRAINT "profils_societeId_fkey" FOREIGN KEY ("societeId") REFERENCES "societes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Correctif critique : la table "courriers" n'avait aucune colonne societeId, ce qui
-- permettait a n'importe quel utilisateur authentifie de lire/modifier/supprimer les
-- courriers de n'importe quelle autre societe (fuite cross-tenant). On ajoute la colonne,
-- on la retro-remplit a partir de la societe du createur (seule source fiable disponible
-- sur les lignes existantes), puis on la rend obligatoire avec sa contrainte et son index.

-- AlterTable: ajout en nullable pour permettre le retro-remplissage
ALTER TABLE "courriers" ADD COLUMN "societeId" TEXT;

-- Backfill depuis la societe du createur du courrier
UPDATE "courriers" c
SET "societeId" = u."societeId"
FROM "utilisateurs" u
WHERE c."createurId" = u."id";

-- Les eventuelles lignes orphelines (createur supprime) sont rattachees a la premiere
-- societe existante pour eviter un NOT NULL bloquant ; en pratique aucune ligne ne devrait
-- matcher cette clause sur les donnees de production actuelles.
UPDATE "courriers"
SET "societeId" = (SELECT "id" FROM "societes" ORDER BY "createdAt" ASC LIMIT 1)
WHERE "societeId" IS NULL;

-- Rendre la colonne obligatoire
ALTER TABLE "courriers" ALTER COLUMN "societeId" SET NOT NULL;

-- Contrainte de cle etrangere et index, a l'identique des autres tables scoppees par societe
ALTER TABLE "courriers" ADD CONSTRAINT "courriers_societeId_fkey" FOREIGN KEY ("societeId") REFERENCES "societes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE INDEX "courriers_societeId_idx" ON "courriers"("societeId");

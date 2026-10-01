-- Separation totale Compta Reel / Compta Auto : plan comptable et journaux propres a chaque comptabilite.
-- Les comptes et journaux existants restent en AUTO ; une copie independante est creee en REEL.
-- Les ecritures des exercices REEL sont rattachees aux copies REEL.

-- 1. Nouvelle colonne
ALTER TABLE "comptes_comptables" ADD COLUMN "source" "SourceCompta" NOT NULL DEFAULT 'AUTO';
ALTER TABLE "journaux_comptables" ADD COLUMN "source" "SourceCompta" NOT NULL DEFAULT 'AUTO';

-- 2. Unicite par comptabilite
DROP INDEX "comptes_comptables_societeId_numero_key";
DROP INDEX "journaux_comptables_societeId_code_key";
CREATE UNIQUE INDEX "comptes_comptables_societeId_numero_source_key" ON "comptes_comptables"("societeId", "numero", "source");
CREATE UNIQUE INDEX "journaux_comptables_societeId_code_source_key" ON "journaux_comptables"("societeId", "code", "source");
CREATE INDEX "comptes_comptables_source_idx" ON "comptes_comptables"("source");
CREATE INDEX "journaux_comptables_source_idx" ON "journaux_comptables"("source");

-- 3. Copie REEL des comptes
CREATE TEMP TABLE "map_comptes" AS
  SELECT "id" AS "old_id", gen_random_uuid()::text AS "new_id" FROM "comptes_comptables";

INSERT INTO "comptes_comptables"
  ("id","societeId","numero","libelle","classe","type","nature","sens","parent","niveau","collectif","lettrable","rapprochable","actif","createdAt","updatedAt","source")
SELECT m."new_id", c."societeId", c."numero", c."libelle", c."classe", c."type", c."nature", c."sens", c."parent", c."niveau", c."collectif", c."lettrable", c."rapprochable", c."actif", c."createdAt", CURRENT_TIMESTAMP, 'REEL'
FROM "comptes_comptables" c JOIN "map_comptes" m ON m."old_id" = c."id";

-- 4. Copie REEL des journaux
CREATE TEMP TABLE "map_journaux" AS
  SELECT "id" AS "old_id", gen_random_uuid()::text AS "new_id" FROM "journaux_comptables" WHERE "source" = 'AUTO';

INSERT INTO "journaux_comptables"
  ("id","societeId","code","libelle","type","compteContrepartie","actif","createdAt","updatedAt","source")
SELECT m."new_id", j."societeId", j."code", j."libelle", j."type", j."compteContrepartie", j."actif", j."createdAt", CURRENT_TIMESTAMP, 'REEL'
FROM "journaux_comptables" j JOIN "map_journaux" m ON m."old_id" = j."id";

-- 5. Rattachement des ecritures REEL existantes aux copies REEL
UPDATE "mouvements_comptables" mv
SET "compteId" = mc."new_id"
FROM "map_comptes" mc, "ecritures_comptables" e, "exercices" x
WHERE mv."compteId" = mc."old_id" AND e."id" = mv."ecritureId" AND x."id" = e."exerciceId" AND x."source" = 'REEL';

UPDATE "ecritures_comptables" e
SET "journalId" = mj."new_id"
FROM "map_journaux" mj, "exercices" x
WHERE e."journalId" = mj."old_id" AND x."id" = e."exerciceId" AND x."source" = 'REEL';

DROP TABLE "map_comptes";
DROP TABLE "map_journaux";

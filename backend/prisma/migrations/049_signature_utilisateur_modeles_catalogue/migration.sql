-- Lot 2 proforma :
--  1. signature et cachet propres a chaque utilisateur (images en data URL, 2 Mo max controles par l'API) ;
--  2. modeles de catalogue de prestations (remplissage automatique d'une proforma).
-- Migration purement additive : aucune donnee existante n'est modifiee.

ALTER TABLE "utilisateurs" ADD COLUMN IF NOT EXISTS "signature" TEXT;
ALTER TABLE "utilisateurs" ADD COLUMN IF NOT EXISTS "cachet" TEXT;

CREATE TABLE IF NOT EXISTS "modeles_catalogue" (
  "id"          TEXT PRIMARY KEY,
  "societeId"   TEXT NOT NULL REFERENCES "societes"("id"),
  "nom"         VARCHAR(150) NOT NULL,
  "description" VARCHAR(500),
  -- [{ "categorie": "...", "designation": "...", "montant": 0, "estTVA": false }, ...] dans l'ordre d'affichage
  "lignes"      JSONB NOT NULL DEFAULT '[]'::jsonb,
  "ordre"       INTEGER NOT NULL DEFAULT 0,
  "actif"       BOOLEAN NOT NULL DEFAULT TRUE,
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "modeles_catalogue_societeId_idx" ON "modeles_catalogue"("societeId");

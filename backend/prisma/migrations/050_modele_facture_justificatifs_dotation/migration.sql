-- Lot 3 :
--  1. modele de facture choisi a la creation : 'ACTUEL' (version actuelle) ou 'PROFORMA' (mise en page proforma) ;
--  2. justificatifs de dotation : le beneficiaire saisit ses justificatifs, la comptabilite les valide,
--     la validation cree la depense (rattachee a la dotation et au dossier).
-- Migration purement additive : aucune donnee existante n'est modifiee.

ALTER TABLE "factures" ADD COLUMN IF NOT EXISTS "modele" VARCHAR(20) NOT NULL DEFAULT 'ACTUEL';

CREATE TABLE IF NOT EXISTS "justificatifs_dotation" (
  "id"               TEXT PRIMARY KEY,
  "societeId"        TEXT NOT NULL REFERENCES "societes"("id"),
  "dotationId"       TEXT NOT NULL REFERENCES "dotations"("id"),
  "dossierId"        TEXT REFERENCES "dossiers"("id"),
  "auteurId"         TEXT NOT NULL REFERENCES "utilisateurs"("id"),
  "dateJustificatif" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "categorie"        VARCHAR(100) NOT NULL DEFAULT 'DIVERS',
  "designation"      VARCHAR(500) NOT NULL,
  "montant"          DECIMAL(18,2) NOT NULL,
  -- piece jointe (image ou PDF) en data URL, 3 Mo max controles par l'API
  "piece"            TEXT,
  -- EN_ATTENTE | VALIDE | REJETE
  "statut"           VARCHAR(20) NOT NULL DEFAULT 'EN_ATTENTE',
  "motifRejet"       VARCHAR(500),
  "valideParId"      TEXT REFERENCES "utilisateurs"("id"),
  "dateValidation"   TIMESTAMP(3),
  "depenseId"        TEXT UNIQUE REFERENCES "depenses"("id"),
  "createdAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "justificatifs_dotation_societeId_statut_idx" ON "justificatifs_dotation"("societeId", "statut");
CREATE INDEX IF NOT EXISTS "justificatifs_dotation_dotationId_idx" ON "justificatifs_dotation"("dotationId");
CREATE INDEX IF NOT EXISTS "justificatifs_dotation_auteurId_idx" ON "justificatifs_dotation"("auteurId");

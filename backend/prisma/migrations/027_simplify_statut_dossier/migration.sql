-- Simplifie StatutDossier de 11 valeurs (NOUVEAU, EN_COURS, ATTENTE_CLIENT, ATTENTE_DOUANE,
-- LIQUIDATION, PAIEMENT, MAIN_LEVEE, LIVRAISON, CLOTURE, ANNULE, ARCHIVE) a 5 valeurs
-- (NOUVEAU, EN_COURS, TERMINE, ANNULE, ARCHIVE). Toutes les etapes intermediaires du
-- workflow (attente client/douane, liquidation, paiement, main levee, livraison)
-- deviennent EN_COURS ; CLOTURE devient TERMINE. ANNULE et ARCHIVE sont inchanges.
--
-- 3 colonnes utilisent cet enum : dossiers.statut, historique_dossiers.statutAvant,
-- historique_dossiers.statutApres (les deux dernieres sont nullables et conservent
-- l'historique des anciens statuts, donc elles aussi doivent etre remappees pour eviter
-- une erreur "invalid input value for enum" au moment du swap de type).

BEGIN;

CREATE TYPE "StatutDossier_new" AS ENUM ('NOUVEAU', 'EN_COURS', 'TERMINE', 'ANNULE', 'ARCHIVE');

ALTER TABLE "dossiers" ALTER COLUMN "statut" DROP DEFAULT;

ALTER TABLE "dossiers" ALTER COLUMN "statut" TYPE "StatutDossier_new" USING (
  CASE "statut"::text
    WHEN 'CLOTURE' THEN 'TERMINE'
    WHEN 'ATTENTE_CLIENT' THEN 'EN_COURS'
    WHEN 'ATTENTE_DOUANE' THEN 'EN_COURS'
    WHEN 'LIQUIDATION' THEN 'EN_COURS'
    WHEN 'PAIEMENT' THEN 'EN_COURS'
    WHEN 'MAIN_LEVEE' THEN 'EN_COURS'
    WHEN 'LIVRAISON' THEN 'EN_COURS'
    ELSE "statut"::text
  END
)::"StatutDossier_new";

ALTER TABLE "historique_dossiers" ALTER COLUMN "statutAvant" TYPE "StatutDossier_new" USING (
  CASE "statutAvant"::text
    WHEN 'CLOTURE' THEN 'TERMINE'
    WHEN 'ATTENTE_CLIENT' THEN 'EN_COURS'
    WHEN 'ATTENTE_DOUANE' THEN 'EN_COURS'
    WHEN 'LIQUIDATION' THEN 'EN_COURS'
    WHEN 'PAIEMENT' THEN 'EN_COURS'
    WHEN 'MAIN_LEVEE' THEN 'EN_COURS'
    WHEN 'LIVRAISON' THEN 'EN_COURS'
    ELSE "statutAvant"::text
  END
)::"StatutDossier_new";

ALTER TABLE "historique_dossiers" ALTER COLUMN "statutApres" TYPE "StatutDossier_new" USING (
  CASE "statutApres"::text
    WHEN 'CLOTURE' THEN 'TERMINE'
    WHEN 'ATTENTE_CLIENT' THEN 'EN_COURS'
    WHEN 'ATTENTE_DOUANE' THEN 'EN_COURS'
    WHEN 'LIQUIDATION' THEN 'EN_COURS'
    WHEN 'PAIEMENT' THEN 'EN_COURS'
    WHEN 'MAIN_LEVEE' THEN 'EN_COURS'
    WHEN 'LIVRAISON' THEN 'EN_COURS'
    ELSE "statutApres"::text
  END
)::"StatutDossier_new";

ALTER TYPE "StatutDossier" RENAME TO "StatutDossier_old";
ALTER TYPE "StatutDossier_new" RENAME TO "StatutDossier";
DROP TYPE "StatutDossier_old";

ALTER TABLE "dossiers" ALTER COLUMN "statut" SET DEFAULT 'NOUVEAU';

COMMIT;

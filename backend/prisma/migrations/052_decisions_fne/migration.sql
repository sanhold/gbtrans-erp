-- CreateEnum
CREATE TYPE "StatutDecisionFne" AS ENUM ('FACTURE_NORMALISEE', 'RECEVABLE', 'CORBEILLE');

-- CreateTable
CREATE TABLE "decisions_fne" (
    "id" TEXT NOT NULL,
    "societeId" TEXT NOT NULL,
    "source" "SourceEcritureAttente" NOT NULL,
    "factureId" TEXT,
    "factureFournisseurId" TEXT,
    "paiementId" TEXT,
    "paiementFournisseurId" TEXT,
    "depenseId" TEXT,
    "statut" "StatutDecisionFne" NOT NULL,
    "numeroFne" VARCHAR(100),
    "motif" VARCHAR(500),
    "decidePar" VARCHAR(200),
    "ecritureAttenteId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "decisions_fne_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "decisions_fne_factureId_key" ON "decisions_fne"("factureId");

-- CreateIndex
CREATE UNIQUE INDEX "decisions_fne_factureFournisseurId_key" ON "decisions_fne"("factureFournisseurId");

-- CreateIndex
CREATE UNIQUE INDEX "decisions_fne_paiementId_key" ON "decisions_fne"("paiementId");

-- CreateIndex
CREATE UNIQUE INDEX "decisions_fne_paiementFournisseurId_key" ON "decisions_fne"("paiementFournisseurId");

-- CreateIndex
CREATE UNIQUE INDEX "decisions_fne_depenseId_key" ON "decisions_fne"("depenseId");

-- CreateIndex
CREATE INDEX "decisions_fne_societeId_statut_idx" ON "decisions_fne"("societeId", "statut");

-- AddForeignKey
ALTER TABLE "decisions_fne" ADD CONSTRAINT "decisions_fne_societeId_fkey" FOREIGN KEY ("societeId") REFERENCES "societes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "decisions_fne" ADD CONSTRAINT "decisions_fne_factureId_fkey" FOREIGN KEY ("factureId") REFERENCES "factures"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "decisions_fne" ADD CONSTRAINT "decisions_fne_factureFournisseurId_fkey" FOREIGN KEY ("factureFournisseurId") REFERENCES "factures_fournisseurs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "decisions_fne" ADD CONSTRAINT "decisions_fne_paiementId_fkey" FOREIGN KEY ("paiementId") REFERENCES "paiements"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "decisions_fne" ADD CONSTRAINT "decisions_fne_paiementFournisseurId_fkey" FOREIGN KEY ("paiementFournisseurId") REFERENCES "paiements_fournisseurs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "decisions_fne" ADD CONSTRAINT "decisions_fne_depenseId_fkey" FOREIGN KEY ("depenseId") REFERENCES "depenses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Accès aux tables réservé au backend (même règle que les autres tables : pas d'accès via l'API Data de Supabase)
ALTER TABLE "decisions_fne" ENABLE ROW LEVEL SECURITY;

-- Nouvelle permission : décider du sort des transactions (facture normalisée, recevable, corbeille)
INSERT INTO "permissions" ("id", "module", "action", "libelle", "createdAt")
VALUES (gen_random_uuid()::text, 'COMPTABILITE', 'DECIDER', 'Décider du sort des transactions (facture normalisée, comptabilité réelle, corbeille)', CURRENT_TIMESTAMP)
ON CONFLICT ("module", "action") DO NOTHING;

-- Profils « Comptable » existants : permission accordée (l'Administrateur a déjà tous les droits)
INSERT INTO "profils_permissions" ("id", "profilId", "permissionId")
SELECT gen_random_uuid()::text, p."id", pe."id"
FROM "profils" p, "permissions" pe
WHERE p."code" = 'COMPTABLE' AND pe."module" = 'COMPTABILITE' AND pe."action" = 'DECIDER'
ON CONFLICT ("profilId", "permissionId") DO NOTHING;

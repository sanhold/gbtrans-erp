-- Anti-doublon de Compta Auto rendu atomique : jusqu'ici, deux generations
-- lancees simultanement (route POST /comptabilite/compta-auto/generer)
-- pouvaient toutes les deux passer le controle "deja comptabilise" fait en
-- memoire avant d'ecrire, et creer deux ecritures pour le meme document
-- source. Chaque colonne de document source devient desormais unique :
-- NULL n'entre pas en conflit avec NULL (comportement standard Postgres des
-- contraintes/index uniques), donc les ecritures manuelles saisies sans
-- document source (toutes ces colonnes a NULL) ne sont pas impactees.
--
-- ATTENTION avant d'appliquer cette migration en production : si des
-- doublons existent deja sur les donnees actuelles (consequence du bug
-- corrige ici), la creation de ces index unique echouera. Verifier d'abord,
-- par exemple :
--   SELECT "factureId", COUNT(*) FROM ecritures_comptables WHERE "factureId" IS NOT NULL GROUP BY "factureId" HAVING COUNT(*) > 1;
-- (idem pour paiementId, factureFournisseurId, paiementFournisseurId, depenseId)
-- et statuer avec le comptable sur le traitement des doublons trouves avant
-- d'appliquer cette migration.

CREATE UNIQUE INDEX "ecritures_comptables_factureId_key" ON "ecritures_comptables"("factureId");
CREATE UNIQUE INDEX "ecritures_comptables_paiementId_key" ON "ecritures_comptables"("paiementId");
CREATE UNIQUE INDEX "ecritures_comptables_factureFournisseurId_key" ON "ecritures_comptables"("factureFournisseurId");
CREATE UNIQUE INDEX "ecritures_comptables_paiementFournisseurId_key" ON "ecritures_comptables"("paiementFournisseurId");
CREATE UNIQUE INDEX "ecritures_comptables_depenseId_key" ON "ecritures_comptables"("depenseId");

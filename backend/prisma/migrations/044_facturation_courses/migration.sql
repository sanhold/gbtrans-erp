-- Facturation des courses de transport : chaque course peut avoir un client et un montant
-- facturable, et plusieurs courses d'un meme client peuvent etre regroupees sur une seule
-- facture (reutilise le systeme de facturation/paiement existant, pas de circuit separe).

ALTER TABLE "courses" ADD COLUMN "clientId" TEXT;
ALTER TABLE "courses" ADD COLUMN "montantFacturable" DECIMAL(12,2);
ALTER TABLE "courses" ADD COLUMN "factureId" TEXT;

CREATE INDEX "courses_clientId_idx" ON "courses"("clientId");
CREATE INDEX "courses_factureId_idx" ON "courses"("factureId");

ALTER TABLE "courses" ADD CONSTRAINT "courses_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "courses" ADD CONSTRAINT "courses_factureId_fkey" FOREIGN KEY ("factureId") REFERENCES "factures"("id") ON DELETE SET NULL ON UPDATE CASCADE;

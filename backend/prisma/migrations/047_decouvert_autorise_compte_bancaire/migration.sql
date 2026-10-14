-- Ajoute le decouvert autorise sur les comptes bancaires, utilise pour le
-- decrement atomique du solde lors d'un decaissement (caisse/compte/facture
-- fournisseur) : un compte bancaire peut descendre jusqu'a -decouvertAutorise,
-- une caisse (especes) ne peut jamais descendre sous 0.
ALTER TABLE "comptes_bancaires" ADD COLUMN "decouvertAutorise" DECIMAL(18,2) NOT NULL DEFAULT 0;

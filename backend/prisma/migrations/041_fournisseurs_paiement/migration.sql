-- Fournisseurs de paiement configurables depuis l'espace super-admin (plusieurs
-- agregateurs Mobile Money/carte possibles, un seul actif a la fois).

CREATE TABLE "fournisseurs_paiement" (
    "id" TEXT NOT NULL,
    "code" VARCHAR(30) NOT NULL,
    "nom" VARCHAR(100) NOT NULL,
    "actif" BOOLEAN NOT NULL DEFAULT false,
    "champs" JSONB,
    "ordre" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fournisseurs_paiement_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "fournisseurs_paiement_code_key" ON "fournisseurs_paiement"("code");

-- Les 4 fournisseurs geres par l'application, tous inactifs et sans identifiants au
-- depart : a configurer depuis Configuration > Fournisseurs de paiement.
INSERT INTO "fournisseurs_paiement" ("id", "code", "nom", "actif", "ordre", "updatedAt") VALUES
    (gen_random_uuid()::text, 'PAWAPAY', 'PawaPay', false, 1, NOW()),
    (gen_random_uuid()::text, 'CINETPAY', 'CinetPay', false, 2, NOW()),
    (gen_random_uuid()::text, 'FEDAPAY', 'FedaPay', false, 3, NOW()),
    (gen_random_uuid()::text, 'FLUTTERWAVE', 'Flutterwave', false, 4, NOW());

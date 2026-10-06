-- Contenu texte de la vitrine publique (page d'accueil, tarifs), editable depuis
-- l'espace super-admin sans toucher au code.

CREATE TABLE "contenu_vitrine" (
    "id" TEXT NOT NULL,
    "heroBadge" VARCHAR(200),
    "heroTitre" VARCHAR(300),
    "heroSousTitre" TEXT,
    "tarifsTitre" VARCHAR(300),
    "tarifsSousTitre" TEXT,
    "faq" JSONB,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "contenu_vitrine_pkey" PRIMARY KEY ("id")
);

-- Ligne unique initiale, pre-remplie avec le texte actuellement en dur dans le code
-- (frontend/src/app/page.tsx et frontend/src/app/tarifs/page.tsx), pour que la bascule
-- vers un contenu pilote par la base soit invisible tant que personne ne l'a modifie.
INSERT INTO "contenu_vitrine" ("id", "heroBadge", "heroTitre", "heroSousTitre", "tarifsTitre", "tarifsSousTitre", "faq", "updatedAt")
VALUES (
    gen_random_uuid()::text,
    'Fait pour les bureaux de transit en Côte d''Ivoire',
    'Le logiciel de gestion pour votre bureau de transit',
    'Dossiers, facturation, comptabilité OHADA, admissions temporaires, cautions, RH — tout en un seul endroit, accessible depuis n''importe où.',
    'Des tarifs simples et transparents',
    'Toutes les formules incluent 14 jours d''essai gratuit. Paiement par Mobile Money.',
    '[
      {"q":"Puis-je essayer avant de payer ?","r":"Oui, chaque formule démarre par 14 jours d’essai gratuit, sans engagement ni carte bancaire requise."},
      {"q":"Comment se fait le paiement ?","r":"Par Mobile Money (Orange, MTN, Moov, Wave) via PawaPay, directement depuis votre espace."},
      {"q":"Mes données sont-elles isolées des autres clients ?","r":"Oui, chaque bureau de transit dispose de son propre espace, totalement cloisonné des autres."},
      {"q":"Puis-je changer de formule plus tard ?","r":"Oui, à tout moment depuis votre espace, sans perte de données."}
    ]'::jsonb,
    NOW()
);

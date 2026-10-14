-- Remplace le verrouillage de compte permanent (deni de service par tentatives
-- echouees repetees sur un compte connu) par un verrouillage temporaire avec
-- backoff progressif. "verrouille" reste un indicateur de l'etat courant, mais
-- l'expiration reelle du verrouillage est portee par "verrouilleJusqua".
ALTER TABLE "utilisateurs" ADD COLUMN "verrouilleJusqua" TIMESTAMP(3);

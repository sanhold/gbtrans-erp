-- Garde-fou d'integrite comptable : le numero d'une ecriture etait genere via un compteur
-- (numerotation.compteur, increment atomique) mais rien n'empechait au niveau base de
-- donnees qu'une ecriture dupliquee (bug, retry applicatif, saisie manuelle concurrente)
-- recoive le meme numero au sein du meme exercice. Aucun doublon constate sur les
-- donnees actuelles (verifie avant migration) ; la contrainte rend desormais cette
-- situation impossible plutot que simplement improbable.

CREATE UNIQUE INDEX "ecritures_comptables_exerciceId_numero_key" ON "ecritures_comptables"("exerciceId", "numero");

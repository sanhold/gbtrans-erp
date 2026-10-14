import { Prisma } from '@prisma/client';

type TxClient = Prisma.TransactionClient;

/**
 * Débite une caisse (espèces) de façon atomique. Le solde d'une caisse ne peut
 * jamais devenir négatif : la mise à jour conditionnelle garantit qu'aucune
 * requête concurrente ne peut faire passer le solde sous 0.
 */
export async function debiterCaisse(tx: TxClient, caisseId: string, montant: number): Promise<void> {
  const resultat = await tx.caisse.updateMany({
    where: { id: caisseId, solde: { gte: montant } },
    data: { solde: { decrement: montant } },
  });
  if (resultat.count !== 1) {
    throw new Error('Solde de caisse insuffisant');
  }
}

/**
 * Débite un compte bancaire de façon atomique, en tolérant le découvert
 * autorisé du compte (solde - montant >= -decouvertAutorise). La comparaison
 * entre la colonne "solde" et la colonne "decouvertAutorise" n'est pas
 * exprimable avec le query builder Prisma (qui ne compare pas deux colonnes
 * entre elles) : on utilise donc un UPDATE SQL paramétré (aucune
 * concaténation de chaîne, uniquement des paramètres liés via le template
 * tag $executeRaw), ce qui reste atomique au niveau de la base de données.
 */
export async function debiterCompteBancaire(tx: TxClient, compteBancaireId: string, montant: number): Promise<void> {
  const nbLignes = await tx.$executeRaw`
    UPDATE "comptes_bancaires"
    SET "solde" = "solde" - ${montant}
    WHERE "id" = ${compteBancaireId}
      AND ("solde" - ${montant}) >= -"decouvertAutorise"
  `;
  if (nbLignes !== 1) {
    throw new Error('Solde insuffisant : le découvert autorisé de ce compte serait dépassé');
  }
}

/**
 * Débite un compte tiers de façon atomique. Pas de notion de découvert
 * autorisé pour ce type de compte : le solde ne peut pas devenir négatif.
 */
export async function debiterCompteTiers(tx: TxClient, compteTiersId: string, montant: number): Promise<void> {
  const resultat = await tx.compteTiers.updateMany({
    where: { id: compteTiersId, solde: { gte: montant } },
    data: { solde: { decrement: montant } },
  });
  if (resultat.count !== 1) {
    throw new Error('Solde insuffisant sur ce compte tiers');
  }
}

export interface CompteADebiter {
  caisseId?: string | null;
  compteBancaireId?: string | null;
  compteTiersId?: string | null;
}

/**
 * Débite, de façon atomique, la caisse ou le compte (bancaire ou tiers)
 * désigné parmi les trois identifiants fournis (un seul doit être renseigné).
 * Utilitaire partagé par les routes de dépenses, de paiements fournisseurs et
 * d'opérations financières.
 */
export async function debiterCompte(tx: TxClient, compte: CompteADebiter, montant: number): Promise<void> {
  if (compte.caisseId) return debiterCaisse(tx, compte.caisseId, montant);
  if (compte.compteBancaireId) return debiterCompteBancaire(tx, compte.compteBancaireId, montant);
  if (compte.compteTiersId) return debiterCompteTiers(tx, compte.compteTiersId, montant);
  throw new Error('Aucun compte à débiter spécifié');
}

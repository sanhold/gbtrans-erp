/** Montant entier au format français (espaces insécables entre les milliers). Source unique pour toute l'application. */
export const fmt = (n: any) => n != null ? new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(Number(n)) : '0';

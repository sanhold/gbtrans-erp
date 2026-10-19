/** Montant abrégé : "68 M", "1,28 Md" — l'unité (FCFA) est affichée à part. */
export function formatMontantAbrege(montant: number): { value: string; unit: string } {
  const abs = Math.abs(montant);
  const nf = (n: number, max: number) => n.toLocaleString('fr-FR', { maximumFractionDigits: max });
  if (abs >= 1_000_000_000) return { value: `${nf(montant / 1_000_000_000, 2)} Md`, unit: 'FCFA' };
  if (abs >= 1_000_000) return { value: `${nf(montant / 1_000_000, 0)} M`, unit: 'FCFA' };
  return { value: nf(Math.round(montant), 0), unit: 'FCFA' };
}

export const fmt = (n: any) => n != null ? new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(Number(n)) : '0';

export const emptyLigne = () => ({ compteId: '', libelle: '', debit: '', credit: '' });

export const emptyEcritureForm = () => ({
  journalId: '',
  dateEcriture: new Date().toISOString().slice(0, 10),
  libelle: '',
  reference: '',
  piece: '',
  lignes: [emptyLigne(), emptyLigne()],
});

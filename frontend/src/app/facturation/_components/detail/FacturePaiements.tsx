'use client';

import { fmt, MODE_PAIEMENT_LABELS } from './factureHelpers';

interface Props {
  paiements: any[];
  canPayer: boolean;
  onPayer: () => void;
}

/** Onglet « Paiements » : historique des affectations de paiement (tableau → cartes sur mobile). */
export default function FacturePaiements({ paiements, canPayer, onPayer }: Props) {
  if (paiements.length === 0) {
    return (
      <div className="card text-center py-10">
        <p className="text-sm text-gray-600 dark:text-gray-400">Aucun paiement enregistré pour cette facture</p>
        {canPayer && <button type="button" onClick={onPayer} className="btn-primary mt-3 max-md:w-full">Enregistrer un paiement</button>}
      </div>
    );
  }
  return (
    <div className="card">
      <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wide mb-3">Historique des paiements</h3>
      <div className="table-container">
        <table className="w-full text-sm">
          <thead><tr>
            <th className="table-header">Date</th><th className="table-header">N° Transaction</th>
            <th className="table-header">Mode</th><th className="table-header">Compte financier</th>
            <th className="table-header text-right">Montant</th><th className="table-header">Utilisateur</th>
            <th className="table-header">Observations</th>
          </tr></thead>
          <tbody>
            {paiements.map((aff: any) => {
              const p = aff.paiement;
              if (!p) return null;
              return (
                <tr key={aff.id} className="table-row">
                  <td className="table-cell text-xs" data-label="Date">{new Date(p.datePaiement).toLocaleDateString('fr-FR')}</td>
                  <td className="table-cell font-medium text-primary-600" data-label="N° Transaction">{p.numero}</td>
                  <td className="table-cell" data-label="Mode">{MODE_PAIEMENT_LABELS[p.modePaiement] || p.modePaiement}</td>
                  <td className="table-cell col-opt" data-label="Compte financier">{p.caisse?.libelle || p.compteBancaire?.libelle || '-'}</td>
                  <td className="table-cell text-right font-mono" data-label="Montant">{fmt(aff.montant)}</td>
                  <td className="table-cell col-opt" data-label="Utilisateur">{p.createur ? `${p.createur.nom} ${p.createur.prenom}` : '-'}</td>
                  <td className="table-cell col-opt text-xs" data-label="Observations">{p.observations || '-'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

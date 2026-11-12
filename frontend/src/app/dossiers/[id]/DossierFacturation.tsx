'use client';

import { useRouter } from 'next/navigation';
import { statutColors } from '@/lib/dossierStatut';
import { fmt, EmptyState } from './dossierShared';

const fmtDate = (d: any) => (d ? new Date(d).toLocaleDateString('fr-FR') : '-');

/** Onglet « Facturation » : proformas et factures liées au dossier. */
export default function DossierFacturation({ dossier }: { dossier: any }) {
  const router = useRouter();
  const proformas: any[] = dossier.proformas || [];
  const factures: any[] = dossier.factures || [];
  return (
    <div className="space-y-4">
      <section className="card" aria-labelledby="sec-proformas">
        <h3 id="sec-proformas" className="font-semibold mb-4">Proformas liées ({proformas.length})</h3>
        {proformas.length > 0 ? (
          <div className="table-container !shadow-none !border-0">
            <table className="w-full">
              <thead>
                <tr>
                  <th className="table-header">N° proforma</th>
                  <th className="table-header">Titre</th>
                  <th className="table-header text-right">Montant TTC</th>
                  <th className="table-header">Statut</th>
                  <th className="table-header">Date</th>
                </tr>
              </thead>
              <tbody>
                {proformas.map((p: any) => (
                  <tr key={p.id} className="table-row cursor-pointer" onClick={() => router.push(`/proformas/${p.id}`)}>
                    <td className="table-cell font-medium text-primary-600" data-label="N° proforma">{p.numero}</td>
                    <td className="table-cell text-xs col-opt" data-label="Titre">{p.titre || '-'}</td>
                    <td className="table-cell text-right font-mono" data-label="Montant TTC">{fmt(p.montantTTC)} F</td>
                    <td className="table-cell" data-label="Statut"><span className={`badge ${statutColors[p.statut] || 'badge-gray'}`}>{p.statut?.replace(/_/g, ' ')}</span></td>
                    <td className="table-cell text-xs col-opt" data-label="Date">{fmtDate(p.dateProforma)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState message="Aucune proforma liée à ce dossier." />
        )}
      </section>

      <section className="card" aria-labelledby="sec-factures">
        <h3 id="sec-factures" className="font-semibold mb-4">Factures liées ({factures.length})</h3>
        {factures.length > 0 ? (
          <div className="table-container !shadow-none !border-0">
            <table className="w-full">
              <thead>
                <tr>
                  <th className="table-header">N° facture</th>
                  <th className="table-header">Objet</th>
                  <th className="table-header text-right">Montant TTC</th>
                  <th className="table-header text-right">Payé</th>
                  <th className="table-header text-right">Reste</th>
                  <th className="table-header">Statut</th>
                  <th className="table-header">Date</th>
                </tr>
              </thead>
              <tbody>
                {factures.map((f: any) => (
                  <tr key={f.id} className="table-row">
                    <td className="table-cell font-medium text-primary-600" data-label="N° facture">{f.numero}</td>
                    <td className="table-cell text-xs col-opt" data-label="Objet">{f.objet || '-'}</td>
                    <td className="table-cell text-right font-mono" data-label="Montant TTC">{fmt(f.montantTTC)} F</td>
                    <td className="table-cell text-right font-mono text-green-700" data-label="Payé">{fmt(f.montantPaye)} F</td>
                    <td className="table-cell text-right font-mono text-red-600" data-label="Reste">{fmt(f.resteAPayer)} F</td>
                    <td className="table-cell" data-label="Statut"><span className={`badge ${statutColors[f.statut] || 'badge-gray'}`}>{f.statut?.replace(/_/g, ' ')}</span></td>
                    <td className="table-cell text-xs col-opt" data-label="Date">{fmtDate(f.dateFacture)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState message="Aucune facture liée à ce dossier." />
        )}
      </section>
    </div>
  );
}

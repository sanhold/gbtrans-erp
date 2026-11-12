'use client';

import Sheet from '@/components/ui/Sheet';
import { fmtFcfa } from './DevisFormSheet';

export const DEVIS_STATUT_LABEL: Record<string, string> = { BROUILLON: 'Brouillon', ENVOYE: 'Envoyé', ACCEPTE: 'Accepté', REFUSE: 'Refusé' };
export const DEVIS_STATUT_BADGE: Record<string, string> = { BROUILLON: 'badge-info', ENVOYE: 'badge-warning', ACCEPTE: 'badge-success', REFUSE: 'badge-danger' };
const fmtDate = (d: any) => d ? new Date(d).toLocaleDateString('fr-FR') : '-';

interface Props {
  detail: any;
  loading: boolean;
  busy: boolean;
  onClose: () => void;
  onEnvoyer: () => void;
  onAccepter: () => void;
  onRefuser: () => void;
  onSupprimer: () => void;
}

export default function DevisDetailSheet({ detail, loading, busy, onClose, onEnvoyer, onAccepter, onRefuser, onSupprimer }: Props) {
  const modifiable = detail && (detail.statut === 'BROUILLON' || detail.statut === 'ENVOYE');
  return (
    <Sheet
      open={!!detail} onClose={onClose} size="3xl"
      title={detail?.numero || 'Devis'}
      description={detail?.client ? `${detail.client.raisonSociale} — ${detail.objet || 'Devis transport'}` : undefined}
    >
      {loading || !detail ? (
        <div className="flex items-center justify-center py-16" role="status" aria-label="Chargement"><div className="animate-spin w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full" /></div>
      ) : (
        <div className="space-y-5">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <span className={`badge ${DEVIS_STATUT_BADGE[detail.statut]}`}>{DEVIS_STATUT_LABEL[detail.statut]}</span>
            <div className="flex items-center gap-2 flex-wrap">
              {detail.statut === 'BROUILLON' && <button type="button" onClick={onEnvoyer} disabled={busy} className="btn-secondary disabled:opacity-50">Marquer envoyé</button>}
              {modifiable && <button type="button" onClick={onAccepter} disabled={busy} className="btn-primary disabled:opacity-50">Accepter le devis</button>}
              {modifiable && <button type="button" onClick={onRefuser} disabled={busy} className="btn-secondary !text-red-600 disabled:opacity-50">Refuser</button>}
              {detail.statut === 'BROUILLON' && <button type="button" onClick={onSupprimer} className="btn-secondary">Supprimer</button>}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="card !py-3"><p className="text-xs text-gray-600 dark:text-gray-400">Montant total estimé</p><p className="text-xl font-bold text-primary-600">{fmtFcfa(detail.montantTotal)}</p></div>
            <div className="card !py-3"><p className="text-xs text-gray-600 dark:text-gray-400">Validité</p><p className="text-xl font-bold">{fmtDate(detail.dateValidite)}</p></div>
            <div className="card !py-3"><p className="text-xs text-gray-600 dark:text-gray-400">Créé par</p><p className="text-xl font-bold">{detail.createur?.prenom} {detail.createur?.nom}</p></div>
          </div>

          <div>
            <h3 className="text-sm font-semibold mb-3">Voyages prévus</h3>
            <div className="table-container">
              <table className="w-full text-sm">
                <thead><tr>
                  <th className="table-header">Trajet</th><th className="table-header">Marchandise</th><th className="table-header">Départ prévu</th><th className="table-header text-right">Montant estimé</th><th className="table-header">Course générée</th>
                </tr></thead>
                <tbody>
                  {detail.lignes?.map((l: any) => (
                    <tr key={l.id} className="table-row">
                      <td className="table-cell" data-label="Trajet">{l.origine} → {l.destination}</td>
                      <td className="table-cell" data-label="Marchandise">{l.designationMarchandise || '-'}</td>
                      <td className="table-cell" data-label="Départ prévu">{fmtDate(l.dateDepartPrevue)}</td>
                      <td className="table-cell text-right font-mono" data-label="Montant estimé">{fmtFcfa(l.montantEstime)}</td>
                      <td className="table-cell" data-label="Course générée">{l.course ? <span className="text-primary-600 font-mono text-xs">{l.course.numero}</span> : '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </Sheet>
  );
}

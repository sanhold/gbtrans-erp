'use client';

import { CI_FLAG, fmt, STATUT_COLORS } from './factureHelpers';

interface Props {
  facture: any;
  numeroNormalise: string;
  setNumeroNormalise: (v: string) => void;
  savingNumeroNormalise: boolean;
  onSaveNumeroNormalise: () => void;
  canSignature: boolean;
  onToggleSignature: (checked: boolean) => void;
}

function Kpi({ label, value, tone }: { label: string; value: React.ReactNode; tone?: string }) {
  return (
    <div className="card !p-3">
      <p className="text-[10px] font-bold uppercase tracking-wide text-gray-600 dark:text-gray-400">{label}</p>
      <p className={`mt-1 text-base font-bold font-mono truncate ${tone || 'text-gray-900 dark:text-white'}`}>{value}</p>
    </div>
  );
}

function Rows({ rows }: { rows: [string, React.ReactNode][] }) {
  return (
    <dl className="divide-y divide-gray-100 dark:divide-surface-700">
      {rows.map(([k, v]) => (
        <div key={k} className="flex justify-between gap-4 py-2 text-sm">
          <dt className="text-gray-600 dark:text-gray-400 flex-shrink-0">{k}</dt>
          <dd className="font-semibold text-gray-900 dark:text-white text-right min-w-0 break-words">{v}</dd>
        </div>
      ))}
    </dl>
  );
}

/** Onglet « Résumé » : chiffres clés, informations facture / client, n° normalisé, signature. */
export default function FactureResume({ facture, numeroNormalise, setNumeroNormalise, savingNumeroNormalise, onSaveNumeroNormalise, canSignature, onToggleSignature }: Props) {
  const d = facture.dossier;
  const c = facture.client;
  const isPaysCI = (c?.pays || '').toLowerCase().includes('ivoire');

  const infos = ([
    ['N° Facture', facture.numero],
    ['Date', new Date(facture.dateFacture).toLocaleDateString('fr-FR')],
    ['Réf. Dossier', d?.numeroPhysique || d?.numero],
    ['Titre', facture.titre],
  ] as [string, React.ReactNode][]).filter(([, v]) => v);

  const clientRows = ([
    ['Nom', c?.raisonSociale],
    ['Adresse', c?.adresse],
    ['Téléphone', c?.telephone || c?.mobile],
    ['Email', c?.email],
    ['N° Contribuable', c?.ncc],
    ['Pays', c?.pays ? <>{c.pays}{isPaysCI ? CI_FLAG : null}</> : null],
  ] as [string, React.ReactNode][]).filter(([, v]) => v);

  return (
    <div className="space-y-4">
      {facture.type === 'AVOIR' && facture.motifAvoir && (
        <div className="card !p-3 bg-amber-50 dark:bg-amber-900/10 border-amber-200 dark:border-amber-800 text-sm text-amber-800 dark:text-amber-300">
          Avoir — Motif : {facture.motifAvoir}
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Kpi label="Total TTC" value={`${fmt(facture.montantTTC)} F`} />
        <Kpi label="Payé" value={`${fmt(facture.montantPaye)} F`} tone="text-green-600" />
        <Kpi label="Reste à payer" value={`${fmt(facture.resteAPayer)} F`} tone="text-red-600" />
        <div className="card !p-3">
          <p className="text-[10px] font-bold uppercase tracking-wide text-gray-600 dark:text-gray-400">Statut</p>
          <p className="mt-1.5"><span className={`badge ${STATUT_COLORS[facture.statut] || 'badge-gray'}`}>{facture.statut?.replace(/_/g, ' ')}</span></p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <section className="card" aria-label="Informations de la facture">
          <h2 className="text-sm font-bold uppercase tracking-wide text-gray-900 dark:text-white mb-1">Facture</h2>
          <Rows rows={infos} />
        </section>
        <section className="card" aria-label="Client">
          <h2 className="text-sm font-bold uppercase tracking-wide text-gray-900 dark:text-white mb-1">Client</h2>
          <Rows rows={clientRows} />
        </section>
      </div>

      <section className="card space-y-3" aria-label="Options du document">
        <div>
          <label htmlFor="numero-normalise" className="label">N° facture normalisée</label>
          <div className="flex items-center gap-3">
            <input
              id="numero-normalise" type="text" value={numeroNormalise}
              onChange={e => setNumeroNormalise(e.target.value)}
              onBlur={onSaveNumeroNormalise}
              placeholder="Numéro reçu du système de facturation normalisée (DGI)"
              disabled={savingNumeroNormalise}
              className="input-field flex-1 min-w-0"
            />
            {savingNumeroNormalise && <span className="text-xs text-gray-600">Enregistrement...</span>}
          </div>
        </div>
        <label className={`flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 min-h-[44px] ${canSignature ? 'cursor-pointer' : 'cursor-not-allowed opacity-60'}`} title={!canSignature ? 'Permission requise : DOCUMENTS:SIGNATURE' : undefined}>
          <input type="checkbox" checked={!!facture.afficherSignature} disabled={!canSignature} onChange={e => onToggleSignature(e.target.checked)} className="w-5 h-5 rounded border-gray-300" />
          Afficher la signature sur le document
        </label>
      </section>
    </div>
  );
}

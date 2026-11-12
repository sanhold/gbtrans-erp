'use client';

import Sheet from '@/components/ui/Sheet';
import SheetActions from '@/components/forms/SheetActions';
import { SkeletonRows } from '@/components/ui/Skeleton';

const fmtDate = (d: any) => d ? new Date(d).toLocaleDateString('fr-FR') : '-';
export const ETAT_LABELS: Record<string, string> = { NON_APURE: 'Non apuré', EXPIRE: 'Expiré', APURE: 'Apuré' };

const RO = 'input-field bg-gray-100 dark:bg-surface-700';

function SignatureCheck({ canSignature, checked, onChange }: { canSignature: boolean; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className={`flex items-center gap-3 min-h-[44px] text-sm text-gray-700 dark:text-gray-300 w-fit ${canSignature ? 'cursor-pointer' : 'cursor-not-allowed opacity-50'}`} title={!canSignature ? 'Permission requise : DOCUMENTS:SIGNATURE' : undefined}>
      <input type="checkbox" checked={checked} disabled={!canSignature} onChange={e => onChange(e.target.checked)} className="rounded border-gray-300 w-5 h-5" />
      Afficher la signature sur le certificat
    </label>
  );
}

interface ProlongerState { nouvelleDateExpiration: string; nouveauNumeroDeclaration: string; afficherSignature: boolean }

export function ProlongationSheet({ at, form, setForm, canSignature, onClose, onSubmit }: {
  at: any; form: ProlongerState; setForm: (f: ProlongerState) => void; canSignature: boolean; onClose: () => void; onSubmit: (e: React.FormEvent) => void;
}) {
  return (
    <Sheet open={!!at} onClose={onClose} title="Fiche prolongation" size="2xl">
      {at && (
        <form onSubmit={onSubmit} className="space-y-4">
          <fieldset className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <legend className="sr-only">Situation actuelle</legend>
            <div><label className="label">Date déclaration</label><input type="text" readOnly value={fmtDate(at.dateDeclaration)} className={RO} /></div>
            <div><label className="label">Date échéance actuelle</label><input type="text" readOnly value={fmtDate(at.dateExpiration)} className={RO} /></div>
            <div><label className="label">Nature du dossier</label><input type="text" readOnly value={at.nature || '-'} className={RO} /></div>
            <div><label className="label">Désignation du document</label><input type="text" readOnly value={at.designation || '-'} className={RO} /></div>
            <div><label className="label">Dossier</label><input type="text" readOnly value={at.dossiers?.[0]?.numero || '-'} className={RO} /></div>
            <div><label className="label">État AT</label><input type="text" readOnly value={ETAT_LABELS[at.etat]} className={RO} /></div>
            <div className="sm:col-span-2"><label className="label">N° ancienne déclaration</label><input type="text" readOnly value={at.declarationEntree || '-'} className={RO} /></div>
          </fieldset>
          <fieldset className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-gray-200 dark:border-surface-700">
            <legend className="sr-only">Prolongation</legend>
            <div>
              <label className="label text-amber-700 font-semibold">Nouvelle date échéance *</label>
              <input type="date" value={form.nouvelleDateExpiration} onChange={e => setForm({ ...form, nouvelleDateExpiration: e.target.value })} className="input-field !bg-amber-50 dark:!bg-amber-900/20 border-amber-300" required />
            </div>
            <div>
              <label className="label text-amber-700 font-semibold">N° nouvelle déclaration *</label>
              <input type="text" value={form.nouveauNumeroDeclaration} onChange={e => setForm({ ...form, nouveauNumeroDeclaration: e.target.value })} className="input-field !bg-amber-50 dark:!bg-amber-900/20 border-amber-300" required />
            </div>
          </fieldset>
          <SignatureCheck canSignature={canSignature} checked={form.afficherSignature} onChange={v => setForm({ ...form, afficherSignature: v })} />
          <SheetActions onCancel={onClose} submitLabel="Valider" />
        </form>
      )}
    </Sheet>
  );
}

interface ApurerState { dateApurement: string; referenceApurement: string; afficherSignature: boolean }

export function ApurementSheet({ at, form, setForm, canSignature, onClose, onSubmit }: {
  at: any; form: ApurerState; setForm: (f: ApurerState) => void; canSignature: boolean; onClose: () => void; onSubmit: (e: React.FormEvent) => void;
}) {
  return (
    <Sheet open={!!at} onClose={onClose} title="Fiche apurement" size="md">
      {at && (
        <form onSubmit={onSubmit} className="space-y-4">
          <div><label className="label">Dossier</label><input type="text" readOnly value={at.dossiers?.[0]?.numero || '-'} className={RO} /></div>
          <div><label className="label">Désignation</label><input type="text" readOnly value={at.designation || '-'} className={RO} /></div>
          <div>
            <label className="label text-red-700 font-semibold">Date d&apos;apurement *</label>
            <input type="date" value={form.dateApurement} onChange={e => setForm({ ...form, dateApurement: e.target.value })} className="input-field !bg-red-50 dark:!bg-red-900/20 border-red-300" required />
          </div>
          <div><label className="label">Référence apurement</label><input type="text" value={form.referenceApurement} onChange={e => setForm({ ...form, referenceApurement: e.target.value })} className="input-field" /></div>
          <SignatureCheck canSignature={canSignature} checked={form.afficherSignature} onChange={v => setForm({ ...form, afficherSignature: v })} />
          <SheetActions onCancel={onClose} variant="success" submitLabel="Valider" />
        </form>
      )}
    </Sheet>
  );
}

export function HistoriqueProlongationsSheet({ at, list, loading, onClose }: { at: any; list: any[]; loading: boolean; onClose: () => void }) {
  return (
    <Sheet open={!!at} onClose={onClose} title="Historique des prolongations" description={at?.numero} size="3xl">
      <div className="table-container !shadow-none !border-0">
        <table className="w-full">
          <thead>
            <tr>
              <th className="table-header">Date prolongation</th>
              <th className="table-header">Ancienne échéance</th>
              <th className="table-header">Nouvelle échéance</th>
              <th className="table-header">Ancien N° déclaration</th>
              <th className="table-header">Nouveau N° déclaration</th>
              <th className="table-header text-center">Durée ajoutée</th>
              <th className="table-header">Utilisateur</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <SkeletonRows cols={7} />
            ) : list.length === 0 ? (
              <tr><td colSpan={7} className="text-center py-12 text-gray-500">Aucune prolongation enregistrée pour cette AT</td></tr>
            ) : list.map(h => (
              <tr key={h.id} className="table-row">
                <td className="table-cell text-xs" data-label="Date prolongation">{fmtDate(h.dateProlongation)}</td>
                <td className="table-cell text-xs" data-label="Ancienne échéance">{fmtDate(h.ancienneDateExpiration)}</td>
                <td className="table-cell text-xs font-medium text-primary-600" data-label="Nouvelle échéance">{fmtDate(h.nouvelleDateExpiration)}</td>
                <td className="table-cell col-opt font-mono text-xs" data-label="Ancien N° déclaration">{h.ancienNumeroDeclaration || '-'}</td>
                <td className="table-cell font-mono text-xs font-medium text-primary-600" data-label="Nouveau N° déclaration">{h.nouveauNumeroDeclaration}</td>
                <td className="table-cell text-center" data-label="Durée ajoutée">{h.dureeProlongationJours} jours</td>
                <td className="table-cell col-opt text-xs" data-label="Utilisateur">{h.utilisateur || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Sheet>
  );
}

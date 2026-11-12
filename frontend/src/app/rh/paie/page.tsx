'use client';

import { SkeletonRows } from '@/components/ui/Skeleton';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import AppLayout from '@/components/layout/AppLayout';
import { rhApi } from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';
import toast from 'react-hot-toast';
import PageHeader from '@/components/ui/PageHeader';
import Sheet from '@/components/ui/Sheet';
import { useConfirm } from '@/components/ui/ConfirmDialog';
import EmptyRow from '@/components/tables/EmptyRow';

const MOIS_LABELS = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
const STATUT_COLORS: Record<string, string> = { BROUILLON: 'badge-gray', VALIDE: 'badge-info', PAYE: 'badge-success' };
const MODE_PAIEMENT_LABELS: Record<string, string> = {
  ESPECES: 'Espèces', CHEQUE: 'Chèque', VIREMENT: 'Virement', TRAITE: 'Traite',
  MOBILE_MONEY: 'Mobile Money', ORANGE_MONEY: 'Orange Money', MTN_MONEY: 'MTN Money',
  WAVE: 'Wave', MOOV_MONEY: 'Moov Money', CARTE_BANCAIRE: 'Carte bancaire', COMPENSATION: 'Compensation',
};

const fmt = (n: any) => n != null ? new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(Number(n)) : '0';
const now = new Date();

export default function PaiePage() {
  const { hasPermission } = useAuthStore();
  const canSeeMontants = hasPermission('RH:VOIR_MONTANTS');
  const money = (n: any) => (canSeeMontants ? fmt(n) : '•••••••');
  const [mois, setMois] = useState(now.getMonth() + 1);
  const [annee, setAnnee] = useState(now.getFullYear());
  const [bulletins, setBulletins] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const confirmer = useConfirm();
  const [selected, setSelected] = useState<any>(null);
  const [showPayer, setShowPayer] = useState(false);
  const [payerForm, setPayerForm] = useState({ modePaiement: 'VIREMENT', datePaiement: new Date().toISOString().slice(0, 10) });

  const load = () => {
    setLoading(true);
    rhApi.bulletins.list({ periodeMois: mois, periodeAnnee: annee })
      .then(r => setBulletins(r.data.data || []))
      .catch(() => toast.error('Erreur de chargement'))
      .finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, [mois, annee]);

  const handleGenerer = async () => {
    if (!(await confirmer({ titre: `Générer les bulletins de ${MOIS_LABELS[mois - 1]} ${annee} ?`, message: 'Les employés déjà traités pour cette période seront ignorés.', confirmer: 'Générer' }))) return;
    setGenerating(true);
    try {
      const res = await rhApi.bulletins.generer(mois, annee);
      toast.success(res.data.message);
      load();
    } catch (e: any) { toast.error(e.response?.data?.message || 'Erreur'); }
    finally { setGenerating(false); }
  };

  const openDetail = async (id: string) => {
    try { const res = await rhApi.bulletins.get(id); setSelected(res.data.data); }
    catch { toast.error('Erreur de chargement du bulletin'); }
  };

  const handleValider = async (id: string) => {
    try {
      await rhApi.bulletins.valider(id);
      toast.success('Bulletin validé');
      load();
      if (selected?.id === id) openDetail(id);
    } catch (e: any) { toast.error(e.response?.data?.message || 'Erreur'); }
  };

  const handlePayer = async (ev: React.FormEvent) => {
    ev.preventDefault();
    try {
      await rhApi.bulletins.payer(selected.id, payerForm.modePaiement, payerForm.datePaiement);
      toast.success('Bulletin marqué payé');
      setShowPayer(false);
      load();
      openDetail(selected.id);
    } catch (e: any) { toast.error(e.response?.data?.message || 'Erreur'); }
  };

  const handleSupprimer = async (id: string) => {
    if (!(await confirmer({ titre: 'Supprimer ce bulletin ?', message: 'Seul le brouillon est supprimé.', danger: true, confirmer: 'Supprimer' }))) return;
    try { await rhApi.bulletins.delete(id); toast.success('Bulletin supprimé'); setSelected(null); load(); }
    catch (e: any) { toast.error(e.response?.data?.message || 'Erreur'); }
  };

  const totaux = bulletins.reduce((acc, b) => ({
    brut: acc.brut + Number(b.salaireBrut), net: acc.net + Number(b.salaireNet),
    cnps: acc.cnps + Number(b.cnpsSalarie) + Number(b.cnpsPatronal), its: acc.its + Number(b.itsSalarie),
    coutTotal: acc.coutTotal + Number(b.coutTotalEmployeur),
  }), { brut: 0, net: 0, cnps: 0, its: 0, coutTotal: 0 });

  return (
    <AppLayout>
      <div className="space-y-4">
        <PageHeader title="Paie" actions={<Link href="/rh/employes" className="btn-secondary">Employés</Link>} />
        <div className="flex flex-wrap items-center gap-2">
          <select value={mois} onChange={e => setMois(parseInt(e.target.value))} aria-label="Mois" className="input-field !w-auto flex-1 sm:flex-none">
            {MOIS_LABELS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
          </select>
          <select value={annee} onChange={e => setAnnee(parseInt(e.target.value))} aria-label="Année" className="input-field !w-auto flex-1 sm:flex-none">
            {[annee - 1, annee, annee + 1].map(a => <option key={a} value={a}>{a}</option>)}
          </select>
          <button type="button" onClick={handleGenerer} disabled={generating} className="btn-primary disabled:opacity-50 w-full sm:w-auto">
            {generating ? 'Génération...' : `Générer les bulletins de ${MOIS_LABELS[mois - 1]}`}
          </button>
        </div>
        <p className="text-xs text-gray-600 dark:text-gray-400 italic">Barème CNPS/ITS indicatif — à faire vérifier par un expert-comptable</p>

        {bulletins.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="stat-card !p-3"><p className="text-[11px] text-gray-600 dark:text-gray-400 uppercase">Masse brute</p><p className="text-sm font-bold">{money(totaux.brut)} F</p></div>
            <div className="stat-card !p-3"><p className="text-[11px] text-gray-600 dark:text-gray-400 uppercase">CNPS (salarié+patronal)</p><p className="text-sm font-bold text-amber-600">{money(totaux.cnps)} F</p></div>
            <div className="stat-card !p-3"><p className="text-[11px] text-gray-600 dark:text-gray-400 uppercase">ITS retenu</p><p className="text-sm font-bold text-amber-600">{money(totaux.its)} F</p></div>
            <div className="stat-card !p-3"><p className="text-[11px] text-gray-600 dark:text-gray-400 uppercase">Coût total employeur</p><p className="text-sm font-bold text-primary-700">{money(totaux.coutTotal)} F</p></div>
          </div>
        )}

        <div className="table-container">
          <table className="w-full">
            <thead><tr>
              <th className="table-header">Actions</th>
              <th className="table-header">N° Bulletin</th>
              <th className="table-header">Employé</th>
              <th className="table-header">Poste</th>
              <th className="table-header text-right">Brut</th>
              <th className="table-header text-right">CNPS</th>
              <th className="table-header text-right">ITS</th>
              <th className="table-header text-right">Net à payer</th>
              <th className="table-header">Statut</th>
            </tr></thead>
            <tbody>
              {loading ? (
                <SkeletonRows cols={9} />
              ) : bulletins.length === 0 ? (
                <EmptyRow colSpan={9} message="Aucun bulletin pour cette période." ctaLabel={`Générer les bulletins de ${MOIS_LABELS[mois - 1]}`} onCta={handleGenerer} />
              ) : bulletins.map(b => (
                <tr key={b.id} className="table-row cursor-pointer" onClick={() => openDetail(b.id)}>
                  <td className="table-cell" data-label="Actions">
                    <button onClick={(e) => { e.stopPropagation(); openDetail(b.id); }} className="text-sm font-medium text-primary-600 hover:underline px-2 py-1.5">Voir</button>
                  </td>
                  <td className="table-cell font-mono font-medium text-primary-600" data-label="N° Bulletin">{b.numero}</td>
                  <td className="table-cell" data-label="Employé">{b.employe?.prenom} {b.employe?.nom}</td>
                  <td className="table-cell col-opt" data-label="Poste" title={b.employe?.poste}>{b.employe?.poste}</td>
                  <td className="table-cell text-right font-mono" data-label="Brut">{money(b.salaireBrut)}</td>
                  <td className="table-cell text-right font-mono text-amber-600" data-label="CNPS">{money(b.cnpsSalarie)}</td>
                  <td className="table-cell text-right font-mono text-amber-600" data-label="ITS">{money(b.itsSalarie)}</td>
                  <td className="table-cell text-right font-mono font-bold" data-label="Net à payer">{money(b.salaireNet)}</td>
                  <td className="table-cell" data-label="Statut"><span className={`badge ${STATUT_COLORS[b.statut] || 'badge-gray'} `}>{b.statut}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Détail bulletin */}
      <Sheet
        open={!!selected} onClose={() => setSelected(null)} size="lg"
        title={selected ? `Bulletin ${selected.numero}` : 'Bulletin'}
        description={selected ? `${MOIS_LABELS[selected.periodeMois - 1]} ${selected.periodeAnnee}` : undefined}
      >
        {selected && (
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="font-bold text-gray-900 dark:text-white">{selected.employe?.prenom} {selected.employe?.nom}</p>
                <p className="text-xs text-gray-600 dark:text-gray-400">{selected.employe?.poste} — Matricule {selected.employe?.matricule}</p>
              </div>
              <span className={`badge ${STATUT_COLORS[selected.statut] || 'badge-gray'}`}>{selected.statut}</span>
            </div>

            <table className="w-full text-sm border border-gray-100 dark:border-surface-700 rounded-lg overflow-hidden">
              <tbody>
                <tr className="border-b border-gray-100 dark:border-surface-700"><td className="px-3 py-2 text-gray-600 dark:text-gray-400">Salaire de base</td><td className="px-3 py-2 text-right font-mono">{money(selected.salaireBase)}</td></tr>
                {Number(selected.primes) > 0 && <tr className="border-b border-gray-100 dark:border-surface-700"><td className="px-3 py-2 text-gray-600 dark:text-gray-400">Primes</td><td className="px-3 py-2 text-right font-mono">{money(selected.primes)}</td></tr>}
                {Number(selected.indemnites) > 0 && <tr className="border-b border-gray-100 dark:border-surface-700"><td className="px-3 py-2 text-gray-600 dark:text-gray-400">Indemnités</td><td className="px-3 py-2 text-right font-mono">{money(selected.indemnites)}</td></tr>}
                <tr className="border-b border-gray-100 dark:border-surface-700 font-bold bg-gray-50 dark:bg-surface-700/40"><td className="px-3 py-2">Salaire brut</td><td className="px-3 py-2 text-right font-mono">{money(selected.salaireBrut)}</td></tr>
                <tr className="border-b border-gray-100 dark:border-surface-700"><td className="px-3 py-2 text-gray-600 dark:text-gray-400">CNPS salarié (6,3%)</td><td className="px-3 py-2 text-right font-mono text-red-600">-{money(selected.cnpsSalarie)}</td></tr>
                <tr className="border-b border-gray-100 dark:border-surface-700"><td className="px-3 py-2 text-gray-600 dark:text-gray-400">ITS</td><td className="px-3 py-2 text-right font-mono text-red-600">-{money(selected.itsSalarie)}</td></tr>
                {Number(selected.autresRetenues) > 0 && <tr className="border-b border-gray-100 dark:border-surface-700"><td className="px-3 py-2 text-gray-600 dark:text-gray-400">Autres retenues</td><td className="px-3 py-2 text-right font-mono text-red-600">-{money(selected.autresRetenues)}</td></tr>}
                {Number(selected.avance) > 0 && <tr className="border-b border-gray-100 dark:border-surface-700"><td className="px-3 py-2 text-gray-600 dark:text-gray-400">Avance sur salaire</td><td className="px-3 py-2 text-right font-mono text-red-600">-{money(selected.avance)}</td></tr>}
                <tr><td colSpan={2} className="p-0">
                  <div className="bg-gradient-to-br from-primary-600 to-primary-800 text-white flex justify-between px-3 py-2.5 font-extrabold">
                    <span>NET À PAYER</span><span className="font-mono">{money(selected.salaireNet)} XOF</span>
                  </div>
                </td></tr>
              </tbody>
            </table>

            <div className="text-xs text-gray-600 dark:text-gray-400 flex flex-wrap justify-between gap-x-4">
              <span>CNPS patronal : {money(selected.cnpsPatronal)} F</span>
              <span>Coût total employeur : {money(selected.coutTotalEmployeur)} F</span>
            </div>

            {selected.statut === 'PAYE' && (
              <p className="text-sm text-green-700 dark:text-green-400">Payé le {new Date(selected.datePaiement).toLocaleDateString('fr-FR')} — {MODE_PAIEMENT_LABELS[selected.modePaiement] || selected.modePaiement}</p>
            )}

            <div className="sticky bottom-0 -mx-4 -mb-4 px-4 py-3 flex flex-wrap justify-end gap-2 bg-white dark:bg-surface-800 border-t border-gray-200 dark:border-surface-700">
              {selected.statut === 'BROUILLON' && <button type="button" onClick={() => handleSupprimer(selected.id)} className="btn-secondary !text-red-600 sm:mr-auto">Supprimer</button>}
              {selected.statut === 'BROUILLON' && <button type="button" onClick={() => handleValider(selected.id)} className="btn-primary">Valider</button>}
              {selected.statut === 'VALIDE' && <button type="button" onClick={() => setShowPayer(true)} className="btn-primary">Marquer payé</button>}
              <button type="button" onClick={() => window.print()} className="btn-secondary">Imprimer</button>
            </div>
          </div>
        )}
      </Sheet>

      {/* Paiement */}
      <Sheet open={showPayer && !!selected} onClose={() => setShowPayer(false)} size="sm" title="Marquer payé" zIndexClass="z-[70]">
        {selected && (
          <form onSubmit={handlePayer} className="space-y-3">
            <p className="text-sm text-gray-600 dark:text-gray-400">Net à payer : <span className="font-mono font-bold text-gray-900 dark:text-white">{money(selected.salaireNet)} XOF</span></p>
            <div><label className="label">Mode de paiement</label>
              <select value={payerForm.modePaiement} onChange={e => setPayerForm({ ...payerForm, modePaiement: e.target.value })} className="input-field">
                {Object.entries(MODE_PAIEMENT_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div><label className="label">Date de paiement</label><input type="date" value={payerForm.datePaiement} onChange={e => setPayerForm({ ...payerForm, datePaiement: e.target.value })} className="input-field" /></div>
            <div className="sticky bottom-0 -mx-4 -mb-4 px-4 py-3 flex flex-col-reverse sm:flex-row sm:justify-end gap-2 bg-white dark:bg-surface-800 border-t border-gray-200 dark:border-surface-700">
              <button type="button" onClick={() => setShowPayer(false)} className="btn-secondary">Annuler</button>
              <button type="submit" className="btn-primary">Confirmer le paiement</button>
            </div>
          </form>
        )}
      </Sheet>
    </AppLayout>
  );
}

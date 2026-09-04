'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import AppLayout from '@/components/layout/AppLayout';
import { rhApi } from '@/lib/api';
import toast from 'react-hot-toast';

const MOIS_LABELS = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
const STATUT_COLORS: Record<string, string> = { BROUILLON: 'badge-gray', VALIDE: 'badge-info', PAYE: 'badge-success' };
const MODE_PAIEMENT_LABELS: Record<string, string> = {
  ESPECES: 'Espèces', CHEQUE: 'Chèque', VIREMENT: 'Virement', TRAITE: 'Traite',
  MOBILE_MONEY: 'Mobile Money', ORANGE_MONEY: 'Orange Money', MTN_MONEY: 'MTN Money',
  WAVE: 'Wave', MOOV_MONEY: 'Moov Money', CARTE_BANCAIRE: 'Carte bancaire', COMPENSATION: 'Compensation',
};

const fmt = (n: any) => n != null ? new Intl.NumberFormat('fr-FR').format(Number(n)) : '0';
const now = new Date();

export default function PaiePage() {
  const [mois, setMois] = useState(now.getMonth() + 1);
  const [annee, setAnnee] = useState(now.getFullYear());
  const [bulletins, setBulletins] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
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
    if (!confirm(`Générer les bulletins de paie pour ${MOIS_LABELS[mois - 1]} ${annee} ? Les employés déjà traités pour cette période seront ignorés.`)) return;
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
    if (!confirm('Supprimer ce bulletin (brouillon) ?')) return;
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
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Paie</h1>
            <p className="text-sm text-gray-500">Génération et suivi des bulletins de paie mensuels</p>
          </div>
          <Link href="/rh/employes" className="btn-secondary text-sm">Employés</Link>
        </div>

        <div className="card !p-3 flex items-center gap-3 flex-wrap">
          <select value={mois} onChange={e => setMois(parseInt(e.target.value))} className="input-field !w-auto text-sm">
            {MOIS_LABELS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
          </select>
          <select value={annee} onChange={e => setAnnee(parseInt(e.target.value))} className="input-field !w-auto text-sm">
            {[annee - 1, annee, annee + 1].map(a => <option key={a} value={a}>{a}</option>)}
          </select>
          <button onClick={handleGenerer} disabled={generating} className="btn-primary text-sm disabled:opacity-50">
            {generating ? 'Génération...' : `Générer les bulletins de ${MOIS_LABELS[mois - 1]}`}
          </button>
          <span className="text-xs text-gray-400 italic ml-auto">
            Barème CNPS/ITS indicatif — à faire vérifier par un expert-comptable
          </span>
        </div>

        {bulletins.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="stat-card !p-3"><p className="text-[10px] text-gray-500 uppercase">Masse brute</p><p className="text-sm font-bold">{fmt(totaux.brut)} F</p></div>
            <div className="stat-card !p-3"><p className="text-[10px] text-gray-500 uppercase">CNPS (salarié+patronal)</p><p className="text-sm font-bold text-amber-600">{fmt(totaux.cnps)} F</p></div>
            <div className="stat-card !p-3"><p className="text-[10px] text-gray-500 uppercase">ITS retenu</p><p className="text-sm font-bold text-amber-600">{fmt(totaux.its)} F</p></div>
            <div className="stat-card !p-3"><p className="text-[10px] text-gray-500 uppercase">Coût total employeur</p><p className="text-sm font-bold text-primary-700">{fmt(totaux.coutTotal)} F</p></div>
          </div>
        )}

        <div className="table-container">
          <table className="w-full">
            <thead><tr>
              <th className="table-header">N° Bulletin</th><th className="table-header">Employé</th><th className="table-header">Poste</th>
              <th className="table-header text-right">Brut</th><th className="table-header text-right">CNPS</th>
              <th className="table-header text-right">ITS</th><th className="table-header text-right">Net à payer</th>
              <th className="table-header">Statut</th><th className="table-header">Actions</th>
            </tr></thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={9} className="text-center py-12 text-gray-500"><div className="animate-spin w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full mx-auto" /></td></tr>
              ) : bulletins.length === 0 ? (
                <tr><td colSpan={9} className="text-center py-12 text-gray-500">Aucun bulletin pour cette période. Cliquez sur &quot;Générer&quot;.</td></tr>
              ) : bulletins.map(b => (
                <tr key={b.id} className="table-row cursor-pointer" onClick={() => openDetail(b.id)}>
                  <td className="table-cell font-mono text-xs font-medium text-primary-600" data-label="N° Bulletin">{b.numero}</td>
                  <td className="table-cell" data-label="Employé">{b.employe?.prenom} {b.employe?.nom}</td>
                  <td className="table-cell text-xs" data-label="Poste">{b.employe?.poste}</td>
                  <td className="table-cell text-right font-mono" data-label="Brut">{fmt(b.salaireBrut)}</td>
                  <td className="table-cell text-right font-mono text-amber-600" data-label="CNPS">{fmt(b.cnpsSalarie)}</td>
                  <td className="table-cell text-right font-mono text-amber-600" data-label="ITS">{fmt(b.itsSalarie)}</td>
                  <td className="table-cell text-right font-mono font-bold" data-label="Net à payer">{fmt(b.salaireNet)}</td>
                  <td className="table-cell" data-label="Statut"><span className={`badge ${STATUT_COLORS[b.statut] || 'badge-gray'}`}>{b.statut}</span></td>
                  <td className="table-cell" data-label="Actions">
                    <button onClick={(e) => { e.stopPropagation(); openDetail(b.id); }} className="text-xs text-primary-500 hover:underline">Voir</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal détail bulletin */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 animate-fade-in p-4">
          <div className="bg-white dark:bg-surface-800 rounded-xl shadow-elevated w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-surface-700">
              <div>
                <h3 className="font-bold text-lg">Bulletin {selected.numero}</h3>
                <p className="text-xs text-gray-500">{MOIS_LABELS[selected.periodeMois - 1]} {selected.periodeAnnee}</p>
              </div>
              <button onClick={() => setSelected(null)} className="p-1 rounded hover:bg-gray-100"><svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
            </div>
            <div className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-bold text-gray-900 dark:text-white">{selected.employe?.prenom} {selected.employe?.nom}</p>
                  <p className="text-xs text-gray-500">{selected.employe?.poste} — Matricule {selected.employe?.matricule}</p>
                </div>
                <span className={`badge ${STATUT_COLORS[selected.statut] || 'badge-gray'}`}>{selected.statut}</span>
              </div>

              <table className="w-full text-sm border border-gray-100 dark:border-surface-700 rounded-lg overflow-hidden">
                <tbody>
                  <tr className="border-b border-gray-100 dark:border-surface-700"><td className="px-3 py-1.5 text-gray-500">Salaire de base</td><td className="px-3 py-1.5 text-right font-mono">{fmt(selected.salaireBase)}</td></tr>
                  {Number(selected.primes) > 0 && <tr className="border-b border-gray-100 dark:border-surface-700"><td className="px-3 py-1.5 text-gray-500">Primes</td><td className="px-3 py-1.5 text-right font-mono">{fmt(selected.primes)}</td></tr>}
                  {Number(selected.indemnites) > 0 && <tr className="border-b border-gray-100 dark:border-surface-700"><td className="px-3 py-1.5 text-gray-500">Indemnités</td><td className="px-3 py-1.5 text-right font-mono">{fmt(selected.indemnites)}</td></tr>}
                  <tr className="border-b border-gray-100 dark:border-surface-700 font-bold bg-gray-50 dark:bg-surface-700/40"><td className="px-3 py-1.5">Salaire brut</td><td className="px-3 py-1.5 text-right font-mono">{fmt(selected.salaireBrut)}</td></tr>
                  <tr className="border-b border-gray-100 dark:border-surface-700"><td className="px-3 py-1.5 text-gray-500">CNPS salarié (6,3%)</td><td className="px-3 py-1.5 text-right font-mono text-red-600">-{fmt(selected.cnpsSalarie)}</td></tr>
                  <tr className="border-b border-gray-100 dark:border-surface-700"><td className="px-3 py-1.5 text-gray-500">ITS</td><td className="px-3 py-1.5 text-right font-mono text-red-600">-{fmt(selected.itsSalarie)}</td></tr>
                  {Number(selected.autresRetenues) > 0 && <tr className="border-b border-gray-100 dark:border-surface-700"><td className="px-3 py-1.5 text-gray-500">Autres retenues</td><td className="px-3 py-1.5 text-right font-mono text-red-600">-{fmt(selected.autresRetenues)}</td></tr>}
                  {Number(selected.avance) > 0 && <tr className="border-b border-gray-100 dark:border-surface-700"><td className="px-3 py-1.5 text-gray-500">Avance sur salaire</td><td className="px-3 py-1.5 text-right font-mono text-red-600">-{fmt(selected.avance)}</td></tr>}
                  <tr><td colSpan={2} className="p-0">
                    <div className="bg-gradient-to-br from-primary-600 to-primary-800 text-white flex justify-between px-3 py-2.5 font-extrabold">
                      <span>NET À PAYER</span><span className="font-mono">{fmt(selected.salaireNet)} XOF</span>
                    </div>
                  </td></tr>
                </tbody>
              </table>

              <div className="text-xs text-gray-400 flex justify-between">
                <span>CNPS patronal : {fmt(selected.cnpsPatronal)} F</span>
                <span>Coût total employeur : {fmt(selected.coutTotalEmployeur)} F</span>
              </div>

              {selected.statut === 'PAYE' && (
                <p className="text-xs text-green-600">Payé le {new Date(selected.datePaiement).toLocaleDateString('fr-FR')} — {MODE_PAIEMENT_LABELS[selected.modePaiement] || selected.modePaiement}</p>
              )}

              <div className="flex justify-end gap-2 pt-3 border-t border-gray-200 dark:border-surface-700">
                {selected.statut === 'BROUILLON' && <button onClick={() => handleSupprimer(selected.id)} className="btn-secondary !text-red-600 text-sm mr-auto">Supprimer</button>}
                {selected.statut === 'BROUILLON' && <button onClick={() => handleValider(selected.id)} className="btn-primary text-sm">Valider</button>}
                {selected.statut === 'VALIDE' && <button onClick={() => setShowPayer(true)} className="btn-primary text-sm">Marquer payé</button>}
                <button onClick={() => window.print()} className="btn-secondary text-sm">Imprimer</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal paiement */}
      {showPayer && selected && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 animate-fade-in">
          <div className="bg-white dark:bg-surface-800 rounded-xl shadow-elevated w-full max-w-sm mx-4">
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-surface-700">
              <h3 className="font-bold text-lg">Marquer payé</h3>
              <button onClick={() => setShowPayer(false)} className="p-1 rounded hover:bg-gray-100"><svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
            </div>
            <form onSubmit={handlePayer} className="p-4 space-y-3">
              <p className="text-sm text-gray-500">Net à payer : <span className="font-mono font-bold text-gray-900 dark:text-white">{fmt(selected.salaireNet)} XOF</span></p>
              <div><label className="label">Mode de paiement</label>
                <select value={payerForm.modePaiement} onChange={e => setPayerForm({ ...payerForm, modePaiement: e.target.value })} className="input-field">
                  {Object.entries(MODE_PAIEMENT_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
              <div><label className="label">Date de paiement</label><input type="date" value={payerForm.datePaiement} onChange={e => setPayerForm({ ...payerForm, datePaiement: e.target.value })} className="input-field" /></div>
              <div className="flex justify-end gap-2 pt-3 border-t border-gray-200 dark:border-surface-700">
                <button type="button" onClick={() => setShowPayer(false)} className="btn-secondary text-sm">Annuler</button>
                <button type="submit" className="btn-primary text-sm">Confirmer le paiement</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppLayout>
  );
}

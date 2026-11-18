'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import AppLayout from '@/components/layout/AppLayout';
import PageHeader from '@/components/ui/PageHeader';
import EmptyState from '@/components/ui/EmptyState';
import KpiCard from '@/components/dashboard/KpiCard';
import ListeResponsive from '@/components/tables/ListeResponsive';
import BoutonIcone, { IconeVoir } from '@/components/tables/BoutonIcone';
import { Numero, Tronque, Tiers, Montant, StatutPastille, tonDepuisBadge } from '@/components/tables/cellules';
import { rhApi } from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';
import toast from 'react-hot-toast';

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
  const [selected, setSelected] = useState<any>(null);
  const [showPayer, setShowPayer] = useState(false);
  const [payerForm, setPayerForm] = useState({ modePaiement: 'VIREMENT', datePaiement: new Date().toISOString().slice(0, 10) });

  const load = useCallback(() => {
    setLoading(true);
    rhApi.bulletins.list({ periodeMois: mois, periodeAnnee: annee })
      .then(r => setBulletins(r.data.data || []))
      .catch(() => toast.error('Erreur de chargement'))
      .finally(() => setLoading(false));
  }, [mois, annee]);
  useEffect(() => { load(); }, [load]);

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
        <PageHeader
          titre="Paie"
          sousTitre={`Bulletins de ${MOIS_LABELS[mois - 1]} ${annee}`}
          icone="M3 7h18v12H3zM3 7l2-4h14l2 4M9 12h6"
          actions={
            <>
              <Link href="/rh/employes" className="btn-secondary">Employés</Link>
              <button onClick={handleGenerer} disabled={generating} className="btn-primary disabled:opacity-50">
                {generating ? 'Génération…' : `Générer ${MOIS_LABELS[mois - 1].toLowerCase()}`}
              </button>
            </>
          }
        />

        <div className="card !p-2.5 sm:!p-3 flex flex-wrap items-center gap-2">
          <select value={mois} onChange={e => setMois(parseInt(e.target.value))} aria-label="Mois" className="input-field !w-auto">
            {MOIS_LABELS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
          </select>
          <select value={annee} onChange={e => setAnnee(parseInt(e.target.value))} aria-label="Année" className="input-field !w-auto">
            {[annee - 1, annee, annee + 1].map(a => <option key={a} value={a}>{a}</option>)}
          </select>
          <p className="basis-full text-[11.5px] italic text-gray-500 sm:ml-auto sm:basis-auto">Barème CNPS/ITS indicatif — à faire vérifier par un expert-comptable</p>
        </div>

        {bulletins.length > 0 && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
            <KpiCard label="Masse brute" value={money(totaux.brut)} unit="F" icon="M3 7h16a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2zM3 7l2-3h12M16 13h3" iconClass="text-blue-600" />
            <KpiCard label="CNPS (salarié + patronal)" value={money(totaux.cnps)} unit="F" icon="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z" iconClass="text-orange-500" />
            <KpiCard label="ITS retenu" value={money(totaux.its)} unit="F" icon="M5 7h14M5 12h14M5 17h9" iconClass="text-violet-600" />
            <KpiCard label="Coût total employeur" value={money(totaux.coutTotal)} unit="F" icon="M3 17l6-6 4 4 8-8M21 7v5h-5" iconClass="text-green-600" />
          </div>
        )}

        <ListeResponsive
          colonnes={[
            { cle: 'num', libelle: 'N° bulletin', texte: (b: any) => b.numero, rendu: (b: any) => <Numero>{b.numero}</Numero> },
            { cle: 'employe', libelle: 'Employé', texte: (b: any) => `${b.employe?.prenom ?? ''} ${b.employe?.nom ?? ''}`.trim(), rendu: (b: any) => <Tiers nom={`${b.employe?.prenom ?? ''} ${b.employe?.nom ?? ''}`.trim()} /> },
            { cle: 'poste', libelle: 'Poste', masquerSous: 'xl' as const, texte: (b: any) => b.employe?.poste || '', rendu: (b: any) => <Tronque texte={b.employe?.poste} largeur="14rem" /> },
            { cle: 'brut', libelle: 'Brut', align: 'right' as const, texte: (b: any) => String(b.salaireBrut), rendu: (b: any) => (canSeeMontants ? <Montant valeur={b.salaireBrut} /> : '•••••••') },
            { cle: 'cnps', libelle: 'CNPS', align: 'right' as const, masquerSous: 'xl' as const, texte: (b: any) => String(b.cnpsSalarie), rendu: (b: any) => (canSeeMontants ? <Montant valeur={b.cnpsSalarie} ton="negatif" /> : '•••••••') },
            { cle: 'its', libelle: 'ITS', align: 'right' as const, masquerSous: 'xl' as const, texte: (b: any) => String(b.itsSalarie), rendu: (b: any) => (canSeeMontants ? <Montant valeur={b.itsSalarie} ton="negatif" /> : '•••••••') },
            { cle: 'net', libelle: 'Net à payer', align: 'right' as const, texte: (b: any) => String(b.salaireNet), rendu: (b: any) => (canSeeMontants ? <Montant valeur={b.salaireNet} /> : '•••••••') },
            { cle: 'statut', libelle: 'Statut', texte: (b: any) => b.statut, rendu: (b: any) => <StatutPastille libelle={b.statut} ton={tonDepuisBadge(STATUT_COLORS[b.statut])} /> },
          ]}
          lignes={bulletins}
          cleLigne={(b: any) => b.id}
          chargement={loading}
          nomExport="bulletins-paie"
          onClic={(b: any) => openDetail(b.id)}
          actions={(b: any) => <BoutonIcone titre="Voir le bulletin" ton="primaire" onClick={() => openDetail(b.id)}><IconeVoir /></BoutonIcone>}
          carte={(b: any) => ({ titre: `${b.employe?.prenom ?? ''} ${b.employe?.nom ?? ''}`.trim(), sousTitre: b.employe?.poste, statut: <StatutPastille libelle={b.statut} ton={tonDepuisBadge(STATUT_COLORS[b.statut])} />, droite: canSeeMontants ? <Montant valeur={b.salaireNet} /> : '•••••••', details: `${b.numero} · brut ${money(b.salaireBrut)}` })}
          vide={<EmptyState titre="Aucun bulletin pour cette période" description="Utilisez « Générer » pour créer les bulletins du mois." />}
        />
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
                  <tr className="border-b border-gray-100 dark:border-surface-700"><td className="px-3 py-1.5 text-gray-500">Salaire de base</td><td className="px-3 py-1.5 text-right font-mono">{money(selected.salaireBase)}</td></tr>
                  {Number(selected.primes) > 0 && <tr className="border-b border-gray-100 dark:border-surface-700"><td className="px-3 py-1.5 text-gray-500">Primes</td><td className="px-3 py-1.5 text-right font-mono">{money(selected.primes)}</td></tr>}
                  {Number(selected.indemnites) > 0 && <tr className="border-b border-gray-100 dark:border-surface-700"><td className="px-3 py-1.5 text-gray-500">Indemnités</td><td className="px-3 py-1.5 text-right font-mono">{money(selected.indemnites)}</td></tr>}
                  <tr className="border-b border-gray-100 dark:border-surface-700 font-bold bg-gray-50 dark:bg-surface-700/40"><td className="px-3 py-1.5">Salaire brut</td><td className="px-3 py-1.5 text-right font-mono">{money(selected.salaireBrut)}</td></tr>
                  <tr className="border-b border-gray-100 dark:border-surface-700"><td className="px-3 py-1.5 text-gray-500">CNPS salarié (6,3%)</td><td className="px-3 py-1.5 text-right font-mono text-red-600">-{money(selected.cnpsSalarie)}</td></tr>
                  <tr className="border-b border-gray-100 dark:border-surface-700"><td className="px-3 py-1.5 text-gray-500">ITS</td><td className="px-3 py-1.5 text-right font-mono text-red-600">-{money(selected.itsSalarie)}</td></tr>
                  {Number(selected.autresRetenues) > 0 && <tr className="border-b border-gray-100 dark:border-surface-700"><td className="px-3 py-1.5 text-gray-500">Autres retenues</td><td className="px-3 py-1.5 text-right font-mono text-red-600">-{money(selected.autresRetenues)}</td></tr>}
                  {Number(selected.avance) > 0 && <tr className="border-b border-gray-100 dark:border-surface-700"><td className="px-3 py-1.5 text-gray-500">Avance sur salaire</td><td className="px-3 py-1.5 text-right font-mono text-red-600">-{money(selected.avance)}</td></tr>}
                  <tr><td colSpan={2} className="p-0">
                    <div className="bg-gradient-to-br from-primary-600 to-primary-800 text-white flex justify-between px-3 py-2.5 font-extrabold">
                      <span>NET À PAYER</span><span className="font-mono">{money(selected.salaireNet)} XOF</span>
                    </div>
                  </td></tr>
                </tbody>
              </table>

              <div className="text-xs text-gray-400 flex justify-between">
                <span>CNPS patronal : {money(selected.cnpsPatronal)} F</span>
                <span>Coût total employeur : {money(selected.coutTotalEmployeur)} F</span>
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
              <p className="text-sm text-gray-500">Net à payer : <span className="font-mono font-bold text-gray-900 dark:text-white">{money(selected.salaireNet)} XOF</span></p>
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

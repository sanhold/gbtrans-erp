'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import AppLayout from '@/components/layout/AppLayout';
import { devisTransportApi, clientsApi } from '@/lib/api';
import toast from 'react-hot-toast';

const STATUT_LABEL: Record<string, string> = { BROUILLON: 'Brouillon', ENVOYE: 'Envoyé', ACCEPTE: 'Accepté', REFUSE: 'Refusé' };
const STATUT_BADGE: Record<string, string> = { BROUILLON: 'badge-info', ENVOYE: 'badge-warning', ACCEPTE: 'badge-success', REFUSE: 'badge-danger' };

const LIGNE_VIDE = { origine: '', destination: '', designationMarchandise: '', dateDepartPrevue: '', montantEstime: '' };
const fmt = (n: any) => n != null ? `${new Intl.NumberFormat('fr-FR').format(Number(n))} FCFA` : '-';

export default function DevisTransportPage() {
  const router = useRouter();
  const [data, setData] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [statutFiltre, setStatutFiltre] = useState('');
  const [clients, setClients] = useState<any[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [clientId, setClientId] = useState('');
  const [objet, setObjet] = useState('');
  const [dateValidite, setDateValidite] = useState('');
  const [lignes, setLignes] = useState<any[]>([{ ...LIGNE_VIDE }]);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await devisTransportApi.list({ page, limit: 20, statut: statutFiltre || undefined });
      setData(res.data.data || []);
      setTotal(res.data.pagination?.total || 0);
      setTotalPages(res.data.pagination?.totalPages || 1);
    } catch { toast.error('Erreur de chargement'); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, [page, statutFiltre]); // eslint-disable-line react-hooks/exhaustive-deps

  const ouvrirCreation = async () => {
    setClientId(''); setObjet(''); setDateValidite(''); setLignes([{ ...LIGNE_VIDE }]);
    try { const r = await clientsApi.list({ limit: 500 }); setClients(r.data.data || []); setShowModal(true); }
    catch { toast.error('Erreur de chargement des clients'); }
  };

  const majLigne = (i: number, champ: string, valeur: string) => {
    setLignes(prev => prev.map((l, idx) => idx === i ? { ...l, [champ]: valeur } : l));
  };
  const ajouterLigne = () => setLignes(prev => [...prev, { ...LIGNE_VIDE }]);
  const retirerLigne = (i: number) => setLignes(prev => prev.filter((_, idx) => idx !== i));

  const montantTotal = lignes.reduce((s, l) => s + (Number(l.montantEstime) || 0), 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientId) { toast.error('Sélectionnez un client'); return; }
    const lignesValides = lignes.filter(l => l.origine && l.destination && l.montantEstime);
    if (lignesValides.length === 0) { toast.error('Ajoutez au moins une ligne de voyage valide'); return; }
    setSaving(true);
    try {
      const r = await devisTransportApi.create({ clientId, objet, dateValidite, lignes: lignesValides });
      toast.success('Devis créé');
      setShowModal(false);
      router.push(`/transport/devis/${r.data.data.id}`);
    } catch (err: any) { toast.error(err.response?.data?.message || 'Erreur'); }
    finally { setSaving(false); }
  };

  return (
    <AppLayout>
      <div className="space-y-5">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Devis Transport</h1>
            <p className="text-sm text-gray-500">{total} devis — programmation de voyages avant exécution</p>
          </div>
          <div className="flex items-center gap-2">
            <select value={statutFiltre} onChange={e => { setPage(1); setStatutFiltre(e.target.value); }} className="input-field !w-48 text-sm">
              <option value="">Tous les statuts</option>
              {Object.entries(STATUT_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
            <button onClick={ouvrirCreation} className="btn-primary text-sm">+ Nouveau devis</button>
          </div>
        </div>

        <div className="table-container">
          <table className="w-full">
            <thead><tr>
              <th className="table-header">N°</th>
              <th className="table-header">Client</th>
              <th className="table-header">Objet</th>
              <th className="table-header text-right">Montant estimé</th>
              <th className="table-header">Statut</th>
              <th className="table-header">Date</th>
            </tr></thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="text-center py-12 text-gray-500"><div className="animate-spin w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full mx-auto" /></td></tr>
              ) : data.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-12 text-gray-500">Aucun devis</td></tr>
              ) : data.map(d => (
                <tr key={d.id} className="table-row">
                  <td className="table-cell"><Link href={`/transport/devis/${d.id}`} className="font-mono text-xs text-primary-600 hover:underline">{d.numero}</Link></td>
                  <td className="table-cell text-xs">{d.client?.raisonSociale}</td>
                  <td className="table-cell text-xs">{d.objet || '-'}</td>
                  <td className="table-cell text-right text-xs font-mono">{fmt(d.montantTotal)}</td>
                  <td className="table-cell"><span className={`badge ${STATUT_BADGE[d.statut]} !text-[10px]`}>{STATUT_LABEL[d.statut]}</span></td>
                  <td className="table-cell text-xs text-gray-500">{new Date(d.createdAt).toLocaleDateString('fr-FR')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2">
            <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="btn-secondary !px-3 !py-1.5 text-sm disabled:opacity-40">Précédent</button>
            <span className="text-sm text-gray-500">Page {page} / {totalPages}</span>
            <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)} className="btn-secondary !px-3 !py-1.5 text-sm disabled:opacity-40">Suivant</button>
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 animate-fade-in p-4">
          <div className="bg-white dark:bg-surface-800 rounded-xl shadow-elevated w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-surface-700">
              <h2 className="text-lg font-bold">Nouveau devis transport</h2>
              <button onClick={() => setShowModal(false)} className="p-1 rounded hover:bg-gray-100 dark:hover:bg-surface-700"><svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Client *</label>
                  <select value={clientId} onChange={e => setClientId(e.target.value)} className="input-field" required>
                    <option value="">Sélectionner...</option>
                    {clients.map((c: any) => <option key={c.id} value={c.id}>{c.raisonSociale}</option>)}
                  </select>
                </div>
                <div><label className="label">Date de validité</label><input type="date" value={dateValidite} onChange={e => setDateValidite(e.target.value)} className="input-field" /></div>
              </div>
              <div><label className="label">Objet</label><input type="text" value={objet} onChange={e => setObjet(e.target.value)} className="input-field" placeholder="Ex: Transport de marchandises Abidjan - Ouagadougou" /></div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="label !mb-0">Voyages prévus *</label>
                  <button type="button" onClick={ajouterLigne} className="text-xs text-primary-600 hover:underline">+ Ajouter un voyage</button>
                </div>
                {lignes.map((l, i) => (
                  <div key={i} className="border border-gray-200 dark:border-surface-700 rounded-lg p-3 space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                      <input type="text" value={l.origine} onChange={e => majLigne(i, 'origine', e.target.value)} className="input-field !text-sm" placeholder="Origine *" />
                      <input type="text" value={l.destination} onChange={e => majLigne(i, 'destination', e.target.value)} className="input-field !text-sm" placeholder="Destination *" />
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <input type="text" value={l.designationMarchandise} onChange={e => majLigne(i, 'designationMarchandise', e.target.value)} className="input-field !text-sm" placeholder="Marchandise" />
                      <input type="date" value={l.dateDepartPrevue} onChange={e => majLigne(i, 'dateDepartPrevue', e.target.value)} className="input-field !text-sm" />
                      <input type="number" value={l.montantEstime} onChange={e => majLigne(i, 'montantEstime', e.target.value)} className="input-field !text-sm" placeholder="Montant estimé *" />
                    </div>
                    {lignes.length > 1 && <button type="button" onClick={() => retirerLigne(i)} className="text-xs text-red-600 hover:underline">Retirer ce voyage</button>}
                  </div>
                ))}
                <p className="text-right text-sm font-semibold">Total estimé : {fmt(montantTotal)}</p>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 dark:border-surface-700">
                <button type="button" onClick={() => setShowModal(false)} className="btn-secondary">Annuler</button>
                <button type="submit" disabled={saving} className="btn-primary disabled:opacity-50">{saving ? 'Création...' : 'Créer le devis'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppLayout>
  );
}

'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import AppLayout from '@/components/layout/AppLayout';
import PickerField from '@/components/ui/PickerField';
import api, { clientsApi, dossiersApi, facturesApi } from '@/lib/api';
import { STATUTS_DOSSIER_FERME } from '@/lib/dossierStatut';
import toast from 'react-hot-toast';

interface LigneFactureForm {
  categorie: string;
  codePrestation: string;
  designation: string;
  quantite: string;
  unite: string;
  prixUnitaire: string;
  tauxTVA: string;
}

const fmt = (n: number) => new Intl.NumberFormat('fr-FR').format(Math.round(n || 0));

function ligneVide(): LigneFactureForm {
  return { categorie: 'DIVERS', codePrestation: '', designation: '', quantite: '1', unite: '', prixUnitaire: '0', tauxTVA: '18' };
}

export default function NouvelleFacturePage() {
  return (
    <Suspense fallback={null}>
      <NouvelleFactureForm />
    </Suspense>
  );
}

function NouvelleFactureForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [clients, setClients] = useState<any[]>([]);
  const [dossiers, setDossiers] = useState<any[]>([]);
  const [catalogue, setCatalogue] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);
  const [showCatalogue, setShowCatalogue] = useState(false);
  const [catalogueSearch, setCatalogueSearch] = useState('');

  const [form, setForm] = useState({
    clientId: '', dossierId: searchParams.get('dossierId') || '',
    objet: '', numeroNormalise: '', observations: '',
  });
  const [lignes, setLignes] = useState<LigneFactureForm[]>([]);

  useEffect(() => {
    Promise.all([
      clientsApi.list({ limit: 500 }),
      dossiersApi.list({ limit: 500 }),
      api.get('/proformas/catalogue'),
    ]).then(([cRes, dRes, catRes]) => {
      setClients(cRes.data.data || []);
      setDossiers((dRes.data.data || []).filter((d: any) => !STATUTS_DOSSIER_FERME.includes(d.statut)));
      setCatalogue(catRes.data.data || []);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (form.dossierId) {
      const d = dossiers.find(d => d.id === form.dossierId);
      if (d?.clientId) setForm(prev => ({ ...prev, clientId: d.clientId }));
    }
  }, [form.dossierId, dossiers]);

  const clientOptions = clients.map(c => ({ id: c.id, label: `${c.code} — ${c.raisonSociale}` }));
  const dossierOptions = dossiers.map(d => ({ id: d.id, label: `${d.numeroPhysique || d.numero} — ${d.client?.raisonSociale || ''}` }));

  const addFromCatalogue = (p: any) => {
    setLignes(prev => [...prev, {
      categorie: p.categorie || '', codePrestation: p.code || '', designation: p.designation,
      quantite: '1', unite: '', prixUnitaire: p.montantDefaut ? String(p.montantDefaut) : '0',
      tauxTVA: p.estTVA ? '18' : '0',
    }]);
  };

  const addLigneLibre = () => setLignes(prev => [...prev, ligneVide()]);
  const removeLigne = (index: number) => setLignes(prev => prev.filter((_, i) => i !== index));
  const updateLigne = (index: number, field: keyof LigneFactureForm, value: string) => {
    setLignes(prev => prev.map((l, i) => i === index ? { ...l, [field]: value } : l));
  };

  const totaux = lignes.reduce((acc, l) => {
    const qte = parseFloat(l.quantite) || 0;
    const pu = parseFloat(l.prixUnitaire) || 0;
    const taux = parseFloat(l.tauxTVA) || 0;
    const ht = qte * pu;
    const tva = (ht * taux) / 100;
    return { ht: acc.ht + ht, tva: acc.tva + tva };
  }, { ht: 0, tva: 0 });
  const totalTTC = totaux.ht + totaux.tva;

  const handleSubmit = async () => {
    if (!form.clientId) { toast.error('Sélectionnez un client'); return; }
    if (lignes.length === 0) { toast.error('Ajoutez au moins une prestation'); return; }
    if (lignes.some(l => !l.designation.trim())) { toast.error('Chaque ligne doit avoir une désignation'); return; }

    setSaving(true);
    try {
      const res = await facturesApi.create({
        clientId: form.clientId,
        dossierId: form.dossierId || undefined,
        objet: form.objet || undefined,
        numeroNormalise: form.numeroNormalise || undefined,
        observations: form.observations || undefined,
        lignes: lignes.map(l => ({
          categorie: l.categorie || 'DIVERS',
          codePrestation: l.codePrestation || undefined,
          designation: l.designation.trim(),
          quantite: parseFloat(l.quantite) || 1,
          unite: l.unite || undefined,
          prixUnitaire: parseFloat(l.prixUnitaire) || 0,
          tauxTVA: parseFloat(l.tauxTVA) || 0,
        })),
      });
      toast.success(res.data.message || 'Facture créée');
      router.push(`/facturation/${res.data.data.id}`);
    } catch (e: any) { toast.error(e.response?.data?.message || 'Erreur'); }
    finally { setSaving(false); }
  };

  const categoriesWithItems = [...new Set(catalogue.map((p: any) => p.categorie))].filter(Boolean) as string[];
  const catalogueFiltre = catalogue.filter((p: any) =>
    !catalogueSearch || p.designation.toLowerCase().includes(catalogueSearch.toLowerCase()) || (p.code || '').toLowerCase().includes(catalogueSearch.toLowerCase())
  );

  return (
    <AppLayout>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Nouvelle facture</h1>
            <p className="text-sm text-gray-500">Créer une facture directement, sans passer par une proforma.</p>
          </div>
          <button onClick={() => router.push('/facturation')} className="btn-secondary">Annuler</button>
        </div>

        <div className="card !p-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="label">Dossier (optionnel)</label>
            <PickerField value={form.dossierId} onChange={id => setForm({ ...form, dossierId: id })} options={dossierOptions} placeholder="— Aucun —" title="Sélectionner un dossier" searchPlaceholder="N° physique, client..." />
          </div>
          <div>
            <label className="label">Client *</label>
            <PickerField value={form.clientId} onChange={id => setForm({ ...form, clientId: id })} options={clientOptions} placeholder="— Sélectionner —" title="Sélectionner un client" searchPlaceholder="Raison sociale..." required />
          </div>
          <div>
            <label className="label">N° facture normalisée (optionnel)</label>
            <input type="text" value={form.numeroNormalise} onChange={e => setForm({ ...form, numeroNormalise: e.target.value })} className="input-field" placeholder="Numéro reçu du système de facturation normalisée (DGI)" />
          </div>
          <div>
            <label className="label">Objet</label>
            <input type="text" value={form.objet} onChange={e => setForm({ ...form, objet: e.target.value })} className="input-field" placeholder="Ex : Prestations transit..." />
          </div>
          <div className="sm:col-span-2">
            <label className="label">Observations</label>
            <textarea value={form.observations} onChange={e => setForm({ ...form, observations: e.target.value })} rows={2} className="input-field" />
          </div>
        </div>

        <div className="card !p-0 overflow-hidden">
          <div className="p-4 border-b border-gray-100 dark:border-surface-700 flex items-center justify-between">
            <h2 className="font-bold text-gray-900 dark:text-white">Prestations</h2>
            <div className="flex gap-2">
              <button type="button" onClick={() => setShowCatalogue(true)} className="btn-secondary text-sm">Catalogue des prestations</button>
              <button type="button" onClick={addLigneLibre} className="btn-primary text-sm">+ Ligne libre</button>
            </div>
          </div>

          {lignes.length === 0 ? (
            <div className="text-center py-12 text-gray-400 text-sm">Ajoutez des prestations depuis le catalogue ou une ligne libre.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="text-left text-[10px] text-gray-500 uppercase border-b border-gray-100 dark:border-surface-700">
                  <th className="p-2">Désignation</th><th className="p-2 w-24">Qté</th><th className="p-2 w-28">Unité</th>
                  <th className="p-2 w-32">Prix unitaire</th><th className="p-2 w-24">TVA %</th><th className="p-2 w-32 text-right">Montant HT</th><th className="p-2 w-10"></th>
                </tr></thead>
                <tbody>
                  {lignes.map((l, i) => {
                    const montantHT = (parseFloat(l.quantite) || 0) * (parseFloat(l.prixUnitaire) || 0);
                    return (
                      <tr key={i} className="border-b border-gray-50 dark:border-surface-700/50">
                        <td className="p-2"><input type="text" value={l.designation} onChange={e => updateLigne(i, 'designation', e.target.value)} className="input-field !py-1 text-sm" /></td>
                        <td className="p-2"><input type="number" value={l.quantite} onChange={e => updateLigne(i, 'quantite', e.target.value)} className="input-field !py-1 text-sm" /></td>
                        <td className="p-2"><input type="text" value={l.unite} onChange={e => updateLigne(i, 'unite', e.target.value)} className="input-field !py-1 text-sm" placeholder="u, kg..." /></td>
                        <td className="p-2"><input type="number" value={l.prixUnitaire} onChange={e => updateLigne(i, 'prixUnitaire', e.target.value)} className="input-field !py-1 text-sm" /></td>
                        <td className="p-2"><input type="number" value={l.tauxTVA} onChange={e => updateLigne(i, 'tauxTVA', e.target.value)} className="input-field !py-1 text-sm" /></td>
                        <td className="p-2 text-right font-mono">{fmt(montantHT)}</td>
                        <td className="p-2 text-center">
                          <button onClick={() => removeLigne(i)} className="text-gray-300 hover:text-red-500">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          <div className="p-4 border-t border-gray-100 dark:border-surface-700 flex justify-end">
            <div className="w-64 space-y-1 text-sm">
              <div className="flex justify-between"><span className="text-gray-500">Total HT</span><span className="font-mono">{fmt(totaux.ht)} F</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Total TVA</span><span className="font-mono">{fmt(totaux.tva)} F</span></div>
              <div className="flex justify-between font-bold text-base border-t border-gray-100 dark:border-surface-700 pt-1"><span>Total TTC</span><span className="font-mono">{fmt(totalTTC)} F</span></div>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <button onClick={() => router.push('/facturation')} className="btn-secondary">Annuler</button>
          <button onClick={handleSubmit} disabled={saving} className="btn-primary disabled:opacity-50">{saving ? 'Création...' : 'Créer la facture'}</button>
        </div>
      </div>

      {showCatalogue && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 animate-fade-in" onClick={() => setShowCatalogue(false)}>
          <div className="bg-white dark:bg-surface-800 rounded-xl shadow-elevated w-full max-w-2xl mx-4 max-h-[85vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b"><h3 className="font-bold text-lg">Ajouter une prestation</h3><button onClick={() => setShowCatalogue(false)} className="p-1 rounded hover:bg-gray-100 dark:hover:bg-surface-700"><svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button></div>
            <div className="px-4 pt-3">
              <input type="text" autoFocus value={catalogueSearch} onChange={e => setCatalogueSearch(e.target.value)} placeholder="Rechercher..." className="input-field text-sm" />
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {categoriesWithItems.map(cat => {
                const items = catalogueFiltre.filter((p: any) => p.categorie === cat);
                if (items.length === 0) return null;
                return (
                  <div key={cat}>
                    <p className="text-[11px] font-bold text-gray-500 uppercase mb-1.5">{cat}</p>
                    <div className="space-y-1.5">
                      {items.map((p: any) => (
                        <div key={p.id} className="flex items-center justify-between p-2.5 rounded-lg border border-gray-100 dark:border-surface-700 hover:border-primary-300">
                          <div><p className="text-sm font-medium">{p.designation}</p><p className="text-[10px] text-gray-400">{p.code}{p.montantDefaut ? ` • ${fmt(Number(p.montantDefaut))} F` : ''}</p></div>
                          <button onClick={() => addFromCatalogue(p)} className="px-3 py-1 bg-primary-500 text-white rounded text-xs hover:bg-primary-600">+ Ajouter</button>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="p-4 border-t flex justify-end"><button onClick={() => setShowCatalogue(false)} className="btn-primary">Fermer</button></div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}

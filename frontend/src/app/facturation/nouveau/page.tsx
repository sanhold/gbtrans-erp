'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import AppLayout from '@/components/layout/AppLayout';
import PickerField from '@/components/ui/PickerField';
import api, { clientsApi, dossiersApi, facturesApi } from '@/lib/api';
import { STATUTS_DOSSIER_FERME } from '@/lib/dossierStatut';
import toast from 'react-hot-toast';
import LignesFactureMobile, { type LigneFactureForm } from '../_components/LignesFactureMobile';
import CatalogueFactureSheet from '../_components/CatalogueFactureSheet';

const fmt = (n: number) => new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(Math.round(n || 0));

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
  const [modele, setModele] = useState<'ACTUEL' | 'PROFORMA'>('ACTUEL');
  const [showCatalogue, setShowCatalogue] = useState(false);
  const [catalogueSearch, setCatalogueSearch] = useState('');

  const [form, setForm] = useState({
    clientId: '', dossierId: searchParams.get('dossierId') || '',
    objet: '', numeroNormalise: '', observations: '',
  });
  const [lignes, setLignes] = useState<LigneFactureForm[]>([]);

  useEffect(() => {
    Promise.all([
      clientsApi.listRef(),
      dossiersApi.listRef(),
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
    toast.success('Prestation ajoutée');
  };

  const addLigneLibre = () => setLignes(prev => [...prev, ligneVide()]);
  const removeLigne = (index: number) => setLignes(prev => prev.filter((_, i) => i !== index));
  const updateLigne = (index: number, field: keyof LigneFactureForm, value: string) => {
    // Montants saisis en text/inputMode decimal : la virgule est acceptée comme séparateur décimal
    const v = ['quantite', 'prixUnitaire', 'tauxTVA'].includes(field) ? value.replace(',', '.') : value;
    setLignes(prev => prev.map((l, i) => i === index ? { ...l, [field]: v } : l));
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
        modele,
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
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-xl lg:text-2xl font-bold text-gray-900 dark:text-white">Nouvelle facture</h1>
            <p className="text-sm text-gray-600 dark:text-gray-400">Créer une facture directement, sans passer par une proforma.</p>
          </div>
          <button type="button" onClick={() => router.push('/facturation')} className="btn-secondary hidden md:inline-flex">Annuler</button>
        </div>

        <section className="card !p-4" aria-label="Modèle de facture">
          <div className="label">Modèle de facture</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {([
              { id: 'PROFORMA', titre: 'Format proforma', texte: 'Prestations regroupées par catégorie avec sous-totaux, montant prestation et TVA : la même présentation que la proforma.' },
              { id: 'ACTUEL', titre: 'Version actuelle', texte: 'Tableau détaillé avec quantités, prix unitaires et TVA par ligne : la présentation habituelle des factures.' },
            ] as const).map(m => (
              <button key={m.id} type="button" aria-pressed={modele === m.id} onClick={() => setModele(m.id)} className={`text-left p-3 min-h-[44px] border rounded-sm transition-colors ${modele === m.id ? 'border-primary-600 bg-primary-50 dark:bg-surface-700' : 'border-gray-300 dark:border-surface-600 hover:bg-gray-50 dark:hover:bg-surface-700'}`}>
                <div className="flex items-center gap-2">
                  <span aria-hidden="true" className={`w-3.5 h-3.5 rounded-full border-2 ${modele === m.id ? 'border-primary-600 bg-primary-600' : 'border-gray-400'}`} />
                  <span className="font-semibold text-sm text-gray-900 dark:text-white">{m.titre}</span>
                </div>
                <p className="text-xs text-gray-600 dark:text-gray-400 mt-1.5 ml-5">{m.texte}</p>
              </button>
            ))}
          </div>
        </section>

        <section className="card !p-4 grid grid-cols-1 sm:grid-cols-2 gap-4" aria-label="Informations">
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
        </section>

        <section className="card !p-0 overflow-hidden" aria-label="Prestations">
          <div className="p-4 border-b border-gray-100 dark:border-surface-700 flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-bold text-gray-900 dark:text-white">Prestations</h2>
            <div className="flex gap-2 max-md:w-full max-md:[&>*]:flex-1">
              <button type="button" onClick={() => setShowCatalogue(true)} className="btn-secondary text-sm">Catalogue des prestations</button>
              <button type="button" onClick={addLigneLibre} className="btn-primary text-sm">+ Ligne libre</button>
            </div>
          </div>

          {lignes.length === 0 ? (
            <div className="text-center py-10 px-4 text-gray-600 dark:text-gray-400 text-sm">
              <p>Ajoutez des prestations depuis le catalogue ou une ligne libre.</p>
              <button type="button" onClick={() => setShowCatalogue(true)} className="btn-primary mt-3 max-md:w-full">Ouvrir le catalogue</button>
            </div>
          ) : (
            <>
              <div className="md:hidden">
                <LignesFactureMobile lignes={lignes} updateLigne={updateLigne} removeLigne={removeLigne} />
              </div>
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="text-left text-[10px] text-gray-600 uppercase border-b border-gray-100 dark:border-surface-700">
                    <th className="p-2">Désignation</th><th className="p-2 w-24">Qté</th><th className="p-2 w-28">Unité</th>
                    <th className="p-2 w-32">Prix unitaire</th><th className="p-2 w-24">TVA %</th><th className="p-2 w-32 text-right">Montant HT</th><th className="p-2 w-12"></th>
                  </tr></thead>
                  <tbody>
                    {lignes.map((l, i) => {
                      const montantHT = (parseFloat(l.quantite) || 0) * (parseFloat(l.prixUnitaire) || 0);
                      return (
                        <tr key={i} className="border-b border-gray-50 dark:border-surface-700/50">
                          <td className="p-2"><input type="text" aria-label="Désignation" value={l.designation} onChange={e => updateLigne(i, 'designation', e.target.value)} className="input-field !py-1 text-sm" /></td>
                          <td className="p-2"><input type="text" inputMode="decimal" aria-label="Quantité" value={l.quantite} onChange={e => updateLigne(i, 'quantite', e.target.value)} className="input-field !py-1 text-sm" /></td>
                          <td className="p-2"><input type="text" aria-label="Unité" value={l.unite} onChange={e => updateLigne(i, 'unite', e.target.value)} className="input-field !py-1 text-sm" placeholder="u, kg..." /></td>
                          <td className="p-2"><input type="text" inputMode="decimal" aria-label="Prix unitaire" value={l.prixUnitaire} onChange={e => updateLigne(i, 'prixUnitaire', e.target.value)} className="input-field !py-1 text-sm" /></td>
                          <td className="p-2"><input type="text" inputMode="decimal" aria-label="TVA %" value={l.tauxTVA} onChange={e => updateLigne(i, 'tauxTVA', e.target.value)} className="input-field !py-1 text-sm" /></td>
                          <td className="p-2 text-right font-mono">{fmt(montantHT)}</td>
                          <td className="p-2 text-center">
                            <button type="button" onClick={() => removeLigne(i)} aria-label={`Supprimer la ligne ${l.designation || i + 1}`} title="Supprimer" className="w-9 h-9 inline-flex items-center justify-center rounded text-gray-500 hover:text-red-600 hover:bg-red-50">
                              <svg aria-hidden="true" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}

          <div className="p-4 border-t border-gray-100 dark:border-surface-700 flex justify-end">
            <div className="w-full md:w-64 space-y-1 text-sm">
              <div className="flex justify-between"><span className="text-gray-600 dark:text-gray-400">Total HT</span><span className="font-mono">{fmt(totaux.ht)} F</span></div>
              <div className="flex justify-between"><span className="text-gray-600 dark:text-gray-400">Total TVA</span><span className="font-mono">{fmt(totaux.tva)} F</span></div>
              <div className="flex justify-between font-bold text-base border-t border-gray-100 dark:border-surface-700 pt-1"><span>Total TTC</span><span className="font-mono">{fmt(totalTTC)} F</span></div>
            </div>
          </div>
        </section>

        {/* Actions : barre collante au-dessus de la bottom nav (mobile) / ligne simple (bureau) */}
        <div className="max-md:fixed max-md:left-0 max-md:right-0 max-md:z-30 max-md:bottom-[calc(var(--bottom-nav-h)+var(--safe-bottom))] max-md:bg-white/95 max-md:dark:bg-surface-800/95 max-md:backdrop-blur max-md:border-t max-md:border-gray-200 max-md:dark:border-surface-700 max-md:px-3 max-md:py-2 flex md:justify-end gap-2">
          <div className="md:hidden flex-1 min-w-0 self-center leading-tight">
            <div className="text-[10px] uppercase font-bold text-gray-600 dark:text-gray-400">Total TTC</div>
            <div className="font-mono font-bold text-base truncate">{fmt(totalTTC)} F</div>
          </div>
          <button type="button" onClick={() => router.push('/facturation')} className="btn-secondary">Annuler</button>
          <button type="button" onClick={handleSubmit} disabled={saving} className="btn-primary disabled:opacity-50">{saving ? 'Création...' : 'Créer la facture'}</button>
        </div>
        <div className="md:hidden h-20" aria-hidden="true" />
      </div>

      <CatalogueFactureSheet
        open={showCatalogue} onClose={() => setShowCatalogue(false)}
        search={catalogueSearch} setSearch={setCatalogueSearch}
        categories={categoriesWithItems} items={catalogueFiltre} onAdd={addFromCatalogue} nbLignes={lignes.length}
      />
    </AppLayout>
  );
}

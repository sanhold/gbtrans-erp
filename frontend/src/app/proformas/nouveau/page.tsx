'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import AppLayout from '@/components/layout/AppLayout';
import api, { clientsApi, dossiersApi } from '@/lib/api';
import toast from 'react-hot-toast';

interface LigneProforma {
  categorie: string;
  codePrestation: string;
  designation: string;
  tauxTVA: number;
  montant: number;
  estTVA: boolean;
}

const CAT_COLORS: Record<string, string> = {
  'DOUANE & COMPAGNIE': '#059669',
  'FRAIS PORTUAIRES': '#0891B2',
  'AUTRES FRAIS': '#D97706',
  'TRANSPORT': '#7C3AED',
};

const fmt = (n: number) => new Intl.NumberFormat('fr-FR').format(n);

export default function NouvelleProformaPage() {
  return (
    <Suspense fallback={null}>
      <NouvelleProformaForm />
    </Suspense>
  );
}

function NouvelleProformaForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [clients, setClients] = useState<any[]>([]);
  const [dossiers, setDossiers] = useState<any[]>([]);
  const [catalogue, setCatalogue] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);
  const [showCatalogue, setShowCatalogue] = useState(false);
  const [selectedCat, setSelectedCat] = useState('');
  const [searchCat, setSearchCat] = useState('');
  const [showAddPrestation, setShowAddPrestation] = useState(false);
  const [newPrestation, setNewPrestation] = useState({ categorie: 'DOUANE & COMPAGNIE', code: '', designation: '', montantDefaut: '', estTVA: false });

  const [form, setForm] = useState({
    clientId: '', dossierId: searchParams.get('dossierId') || '', titre: '', observations: '',
    fobUnitaire: '', fretUnitaire: '', assurance: '', fraisDivers: '0', nombreUnites: '1',
  });

  const [lignes, setLignes] = useState<LigneProforma[]>([]);

  useEffect(() => {
    Promise.all([
      clientsApi.list({ limit: 500 }),
      dossiersApi.list({ limit: 500 }),
      api.get('/proformas/catalogue'),
    ]).then(([cRes, dRes, catRes]) => {
      setClients(cRes.data.data || []);
      setDossiers((dRes.data.data || []).filter((d: any) => !['CLOTURE', 'ANNULE', 'ARCHIVE'].includes(d.statut)));
      setCatalogue(catRes.data.data || []);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (form.dossierId) {
      const d = dossiers.find(d => d.id === form.dossierId);
      if (d) {
        setForm(prev => ({
          ...prev,
          clientId: d.clientId || prev.clientId,
          fobUnitaire: d.valeurFOB ? String(d.valeurFOB) : prev.fobUnitaire,
          fretUnitaire: d.fret ? String(d.fret) : prev.fretUnitaire,
          assurance: d.assurance ? String(d.assurance) : prev.assurance,
        }));
      }
    }
  }, [form.dossierId, dossiers]);

  const addFromCatalogue = (prestation: any) => {
    const exists = lignes.some(l => l.codePrestation === prestation.code);
    if (exists) { toast.error('Déjà ajouté'); return; }
    setLignes([...lignes, {
      categorie: prestation.categorie,
      codePrestation: prestation.code,
      designation: prestation.designation,
      tauxTVA: Number(prestation.tauxTVA) || 0,
      montant: Number(prestation.montantDefaut) || 0,
      estTVA: prestation.estTVA,
    }]);
    toast.success(`${prestation.designation} ajouté`);
  };

  const handleAddPrestation = async () => {
    if (!newPrestation.code || !newPrestation.designation) { toast.error('Code et désignation requis'); return; }
    try {
      const res = await api.post('/proformas/catalogue', {
        ...newPrestation,
        code: newPrestation.code.toUpperCase(),
        montantDefaut: newPrestation.montantDefaut ? parseFloat(newPrestation.montantDefaut) : null,
        ordre: catalogue.filter(p => p.categorie === newPrestation.categorie).length + 1,
      });
      setCatalogue([...catalogue, res.data.data]);
      setNewPrestation({ categorie: newPrestation.categorie, code: '', designation: '', montantDefaut: '', estTVA: false });
      setShowAddPrestation(false);
      toast.success('Prestation ajoutée au catalogue');
    } catch (e: any) { toast.error(e.response?.data?.message || 'Erreur'); }
  };

  const addAllCategory = (cat: string) => {
    const catItems = catalogue.filter(p => p.categorie === cat);
    const newLignes = catItems
      .filter(p => !lignes.some(l => l.codePrestation === p.code))
      .map(p => ({
        categorie: p.categorie,
        codePrestation: p.code,
        designation: p.designation,
        tauxTVA: Number(p.tauxTVA) || 0,
        montant: Number(p.montantDefaut) || 0,
        estTVA: p.estTVA,
      }));
    setLignes([...lignes, ...newLignes]);
    toast.success(`${newLignes.length} élément(s) ajouté(s)`);
  };

  const updateLigne = (index: number, field: string, value: any) => {
    setLignes(lignes.map((l, i) => i === index ? { ...l, [field]: value } : l));
  };

  const removeLigne = (index: number) => setLignes(lignes.filter((_, i) => i !== index));

  const valeurCAF = ((parseFloat(form.fobUnitaire) || 0) + (parseFloat(form.fretUnitaire) || 0) + (parseFloat(form.assurance) || 0) + (parseFloat(form.fraisDivers) || 0)) * (parseInt(form.nombreUnites) || 1);

  const categories = Object.keys(CAT_COLORS);
  const groupedLignes = categories.map(cat => ({
    categorie: cat,
    couleur: CAT_COLORS[cat],
    lignes: lignes.filter(l => l.categorie === cat),
    sousTotal: lignes.filter(l => l.categorie === cat).reduce((s, l) => s + (l.montant || 0), 0),
  })).filter(g => g.lignes.length > 0);

  const totalHT = lignes.filter(l => !l.estTVA).reduce((s, l) => s + (l.montant || 0), 0);
  const totalTVA = lignes.filter(l => l.estTVA).reduce((s, l) => s + (l.montant || 0), 0);
  const totalGeneral = totalHT + totalTVA;

  const handleSubmit = async () => {
    if (!form.clientId) { toast.error('Sélectionnez un client'); return; }
    if (lignes.length === 0) { toast.error('Ajoutez au moins une prestation'); return; }
    setSaving(true);
    try {
      const res = await api.post('/proformas', { ...form, lignes });
      toast.success(res.data.message);
      router.push(`/proformas/${res.data.data.id}`);
    } catch (e: any) { toast.error(e.response?.data?.message || 'Erreur'); }
    finally { setSaving(false); }
  };

  let globalIndex = 0;

  return (
    <AppLayout>
      <div className="space-y-3">
        {/* Header */}
        <div className="bg-emerald-600 rounded-lg p-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => router.back()} className="p-2 rounded-lg hover:bg-emerald-700 text-white">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
            </button>
            <h1 className="text-lg font-bold text-white">Fiche Proforma</h1>
          </div>
          <div className="flex gap-2">
            <button onClick={handleSubmit} disabled={saving} className="px-4 py-2 bg-white text-emerald-700 rounded-lg font-semibold text-sm hover:bg-emerald-50 disabled:opacity-50 flex items-center gap-1">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
              {saving ? 'Enregistrement...' : 'Valider'}
            </button>
            <button onClick={() => router.back()} className="px-4 py-2 bg-red-500 text-white rounded-lg font-semibold text-sm hover:bg-red-600">Annuler</button>
          </div>
        </div>

        <div className="flex gap-4">
          {/* Panneau gauche */}
          <div className="w-72 flex-shrink-0 space-y-3">
            <div className="card !p-3 space-y-2">
              <div><label className="text-[10px] font-bold text-gray-500 uppercase">Dossier</label>
                <select value={form.dossierId} onChange={e => setForm({...form, dossierId: e.target.value})} className="input-field text-xs !py-1.5">
                  <option value="">-- Aucun --</option>
                  {dossiers.map(d => <option key={d.id} value={d.id}>{d.numero}</option>)}
                </select>
              </div>
              <div><label className="text-[10px] font-bold text-gray-500 uppercase">Client *</label>
                <select value={form.clientId} onChange={e => setForm({...form, clientId: e.target.value})} className="input-field text-xs !py-1.5" required>
                  <option value="">-- Sélectionner --</option>
                  {clients.map(c => <option key={c.id} value={c.id}>{c.raisonSociale}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div><label className="text-[9px] font-bold text-gray-500">FOB (Unitaire)</label><input type="number" value={form.fobUnitaire} onChange={e => setForm({...form, fobUnitaire: e.target.value})} className="input-field !py-1 text-[11px] font-mono" /></div>
                <div><label className="text-[9px] font-bold text-gray-500">FRET (Unitaire)</label><input type="number" value={form.fretUnitaire} onChange={e => setForm({...form, fretUnitaire: e.target.value})} className="input-field !py-1 text-[11px] font-mono" /></div>
                <div><label className="text-[9px] font-bold text-gray-500">ASSURANCE</label><input type="number" value={form.assurance} onChange={e => setForm({...form, assurance: e.target.value})} className="input-field !py-1 text-[11px] font-mono" /></div>
                <div><label className="text-[9px] font-bold text-gray-500">FRAIS_DIVERS</label><input type="number" value={form.fraisDivers} onChange={e => setForm({...form, fraisDivers: e.target.value})} className="input-field !py-1 text-[11px] font-mono" /></div>
                <div><label className="text-[9px] font-bold text-gray-500">Nbre</label><input type="number" value={form.nombreUnites} onChange={e => setForm({...form, nombreUnites: e.target.value})} className="input-field !py-1 text-[11px] font-mono" /></div>
                <div><label className="text-[9px] font-bold text-gray-500">VALEUR_CAF</label><div className="input-field !py-1 text-[11px] font-mono bg-gray-50 font-bold text-emerald-700">{fmt(valeurCAF)}</div></div>
              </div>
              <div><label className="text-[10px] font-bold text-gray-500 uppercase">Titre</label><textarea value={form.titre} onChange={e => setForm({...form, titre: e.target.value})} className="input-field text-xs" rows={3} placeholder="DEDOUANEMENT..." /></div>
              <div><label className="text-[10px] font-bold text-gray-500 uppercase">NB</label><textarea value={form.observations} onChange={e => setForm({...form, observations: e.target.value})} className="input-field text-xs" rows={3} /></div>
            </div>
          </div>

          {/* Panneau droit */}
          <div className="flex-1 space-y-2">
            {/* Toolbar */}
            <div className="flex gap-2 flex-wrap">
              <button onClick={() => setShowCatalogue(true)} className="px-3 py-1.5 bg-emerald-500 text-white rounded text-xs font-medium hover:bg-emerald-600 flex items-center gap-1">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                Ajouter des éléments
              </button>
              {categories.map(cat => (
                <button key={cat} onClick={() => addAllCategory(cat)} className="px-2 py-1 rounded text-[10px] font-medium border hover:opacity-80" style={{ borderColor: CAT_COLORS[cat], color: CAT_COLORS[cat] }}>
                  + {cat}
                </button>
              ))}
            </div>

            {/* Tableau des lignes */}
            <div className="bg-white dark:bg-surface-800 rounded-lg border border-gray-200 dark:border-surface-700 overflow-hidden text-sm">
              <div className="grid grid-cols-[32px_36px_1fr_80px_110px_36px_32px] bg-gray-600 text-white text-[10px] font-semibold">
                <div className="px-1 py-2"></div>
                <div className="px-1 py-2 text-center">N°</div>
                <div className="px-2 py-2">Désignation</div>
                <div className="px-1 py-2 text-right">Taux(%)</div>
                <div className="px-2 py-2 text-right">Montant</div>
                <div className="px-1 py-2 text-center text-[8px]">TVA</div>
                <div className="px-1 py-2"></div>
              </div>

              {lignes.length === 0 ? (
                <div className="text-center py-8 text-gray-400 text-sm">
                  Cliquez sur &quot;Ajouter des éléments&quot; pour sélectionner les prestations
                </div>
              ) : (
                groupedLignes.map(group => (
                  <div key={group.categorie}>
                    <div className="grid grid-cols-[32px_36px_1fr_80px_110px_36px_32px]" style={{ backgroundColor: group.couleur + '12' }}>
                      <div className="px-1 py-1.5 text-gray-400 text-[10px]">—</div>
                      <div></div>
                      <div className="px-2 py-1.5 font-bold text-xs" style={{ color: group.couleur }}>{group.categorie}</div>
                      <div></div>
                      <div className="px-2 py-1.5 text-right text-[10px]" style={{ color: group.couleur }}>
                        Sous Total : <span className="font-bold">{fmt(group.sousTotal)}</span>
                      </div>
                      <div></div><div></div>
                    </div>
                    {group.lignes.map(ligne => {
                      globalIndex++;
                      const idx = lignes.indexOf(ligne);
                      return (
                        <div key={idx} className="grid grid-cols-[32px_36px_1fr_80px_110px_36px_32px] border-t border-gray-100 dark:border-surface-700 hover:bg-gray-50">
                          <div className="px-1 py-1 flex items-center">
                            <span className="w-5 h-5 rounded bg-amber-500 text-white text-[9px] flex items-center justify-center">✎</span>
                          </div>
                          <div className="px-1 py-1 text-center text-gray-400 text-xs">{globalIndex}</div>
                          <div className="px-2 py-1">
                            <input type="text" value={ligne.designation} onChange={e => updateLigne(idx, 'designation', e.target.value)}
                              className="w-full bg-transparent border-0 outline-none text-xs p-0" />
                          </div>
                          <div className="px-1 py-1">
                            <input type="number" value={ligne.tauxTVA || ''} onChange={e => updateLigne(idx, 'tauxTVA', parseFloat(e.target.value) || 0)}
                              className="w-full bg-transparent border-0 outline-none text-xs text-right p-0" placeholder="0,00" />
                          </div>
                          <div className="px-2 py-1">
                            <input type="number" value={ligne.montant || ''} onChange={e => updateLigne(idx, 'montant', parseFloat(e.target.value) || 0)}
                              className="w-full bg-transparent border-0 outline-none text-xs text-right p-0 font-mono font-bold" placeholder="0" />
                          </div>
                          <div className="px-1 py-1 flex items-center justify-center">
                            <input type="checkbox" checked={ligne.estTVA} onChange={e => updateLigne(idx, 'estTVA', e.target.checked)} className="w-3 h-3 rounded" />
                          </div>
                          <div className="px-1 py-1 flex items-center">
                            <button onClick={() => removeLigne(idx)} className="text-red-400 hover:text-red-600">
                              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ))
              )}

              {lignes.length > 0 && (
                <div className="grid grid-cols-[32px_36px_1fr_80px_110px_36px_32px] border-t-2 border-gray-300 bg-gray-50 font-bold text-xs">
                  <div></div><div></div>
                  <div className="px-2 py-2 text-right">Somme</div>
                  <div></div>
                  <div className="px-2 py-2 text-right font-mono">{fmt(totalGeneral)}</div>
                  <div></div><div></div>
                </div>
              )}
            </div>

            {/* Totaux */}
            {lignes.length > 0 && (
              <div className="flex justify-end gap-4 mt-3">
                <div className="text-center">
                  <p className="text-[10px] font-bold text-gray-500 mb-1">Total HT</p>
                  <div className="px-4 py-2 bg-white border border-gray-200 rounded-lg font-mono font-bold">{fmt(totalHT)}</div>
                </div>
                <div className="text-center">
                  <p className="text-[10px] font-bold text-red-500 mb-1">Total TVA</p>
                  <div className="px-4 py-2 bg-white border border-red-200 rounded-lg font-mono font-bold text-red-600">{fmt(totalTVA)}</div>
                </div>
                <div className="text-center">
                  <p className="text-[10px] font-bold text-emerald-600 mb-1">TOTAL GÉNÉRAL</p>
                  <div className="px-4 py-2 bg-emerald-50 border-2 border-emerald-500 rounded-lg font-mono font-bold text-lg text-emerald-700">{fmt(totalGeneral)}</div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal Catalogue */}
      {showCatalogue && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 animate-fade-in">
          <div className="bg-white dark:bg-surface-800 rounded-xl shadow-elevated w-full max-w-2xl mx-4 max-h-[85vh] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-surface-700">
              <h3 className="font-bold text-lg">Catalogue des Prestations</h3>
              <button onClick={() => setShowCatalogue(false)} className="p-1 rounded hover:bg-gray-100">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            {/* Recherche + Filtres */}
            <div className="px-4 pt-3 space-y-2">
              <div className="relative">
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                <input
                  type="text"
                  value={searchCat}
                  onChange={e => setSearchCat(e.target.value)}
                  placeholder="Rechercher une prestation..."
                  className="input-field pl-10 text-sm"
                  autoFocus
                />
                {searchCat && (
                  <button onClick={() => setSearchCat('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                )}
              </div>
              <div className="flex gap-1 flex-wrap">
                <button onClick={() => setSelectedCat('')} className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${!selectedCat ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                  Toutes
                </button>
                {Object.entries(CAT_COLORS).map(([cat, color]) => {
                  const count = catalogue.filter(p => p.categorie === cat).length;
                  return (
                    <button key={cat} onClick={() => setSelectedCat(cat)}
                      className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${selectedCat === cat ? 'text-white' : 'bg-gray-100 hover:opacity-80'}`}
                      style={selectedCat === cat ? { backgroundColor: color } : { color }}>
                      {cat} ({count})
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Liste */}
            <div className="flex-1 overflow-y-auto p-4 space-y-1.5">
              {catalogue
                .filter(p => !selectedCat || p.categorie === selectedCat)
                .filter(p => !searchCat || p.designation.toLowerCase().includes(searchCat.toLowerCase()) || p.code.toLowerCase().includes(searchCat.toLowerCase()) || p.categorie.toLowerCase().includes(searchCat.toLowerCase()))
                .map(p => {
                  const alreadyAdded = lignes.some(l => l.codePrestation === p.code);
                  return (
                    <div key={p.id} className={`flex items-center justify-between p-2.5 rounded-lg border transition-all ${alreadyAdded ? 'bg-green-50 border-green-200' : 'bg-white border-gray-100 hover:border-primary-300 hover:bg-primary-50 dark:bg-surface-700 dark:border-surface-600'}`}>
                      <div className="flex items-center gap-3">
                        <span className="px-2 py-0.5 rounded text-[9px] font-bold text-white min-w-[40px] text-center" style={{ backgroundColor: CAT_COLORS[p.categorie] || '#6B7280' }}>
                          {p.code}
                        </span>
                        <div>
                          <p className="text-sm font-medium">{p.designation}</p>
                          <p className="text-[10px] text-gray-400">{p.categorie}{p.montantDefaut ? ` • Défaut: ${fmt(Number(p.montantDefaut))} F` : ''}{p.estTVA ? ' • TVA' : ''}</p>
                        </div>
                      </div>
                      {alreadyAdded ? (
                        <span className="text-green-600 text-xs font-medium flex items-center gap-1 whitespace-nowrap">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                          Ajouté
                        </span>
                      ) : (
                        <button onClick={() => addFromCatalogue(p)} className="px-3 py-1 bg-primary-500 text-white rounded text-xs font-medium hover:bg-primary-600 whitespace-nowrap">
                          + Ajouter
                        </button>
                      )}
                    </div>
                  );
                })}
              {catalogue
                .filter(p => !selectedCat || p.categorie === selectedCat)
                .filter(p => !searchCat || p.designation.toLowerCase().includes(searchCat.toLowerCase()) || p.code.toLowerCase().includes(searchCat.toLowerCase()))
                .length === 0 && (
                <div className="text-center py-6 text-gray-400">
                  <p className="text-sm">Aucune prestation trouvée pour &quot;{searchCat}&quot;</p>
                  <button onClick={() => { setShowAddPrestation(true); setNewPrestation(prev => ({ ...prev, designation: searchCat })); }} className="text-primary-500 text-xs mt-2 hover:underline">
                    + Créer cette prestation
                  </button>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-gray-200 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <p className="text-sm text-gray-500">{lignes.length} élément(s) sélectionné(s)</p>
                <button onClick={() => setShowAddPrestation(true)} className="text-xs text-primary-500 hover:text-primary-700 font-medium flex items-center gap-1">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                  Nouvelle prestation
                </button>
              </div>
              <button onClick={() => setShowCatalogue(false)} className="btn-primary">Fermer</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Ajouter Prestation au catalogue */}
      {showAddPrestation && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 animate-fade-in">
          <div className="bg-white dark:bg-surface-800 rounded-xl shadow-elevated w-full max-w-md mx-4">
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h3 className="font-bold">Nouvelle Prestation</h3>
              <button onClick={() => setShowAddPrestation(false)} className="p-1 rounded hover:bg-gray-100">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="p-4 space-y-3">
              <div>
                <label className="label">Catégorie *</label>
                <select value={newPrestation.categorie} onChange={e => setNewPrestation({...newPrestation, categorie: e.target.value})} className="input-field">
                  {Object.keys(CAT_COLORS).map(cat => <option key={cat} value={cat}>{cat}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Code *</label>
                  <input type="text" value={newPrestation.code} onChange={e => setNewPrestation({...newPrestation, code: e.target.value.toUpperCase()})} className="input-field" placeholder="AF09" />
                </div>
                <div>
                  <label className="label">Montant par défaut</label>
                  <input type="number" value={newPrestation.montantDefaut} onChange={e => setNewPrestation({...newPrestation, montantDefaut: e.target.value})} className="input-field" placeholder="0" />
                </div>
              </div>
              <div>
                <label className="label">Désignation *</label>
                <input type="text" value={newPrestation.designation} onChange={e => setNewPrestation({...newPrestation, designation: e.target.value})} className="input-field" placeholder="Nom de la prestation" />
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={newPrestation.estTVA} onChange={e => setNewPrestation({...newPrestation, estTVA: e.target.checked})} className="w-4 h-4 rounded" />
                <span className="text-sm">Ligne de TVA</span>
              </label>
              <div className="flex justify-end gap-2 pt-3 border-t">
                <button onClick={() => setShowAddPrestation(false)} className="btn-secondary text-sm">Annuler</button>
                <button onClick={handleAddPrestation} className="btn-primary text-sm">Ajouter au catalogue</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}

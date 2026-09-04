'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import AppLayout from '@/components/layout/AppLayout';
import { downloadPDF, type DocData } from '@/lib/generatePDF';
import api from '@/lib/api';
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
  'DOUANE': '#059669',
  'DOUANE & COMPAGNIE': '#059669',
  'DEBOURS DOUANE': '#0d9488',
  'DEBOURS DOUANE & COMPAGNIE': '#0d9488',
  'DOUANE ELIBU-NOE-E': '#65a30d',
  'COMPAGNIE MARITIME': '#2563eb',
  'FRAIS PORTUAIRES': '#0891B2',
  'GUICHET UNIQUE': '#4f46e5',
  'GUICHET UNIQUE/IMMATRICULATION': '#4f46e5',
  'EXPORT ET FRET': '#7c3aed',
  'TRANSPORT': '#7C3AED',
  'PENALITES PORTUAIRES': '#dc2626',
  'AUTRES FRAIS': '#D97706',
  'DIVERS': '#6b7280',
};

const fmt = (n: number) => new Intl.NumberFormat('fr-FR').format(Math.round(n || 0));

function suggestCode(catalogue: any[], categorie: string): string {
  const codes = catalogue.filter(p => p.categorie === categorie).map(p => p.code as string).filter(Boolean);
  const parsed = codes
    .map(c => { const m = c.match(/^([A-Za-zÀ-ÿ-]*)(\d+)$/); return m ? { prefix: m[1], num: parseInt(m[2], 10), width: m[2].length } : null; })
    .filter((p): p is { prefix: string; num: number; width: number } => !!p);
  if (parsed.length > 0) {
    const counts: Record<string, number> = {};
    parsed.forEach(p => { counts[p.prefix] = (counts[p.prefix] || 0) + 1; });
    const bestPrefix = Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
    const group = parsed.filter(p => p.prefix === bestPrefix);
    const maxNum = Math.max(...group.map(p => p.num));
    const width = Math.max(...group.map(p => p.width));
    return `${bestPrefix}${String(maxNum + 1).padStart(width, '0')}`;
  }
  const initials = (categorie.match(/[A-Za-zÀ-ÿ]+/g) || []).map(w => w[0]).join('').toUpperCase().slice(0, 3) || 'PR';
  return `${initials}01`;
}

export default function ModifierProformaPage() {
  const router = useRouter();
  const params = useParams();
  const proformaId = params.id as string;
  const sheetRef = useRef<HTMLDivElement>(null);

  const [loading, setLoading] = useState(true);
  const [proforma, setProforma] = useState<any>(null);
  const [catalogue, setCatalogue] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [openCat, setOpenCat] = useState('');
  const [catalogueSearch, setCatalogueSearch] = useState('');
  const [showCatalogue, setShowCatalogue] = useState(false);
  const [quickCat, setQuickCat] = useState('');
  const [showAddPrestation, setShowAddPrestation] = useState(false);
  const [newPrestation, setNewPrestation] = useState({ categorie: 'DOUANE & COMPAGNIE', code: '', designation: '', montantDefaut: '', estTVA: false });
  const [customCategorie, setCustomCategorie] = useState('');
  const [codeTouched, setCodeTouched] = useState(false);

  const [form, setForm] = useState({
    titre: '', objet: '', observations: '',
    fobUnitaire: '', fretUnitaire: '', assurance: '', fraisDivers: '0', nombreUnites: '1',
  });

  const [lignes, setLignes] = useState<LigneProforma[]>([]);

  useEffect(() => {
    Promise.all([
      api.get(`/proformas/${proformaId}`),
      api.get('/proformas/catalogue'),
    ]).then(([pRes, catRes]) => {
      const p = pRes.data.data;
      if (!p) { toast.error('Proforma non trouvée'); router.push('/proformas'); return; }
      if (p.factureId || p.statut === 'TRANSFORMEE') {
        toast.error('Cette proforma a déjà été transformée en facture, elle ne peut plus être modifiée');
        router.push(`/proformas/${proformaId}`);
        return;
      }
      setProforma(p);
      setForm({
        titre: p.titre || '', objet: p.objet || '', observations: p.observations || '',
        fobUnitaire: p.fobUnitaire ? String(p.fobUnitaire) : '',
        fretUnitaire: p.fretUnitaire ? String(p.fretUnitaire) : '',
        assurance: p.assurance ? String(p.assurance) : '',
        fraisDivers: p.fraisDivers ? String(p.fraisDivers) : '0',
        nombreUnites: p.nombreUnites ? String(p.nombreUnites) : '1',
      });
      setLignes((p.lignes || []).map((l: any) => ({
        categorie: l.categorie || '', codePrestation: l.codePrestation || '',
        designation: l.designation, tauxTVA: Number(l.tauxTVA) || 0,
        montant: Number(l.prixUnitaire) || 0, estTVA: l.estTVA,
      })));
      const cat = catRes.data.data || [];
      setCatalogue(cat);
      const firstCat = [...new Set(cat.map((x: any) => x.categorie))][0] as string | undefined;
      if (firstCat) setOpenCat(firstCat);
    }).catch(() => {
      toast.error('Erreur de chargement');
      router.push('/proformas');
    }).finally(() => setLoading(false));
  }, [proformaId, router]);

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
  };

  const openAddPrestation = () => {
    setCodeTouched(false);
    setCustomCategorie('');
    setNewPrestation(prev => ({ ...prev, code: suggestCode(catalogue, prev.categorie) }));
    setShowAddPrestation(true);
  };

  const setPrestationCategorie = (categorie: string) => {
    setNewPrestation(prev => ({ ...prev, categorie, code: codeTouched ? prev.code : suggestCode(catalogue, categorie) }));
  };

  const handleAddPrestation = async () => {
    const categorie = newPrestation.categorie === '__new__' ? customCategorie.trim().toUpperCase() : newPrestation.categorie;
    if (!categorie) { toast.error('Indiquez le nom de la nouvelle catégorie'); return; }
    if (!newPrestation.code || !newPrestation.designation) { toast.error('Code et désignation requis'); return; }
    try {
      const res = await api.post('/proformas/catalogue', {
        ...newPrestation,
        categorie,
        code: newPrestation.code.toUpperCase(),
        montantDefaut: newPrestation.montantDefaut ? parseFloat(newPrestation.montantDefaut) : null,
        ordre: catalogue.filter(p => p.categorie === categorie).length + 1,
      });
      setCatalogue([...catalogue, res.data.data]);
      setOpenCat(categorie);
      setNewPrestation({ categorie, code: '', designation: '', montantDefaut: '', estTVA: false });
      setCustomCategorie('');
      setShowAddPrestation(false);
      toast.success('Prestation ajoutée au catalogue');
    } catch (e: any) { toast.error(e.response?.data?.message || 'Erreur'); }
  };

  const updateLigne = (index: number, field: string, value: any) => {
    setLignes(lignes.map((l, i) => i === index ? { ...l, [field]: value } : l));
  };

  const removeLigne = (index: number) => setLignes(lignes.filter((_, i) => i !== index));

  const handleAjouterGroupe = () => {
    if (!quickCat) { toast.error('Choisissez une catégorie'); return; }
    const items = catalogue.filter(p => p.categorie === quickCat);
    if (items.length === 0) { toast.error('Aucune prestation dans cette catégorie'); return; }
    const nouvelles = items.filter(p => !lignes.some(l => l.codePrestation === p.code));
    if (nouvelles.length === 0) { toast.error('Toutes les prestations de cette catégorie sont déjà ajoutées'); return; }
    setLignes([...lignes, ...nouvelles.map(p => ({
      categorie: p.categorie, codePrestation: p.code, designation: p.designation,
      tauxTVA: Number(p.tauxTVA) || 0, montant: Number(p.montantDefaut) || 0, estTVA: p.estTVA,
    }))]);
    toast.success(`${nouvelles.length} prestation(s) ajoutée(s)`);
    setQuickCat('');
  };

  const valeurCAF = ((parseFloat(form.fobUnitaire) || 0) + (parseFloat(form.fretUnitaire) || 0) + (parseFloat(form.assurance) || 0) + (parseFloat(form.fraisDivers) || 0)) * (parseInt(form.nombreUnites) || 1);

  const allCategories = [...new Set([...Object.keys(CAT_COLORS), ...catalogue.map(p => p.categorie)])];
  const categoriesWithItems = allCategories.filter(cat => catalogue.some(p => p.categorie === cat));
  const groupedLignes = allCategories.map(cat => ({
    categorie: cat,
    couleur: CAT_COLORS[cat] || '#6b7280',
    lignes: lignes.filter(l => l.categorie === cat),
    sousTotal: lignes.filter(l => l.categorie === cat).reduce((s, l) => s + (l.montant || 0), 0),
  })).filter(g => g.lignes.length > 0);

  const totalHT = lignes.filter(l => !l.estTVA).reduce((s, l) => s + (l.montant || 0), 0);
  const totalTVA = lignes.filter(l => l.estTVA).reduce((s, l) => s + (l.montant || 0), 0);
  const totalGeneral = totalHT + totalTVA;

  const handleSubmit = async () => {
    if (lignes.length === 0) { toast.error('Ajoutez au moins une prestation'); return; }
    setSaving(true);
    try {
      const res = await api.put(`/proformas/${proformaId}`, { ...form, lignes });
      toast.success(res.data.message || 'Proforma modifiée');
      router.push(`/proformas/${proformaId}`);
    } catch (e: any) { toast.error(e.response?.data?.message || 'Erreur'); }
    finally { setSaving(false); }
  };

  const handleExportApercu = async () => {
    setExporting(true);
    try {
      const d = proforma.dossier;
      const docData: DocData = {
        type: 'PROFORMA',
        numero: proforma.numero,
        date: new Date(proforma.dateProforma).toLocaleDateString('fr-FR'),
        client: proforma.client?.raisonSociale || '',
        clientAdresse: proforma.client?.adresse || undefined,
        clientTelephone: proforma.client?.telephone || proforma.client?.mobile || undefined,
        clientEmail: proforma.client?.email || undefined,
        clientNcc: proforma.client?.ncc || undefined,
        clientPays: proforma.client?.pays || undefined,
        dossierNumero: d ? (d.numeroPhysique || d.numero) : undefined,
        titre: form.titre || undefined,
        fobUnitaire: form.fobUnitaire ? parseFloat(form.fobUnitaire) : undefined,
        fretUnitaire: form.fretUnitaire ? parseFloat(form.fretUnitaire) : undefined,
        assurance: form.assurance ? parseFloat(form.assurance) : undefined,
        nombreUnites: form.nombreUnites ? parseInt(form.nombreUnites) : undefined,
        valeurCAF: valeurCAF || undefined,
        montantHT: totalHT,
        montantTVA: totalTVA,
        montantTTC: totalGeneral,
        lignes: lignes.map(l => ({ categorie: l.categorie, designation: l.designation, montant: l.montant, estTVA: l.estTVA })),
      };
      await downloadPDF(docData);
      toast.success('Aperçu PDF téléchargé');
    } catch { toast.error('Erreur lors de l\'export'); }
    finally { setExporting(false); }
  };

  let globalIndex = 0;
  const filteredCatalogue = (cat: string) => catalogue
    .filter(p => p.categorie === cat)
    .filter(p => !catalogueSearch || p.designation.toLowerCase().includes(catalogueSearch.toLowerCase()) || p.code.toLowerCase().includes(catalogueSearch.toLowerCase()));

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full" />
        </div>
      </AppLayout>
    );
  }

  if (!proforma) return null;

  return (
    <AppLayout>
      <div className="space-y-4">
        {/* Barre d'actions */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <button onClick={() => router.push(`/proformas/${proformaId}`)} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-surface-700">
              <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
            </button>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">Modifier — {proforma.numero}</h1>
          </div>
          <div className="flex gap-2 flex-wrap">
            <button onClick={handleExportApercu} disabled={exporting || lignes.length === 0} className="btn-secondary disabled:opacity-50">
              {exporting ? 'Export...' : 'Aperçu PDF'}
            </button>
            <button onClick={handleSubmit} disabled={saving} className="btn-primary disabled:opacity-50">
              {saving ? 'Enregistrement...' : 'Enregistrer les modifications'}
            </button>
            <button onClick={() => router.push(`/proformas/${proformaId}`)} className="btn-secondary !text-red-600 hover:!bg-red-50">Annuler</button>
          </div>
        </div>

        {/* Informations (au-dessus de la fiche) */}
        <div className="card">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            <div><label className="label">Client</label><div className="input-field bg-gray-50 dark:bg-surface-700 font-medium flex items-center">{proforma.client?.raisonSociale}</div></div>
            {proforma.dossier && (
              <div><label className="label">Dossier</label><div className="input-field bg-gray-50 dark:bg-surface-700 font-mono flex items-center">{proforma.dossier.numeroPhysique || proforma.dossier.numero}</div></div>
            )}
            <div><label className="label">FOB (Unitaire)</label><input type="number" value={form.fobUnitaire} onChange={e => setForm({ ...form, fobUnitaire: e.target.value })} className="input-field" /></div>
            <div><label className="label">FRET (Unitaire)</label><input type="number" value={form.fretUnitaire} onChange={e => setForm({ ...form, fretUnitaire: e.target.value })} className="input-field" /></div>
            <div><label className="label">Assurance</label><input type="number" value={form.assurance} onChange={e => setForm({ ...form, assurance: e.target.value })} className="input-field" /></div>
            <div><label className="label">Frais divers</label><input type="number" value={form.fraisDivers} onChange={e => setForm({ ...form, fraisDivers: e.target.value })} className="input-field" /></div>
            <div><label className="label">Nbre unités</label><input type="number" value={form.nombreUnites} onChange={e => setForm({ ...form, nombreUnites: e.target.value })} className="input-field" /></div>
            <div><label className="label">Valeur CAF</label><div className="input-field bg-gray-50 dark:bg-surface-700 font-mono font-bold text-primary-600 flex items-center">{fmt(valeurCAF)}</div></div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
            <div><label className="label">Titre</label><textarea value={form.titre} onChange={e => setForm({ ...form, titre: e.target.value })} rows={2} className="input-field" placeholder="DEDOUANEMENT..." /></div>
            <div><label className="label">NB / Observations</label><textarea value={form.observations} onChange={e => setForm({ ...form, observations: e.target.value })} rows={2} className="input-field" /></div>
          </div>
        </div>

        {/* Fiche Proforma — rendu papier */}
        <div className="pf-sheet-wrap">
          <div className="pf-sheet" ref={sheetRef}>
            <div className="pf-doc-head">
              <div className="pf-company">
                <div className="pf-company-name">GBTRANS SARL</div>
                <div className="pf-company-sub">Transit · Douane · Logistique</div>
                <div className="pf-company-addr">
                  Cocody Angré 7ème Tranche, Abidjan — Côte d&apos;Ivoire<br />
                  +225 27 20 00 00 00 · contact@gbtrans.ci
                </div>
              </div>
              <div className="pf-doc-title">
                <div className="pf-doc-label">PROFORMA</div>
                <div className="pf-doc-num">N° <em>{proforma.numero}</em></div>
                <div className="pf-doc-num">Date : {new Date(proforma.dateProforma).toLocaleDateString('fr-FR')}</div>
              </div>
            </div>

            <div className="pf-meta-grid">
              <div className="pf-meta-block">
                <div className="pf-meta-k">Adressée à</div>
                <div className="pf-meta-v pf-meta-strong">{proforma.client?.raisonSociale}</div>
                {proforma.client?.adresse && <div className="pf-meta-v">{proforma.client.adresse}</div>}
                {(proforma.client?.telephone || proforma.client?.mobile) && <div className="pf-meta-v">{proforma.client.telephone || proforma.client.mobile}</div>}
              </div>
              <div className="pf-meta-block">
                <div className="pf-meta-k">Détails</div>
                {proforma.dossier && <div className="pf-meta-v">Dossier : <strong>{proforma.dossier.numeroPhysique || proforma.dossier.numero}</strong></div>}
                <div className="pf-meta-v pf-meta-dim">Offre valable 30 jours à compter de la date d&apos;émission.</div>
              </div>
            </div>

            {form.titre && <div className="pf-titre">{form.titre}</div>}

            {lignes.length === 0 && (
              <div className="pf-empty-hint">Ajoutez des prestations depuis le catalogue pour composer la proforma.</div>
            )}

            <div className="pf-inline-toolbar pf-no-export">
              <button type="button" onClick={() => setShowCatalogue(true)} className="pf-inline-btn-outline">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" /></svg>
                Catalogue des prestations
                {lignes.length > 0 && <span className="pf-inline-badge">{lignes.length}</span>}
              </button>
              <div className="pf-inline-group-add">
                <select value={quickCat} onChange={e => setQuickCat(e.target.value)} className="pf-inline-select">
                  <option value="">-- Choisir une catégorie --</option>
                  {categoriesWithItems.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                </select>
                <button type="button" onClick={handleAjouterGroupe} className="pf-inline-btn-solid">+ Ajouter un groupe</button>
              </div>
            </div>

            {lignes.length > 0 && (
              <table className="pf-items">
                <thead>
                  <tr>
                    <th className="pf-numcol">N°</th>
                    <th>Désignation</th>
                    <th className="pf-num pf-montantcol">Montant</th>
                    <th className="pf-tvacol">TVA</th>
                    <th className="pf-rmcol pf-no-export"></th>
                  </tr>
                </thead>
                {groupedLignes.map(group => (
                  <tbody key={group.categorie}>
                    <tr>
                      <td colSpan={5} className="pf-section-title-row" style={{ background: group.couleur }}>{group.categorie}</td>
                    </tr>
                    {group.lignes.map(ligne => {
                      globalIndex++;
                      const idx = lignes.indexOf(ligne);
                      return (
                        <tr key={idx}>
                          <td className="pf-numcol">{globalIndex}</td>
                          <td><input value={ligne.designation} onChange={e => updateLigne(idx, 'designation', e.target.value)} /></td>
                          <td className="pf-num"><input className="pf-num-input" type="number" value={ligne.montant || ''} onChange={e => updateLigne(idx, 'montant', parseFloat(e.target.value) || 0)} /></td>
                          <td className="pf-tvacol"><input type="checkbox" checked={ligne.estTVA} disabled className="pf-tva-checkbox" title="Défini depuis le catalogue" /></td>
                          <td className="pf-rmcol pf-no-export"><button type="button" onClick={() => removeLigne(idx)}>✕</button></td>
                        </tr>
                      );
                    })}
                    <tr className="pf-subtotal-row">
                      <td colSpan={2}>Sous-total {group.categorie}</td>
                      <td className="pf-num">{fmt(group.sousTotal)}</td>
                      <td className="pf-no-export"></td>
                      <td className="pf-no-export"></td>
                    </tr>
                  </tbody>
                ))}
              </table>
            )}

            {lignes.length > 0 && (
              <div className="pf-totals">
                <div className="pf-trow"><span>Total HT</span><span>{fmt(totalHT)}</span></div>
                <div className="pf-trow"><span>Total TVA</span><span>{fmt(totalTVA)}</span></div>
                <div className="pf-trow pf-grand"><span>Total Général</span><span>{fmt(totalGeneral)}</span></div>
              </div>
            )}

            <div className="pf-hors">
              <strong>HORS :</strong> Frais de dépotage, d&apos;expertises éventuels, scanner, frais de magasinage, de dépôt douane, de surestarie, BSC, tout autre frais non défini mais induit par les opérations de dédouanement.
            </div>

            {form.observations && (
              <div className="pf-footer-grid">
                <div>
                  <div className="pf-meta-k">Observations</div>
                  <p className="pf-obs-text">{form.observations}</p>
                </div>
              </div>
            )}

            <div className="pf-sign">
              Fait à Abidjan<br />
              <div className="pf-sign-line">GBTRANS SARL</div>
            </div>
          </div>
        </div>
      </div>

      {/* Modal Catalogue des prestations */}
      {showCatalogue && (
        <div className="fixed inset-0 z-[58] flex items-center justify-center bg-black/50 animate-fade-in p-4" onClick={() => setShowCatalogue(false)}>
          <div className="bg-white dark:bg-surface-800 rounded-xl shadow-elevated w-full max-w-lg max-h-[85vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-surface-700">
              <h3 className="font-bold text-lg">Catalogue des prestations</h3>
              <button type="button" onClick={() => setShowCatalogue(false)} className="p-1 rounded hover:bg-gray-100 dark:hover:bg-surface-700">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="px-4 pt-3">
              <input type="text" autoFocus value={catalogueSearch} onChange={e => setCatalogueSearch(e.target.value)} placeholder="Rechercher..." className="input-field text-sm" />
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {categoriesWithItems.length === 0 ? (
                <p className="text-center text-sm text-gray-400 py-8">Chargement du catalogue…</p>
              ) : categoriesWithItems.map(cat => {
                const items = filteredCatalogue(cat);
                if (catalogueSearch && items.length === 0) return null;
                const isOpen = openCat === cat;
                return (
                  <div key={cat} className="border border-gray-100 dark:border-surface-600 rounded-lg overflow-hidden">
                    <button type="button" onClick={() => setOpenCat(isOpen ? '' : cat)} className="w-full flex items-center justify-between px-3 py-2 text-left text-xs font-bold uppercase tracking-wide bg-gray-50 dark:bg-surface-700 text-gray-700 dark:text-gray-200" style={{ borderLeft: `3px solid ${CAT_COLORS[cat] || '#6b7280'}` }}>
                      <span>{cat}</span>
                      <svg className={`w-3.5 h-3.5 text-gray-400 transition-transform flex-shrink-0 ${isOpen ? 'rotate-90' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
                    </button>
                    {isOpen && (
                      <div className="divide-y divide-gray-100 dark:divide-surface-700">
                        {items.map(p => {
                          const already = lignes.some(l => l.codePrestation === p.code);
                          return (
                            <div key={p.id} className="flex items-center justify-between px-3 py-2">
                              <div>
                                <p className="text-sm font-medium text-gray-900 dark:text-white">{p.designation}</p>
                                <p className="text-[10px] text-gray-400">{p.code}{p.montantDefaut ? ` · ${fmt(Number(p.montantDefaut))} F` : ''}{p.estTVA ? ' · TVA' : ''}</p>
                              </div>
                              {already ? <span className="text-green-500 text-sm font-bold flex-shrink-0">✓</span> : (
                                <button type="button" onClick={() => addFromCatalogue(p)} className="w-6 h-6 flex-shrink-0 rounded-full border border-primary-400 text-primary-500 text-sm hover:bg-primary-500 hover:text-white transition-colors" title="Ajouter">+</button>
                              )}
                            </div>
                          );
                        })}
                        {items.length === 0 && <p className="text-center text-xs text-gray-400 py-4">Aucun résultat</p>}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            <div className="p-4 border-t border-gray-200 dark:border-surface-700">
              <button type="button" onClick={openAddPrestation} className="text-xs text-primary-600 hover:underline">+ Nouvelle prestation au catalogue</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Nouvelle Prestation (catalogue) */}
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
                {newPrestation.categorie === '__new__' ? (
                  <div className="flex gap-2">
                    <input type="text" autoFocus value={customCategorie} onChange={e => { const v = e.target.value.toUpperCase(); setCustomCategorie(v); if (!codeTouched) setNewPrestation(prev => ({ ...prev, code: suggestCode(catalogue, v) })); }} className="input-field" placeholder="NOM DE LA NOUVELLE CATEGORIE" />
                    <button type="button" onClick={() => { setPrestationCategorie(allCategories[0] || 'DOUANE & COMPAGNIE'); setCustomCategorie(''); }} className="btn-secondary text-sm px-3 whitespace-nowrap">Annuler</button>
                  </div>
                ) : (
                  <select value={newPrestation.categorie} onChange={e => setPrestationCategorie(e.target.value)} className="input-field">
                    {allCategories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                    <option value="__new__">+ Nouvelle catégorie…</option>
                  </select>
                )}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Code * <span className="text-gray-400 font-normal">(généré, modifiable)</span></label>
                  <input type="text" value={newPrestation.code} onChange={e => { setCodeTouched(true); setNewPrestation({ ...newPrestation, code: e.target.value.toUpperCase() }); }} className="input-field" placeholder="AF09" />
                </div>
                <div>
                  <label className="label">Montant par défaut</label>
                  <input type="number" value={newPrestation.montantDefaut} onChange={e => setNewPrestation({ ...newPrestation, montantDefaut: e.target.value })} className="input-field" placeholder="0" />
                </div>
              </div>
              <div>
                <label className="label">Désignation *</label>
                <input type="text" value={newPrestation.designation} onChange={e => setNewPrestation({ ...newPrestation, designation: e.target.value })} className="input-field" placeholder="Nom de la prestation" />
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={newPrestation.estTVA} onChange={e => setNewPrestation({ ...newPrestation, estTVA: e.target.checked })} className="w-4 h-4 rounded" />
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

      <style jsx global>{`
        :root { --pf-ink:#241536; --pf-ink-soft:#5d4a72; --pf-gold:#7322ab; --pf-gold-soft:#f0e6fa; --pf-paper:#FBF9F4; --pf-line:#ded2ea; --pf-danger:#B3492F; }

        .pf-sheet-wrap { background:#0C0812; padding:28px 20px; border-radius:14px; display:flex; justify-content:center; overflow-x:auto; min-width:0; }
        .pf-sheet { width:210mm; max-width:100%; min-height:280mm; background:var(--pf-paper); color:var(--pf-ink); padding:14mm 13mm; font-family:'Segoe UI',Arial,sans-serif; box-shadow:0 16px 40px rgba(0,0,0,.4); }

        .pf-doc-head { display:flex; justify-content:space-between; align-items:flex-start; border-bottom:2px solid var(--pf-ink); padding-bottom:12px; margin-bottom:18px; }
        .pf-company-name { font-size:20px; font-weight:700; letter-spacing:.01em; }
        .pf-company-sub { font-size:11px; color:var(--pf-ink-soft); margin-top:2px; }
        .pf-company-addr { font-size:10px; color:#5C6580; margin-top:6px; line-height:1.5; }
        .pf-doc-title { text-align:right; flex:none; }
        .pf-doc-label { font-size:19px; font-weight:700; letter-spacing:.05em; }
        .pf-doc-num { font-size:11.5px; color:var(--pf-ink-soft); margin-top:3px; }
        .pf-doc-num em { color:var(--pf-gold); font-style:normal; }

        .pf-meta-grid { display:grid; grid-template-columns:1fr 1fr; gap:14px; margin-bottom:18px; }
        .pf-meta-block { border:1px solid var(--pf-line); padding:9px 11px; }
        .pf-meta-k { font-size:9px; text-transform:uppercase; letter-spacing:.08em; color:var(--pf-gold); margin-bottom:6px; font-weight:700; }
        .pf-meta-v { font-size:12px; padding:1px 0; }
        .pf-meta-strong { font-weight:700; }
        .pf-meta-dim { color:#8b93ad; font-size:10.5px; margin-top:4px; }

        .pf-titre { background:var(--pf-gold-soft); padding:8px 11px; margin-bottom:16px; font-size:12px; font-weight:700; text-transform:uppercase; letter-spacing:.02em; border-left:3px solid var(--pf-gold); color:var(--pf-ink); }

        .pf-empty-hint { font-size:12px; color:#9AA0B5; text-align:center; padding:30px 10px; border:1px dashed var(--pf-line); margin-bottom:16px; }

        .pf-inline-toolbar { display:flex; flex-wrap:wrap; align-items:center; justify-content:space-between; gap:10px; border:1px dashed var(--pf-line); border-radius:4px; padding:10px 12px; margin-bottom:16px; background:rgba(174,124,31,.03); }
        .pf-inline-btn-outline { display:inline-flex; align-items:center; gap:6px; background:transparent; border:1px solid var(--pf-gold); color:var(--pf-gold); font-size:11.5px; font-weight:700; padding:6px 12px; border-radius:4px; cursor:pointer; font-family:inherit; }
        .pf-inline-btn-outline:hover { background:var(--pf-gold-soft); }
        .pf-inline-badge { background:var(--pf-gold); color:#fff; font-size:9.5px; font-weight:800; padding:1px 7px; border-radius:10px; margin-left:2px; }
        .pf-inline-group-add { display:flex; align-items:center; gap:8px; flex-wrap:wrap; }
        .pf-inline-select { border:1px solid var(--pf-line); background:#fff; color:var(--pf-ink); font-size:11.5px; padding:6px 8px; border-radius:4px; font-family:inherit; min-width:180px; }
        .pf-inline-select:focus { outline:none; border-color:var(--pf-gold); }
        .pf-inline-btn-solid { background:var(--pf-gold); color:#fff; border:none; font-size:11.5px; font-weight:700; padding:7px 14px; border-radius:4px; cursor:pointer; white-space:nowrap; font-family:inherit; }
        .pf-inline-btn-solid:hover { background:#5d1590; }

        .pf-section-title-row { color:#fff; padding:8px 10px; font-size:11.5px; letter-spacing:.03em; font-weight:700; text-align:left; }
        table.pf-items { width:100%; border-collapse:collapse; font-size:11.5px; }
        table.pf-items th { text-align:left; font-size:9px; text-transform:uppercase; letter-spacing:.05em; color:var(--pf-ink-soft); border-bottom:1px solid var(--pf-line); padding:5px 6px; }
        table.pf-items td { padding:5px 6px; border-bottom:1px solid var(--pf-line); vertical-align:middle; }
        .pf-numcol { width:28px; text-align:center; color:#8b93ad; }
        .pf-tvacol { width:36px; text-align:center; }
        .pf-tva-checkbox { accent-color:#9AA0B5; opacity:.65; cursor:not-allowed; }
        .pf-montantcol { width:110px; }
        .pf-rmcol { width:22px; }
        table.pf-items .pf-num { text-align:right; white-space:nowrap; }
        table.pf-items input { border:none; background:transparent; font-family:inherit; width:100%; font-size:11.5px; color:var(--pf-ink); padding:1px 2px; }
        table.pf-items input:focus { outline:1px dashed var(--pf-gold); }
        .pf-num-input { text-align:right; font-family:'Courier New',monospace; font-weight:700; }
        table.pf-items .pf-rmcol button { background:none; border:none; color:var(--pf-danger); cursor:pointer; font-size:12px; }
        .pf-subtotal-row td { font-weight:700; color:var(--pf-ink); background:rgba(115,34,171,.06); border-bottom:2px solid var(--pf-gold); }
        .pf-subtotal-row td:first-child { text-align:right; font-size:10.5px; }

        .pf-totals { margin-left:auto; width:260px; margin-top:10px; margin-bottom:16px; }
        .pf-trow { display:flex; justify-content:space-between; padding:5px 0; font-size:12.5px; border-bottom:1px solid var(--pf-line); }
        .pf-trow.pf-grand { border-bottom:none; border-top:2px solid var(--pf-ink); margin-top:4px; padding-top:8px; font-size:15px; font-weight:700; color:var(--pf-ink); }

        .pf-hors { font-size:9.5px; color:var(--pf-ink-soft); border:1px solid var(--pf-line); border-radius:2px; padding:8px 10px; background:rgba(115,34,171,.05); line-height:1.5; margin-bottom:14px; }
        .pf-hors strong { color:var(--pf-ink); }

        .pf-footer-grid { margin-top:10px; margin-bottom:10px; font-size:11px; color:var(--pf-ink-soft); }
        .pf-obs-text { border:1px solid var(--pf-line); padding:8px; margin-top:4px; font-size:11px; line-height:1.5; }

        .pf-sign { margin-top:24px; text-align:right; font-size:11.5px; color:var(--pf-ink-soft); }
        .pf-sign-line { margin-top:32px; border-top:1px solid var(--pf-ink-soft); display:inline-block; padding-top:4px; width:180px; }

        .pf-sheet.pf-exporting input, .pf-sheet.pf-exporting textarea { border:none !important; outline:none !important; background:transparent !important; }
        .pf-sheet.pf-exporting .pf-no-export { display:none !important; }
        .pf-sheet.pf-exporting { box-shadow:none; }
      `}</style>
    </AppLayout>
  );
}

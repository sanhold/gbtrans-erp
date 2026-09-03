'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
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
  const sheetRef = useRef<HTMLDivElement>(null);

  const [clients, setClients] = useState<any[]>([]);
  const [dossiers, setDossiers] = useState<any[]>([]);
  const [catalogue, setCatalogue] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [openCat, setOpenCat] = useState('');
  const [catalogueSearch, setCatalogueSearch] = useState('');
  const [showAddPrestation, setShowAddPrestation] = useState(false);
  const [newPrestation, setNewPrestation] = useState({ categorie: 'DOUANE & COMPAGNIE', code: '', designation: '', montantDefaut: '', estTVA: false });
  const [customCategorie, setCustomCategorie] = useState('');
  const [codeTouched, setCodeTouched] = useState(false);

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
      const cat = catRes.data.data || [];
      setCatalogue(cat);
      const firstCat = [...new Set(cat.map((p: any) => p.categorie))][0] as string | undefined;
      if (firstCat) setOpenCat(firstCat);
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

  const selectedClient = clients.find(c => c.id === form.clientId);
  const selectedDossier = dossiers.find(d => d.id === form.dossierId);

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

  const handleExportApercu = async () => {
    if (!sheetRef.current) return;
    setExporting(true);
    try {
      const html2pdf = (await import('html2pdf.js')).default;
      const el = sheetRef.current;
      el.classList.add('pf-exporting');
      await html2pdf()
        .set({
          margin: 0,
          filename: `Proforma_apercu_${selectedClient?.raisonSociale || 'client'}.pdf`,
          image: { type: 'jpeg', quality: 0.98 },
          html2canvas: { scale: 2, useCORS: true, logging: false },
          jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
        })
        .from(el)
        .save();
      el.classList.remove('pf-exporting');
      toast.success('Aperçu PDF téléchargé');
    } catch { toast.error('Erreur lors de l\'export'); }
    finally { setExporting(false); }
  };

  let globalIndex = 0;
  const filteredCatalogue = (cat: string) => catalogue
    .filter(p => p.categorie === cat)
    .filter(p => !catalogueSearch || p.designation.toLowerCase().includes(catalogueSearch.toLowerCase()) || p.code.toLowerCase().includes(catalogueSearch.toLowerCase()));

  return (
    <AppLayout>
      <div className="pf-root">
        {/* Barre d'actions */}
        <div className="pf-topbar">
          <div className="pf-topbar-left">
            <button onClick={() => router.back()} className="pf-icon-btn" aria-label="Retour">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
            </button>
            <span className="pf-topbar-title">Nouvelle Proforma</span>
          </div>
          <div className="pf-topbar-right">
            <button onClick={handleExportApercu} disabled={exporting || lignes.length === 0} className="pf-btn-ghost">
              {exporting ? 'Export...' : 'Aperçu PDF'}
            </button>
            <button onClick={handleSubmit} disabled={saving} className="pf-btn-gold">
              {saving ? 'Enregistrement...' : 'Enregistrer la proforma'}
            </button>
            <button onClick={() => router.back()} className="pf-btn-cancel">Annuler</button>
          </div>
        </div>

        <div className="pf-app">
          {/* ---------- LEFT PANEL ---------- */}
          <div className="pf-panel">
            <div className="pf-brandmark">GBTRANS SARL</div>
            <h1 className="pf-panel-h1">Fiche Proforma</h1>

            <h2 className="pf-panel-h2">Informations</h2>
            <div className="pf-field">
              <label>Dossier</label>
              <select value={form.dossierId} onChange={e => setForm({ ...form, dossierId: e.target.value })}>
                <option value="">— Aucun —</option>
                {dossiers.map(d => <option key={d.id} value={d.id}>{d.numero}</option>)}
              </select>
            </div>
            <div className="pf-field">
              <label>Client *</label>
              <select value={form.clientId} onChange={e => setForm({ ...form, clientId: e.target.value })} required>
                <option value="">— Sélectionner —</option>
                {clients.map(c => <option key={c.id} value={c.id}>{c.raisonSociale}</option>)}
              </select>
            </div>
            <div className="pf-row2">
              <div className="pf-field"><label>FOB (Unitaire)</label><input type="number" value={form.fobUnitaire} onChange={e => setForm({ ...form, fobUnitaire: e.target.value })} /></div>
              <div className="pf-field"><label>FRET (Unitaire)</label><input type="number" value={form.fretUnitaire} onChange={e => setForm({ ...form, fretUnitaire: e.target.value })} /></div>
            </div>
            <div className="pf-row2">
              <div className="pf-field"><label>Assurance</label><input type="number" value={form.assurance} onChange={e => setForm({ ...form, assurance: e.target.value })} /></div>
              <div className="pf-field"><label>Frais divers</label><input type="number" value={form.fraisDivers} onChange={e => setForm({ ...form, fraisDivers: e.target.value })} /></div>
            </div>
            <div className="pf-row2">
              <div className="pf-field"><label>Nbre unités</label><input type="number" value={form.nombreUnites} onChange={e => setForm({ ...form, nombreUnites: e.target.value })} /></div>
              <div className="pf-field"><label>Valeur CAF</label><div className="pf-readonly">{fmt(valeurCAF)}</div></div>
            </div>
            <div className="pf-field"><label>Titre</label><textarea value={form.titre} onChange={e => setForm({ ...form, titre: e.target.value })} rows={2} placeholder="DEDOUANEMENT..." /></div>
            <div className="pf-field"><label>NB / Observations</label><textarea value={form.observations} onChange={e => setForm({ ...form, observations: e.target.value })} rows={2} /></div>

            <h2 className="pf-panel-h2">Catalogue des prestations</h2>
            <input className="pf-search" type="text" value={catalogueSearch} onChange={e => setCatalogueSearch(e.target.value)} placeholder="Rechercher..." />

            <div className="pf-catalog">
              {categoriesWithItems.length === 0 ? (
                <p className="pf-catalog-empty">Chargement du catalogue…</p>
              ) : categoriesWithItems.map(cat => {
                const items = filteredCatalogue(cat);
                if (catalogueSearch && items.length === 0) return null;
                const isOpen = openCat === cat;
                return (
                  <div key={cat} className={`pf-cat ${isOpen ? 'pf-cat-open' : ''}`}>
                    <button type="button" className="pf-cat-head" onClick={() => setOpenCat(isOpen ? '' : cat)} style={{ borderLeftColor: CAT_COLORS[cat] }}>
                      <span>{cat}</span>
                      <span className="pf-chev">▶</span>
                    </button>
                    {isOpen && (
                      <div className="pf-cat-items">
                        {items.map(p => {
                          const already = lignes.some(l => l.codePrestation === p.code);
                          return (
                            <div key={p.id} className="pf-cat-item">
                              <div>
                                <div className="pf-cat-item-name">{p.designation}</div>
                                <div className="pf-cat-item-meta">{p.code}{p.montantDefaut ? ` · ${fmt(Number(p.montantDefaut))} F` : ''}{p.estTVA ? ' · TVA' : ''}</div>
                              </div>
                              {already ? <span className="pf-added">✓</span> : (
                                <button type="button" className="pf-add-btn" title="Ajouter" onClick={() => addFromCatalogue(p)}>+</button>
                              )}
                            </div>
                          );
                        })}
                        {items.length === 0 && <p className="pf-catalog-empty">Aucun résultat</p>}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            <button type="button" className="pf-new-prestation" onClick={openAddPrestation}>+ Nouvelle prestation au catalogue</button>
          </div>

          {/* ---------- RIGHT: SHEET ---------- */}
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
                  <div className="pf-doc-num">N° <em>généré à l&apos;enregistrement</em></div>
                  <div className="pf-doc-num">Date : {new Date().toLocaleDateString('fr-FR')}</div>
                </div>
              </div>

              <div className="pf-meta-grid">
                <div className="pf-meta-block">
                  <div className="pf-meta-k">Adressée à</div>
                  {selectedClient ? (
                    <>
                      <div className="pf-meta-v pf-meta-strong">{selectedClient.raisonSociale}</div>
                      {selectedClient.adresse && <div className="pf-meta-v">{selectedClient.adresse}</div>}
                      {(selectedClient.telephone || selectedClient.mobile) && <div className="pf-meta-v">{selectedClient.telephone || selectedClient.mobile}</div>}
                    </>
                  ) : <div className="pf-meta-v pf-meta-placeholder">Sélectionnez un client…</div>}
                </div>
                <div className="pf-meta-block">
                  <div className="pf-meta-k">Détails</div>
                  {selectedDossier && <div className="pf-meta-v">Dossier : <strong>{selectedDossier.numero}</strong></div>}
                  <div className="pf-meta-v pf-meta-dim">Offre valable 30 jours à compter de la date d&apos;émission.</div>
                </div>
              </div>

              {form.titre && <div className="pf-titre">{form.titre}</div>}

              {lignes.length === 0 ? (
                <div className="pf-empty-hint">Ajoutez des prestations depuis le catalogue à gauche pour composer la proforma.</div>
              ) : groupedLignes.map(group => (
                <div key={group.categorie} className="pf-section-block">
                  <div className="pf-section-title-row" style={{ background: group.couleur }}>
                    <span className="pf-section-name">{group.categorie}</span>
                  </div>
                  <table className="pf-items">
                    <thead>
                      <tr>
                        <th className="pf-numcol">N°</th>
                        <th>Désignation</th>
                        <th className="pf-tvacol">TVA</th>
                        <th className="pf-num pf-montantcol">Montant</th>
                        <th className="pf-rmcol pf-no-export"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {group.lignes.map(ligne => {
                        globalIndex++;
                        const idx = lignes.indexOf(ligne);
                        return (
                          <tr key={idx}>
                            <td className="pf-numcol">{globalIndex}</td>
                            <td><input value={ligne.designation} onChange={e => updateLigne(idx, 'designation', e.target.value)} /></td>
                            <td className="pf-tvacol"><input type="checkbox" checked={ligne.estTVA} onChange={e => updateLigne(idx, 'estTVA', e.target.checked)} /></td>
                            <td className="pf-num"><input className="pf-num-input" type="number" value={ligne.montant || ''} onChange={e => updateLigne(idx, 'montant', parseFloat(e.target.value) || 0)} /></td>
                            <td className="pf-rmcol pf-no-export"><button type="button" onClick={() => removeLigne(idx)}>✕</button></td>
                          </tr>
                        );
                      })}
                      <tr className="pf-subtotal-row">
                        <td colSpan={3}>Sous-total {group.categorie}</td>
                        <td className="pf-num">{fmt(group.sousTotal)}</td>
                        <td className="pf-no-export"></td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              ))}

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
      </div>

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
        .pf-root { --pf-ink:#241536; --pf-ink-soft:#5d4a72; --pf-gold:#7322ab; --pf-gold-soft:#f0e6fa; --pf-paper:#FBF9F4; --pf-line:#ded2ea; --pf-panel:#1a1025; --pf-panel-2:#241a35; --pf-panel-text:#E9E7DD; --pf-panel-dim:#a89bb8; --pf-danger:#B3492F; }

        .pf-topbar { display:flex; align-items:center; justify-content:space-between; background:var(--pf-panel); border-radius:10px; padding:10px 14px; margin-bottom:12px; }
        .pf-topbar-left { display:flex; align-items:center; gap:10px; }
        .pf-topbar-title { color:#fff; font-weight:700; font-size:15px; }
        .pf-icon-btn { background:transparent; border:none; color:#fff; cursor:pointer; padding:6px; border-radius:8px; display:flex; }
        .pf-icon-btn:hover { background:rgba(255,255,255,.08); }
        .pf-topbar-right { display:flex; gap:8px; }
        .pf-btn-gold, .pf-btn-ghost, .pf-btn-cancel { border:none; border-radius:6px; padding:8px 14px; font-size:13px; font-weight:600; cursor:pointer; }
        .pf-btn-gold { background:var(--pf-gold); color:#1a1204; }
        .pf-btn-gold:hover { background:#c48f2c; }
        .pf-btn-gold:disabled { opacity:.5; cursor:default; }
        .pf-btn-ghost { background:var(--pf-panel-2); color:var(--pf-panel-text); border:1px solid #2C3550; }
        .pf-btn-ghost:hover { border-color:var(--pf-gold); color:var(--pf-gold); }
        .pf-btn-ghost:disabled { opacity:.5; cursor:default; }
        .pf-btn-cancel { background:transparent; color:#E08877; border:1px solid #4a2c28; }
        .pf-btn-cancel:hover { background:rgba(224,136,119,.1); }

        .pf-app { display:grid; grid-template-columns:340px minmax(0,1fr); gap:0; background:#0C0812; border-radius:12px; overflow:hidden; }
        @media (max-width:1000px) { .pf-app { grid-template-columns:1fr; } }

        .pf-panel { background:var(--pf-panel); padding:20px 18px 40px; border-right:1px solid #232B42; max-height:calc(100vh - 160px); overflow-y:auto; }
        .pf-brandmark { font-size:10.5px; letter-spacing:.14em; color:var(--pf-gold); margin-bottom:4px; font-weight:700; }
        .pf-panel-h1 { font-size:17px; margin:0 0 16px; color:#fff; font-weight:700; }
        .pf-panel-h2 { font-size:11px; color:var(--pf-panel-dim); text-transform:uppercase; letter-spacing:.08em; margin:20px 0 10px; font-weight:700; }
        .pf-field { margin-bottom:9px; }
        .pf-field label { display:block; font-size:10.5px; color:var(--pf-panel-dim); margin-bottom:3px; }
        .pf-field input, .pf-field select, .pf-field textarea {
          width:100%; background:var(--pf-panel-2); border:1px solid #2C3550; color:var(--pf-panel-text);
          padding:7px 8px; border-radius:4px; font-size:12.5px; font-family:inherit; resize:none;
        }
        .pf-field input:focus, .pf-field select:focus, .pf-field textarea:focus { outline:none; border-color:var(--pf-gold); }
        .pf-readonly { background:var(--pf-panel-2); border:1px solid #2C3550; color:var(--pf-gold); padding:7px 8px; border-radius:4px; font-size:12.5px; font-weight:700; font-family:'Courier New',monospace; }
        .pf-row2 { display:grid; grid-template-columns:1fr 1fr; gap:8px; }

        .pf-search { width:100%; background:var(--pf-panel-2); border:1px solid #2C3550; color:var(--pf-panel-text); padding:7px 9px; border-radius:4px; font-size:12px; margin-bottom:8px; }
        .pf-search:focus { outline:none; border-color:var(--pf-gold); }
        .pf-catalog-empty { font-size:11px; color:var(--pf-panel-dim); padding:6px 2px; }
        .pf-cat { border:1px solid #232B42; border-radius:4px; margin-bottom:6px; overflow:hidden; background:var(--pf-panel-2); }
        .pf-cat-head { width:100%; text-align:left; background:transparent; border:none; border-left:3px solid; padding:8px 10px; display:flex; justify-content:space-between; align-items:center; cursor:pointer; font-size:12px; font-weight:600; color:#fff; }
        .pf-chev { color:var(--pf-panel-dim); font-size:9px; transition:transform .15s; }
        .pf-cat-open .pf-chev { transform:rotate(90deg); }
        .pf-cat-items { border-top:1px solid #232B42; }
        .pf-cat-item { display:flex; align-items:center; justify-content:space-between; padding:7px 10px; border-top:1px solid #232B42; gap:6px; }
        .pf-cat-item:first-child { border-top:none; }
        .pf-cat-item-name { font-size:11.5px; color:var(--pf-panel-text); }
        .pf-cat-item-meta { font-size:10px; color:var(--pf-panel-dim); margin-top:1px; }
        .pf-add-btn { flex:none; width:20px; height:20px; border-radius:50%; border:1px solid var(--pf-gold); background:transparent; color:var(--pf-gold); font-size:13px; line-height:1; cursor:pointer; }
        .pf-add-btn:hover { background:var(--pf-gold); color:#1a1204; }
        .pf-added { color:#4ade80; font-size:12px; font-weight:700; }
        .pf-new-prestation { width:100%; margin-top:8px; background:transparent; border:1px dashed #3a4363; color:var(--pf-panel-dim); font-size:11px; padding:8px; border-radius:4px; cursor:pointer; }
        .pf-new-prestation:hover { border-color:var(--pf-gold); color:var(--pf-gold); }

        .pf-sheet-wrap { background:#0C0812; padding:30px 24px; display:flex; justify-content:center; overflow-x:auto; min-width:0; }
        .pf-sheet { width:210mm; max-width:100%; min-height:280mm; background:var(--pf-paper); color:var(--pf-ink); padding:14mm 13mm; font-family:Georgia,'Iowan Old Style','Palatino Linotype',serif; box-shadow:0 16px 40px rgba(0,0,0,.4); }

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
        .pf-meta-placeholder { color:#b6b0a0; font-style:italic; }

        .pf-titre { background:var(--pf-gold-soft); padding:8px 11px; margin-bottom:16px; font-size:12px; font-weight:700; text-transform:uppercase; letter-spacing:.02em; border-left:3px solid var(--pf-gold); color:var(--pf-ink); }

        .pf-empty-hint { font-size:12px; color:#9AA0B5; text-align:center; padding:30px 10px; border:1px dashed var(--pf-line); margin-bottom:16px; }

        .pf-section-block { margin-bottom:14px; }
        .pf-section-title-row { color:#fff; padding:6px 10px; font-size:11.5px; letter-spacing:.03em; font-weight:700; }
        table.pf-items { width:100%; border-collapse:collapse; font-size:11.5px; }
        table.pf-items th { text-align:left; font-size:9px; text-transform:uppercase; letter-spacing:.05em; color:var(--pf-ink-soft); border-bottom:1px solid var(--pf-line); padding:5px 6px; }
        table.pf-items td { padding:5px 6px; border-bottom:1px solid var(--pf-line); vertical-align:middle; }
        .pf-numcol { width:28px; text-align:center; color:#8b93ad; }
        .pf-tvacol { width:36px; text-align:center; }
        .pf-montantcol { width:110px; }
        .pf-rmcol { width:22px; }
        table.pf-items .pf-num { text-align:right; white-space:nowrap; }
        table.pf-items input { border:none; background:transparent; font-family:inherit; width:100%; font-size:11.5px; color:var(--pf-ink); padding:1px 2px; }
        table.pf-items input:focus { outline:1px dashed var(--pf-gold); }
        .pf-num-input { text-align:right; font-family:'Courier New',monospace; font-weight:700; }
        table.pf-items .pf-rmcol button { background:none; border:none; color:var(--pf-danger); cursor:pointer; font-size:12px; }
        .pf-subtotal-row td { font-weight:700; color:var(--pf-ink); background:rgba(174,124,31,.06); border-bottom:2px solid var(--pf-gold); }
        .pf-subtotal-row td:first-child { text-align:right; font-size:10.5px; }

        .pf-totals { margin-left:auto; width:260px; margin-top:10px; margin-bottom:16px; }
        .pf-trow { display:flex; justify-content:space-between; padding:5px 0; font-size:12.5px; border-bottom:1px solid var(--pf-line); }
        .pf-trow.pf-grand { border-bottom:none; border-top:2px solid var(--pf-ink); margin-top:4px; padding-top:8px; font-size:15px; font-weight:700; color:var(--pf-ink); }

        .pf-hors { font-size:9.5px; color:var(--pf-ink-soft); border:1px solid var(--pf-line); border-radius:2px; padding:8px 10px; background:rgba(174,124,31,.05); line-height:1.5; margin-bottom:14px; }
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

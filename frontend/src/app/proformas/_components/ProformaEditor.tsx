'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import AppLayout from '@/components/layout/AppLayout';
import PickerField from '@/components/ui/PickerField';
import Sheet from '@/components/ui/Sheet';
import { downloadPDF, getSocieteBranding, type DocData } from '@/lib/generatePDF';
import { useAuthStore } from '@/stores/authStore';
import api, { clientsApi, dossiersApi } from '@/lib/api';
import { STATUTS_DOSSIER_FERME } from '@/lib/dossierStatut';
import toast from 'react-hot-toast';
import {
  CAT_COLORS, fmt, fmtSaisie, nettoyerNombre, suggestCode,
  type LigneProforma, type ProformaFormState,
} from './proformaUtils';
import ProformaSheet, { type GroupeLignes, type LignesActions } from './ProformaSheet';
import ProformaSheetStyles from './ProformaSheetStyles';
import MobileLignes from './MobileLignes';
import { AddPrestationSheet, CatalogueSheet, type NewPrestation } from './CatalogueSheets';
import { IconBack } from './icons';

interface Props {
  /** « create » : POST /proformas ; « edit » : PUT /proformas/:id (brouillon uniquement). */
  mode: 'create' | 'edit';
  proformaId?: string;
}

/** Éditeur de proforma partagé par /proformas/nouveau et /proformas/[id]/edit (contrat API inchangé). */
export default function ProformaEditor({ mode, proformaId }: Props) {
  const isEdit = mode === 'edit';
  const router = useRouter();
  const searchParams = useSearchParams();
  const { hasPermission } = useAuthStore();
  const canImprimer = hasPermission('PROFORMAS:IMPRIMER');
  const canSignature = hasPermission('DOCUMENTS:SIGNATURE');

  const [loading, setLoading] = useState(isEdit);
  const [proforma, setProforma] = useState<any>(null);
  const [clients, setClients] = useState<any[]>([]);
  const [dossiers, setDossiers] = useState<any[]>([]);
  const [catalogue, setCatalogue] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [openCat, setOpenCat] = useState('');
  const [catalogueSearch, setCatalogueSearch] = useState('');
  const [showCatalogue, setShowCatalogue] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [previewScale, setPreviewScale] = useState(1);
  const [quickCat, setQuickCat] = useState('');
  const [showAddPrestation, setShowAddPrestation] = useState(false);
  const [newPrestation, setNewPrestation] = useState<NewPrestation>({ categorie: 'DOUANE & COMPAGNIE', code: '', designation: '', montantDefaut: '', estTVA: false });
  const [customCategorie, setCustomCategorie] = useState('');
  const [codeTouched, setCodeTouched] = useState(false);
  const [branding, setBranding] = useState<any>(null);
  const [modeles, setModeles] = useState<any[]>([]);
  const [modeleId, setModeleId] = useState('');

  useEffect(() => {
    getSocieteBranding().then(setBranding);
    api.get('/proformas/modeles-catalogue').then(r => setModeles(r.data.data || [])).catch(() => {});
  }, []);

  const [form, setForm] = useState<ProformaFormState>({
    clientId: '', dossierId: isEdit ? '' : (searchParams.get('dossierId') || ''), titre: '', objet: '', observations: '',
    fobUnitaire: '', fretUnitaire: '', assurance: '', fraisDivers: '0', nombreUnites: '1',
    afficherSignature: false,
  });

  const [lignes, setLignes] = useState<LigneProforma[]>([]);

  // Chargement : références (création) ou proforma existante (modification) + catalogue
  useEffect(() => {
    if (isEdit) {
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
        setForm(prev => ({
          ...prev,
          titre: p.titre || '', objet: p.objet || '', observations: p.observations || '',
          fobUnitaire: p.fobUnitaire ? String(p.fobUnitaire) : '',
          fretUnitaire: p.fretUnitaire ? String(p.fretUnitaire) : '',
          assurance: p.assurance ? String(p.assurance) : '',
          fraisDivers: p.fraisDivers ? String(p.fraisDivers) : '0',
          nombreUnites: p.nombreUnites ? String(p.nombreUnites) : '1',
          afficherSignature: !!p.afficherSignature,
        }));
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
      return;
    }
    Promise.all([
      clientsApi.listRef(),
      dossiersApi.listRef(),
      api.get('/proformas/catalogue'),
    ]).then(([cRes, dRes, catRes]) => {
      setClients(cRes.data.data || []);
      setDossiers((dRes.data.data || []).filter((d: any) => !STATUTS_DOSSIER_FERME.includes(d.statut)));
      const cat = catRes.data.data || [];
      setCatalogue(cat);
      const firstCat = [...new Set(cat.map((p: any) => p.categorie))][0] as string | undefined;
      if (firstCat) setOpenCat(firstCat);
    }).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEdit, proformaId]);

  // Création : le choix d'un dossier pré-remplit client et valeurs CAF
  useEffect(() => {
    if (isEdit || !form.dossierId) return;
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
  }, [isEdit, form.dossierId, dossiers]);

  // Échelle de l'aperçu A4 à l'ouverture (mobile)
  useEffect(() => {
    if (showPreview) setPreviewScale(Math.min(1, (window.innerWidth - 32) / 794));
  }, [showPreview]);

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
    if (categorie !== '__new__') setCustomCategorie('');
  };

  const handleCustomCategorie = (v: string) => {
    setCustomCategorie(v);
    if (!codeTouched) setNewPrestation(prev => ({ ...prev, code: suggestCode(catalogue, v) }));
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

  const appliquerModele = () => {
    const modele = modeles.find(m => m.id === modeleId);
    if (!modele) { toast.error('Choisissez un modèle'); return; }
    const nouvelles = (modele.lignes as any[]).filter(l => !lignes.some(x => l.codePrestation ? x.codePrestation === l.codePrestation : x.designation === l.designation && x.categorie === l.categorie));
    if (nouvelles.length === 0) { toast.error('Toutes les lignes de ce modèle sont déjà présentes'); return; }
    setLignes([...lignes, ...nouvelles.map(l => ({
      categorie: l.categorie, codePrestation: l.codePrestation || undefined, designation: l.designation,
      tauxTVA: Number(catalogue.find(p => p.code === l.codePrestation)?.tauxTVA) || 0, montant: Number(l.montant) || 0, estTVA: !!l.estTVA,
    }))]);
    toast.success(`${nouvelles.length} ligne(s) ajoutée(s) depuis « ${modele.nom} »`);
    setModeleId('');
  };

  // Réorganisation : on déplace les lignes dans le tableau, l'ordre d'affichage et d'enregistrement en découle.
  const moveLigne = (index: number, dir: -1 | 1) => {
    const cat = lignes[index].categorie;
    let cible = index + dir;
    while (cible >= 0 && cible < lignes.length && lignes[cible].categorie !== cat) cible += dir;
    if (cible < 0 || cible >= lignes.length) return;
    const copie = [...lignes];
    [copie[index], copie[cible]] = [copie[cible], copie[index]];
    setLignes(copie);
  };

  const moveGroupe = (cat: string, dir: -1 | 1) => {
    const ordre = [...new Set(lignes.map(l => l.categorie))];
    const i = ordre.indexOf(cat);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= ordre.length) return;
    [ordre[i], ordre[j]] = [ordre[j], ordre[i]];
    setLignes(ordre.flatMap(c => lignes.filter(l => l.categorie === c)));
  };

  const removeLigne = (index: number) => setLignes(lignes.filter((_, i) => i !== index));
  const actions: LignesActions = { updateLigne, moveLigne, moveGroupe, removeLigne };

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
  const groupes: GroupeLignes[] = [...new Set(lignes.map(l => l.categorie))].map(cat => ({
    categorie: cat,
    couleur: CAT_COLORS[cat] || '#6b7280',
    lignes: lignes.filter(l => l.categorie === cat),
    sousTotal: lignes.filter(l => l.categorie === cat).reduce((s, l) => s + (l.montant || 0), 0),
  }));

  const totalHT = lignes.filter(l => !l.estTVA).reduce((s, l) => s + (l.montant || 0), 0);
  const totalTVA = lignes.filter(l => l.estTVA).reduce((s, l) => s + (l.montant || 0), 0);
  const totalGeneral = totalHT + totalTVA;
  // Même règle que la facture : « prestation » = frais propres du bureau (catégorie AUTRES FRAIS / codes AF), hors TVA.
  const montantPrestation = lignes.filter(l => !l.estTVA && (l.categorie === 'AUTRES FRAIS' || (l.codePrestation || '').startsWith('AF'))).reduce((s, l) => s + (l.montant || 0), 0);
  const totaux = { totalHT, totalTVA, totalGeneral, montantPrestation, valeurCAF };

  const client = isEdit ? proforma?.client : clients.find(c => c.id === form.clientId);
  const dossier = isEdit ? proforma?.dossier : dossiers.find(d => d.id === form.dossierId);
  const retour = () => (isEdit ? router.push(`/proformas/${proformaId}`) : router.back());

  const handleSubmit = async () => {
    if (!isEdit && !form.clientId) { toast.error('Sélectionnez un client'); return; }
    if (lignes.length === 0) { toast.error('Ajoutez au moins une prestation'); return; }
    setSaving(true);
    try {
      if (isEdit) {
        const { clientId: _c, dossierId: _d, ...payload } = form;
        const res = await api.put(`/proformas/${proformaId}`, { ...payload, lignes });
        toast.success(res.data.message || 'Proforma modifiée');
        router.push(`/proformas/${proformaId}`);
      } else {
        const { objet: _o, ...payload } = form;
        const res = await api.post('/proformas', { ...payload, lignes });
        toast.success(res.data.message);
        router.push(`/proformas/${res.data.data.id}`);
      }
    } catch (e: any) { toast.error(e.response?.data?.message || 'Erreur'); }
    finally { setSaving(false); }
  };

  const handleExportApercu = async () => {
    if (!canImprimer) { toast.error('Vous n\'avez pas la permission d\'imprimer/télécharger ce document'); return; }
    setExporting(true);
    try {
      const docData: DocData = {
        type: 'PROFORMA',
        numero: isEdit ? proforma.numero : 'BROUILLON',
        date: (isEdit ? new Date(proforma.dateProforma) : new Date()).toLocaleDateString('fr-FR'),
        client: client?.raisonSociale || '',
        clientAdresse: client?.adresse || undefined,
        clientTelephone: client?.telephone || client?.mobile || undefined,
        clientEmail: client?.email || undefined,
        clientNcc: client?.ncc || undefined,
        clientPays: client?.pays || undefined,
        dossierNumero: dossier ? (dossier.numeroPhysique || dossier.numero) : undefined,
        titre: form.titre || undefined,
        afficherSignature: form.afficherSignature,
        fobUnitaire: form.fobUnitaire ? parseFloat(form.fobUnitaire) : undefined,
        fretUnitaire: form.fretUnitaire ? parseFloat(form.fretUnitaire) : undefined,
        assurance: form.assurance ? parseFloat(form.assurance) : undefined,
        fraisDivers: form.fraisDivers ? parseFloat(form.fraisDivers) : undefined,
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

  const dossierOptions = dossiers.map(d => ({ id: d.id, label: d.numeroPhysique || d.numero, sublabel: d.client?.raisonSociale }));
  const clientOptions = clients.map(c => ({ id: c.id, label: c.raisonSociale, sublabel: c.code }));
  const setNum = (field: 'fobUnitaire' | 'fretUnitaire' | 'assurance' | 'fraisDivers') => (e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, [field]: nettoyerNombre(e.target.value) });

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full" />
        </div>
      </AppLayout>
    );
  }
  if (isEdit && !proforma) return null;

  const dateLabel = (isEdit ? new Date(proforma.dateProforma) : new Date()).toLocaleDateString('fr-FR');
  const numeroNode = isEdit ? <em>{proforma.numero}</em> : <em>généré à l&apos;enregistrement</em>;
  const sheetProps = { form, lignes, groupes, client: client || null, dossier: dossier || null, numeroNode, dateLabel, totaux, branding, actions };

  const desktopToolbar = (
    <div className="pf-inline-toolbar pf-no-export">
      <div className="pf-inline-group-add">
        <select value={modeleId} onChange={e => setModeleId(e.target.value)} className="pf-inline-select" title="Remplir automatiquement avec un modèle de catalogue" aria-label="Modèle de catalogue">
          <option value="">-- Modèle de catalogue --</option>
          {modeles.map(m => <option key={m.id} value={m.id}>{m.nom}</option>)}
        </select>
        <button type="button" onClick={appliquerModele} className="pf-inline-btn-outline">Appliquer</button>
      </div>
      <div className="pf-inline-group-add">
        <select value={quickCat} onChange={e => setQuickCat(e.target.value)} className="pf-inline-select" aria-label="Catégorie">
          <option value="">-- Choisir une catégorie --</option>
          {categoriesWithItems.map(cat => <option key={cat} value={cat}>{cat}</option>)}
        </select>
        <button type="button" onClick={handleAjouterGroupe} className="pf-inline-btn-solid">+ Ajouter un groupe</button>
      </div>
    </div>
  );

  return (
    <AppLayout>
      <div className="space-y-4 pb-36 md:pb-0">
        {/* Barre d'actions (bureau) */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <button type="button" onClick={retour} aria-label="Retour" className="w-11 h-11 flex-shrink-0 flex items-center justify-center rounded-lg text-gray-600 hover:bg-gray-100 dark:hover:bg-surface-700">
              <IconBack />
            </button>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white truncate">{isEdit ? `Modifier — ${proforma.numero}` : 'Nouvelle Proforma'}</h1>
          </div>
          <div className="hidden md:flex gap-2 flex-wrap">
            <button onClick={handleExportApercu} disabled={exporting || lignes.length === 0 || !canImprimer} title={!canImprimer ? 'Permission requise : PROFORMAS:IMPRIMER' : undefined} className="btn-secondary disabled:opacity-50">
              {exporting ? 'Export...' : 'Aperçu PDF'}
            </button>
            <button onClick={handleSubmit} disabled={saving} className="btn-primary disabled:opacity-50">
              {saving ? 'Enregistrement...' : isEdit ? 'Enregistrer les modifications' : 'Enregistrer la proforma'}
            </button>
            <button onClick={retour} className="btn-secondary !text-red-600 hover:!bg-red-50">Annuler</button>
          </div>
        </div>

        {/* Informations (au-dessus de la fiche) */}
        <div className="card space-y-4">
          <section aria-label="Client et dossier" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {isEdit ? (
              <>
                <div><label className="label">Client</label><div className="input-field bg-gray-50 dark:bg-surface-700 font-medium flex items-center">{proforma.client?.raisonSociale}</div></div>
                {proforma.dossier && (
                  <div><label className="label">Dossier</label><div className="input-field bg-gray-50 dark:bg-surface-700 font-mono flex items-center">{proforma.dossier.numeroPhysique || proforma.dossier.numero}</div></div>
                )}
              </>
            ) : (
              <>
                <div><label className="label">Dossier</label><PickerField value={form.dossierId} onChange={id => setForm({ ...form, dossierId: id })} options={dossierOptions} placeholder="— Aucun —" title="Sélectionner un dossier" searchPlaceholder="N° physique, client..." /></div>
                <div><label className="label">Client *</label><PickerField value={form.clientId} onChange={id => setForm({ ...form, clientId: id })} options={clientOptions} placeholder="— Sélectionner —" title="Sélectionner un client" searchPlaceholder="Raison sociale..." required /></div>
              </>
            )}
          </section>
          <section aria-label="Valeur en douane">
            <h2 className="text-xs font-bold uppercase tracking-wide text-gray-600 dark:text-gray-400 mb-2">Valeur en douane (CAF)</h2>
            <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
              <div><label className="label">FOB (Unitaire)</label><input type="text" inputMode="decimal" value={fmtSaisie(form.fobUnitaire)} onChange={setNum('fobUnitaire')} className="input-field" /></div>
              <div><label className="label">FRET (Unitaire)</label><input type="text" inputMode="decimal" value={fmtSaisie(form.fretUnitaire)} onChange={setNum('fretUnitaire')} className="input-field" /></div>
              <div><label className="label">Assurance</label><input type="text" inputMode="decimal" value={fmtSaisie(form.assurance)} onChange={setNum('assurance')} className="input-field" /></div>
              <div><label className="label">Frais divers</label><input type="text" inputMode="decimal" value={fmtSaisie(form.fraisDivers)} onChange={setNum('fraisDivers')} className="input-field" /></div>
              <div><label className="label">Nbre unités</label><input type="text" inputMode="numeric" value={fmtSaisie(form.nombreUnites)} onChange={e => setForm({ ...form, nombreUnites: nettoyerNombre(e.target.value).replace(/\..*/, '') })} className="input-field" /></div>
              <div><label className="label">Valeur CAF</label><div className="input-field bg-gray-50 dark:bg-surface-700 font-mono font-bold text-primary-600 flex items-center">{fmt(valeurCAF)}</div></div>
            </div>
          </section>
          <section aria-label="Textes" className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div><label className="label">Titre</label><textarea value={form.titre} onChange={e => setForm({ ...form, titre: e.target.value })} rows={2} className="input-field" placeholder="DEDOUANEMENT..." /></div>
            <div><label className="label">NB / Observations</label><textarea value={form.observations} onChange={e => setForm({ ...form, observations: e.target.value })} rows={2} className="input-field" /></div>
          </section>
          <div className="flex items-center justify-between flex-wrap gap-3">
            <label className={`flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 min-h-[44px] ${canSignature ? 'cursor-pointer' : 'cursor-not-allowed opacity-50'}`} title={!canSignature ? 'Permission requise : DOCUMENTS:SIGNATURE' : undefined}>
              <input type="checkbox" checked={form.afficherSignature} disabled={!canSignature} onChange={e => setForm({ ...form, afficherSignature: e.target.checked })} className="w-5 h-5 rounded border-gray-300" />
              Afficher la signature sur la proforma
            </label>
            <button type="button" onClick={() => setShowCatalogue(true)} className="btn-secondary max-md:w-full">
              <svg aria-hidden="true" className="w-4 h-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" /></svg>
              Catalogue des prestations
              {lignes.length > 0 && <span className="ml-2 bg-primary-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-sm">{lignes.length}</span>}
            </button>
          </div>
        </div>

        {/* Mobile (<768px) : lignes en cartes empilées */}
        <div className="md:hidden space-y-3">
          <h2 className="text-sm font-bold text-gray-900 dark:text-white">Prestations</h2>
          <div className="card space-y-2">
            <div className="flex gap-2">
              <select value={modeleId} onChange={e => setModeleId(e.target.value)} className="input-field flex-1 min-w-0" aria-label="Modèle de catalogue">
                <option value="">Modèle de catalogue…</option>
                {modeles.map(m => <option key={m.id} value={m.id}>{m.nom}</option>)}
              </select>
              <button type="button" onClick={appliquerModele} className="btn-secondary">Appliquer</button>
            </div>
            <div className="flex gap-2">
              <select value={quickCat} onChange={e => setQuickCat(e.target.value)} className="input-field flex-1 min-w-0" aria-label="Catégorie">
                <option value="">Catégorie à ajouter…</option>
                {categoriesWithItems.map(cat => <option key={cat} value={cat}>{cat}</option>)}
              </select>
              <button type="button" onClick={handleAjouterGroupe} className="btn-secondary">+ Groupe</button>
            </div>
          </div>
          <MobileLignes lignes={lignes} groupes={groupes} actions={actions} onOpenCatalogue={() => setShowCatalogue(true)} />
        </div>

        {/* Bureau (>=768px) et impression : fiche A4 éditable */}
        <div className="pf-sheet-wrap hidden md:flex">
          <ProformaSheet {...sheetProps} toolbar={desktopToolbar} />
        </div>
      </div>

      {/* Mobile : totaux collants + actions principales (au-dessus de la bottom nav) */}
      <div className="md:hidden fixed left-0 right-0 z-30 bottom-[calc(var(--bottom-nav-h)+var(--safe-bottom))] bg-white/95 dark:bg-surface-800/95 backdrop-blur border-t border-gray-200 dark:border-surface-700 px-3 pt-2 pb-2">
        <dl className="flex items-end justify-between gap-3 mb-2 text-xs text-gray-600 dark:text-gray-300">
          <div><dt className="sr-only">Total HT</dt><dd>HT <span className="font-mono font-semibold">{fmt(totalHT)}</span></dd></div>
          <div><dt className="sr-only">Total TVA</dt><dd>TVA <span className="font-mono font-semibold">{fmt(totalTVA)}</span></dd></div>
          <div className="text-right"><dt className="text-[10px] uppercase font-bold">Total TTC</dt><dd className="text-base font-bold font-mono text-gray-900 dark:text-white">{fmt(totalGeneral)} F</dd></div>
        </dl>
        <div className="flex gap-2">
          <button type="button" onClick={() => setShowPreview(true)} className="btn-secondary flex-1">Aperçu</button>
          <button type="button" onClick={handleSubmit} disabled={saving} className="btn-primary flex-[2] disabled:opacity-50">
            {saving ? 'Enregistrement...' : isEdit ? 'Enregistrer' : 'Enregistrer la proforma'}
          </button>
        </div>
      </div>

      {/* Aperçu A4 plein écran (mobile) */}
      <Sheet open={showPreview} onClose={() => setShowPreview(false)} title="Aperçu" description="Rendu papier de la proforma" fullScreen size="5xl" zIndexClass="z-[62]">
        <div className="flex gap-2 mb-3">
          <button type="button" onClick={handleExportApercu} disabled={exporting || lignes.length === 0 || !canImprimer} title={!canImprimer ? 'Permission requise : PROFORMAS:IMPRIMER' : undefined} className="btn-secondary flex-1 disabled:opacity-50">
            {exporting ? 'Export...' : 'Télécharger le PDF'}
          </button>
          <button type="button" onClick={() => setShowPreview(false)} className="btn-primary flex-1">Fermer</button>
        </div>
        <div className="pf-sheet-wrap !p-1 !justify-start">
          <div style={{ zoom: previewScale, width: '210mm', flexShrink: 0 }}>
            <ProformaSheet {...sheetProps} readOnly />
          </div>
        </div>
      </Sheet>

      <CatalogueSheet
        open={showCatalogue} onClose={() => setShowCatalogue(false)}
        catalogue={catalogue} categoriesWithItems={categoriesWithItems} lignes={lignes}
        search={catalogueSearch} setSearch={setCatalogueSearch} openCat={openCat} setOpenCat={setOpenCat}
        onAdd={addFromCatalogue} onNewPrestation={openAddPrestation}
      />
      <AddPrestationSheet
        open={showAddPrestation} onClose={() => setShowAddPrestation(false)}
        value={newPrestation} setValue={setNewPrestation} allCategories={allCategories}
        customCategorie={customCategorie} onCustomCategorie={handleCustomCategorie}
        onCategorieChange={setPrestationCategorie}
        onCodeChange={code => { setCodeTouched(true); setNewPrestation(prev => ({ ...prev, code })); }}
        onSubmit={handleAddPrestation}
      />
      <ProformaSheetStyles />
    </AppLayout>
  );
}

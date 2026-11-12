'use client';

import { useEffect, useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import api from '@/lib/api';
import Link from 'next/link';
import toast from 'react-hot-toast';
import PageHeader from '@/components/ui/PageHeader';
import FAB from '@/components/ui/FAB';
import { useConfirm } from '@/components/ui/ConfirmDialog';
import FormSheet from '@/components/forms/FormSheet';

interface Etape { code: string; nom: string; description: string; couleur: string; delaiJours: string; obligatoire: boolean; }

const defaultEtapes: Etape[] = [
  { code: 'NOUVEAU', nom: 'Nouveau', description: '', couleur: '#3B82F6', delaiJours: '', obligatoire: true },
  { code: 'EN_COURS', nom: 'En cours', description: '', couleur: '#F59E0B', delaiJours: '2', obligatoire: true },
  { code: 'LIQUIDATION', nom: 'Liquidation', description: '', couleur: '#8B5CF6', delaiJours: '5', obligatoire: true },
  { code: 'PAIEMENT', nom: 'Paiement droits', description: '', couleur: '#EC4899', delaiJours: '3', obligatoire: true },
  { code: 'MAIN_LEVEE', nom: 'Main levée', description: '', couleur: '#10B981', delaiJours: '2', obligatoire: true },
  { code: 'LIVRAISON', nom: 'Livraison', description: '', couleur: '#06B6D4', delaiJours: '3', obligatoire: true },
  { code: 'CLOTURE', nom: 'Clôturé', description: '', couleur: '#6B7280', delaiJours: '', obligatoire: true },
];

export default function ProcessusPage() {
  const [processusList, setProcessusList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const confirmer = useConfirm();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ code: '', nom: '', description: '', nature: '' });
  const [etapes, setEtapes] = useState<Etape[]>(defaultEtapes);

  const load = async () => {
    try {
      const res = await api.get('/processus');
      setProcessusList(res.data.data || []);
    } catch { setProcessusList([]); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const handleAddEtape = () => {
    setEtapes([...etapes, { code: '', nom: '', description: '', couleur: '#3B82F6', delaiJours: '', obligatoire: true }]);
  };

  const handleRemoveEtape = (index: number) => {
    setEtapes(etapes.filter((_, i) => i !== index));
  };

  const updateEtape = (index: number, field: string, value: any) => {
    setEtapes(etapes.map((e, i) => i === index ? { ...e, [field]: value } : e));
  };

  const handleEdit = (p: any) => {
    setEditingId(p.id);
    setForm({ code: p.code, nom: p.nom, description: p.description || '', nature: p.nature || '' });
    setEtapes(p.etapes.map((e: any) => ({
      code: e.code, nom: e.nom, description: e.description || '', couleur: e.couleur || '#3B82F6',
      delaiJours: e.delaiJours ? String(e.delaiJours) : '', obligatoire: e.obligatoire,
    })));
    setShowModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (etapes.length < 2) { toast.error('Minimum 2 étapes requises'); return; }
    if (etapes.some(et => !et.code || !et.nom)) { toast.error('Code et nom requis pour chaque étape'); return; }

    try {
      const data = {
        ...form,
        nature: form.nature || null,
        etapes: etapes.map(et => ({
          ...et,
          delaiJours: et.delaiJours ? parseInt(et.delaiJours) : null,
        })),
      };

      if (editingId) {
        await api.put(`/processus/${editingId}`, data);
        toast.success('Processus modifié');
      } else {
        await api.post('/processus', data);
        toast.success('Processus créé');
      }
      setShowModal(false);
      setEditingId(null);
      load();
    } catch (err: any) { toast.error(err.response?.data?.message || 'Erreur'); }
  };

  const handleDelete = async (id: string) => {
    if (!(await confirmer({ titre: 'Supprimer ce processus ?', message: 'Cette action est irréversible.', danger: true, confirmer: 'Supprimer' }))) return;
    try {
      await api.delete(`/processus/${id}`);
      toast.success('Processus supprimé');
      load();
    } catch (err: any) { toast.error(err.response?.data?.message || 'Erreur'); }
  };

  const openNew = () => {
    setEditingId(null);
    setForm({ code: '', nom: '', description: '', nature: '' });
    setEtapes(defaultEtapes);
    setShowModal(true);
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <Link href="/parametres" className="inline-flex items-center min-h-[44px] text-sm text-primary-600 hover:underline">← Paramètres</Link>
          <PageHeader
            title="Processus de Suivi"
            subtitle="Configurez les workflows de suivi des dossiers"
            className="!mb-0"
            actions={<button type="button" onClick={openNew} className="btn-primary hidden lg:inline-flex">+ Nouveau Processus</button>}
          />
        </div>

        {loading ? (
          <div className="flex justify-center py-12"><div className="animate-spin w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full" /></div>
        ) : processusList.length === 0 ? (
          <div className="card text-center py-12">
            <svg aria-hidden="true" className="w-16 h-16 mx-auto mb-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" /></svg>
            <p className="text-gray-600 dark:text-gray-400 mb-4">Aucun processus configuré. Créez votre premier workflow de suivi.</p>
            <button onClick={openNew} className="btn-primary">Créer un processus</button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
            {processusList.map(p => (
              <div key={p.id} className="card hover:shadow-elevated transition-shadow">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white">{p.nom}</h3>
                    <p className="text-xs text-gray-600 dark:text-gray-400">Code: {p.code} {p.nature && `• ${p.nature}`} • {p._count?.dossiers || 0} dossier(s)</p>
                  </div>
                  <div className="flex gap-1">
                    <button type="button" onClick={() => handleEdit(p)} className="w-11 h-11 flex items-center justify-center rounded hover:bg-gray-100 dark:hover:bg-surface-700" aria-label={`Modifier le processus ${p.nom}`}>
                      <svg aria-hidden="true" className="w-4 h-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                    </button>
                    <button type="button" onClick={() => handleDelete(p.id)} className="w-11 h-11 flex items-center justify-center rounded hover:bg-gray-100 dark:hover:bg-surface-700" aria-label={`Supprimer le processus ${p.nom}`}>
                      <svg aria-hidden="true" className="w-4 h-4 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    </button>
                  </div>
                </div>
                {p.description && <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">{p.description}</p>}
                <div className="flex items-center gap-1 flex-wrap">
                  {p.etapes?.map((e: any, i: number) => (
                    <div key={e.id} className="flex items-center">
                      <span className="px-2 py-1 rounded text-xs font-medium text-white" style={{ backgroundColor: e.couleur || '#6B7280' }}>
                        {e.nom}
                      </span>
                      {i < p.etapes.length - 1 && <svg aria-hidden="true" className="w-4 h-4 text-gray-400 mx-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <FAB label="Nouveau processus" onClick={openNew} />

      <FormSheet
        open={showModal} onClose={() => setShowModal(false)} size="3xl" onSubmit={handleSave}
        title={editingId ? 'Modifier le processus' : 'Nouveau Processus de Suivi'} submitLabel={editingId ? 'Modifier' : 'Créer le processus'}
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div><label htmlFor="pr-code" className="label">Code *</label><input id="pr-code" type="text" autoCapitalize="characters" value={form.code} onChange={e => setForm({...form, code: e.target.value.toUpperCase()})} className="input-field" required placeholder="IMP_STD" /></div>
          <div><label htmlFor="pr-nom" className="label">Nom *</label><input id="pr-nom" type="text" value={form.nom} onChange={e => setForm({...form, nom: e.target.value})} className="input-field" required placeholder="Import Standard" /></div>
          <div><label htmlFor="pr-nature" className="label">Nature dossier</label><select id="pr-nature" value={form.nature} onChange={e => setForm({...form, nature: e.target.value})} className="input-field"><option value="">Toutes natures</option><option value="IMPORT">Import</option><option value="EXPORT">Export</option><option value="TRANSIT">Transit</option></select></div>
          <div><label htmlFor="pr-desc" className="label">Description</label><input id="pr-desc" type="text" value={form.description} onChange={e => setForm({...form, description: e.target.value})} className="input-field" /></div>
        </div>

        <section>
          <div className="flex items-center justify-between gap-2 mb-3">
            <h3 className="font-semibold">Étapes du processus</h3>
            <button type="button" onClick={handleAddEtape} className="btn-secondary">+ Ajouter étape</button>
          </div>
          <div className="space-y-2">
            {etapes.map((etape, i) => (
              <div key={i} className="flex flex-wrap items-center gap-2 p-3 bg-gray-50 dark:bg-surface-700 rounded-lg">
                <span className="text-xs font-bold text-gray-600 dark:text-gray-400 w-6">{i + 1}</span>
                <input type="color" aria-label={`Couleur de l'étape ${i + 1}`} value={etape.couleur} onChange={e => updateEtape(i, 'couleur', e.target.value)} className="w-11 h-11 rounded cursor-pointer border-0 flex-shrink-0" />
                <input type="text" aria-label={`Code de l'étape ${i + 1}`} value={etape.code} onChange={e => updateEtape(i, 'code', e.target.value.toUpperCase())} className="input-field !w-32 flex-1 sm:flex-none" placeholder="CODE" required />
                {etapes.length > 2 && (
                  <button type="button" onClick={() => handleRemoveEtape(i)} aria-label={`Retirer l'étape ${i + 1}`} className="w-11 h-11 flex items-center justify-center text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded ml-auto sm:order-last">
                    <svg aria-hidden="true" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                )}
                <input type="text" aria-label={`Nom de l'étape ${i + 1}`} value={etape.nom} onChange={e => updateEtape(i, 'nom', e.target.value)} className="input-field w-full sm:w-auto sm:flex-1" placeholder="Nom de l'étape" required />
                <input type="number" inputMode="numeric" aria-label={`Délai en jours de l'étape ${i + 1}`} value={etape.delaiJours} onChange={e => updateEtape(i, 'delaiJours', e.target.value)} className="input-field !w-24" placeholder="Jours" title="Délai en jours" />
                <label className="flex items-center gap-2 min-h-[44px] text-sm cursor-pointer whitespace-nowrap">
                  <input type="checkbox" checked={etape.obligatoire} onChange={e => updateEtape(i, 'obligatoire', e.target.checked)} className="w-5 h-5 rounded" />
                  Obligatoire
                </label>
              </div>
            ))}
          </div>
        </section>
      </FormSheet>
    </AppLayout>
  );
}

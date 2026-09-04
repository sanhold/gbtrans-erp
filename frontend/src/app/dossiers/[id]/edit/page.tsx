'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import AppLayout from '@/components/layout/AppLayout';
import PickerField from '@/components/ui/PickerField';
import { dossiersApi, clientsApi } from '@/lib/api';
import toast from 'react-hot-toast';

export default function EditDossierPage() {
  const params = useParams();
  const router = useRouter();
  const dossierId = params.id as string;

  const [dossier, setDossier] = useState<any>(null);
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<Record<string, string>>({});

  const fields = [
    'clientId', 'numeroPhysique', 'nature', 'type',
    'compagnieMaritime', 'navire', 'voyage', 'numeroBL', 'portOrigine', 'portDestination',
    'designation', 'poidsBrut', 'poidsNet', 'volume', 'nombreColis', 'emballage',
    'valeurFOB', 'fret', 'assurance', 'valeurCAF', 'incoterm', 'devise',
    'numeroDeclaration', 'regimeDouanier', 'bureauDouane',
    'droitDouane', 'tva', 'autresTaxes', 'totalDroits',
    'lieuLivraison', 'bonLivraison', 'observations',
  ];

  const numFields = [
    'poidsBrut', 'poidsNet', 'volume', 'nombreColis',
    'valeurFOB', 'fret', 'assurance', 'valeurCAF',
    'droitDouane', 'tva', 'autresTaxes', 'totalDroits',
  ];

  const buildForm = (d: any): Record<string, string> => {
    const f: Record<string, string> = {};
    fields.forEach(k => { f[k] = d[k] != null ? String(d[k]) : ''; });
    return f;
  };

  const load = useCallback(async () => {
    try {
      const [dossierRes, clientsRes] = await Promise.all([
        dossiersApi.get(dossierId),
        clientsApi.list({ limit: 500 }),
      ]);
      if (!dossierRes.data.data) { toast.error('Dossier non trouvé'); router.push('/dossiers'); return; }
      if (['CLOTURE', 'ANNULE', 'ARCHIVE'].includes(dossierRes.data.data.statut)) {
        toast.error('Ce dossier est verrouillé, modification impossible');
        router.push(`/dossiers/${dossierId}`);
        return;
      }
      setDossier(dossierRes.data.data);
      setForm(buildForm(dossierRes.data.data));
      setClients(clientsRes.data.data || []);
    } catch {
      toast.error('Erreur de chargement');
      router.push('/dossiers');
    } finally {
      setLoading(false);
    }
  }, [dossierId]);

  useEffect(() => { load(); }, [load]);

  const updateField = (field: string, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const clientOptions = clients.map(c => ({ id: c.id, label: c.raisonSociale, sublabel: c.code }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const data: Record<string, any> = {};

      fields.forEach(f => {
        const oldVal = dossier[f] != null ? String(dossier[f]) : '';
        if (form[f] !== oldVal) {
          if (numFields.includes(f)) {
            data[f] = form[f] !== '' ? (f === 'nombreColis' ? parseInt(form[f]) : parseFloat(form[f])) : null;
          } else {
            data[f] = form[f] || null;
          }
        }
      });

      if (Object.keys(data).length === 0) {
        toast('Aucune modification détectée', { icon: 'ℹ️' });
        setSaving(false);
        return;
      }

      await dossiersApi.update(dossierId, data);
      toast.success('Dossier modifié avec succès');
      router.push(`/dossiers/${dossierId}`);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Erreur lors de la modification');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full" />
        </div>
      </AppLayout>
    );
  }

  if (!dossier) return null;

  return (
    <AppLayout>
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <button onClick={() => router.back()} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-surface-700">
            <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Modifier — {dossier.numero}</h1>
            <p className="text-sm text-gray-500">{dossier.client?.raisonSociale} — {dossier.nature} {dossier.type}</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Informations générales */}
          <div className="card">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <svg className="w-5 h-5 text-primary-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              Informations Générales
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="label">Client *</label>
                <PickerField value={form.clientId} onChange={id => updateField('clientId', id)} options={clientOptions} placeholder="-- Sélectionner --" title="Sélectionner un client" searchPlaceholder="Raison sociale, code..." required />
              </div>
              <div>
                <label className="label">N° physique *</label>
                <input type="text" value={form.numeroPhysique} onChange={e => updateField('numeroPhysique', e.target.value)} className="input-field" required />
              </div>
              <div>
                <label className="label">Nature</label>
                <select value={form.nature} onChange={e => updateField('nature', e.target.value)} className="input-field">
                  <option value="IMPORT">Import</option><option value="EXPORT">Export</option>
                  <option value="TRANSIT">Transit</option><option value="REEXPORT">Réexport</option>
                  <option value="CABOTAGE">Cabotage</option><option value="TRANSBORDEMENT">Transbordement</option>
                </select>
              </div>
              <div>
                <label className="label">Type</label>
                <select value={form.type} onChange={e => updateField('type', e.target.value)} className="input-field">
                  <option value="MARITIME">Maritime</option><option value="AERIEN">Aérien</option>
                  <option value="TERRESTRE">Terrestre</option><option value="MULTIMODAL">Multimodal</option>
                </select>
              </div>
            </div>
          </div>

          {/* Transport */}
          <div className="card">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <svg className="w-5 h-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10" /></svg>
              Transport
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div><label className="label">Compagnie Maritime</label><input type="text" value={form.compagnieMaritime} onChange={e => updateField('compagnieMaritime', e.target.value)} className="input-field" /></div>
              <div><label className="label">Navire</label><input type="text" value={form.navire} onChange={e => updateField('navire', e.target.value)} className="input-field" /></div>
              <div><label className="label">Voyage</label><input type="text" value={form.voyage} onChange={e => updateField('voyage', e.target.value)} className="input-field" /></div>
              <div><label className="label">N° BL</label><input type="text" value={form.numeroBL} onChange={e => updateField('numeroBL', e.target.value)} className="input-field" /></div>
              <div><label className="label">Port Origine</label><input type="text" value={form.portOrigine} onChange={e => updateField('portOrigine', e.target.value)} className="input-field" /></div>
              <div><label className="label">Port Destination</label><input type="text" value={form.portDestination} onChange={e => updateField('portDestination', e.target.value)} className="input-field" /></div>
            </div>
          </div>

          {/* Marchandise */}
          <div className="card">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <svg className="w-5 h-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>
              Marchandise
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-3"><label className="label">Désignation</label><textarea value={form.designation} onChange={e => updateField('designation', e.target.value)} className="input-field" rows={2} /></div>
              <div><label className="label">Poids Brut (kg)</label><input type="number" step="0.001" value={form.poidsBrut} onChange={e => updateField('poidsBrut', e.target.value)} className="input-field" /></div>
              <div><label className="label">Poids Net (kg)</label><input type="number" step="0.001" value={form.poidsNet} onChange={e => updateField('poidsNet', e.target.value)} className="input-field" /></div>
              <div><label className="label">Volume (m³)</label><input type="number" step="0.001" value={form.volume} onChange={e => updateField('volume', e.target.value)} className="input-field" /></div>
              <div><label className="label">Nombre de colis</label><input type="number" value={form.nombreColis} onChange={e => updateField('nombreColis', e.target.value)} className="input-field" /></div>
              <div><label className="label">Emballage</label><input type="text" value={form.emballage} onChange={e => updateField('emballage', e.target.value)} className="input-field" /></div>
            </div>
          </div>

          {/* Valeur & Douane */}
          <div className="card">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <svg className="w-5 h-5 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              Valeur & Douane
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div><label className="label">Valeur FOB</label><input type="number" value={form.valeurFOB} onChange={e => updateField('valeurFOB', e.target.value)} className="input-field" /></div>
              <div><label className="label">Fret</label><input type="number" value={form.fret} onChange={e => updateField('fret', e.target.value)} className="input-field" /></div>
              <div><label className="label">Assurance</label><input type="number" value={form.assurance} onChange={e => updateField('assurance', e.target.value)} className="input-field" /></div>
              <div><label className="label">Valeur CAF</label><input type="number" value={form.valeurCAF} onChange={e => updateField('valeurCAF', e.target.value)} className="input-field" /></div>
              <div><label className="label">Incoterm</label><select value={form.incoterm} onChange={e => updateField('incoterm', e.target.value)} className="input-field"><option value="">--</option><option>CIF</option><option>FOB</option><option>CFR</option><option>EXW</option><option>FCA</option><option>DAP</option><option>DDP</option></select></div>
              <div><label className="label">Devise</label><select value={form.devise} onChange={e => updateField('devise', e.target.value)} className="input-field"><option>XOF</option><option>EUR</option><option>USD</option></select></div>
              <div><label className="label">N° Déclaration</label><input type="text" value={form.numeroDeclaration} onChange={e => updateField('numeroDeclaration', e.target.value)} className="input-field" /></div>
              <div><label className="label">Régime Douanier</label><input type="text" value={form.regimeDouanier} onChange={e => updateField('regimeDouanier', e.target.value)} className="input-field" /></div>
              <div><label className="label">Bureau de Douane</label><input type="text" value={form.bureauDouane} onChange={e => updateField('bureauDouane', e.target.value)} className="input-field" /></div>
              <div><label className="label">Droits de Douane</label><input type="number" value={form.droitDouane} onChange={e => updateField('droitDouane', e.target.value)} className="input-field" /></div>
              <div><label className="label">TVA Douane</label><input type="number" value={form.tva} onChange={e => updateField('tva', e.target.value)} className="input-field" /></div>
              <div><label className="label">Total Droits & Taxes</label><input type="number" value={form.totalDroits} onChange={e => updateField('totalDroits', e.target.value)} className="input-field" /></div>
            </div>
          </div>

          {/* Livraison */}
          <div className="card">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <svg className="w-5 h-5 text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
              Livraison
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div><label className="label">Lieu de Livraison</label><input type="text" value={form.lieuLivraison} onChange={e => updateField('lieuLivraison', e.target.value)} className="input-field" /></div>
              <div><label className="label">N° Bon de Livraison</label><input type="text" value={form.bonLivraison} onChange={e => updateField('bonLivraison', e.target.value)} className="input-field" /></div>
            </div>
          </div>

          {/* Observations */}
          <div className="card">
            <label className="label">Observations</label>
            <textarea value={form.observations} onChange={e => updateField('observations', e.target.value)} className="input-field" rows={3} placeholder="Notes, instructions..." />
          </div>

          {/* Actions */}
          <div className="flex justify-between items-center">
            <button type="button" onClick={() => router.push(`/dossiers/${dossierId}`)} className="btn-secondary">
              <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
              Retour au dossier
            </button>
            <div className="flex gap-3">
              <button type="button" onClick={() => router.back()} className="btn-secondary">Annuler</button>
              <button type="submit" disabled={saving} className="btn-primary disabled:opacity-50">
                {saving ? (
                  <><svg className="animate-spin w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>Enregistrement...</>
                ) : (
                  <><svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>Enregistrer les modifications</>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </AppLayout>
  );
}

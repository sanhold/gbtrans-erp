'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import AppLayout from '@/components/layout/AppLayout';
import { dossiersApi } from '@/lib/api';
import toast from 'react-hot-toast';
import { statutColors, statutLabels } from '@/lib/dossierStatut';

export default function SuiviDossiersPage() {
  const [dossiers, setDossiers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    setLoading(true);
    const timer = setTimeout(() => {
      dossiersApi.list({ limit: 50, search: search || undefined, sortBy: 'dateCreation', sortOrder: 'desc' })
        .then(r => setDossiers(r.data.data || []))
        .catch(() => toast.error('Erreur de chargement des dossiers'))
        .finally(() => setLoading(false));
    }, search ? 300 : 0);
    return () => clearTimeout(timer);
  }, [search]);

  return (
    <AppLayout>
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Suivi d&apos;exécution des dossiers</h1>
          <p className="text-sm text-gray-500">Recherchez un dossier puis ouvrez-le pour voir ses informations et valider les étapes de son processus.</p>
        </div>

        <div className="card !p-3 space-y-3">
          <div className="relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="N° physique, client, BL, déclaration..." className="input-field pl-9 text-sm" autoFocus />
          </div>

          {loading ? (
            <div className="text-center py-10"><div className="animate-spin w-5 h-5 border-2 border-primary-500 border-t-transparent rounded-full mx-auto" /></div>
          ) : dossiers.length === 0 ? (
            <p className="text-center text-sm text-gray-400 py-10">Aucun dossier trouvé</p>
          ) : (
            <ul className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2">
              {dossiers.map(d => (
                <li key={d.id}>
                  <Link href={`/dossiers/suivi/${d.id}`} className="block p-3 rounded-lg border border-gray-200 dark:border-surface-700 hover:bg-gray-50 dark:hover:bg-surface-700 hover:border-primary-300 transition-colors">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-sm font-semibold text-primary-600">{d.numeroPhysique || d.numero}</span>
                      <span className={`badge ${statutColors[d.statut] || 'badge-gray'} !text-[10px]`}>{statutLabels[d.statut] || d.statut?.replace(/_/g, ' ')}</span>
                    </div>
                    <p className="text-sm text-gray-700 dark:text-gray-200 mt-1 truncate">{d.client?.raisonSociale}</p>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </AppLayout>
  );
}

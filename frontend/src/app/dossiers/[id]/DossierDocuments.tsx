'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { documentsApi } from '@/lib/api';
import { Skeleton } from '@/components/ui/Skeleton';
import { ICON_BTN, EmptyState } from './dossierShared';

const fmtSize = (n: number) => n < 1024 ? `${n} o` : n < 1024 * 1024 ? `${(n / 1024).toFixed(1)} Ko` : `${(n / (1024 * 1024)).toFixed(1)} Mo`;

/** Onglet « Documents » : pièces archivées (GED) rattachées au dossier. */
export default function DossierDocuments({ dossierId }: { dossierId: string }) {
  const [docs, setDocs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    documentsApi.list({ dossierId, limit: 100 })
      .then(res => setDocs(res.data.data || []))
      .catch(() => setDocs([]))
      .finally(() => setLoading(false));
  }, [dossierId]);

  const telecharger = async (doc: any) => {
    try {
      const res = await documentsApi.fichier(doc.id);
      const url = URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = url; a.download = doc.nomOriginal; a.rel = 'noreferrer';
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 10000);
    } catch (err: any) { toast.error(err.response?.data?.message || 'Erreur lors du téléchargement'); }
  };

  return (
    <section className="card" aria-labelledby="sec-docs">
      <div className="flex items-center justify-between gap-2 mb-4">
        <h3 id="sec-docs" className="font-semibold">Documents archivés</h3>
        <Link href="/archives" className="btn-secondary">Ouvrir les archives</Link>
      </div>
      {loading ? (
        <div className="space-y-2" aria-busy="true"><Skeleton className="h-10 w-full" /><Skeleton className="h-10 w-full" /></div>
      ) : docs.length === 0 ? (
        <EmptyState message="Aucun document archivé pour ce dossier." action={<Link href="/archives" className="btn-primary">Importer un document</Link>} />
      ) : (
        <div className="table-container !shadow-none !border-0">
          <table className="w-full">
            <thead>
              <tr>
                <th className="table-header">Actions</th>
                <th className="table-header">Nom</th>
                <th className="table-header">Catégorie</th>
                <th className="table-header">Taille</th>
                <th className="table-header">Date</th>
              </tr>
            </thead>
            <tbody>
              {docs.map(d => (
                <tr key={d.id} className="table-row">
                  <td className="table-cell" data-label="Actions">
                    <button type="button" onClick={() => telecharger(d)} className={ICON_BTN} title="Télécharger" aria-label={`Télécharger ${d.nomOriginal}`}>
                      <svg aria-hidden="true" className="w-4 h-4 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                    </button>
                  </td>
                  <td className="table-cell font-medium" data-label="Nom">{d.nomOriginal}</td>
                  <td className="table-cell col-opt" data-label="Catégorie"><span className="badge badge-gray">{(d.categorie || '').replace(/_/g, ' ')}</span></td>
                  <td className="table-cell col-opt" data-label="Taille">{fmtSize(d.taille || 0)}</td>
                  <td className="table-cell" data-label="Date">{d.createdAt ? new Date(d.createdAt).toLocaleDateString('fr-FR') : '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

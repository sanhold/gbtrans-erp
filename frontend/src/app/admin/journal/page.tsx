'use client';

import { useEffect, useState } from 'react';
import AdminShell from '@/components/admin/AdminShell';
import { platformApi } from '@/lib/platformApi';
import toast from 'react-hot-toast';

const ACTION_LABEL: Record<string, string> = {
  ABONNEMENT_MODIFIE: 'Abonnement modifié',
  ESSAI_PROLONGE: 'Essai prolongé',
  RELANCE_ENVOYEE: 'Relance envoyée',
  FORMULE_MODIFIEE: 'Formule modifiée',
  COMPTE_ADMIN_CREE: 'Compte admin créé',
  COMPTE_ADMIN_ACTIVE: 'Compte admin activé',
  COMPTE_ADMIN_DESACTIVE: 'Compte admin désactivé',
  COMPTE_ADMIN_SUPPRIME: 'Compte admin supprimé',
  VITRINE_MODIFIEE: 'Contenu vitrine modifié',
  FOURNISSEUR_PAIEMENT_MODIFIE: 'Fournisseur de paiement modifié',
};
const ACTION_BADGE: Record<string, string> = {
  ABONNEMENT_MODIFIE: 'badge-info', ESSAI_PROLONGE: 'badge-success', RELANCE_ENVOYEE: 'badge-warning',
  FORMULE_MODIFIEE: 'badge-info', COMPTE_ADMIN_CREE: 'badge-success', COMPTE_ADMIN_ACTIVE: 'badge-success',
  COMPTE_ADMIN_DESACTIVE: 'badge-danger', COMPTE_ADMIN_SUPPRIME: 'badge-danger', VITRINE_MODIFIEE: 'badge-gray',
  FOURNISSEUR_PAIEMENT_MODIFIE: 'badge-info',
};

const fmtDateHeure = (d: any) => d ? new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-';

export default function AdminJournalPage() {
  const [data, setData] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    platformApi.auditLog({ page, limit: 30 })
      .then(r => { setData(r.data.data.data || []); setTotal(r.data.data.total || 0); setTotalPages(r.data.data.totalPages || 1); })
      .catch(() => toast.error('Erreur de chargement'))
      .finally(() => setLoading(false));
  }, [page]);

  const detailsTexte = (entry: any) => {
    const d = entry.details;
    if (!d) return null;
    if (entry.action === 'ABONNEMENT_MODIFIE' && d.statut) return `→ ${d.statut}`;
    if (entry.action === 'ESSAI_PROLONGE' && d.jours) return `+${d.jours} jour(s)`;
    if (entry.action === 'RELANCE_ENVOYEE' && d.email) return d.email;
    if (entry.action === 'FORMULE_MODIFIEE' && d.nom) return d.nom;
    if (entry.action === 'COMPTE_ADMIN_CREE' && d.email) return d.email;
    if (entry.action === 'COMPTE_ADMIN_SUPPRIME' && d.email) return d.email;
    return null;
  };

  return (
    <AdminShell>
      <div className="space-y-5">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Journal d&apos;activité</h1>
          <p className="text-sm text-gray-500">{total} action(s) enregistrée(s) — traçabilité des opérations sensibles de la plateforme</p>
        </div>

        <div className="table-container">
          <table className="w-full">
            <thead><tr>
              <th className="table-header">Date</th>
              <th className="table-header">Administrateur</th>
              <th className="table-header">Action</th>
              <th className="table-header">Détails</th>
            </tr></thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={4} className="text-center py-12 text-gray-500"><div className="animate-spin w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full mx-auto" /></td></tr>
              ) : data.length === 0 ? (
                <tr><td colSpan={4} className="text-center py-12 text-gray-500">Aucune action enregistrée</td></tr>
              ) : data.map(entry => (
                <tr key={entry.id} className="table-row">
                  <td className="table-cell text-xs" data-label="Date">{fmtDateHeure(entry.createdAt)}</td>
                  <td className="table-cell text-xs" data-label="Administrateur">{entry.adminEmail}</td>
                  <td className="table-cell" data-label="Action"><span className={`badge ${ACTION_BADGE[entry.action] || 'badge-gray'} !text-[10px]`}>{ACTION_LABEL[entry.action] || entry.action}</span></td>
                  <td className="table-cell text-xs text-gray-500" data-label="Détails">{detailsTexte(entry) || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2">
            <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="btn-secondary !px-3 !py-1.5 text-sm disabled:opacity-40">Précédent</button>
            <span className="text-sm text-gray-500">Page {page} / {totalPages}</span>
            <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)} className="btn-secondary !px-3 !py-1.5 text-sm disabled:opacity-40">Suivant</button>
          </div>
        )}
      </div>
    </AdminShell>
  );
}

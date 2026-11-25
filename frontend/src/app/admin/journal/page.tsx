'use client';

import { useEffect, useState } from 'react';
import AdminShell from '@/components/admin/AdminShell';
import PageHeader from '@/components/ui/PageHeader';
import EmptyState from '@/components/ui/EmptyState';
import ListeResponsive from '@/components/tables/ListeResponsive';
import { Discret, Tronque, StatutPastille, tonDepuisBadge } from '@/components/tables/cellules';
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

  const pastille = (e: any) => <StatutPastille libelle={ACTION_LABEL[e.action] || e.action} ton={tonDepuisBadge(ACTION_BADGE[e.action])} />;
  const colonnes = [
    { cle: 'date', libelle: 'Date', texte: (e: any) => fmtDateHeure(e.createdAt), rendu: (e: any) => <Discret>{fmtDateHeure(e.createdAt)}</Discret> },
    { cle: 'admin', libelle: 'Administrateur', texte: (e: any) => e.adminEmail || '', rendu: (e: any) => <Tronque texte={e.adminEmail} largeur="18rem" /> },
    { cle: 'action', libelle: 'Action', texte: (e: any) => ACTION_LABEL[e.action] || e.action, rendu: pastille },
    { cle: 'details', libelle: 'Détails', texte: (e: any) => detailsTexte(e) || '', rendu: (e: any) => <Tronque texte={detailsTexte(e) || '—'} largeur="20rem" /> },
  ];

  return (
    <AdminShell>
      <div className="space-y-3 sm:space-y-4">
        <PageHeader titre="Journal d'activité" sousTitre={`${total} action(s) — traçabilité des opérations sensibles`} sousTitreMasqueMobile />
        <ListeResponsive
          colonnes={colonnes}
          lignes={data}
          cleLigne={(e: any) => e.id}
          chargement={loading}
          nomExport="journal-activite"
          carte={(e: any) => ({ titre: ACTION_LABEL[e.action] || e.action, sousTitre: e.adminEmail, statut: undefined, details: `${fmtDateHeure(e.createdAt)}${detailsTexte(e) ? ` — ${detailsTexte(e)}` : ''}` })}
          pagination={{ page, totalPages, total, pageSize: 30, onPageChange: setPage, onPageSizeChange: () => {} }}
          vide={<EmptyState titre="Aucune action enregistrée" description="Les opérations sensibles apparaîtront ici." />}
        />
      </div>
    </AdminShell>
  );
}

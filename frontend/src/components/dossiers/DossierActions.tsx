'use client';

import { useState } from 'react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { useAuthStore } from '@/stores/authStore';
import { dossiersApi } from '@/lib/api';
import { dossierEstFerme, statutLabels } from '@/lib/dossierStatut';
import ConfirmDialog from '@/components/ui/ConfirmDialog';

interface Props {
  dossier: any;
  /** Appelé après un changement de statut (pour recharger les données). */
  onChange?: () => void;
  /** Appelé après la suppression du dossier. */
  onDeleted?: () => void;
  /** Masque le bouton « Fiche complète » (déjà sur la fiche). */
  masquerFiche?: boolean;
}

type Confirmation = { titre: string; message: string; label: string; danger: boolean; action: () => Promise<void> } | null;

/**
 * Tous les raccourcis d'action d'un dossier, filtrés selon les droits du profil connecté
 * et l'état du dossier (mêmes règles que le serveur : un dossier fermé n'est plus modifiable,
 * seuls les dossiers NOUVEAU ou ANNULÉ sont supprimables, etc.).
 */
export default function DossierActions({ dossier, onChange, onDeleted, masquerFiche = false }: Props) {
  const { hasPermission } = useAuthStore();
  const [confirmation, setConfirmation] = useState<Confirmation>(null);
  const [enCours, setEnCours] = useState(false);

  const id = dossier.id as string;
  const ferme = dossierEstFerme(dossier.statut);
  const peut = (p: string) => hasPermission(p);

  const nbProformas = dossier._count?.proformas ?? dossier.proformas?.length ?? 0;
  const nbFactures = dossier._count?.factures ?? dossier.factures?.length ?? 0;

  const lien = 'btn-secondary !justify-start text-left';
  const executer = async (action: () => Promise<void>) => {
    setEnCours(true);
    try { await action(); setConfirmation(null); }
    catch (e: any) { toast.error(e?.response?.data?.message || 'Opération impossible'); }
    finally { setEnCours(false); }
  };

  const changerStatut = (statut: string, titre: string, message: string, danger = false) => setConfirmation({
    titre, message, label: titre, danger,
    action: async () => {
      if (statut === 'ARCHIVE') await dossiersApi.archiver(id); else await dossiersApi.changeStatut(id, statut);
      toast.success(`Statut modifié : ${statutLabels[statut]}`);
      onChange?.();
    },
  });

  const supprimer = () => setConfirmation({
    titre: 'Supprimer le dossier', message: `Supprimer définitivement le dossier ${dossier.numeroPhysique || dossier.numero} ? Cette action est irréversible.`, label: 'Supprimer', danger: true,
    action: async () => { await dossiersApi.delete(id); toast.success('Dossier supprimé'); onDeleted?.(); },
  });

  const groupe = (titre: string, enfants: React.ReactNode[]) => {
    const visibles = enfants.filter(Boolean);
    if (visibles.length === 0) return null;
    return (
      <div>
        <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wide mb-2">{titre}</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">{visibles}</div>
      </div>
    );
  };

  const consulter = [
    !masquerFiche && peut('DOSSIERS:LIRE') && <Link key="fiche" href={`/dossiers/${id}`} className="btn-primary !justify-start">📄 Fiche complète</Link>,
    peut('DOSSIERS:LIRE') && <Link key="suivi" href={`/dossiers/suivi/${id}`} className={lien}>✅ Suivi des étapes</Link>,
    peut('PROFORMAS:LIRE') && <Link key="lp" href={`/dossiers/${id}?onglet=proformas`} className={lien}>📝 Proformas ({nbProformas})</Link>,
    peut('FACTURATION:LIRE') && <Link key="lf" href={`/dossiers/${id}?onglet=factures`} className={lien}>🧾 Factures ({nbFactures})</Link>,
  ];

  const creer = [
    !ferme && peut('PROFORMAS:CREER') && <Link key="np" href={`/proformas/nouveau?dossierId=${id}`} className={lien}>＋ Nouvelle proforma</Link>,
    !ferme && peut('FACTURATION:CREER') && <Link key="nf" href={`/facturation/nouveau?dossierId=${id}`} className={lien}>＋ Nouvelle facture</Link>,
  ];

  const statut = dossier.statut as string;
  const gerer = [
    !ferme && peut('DOSSIERS:MODIFIER') && <Link key="mod" href={`/dossiers/${id}/edit`} className={lien}>✏️ Modifier</Link>,
    statut === 'NOUVEAU' && peut('DOSSIERS:MODIFIER') && <button key="demarrer" type="button" className={lien} onClick={() => changerStatut('EN_COURS', 'Démarrer le dossier', 'Passer ce dossier au statut « En cours » ?')}>▶️ Démarrer (En cours)</button>,
    statut === 'EN_COURS' && peut('DOSSIERS:MODIFIER') && <button key="terminer" type="button" className={lien} onClick={() => changerStatut('TERMINE', 'Marquer comme terminé', 'Marquer ce dossier comme terminé ? Il ne pourra plus être modifié.')}>🏁 Marquer terminé</button>,
    !ferme && peut('DOSSIERS:MODIFIER') && <button key="annuler" type="button" className={`${lien} !text-red-600`} onClick={() => changerStatut('ANNULE', 'Annuler le dossier', 'Annuler ce dossier ? Il ne pourra plus être modifié.', true)}>🚫 Annuler le dossier</button>,
    (statut === 'TERMINE' || statut === 'ANNULE') && peut('DOSSIERS:ARCHIVER') && <button key="archiver" type="button" className={lien} onClick={() => changerStatut('ARCHIVE', 'Archiver le dossier', 'Archiver ce dossier ? Plus aucune information ne pourra être ajoutée ou modifiée.')}>🗄️ Archiver</button>,
    (statut === 'NOUVEAU' || statut === 'ANNULE') && peut('DOSSIERS:SUPPRIMER') && <button key="supprimer" type="button" className={`${lien} !text-red-600`} onClick={supprimer}>🗑️ Supprimer</button>,
  ];

  return (
    <div className="space-y-5">
      {groupe('Consulter', consulter)}
      {groupe('Créer', creer)}
      {groupe('Gérer', gerer)}
      <ConfirmDialog
        open={!!confirmation}
        titre={confirmation?.titre || ''}
        message={confirmation?.message || ''}
        confirmLabel={confirmation?.label}
        danger={confirmation?.danger}
        loading={enCours}
        onConfirm={() => confirmation && executer(confirmation.action)}
        onCancel={() => setConfirmation(null)}
      />
    </div>
  );
}

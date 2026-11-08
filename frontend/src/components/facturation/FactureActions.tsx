'use client';

import { useState } from 'react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { useAuthStore } from '@/stores/authStore';
import { facturesApi } from '@/lib/api';
import { downloadPDF } from '@/lib/generatePDF';
import ConfirmDialog from '@/components/ui/ConfirmDialog';

interface Props {
  facture: any;
  /** Appelé après un changement de statut (pour recharger les données). */
  onChange?: () => void;
}

// Mêmes statuts que le serveur (STATUTS_FACTURE_PAYABLES)
const STATUTS_PAYABLES = ['VALIDEE', 'ENVOYEE', 'PARTIELLEMENT_PAYEE', 'EN_RETARD', 'CONTENTIEUX'];

type Confirmation = { titre: string; message: string; label: string; danger: boolean; action: () => Promise<void> } | null;

/** Télécharge le PDF d'une facture (récupère la facture complète avec ses lignes). */
export async function telechargerFacturePDF(id: string) {
  try {
    const res = await facturesApi.get(id);
    const f = res.data.data;
    downloadPDF({
      type: 'FACTURE', numero: f.numero,
      date: new Date(f.dateFacture).toLocaleDateString('fr-FR'),
      client: f.client?.raisonSociale || '', dossierNumero: f.dossier?.numeroPhysique || f.dossier?.numero, titre: f.titre,
      afficherSignature: !!f.afficherSignature,
      montantHT: Number(f.montantHT), montantTVA: Number(f.montantTVA), montantTTC: Number(f.montantTTC),
      montantPrestation: f.montantPrestation ? Number(f.montantPrestation) : undefined,
      tvaPrestation: f.tvaPrestation ? Number(f.tvaPrestation) : undefined,
      acompte: Number(f.acompte) || undefined,
      resteAPayer: Number(f.resteAPayer) || undefined,
      lignes: (f.lignes || []).map((l: any) => ({ categorie: l.categorie || '', designation: l.designation, montant: Number(l.prixUnitaire || 0), estTVA: l.estTVA })),
    });
    toast.success('PDF téléchargé');
  } catch { toast.error('Erreur téléchargement'); }
}

/**
 * Tous les raccourcis d'action d'une facture, filtrés selon les droits du profil connecté et
 * l'état de la facture (mêmes règles que le serveur : seul un brouillon se valide ou s'annule,
 * un avoir s'émet sur une facture validée, un paiement sur une facture non soldée).
 */
export default function FactureActions({ facture, onChange }: Props) {
  const { hasPermission } = useAuthStore();
  const [confirmation, setConfirmation] = useState<Confirmation>(null);
  const [enCours, setEnCours] = useState(false);

  const id = facture.id as string;
  const statut = facture.statut as string;
  const brouillon = statut === 'BROUILLON';
  const annulee = statut === 'ANNULEE';
  const peut = (p: string) => hasPermission(p);
  const dossierId = facture.dossier?.id || facture.dossierId;

  const lien = 'btn-secondary !justify-start text-left';
  const executer = async (action: () => Promise<void>) => {
    setEnCours(true);
    try { await action(); setConfirmation(null); }
    catch (e: any) { toast.error(e?.response?.data?.message || 'Opération impossible'); }
    finally { setEnCours(false); }
  };

  const valider = () => setConfirmation({
    titre: 'Valider la facture', message: `Valider la facture ${facture.numero} ? Elle ne pourra plus être modifiée.`, label: 'Valider', danger: false,
    action: async () => { await facturesApi.valider(id); toast.success('Facture validée'); onChange?.(); },
  });
  const annuler = () => setConfirmation({
    titre: 'Annuler la facture', message: `Annuler la facture brouillon ${facture.numero} ?`, label: 'Annuler la facture', danger: true,
    action: async () => { await facturesApi.annuler(id); toast.success('Facture annulée'); onChange?.(); },
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
    peut('FACTURATION:LIRE') && <Link key="fiche" href={`/facturation/${id}`} className="btn-primary !justify-start">📄 Fiche complète</Link>,
    peut('FACTURATION:LIRE') && <button key="pdf" type="button" className={lien} onClick={() => telechargerFacturePDF(id)}>⬇️ Télécharger le PDF</button>,
    dossierId && peut('DOSSIERS:LIRE') && <Link key="dossier" href={`/dossiers/${dossierId}`} className={lien}>📁 Voir le dossier</Link>,
  ];

  const gerer = [
    brouillon && peut('FACTURATION:VALIDER') && <button key="valider" type="button" className={lien} onClick={valider}>✅ Valider</button>,
    brouillon && peut('FACTURATION:MODIFIER') && <Link key="modifier" href={`/facturation/${id}`} className={lien}>✏️ Modifier les lignes</Link>,
    STATUTS_PAYABLES.includes(statut) && Number(facture.resteAPayer) > 0 && peut('FACTURATION:PAYER') && <Link key="payer" href={`/facturation/${id}?action=paiement`} className={lien}>💰 Enregistrer un paiement</Link>,
    facture.type === 'FACTURE' && !brouillon && !annulee && peut('FACTURATION:CREER') && <Link key="avoir" href={`/facturation/${id}?action=avoir`} className={lien}>↩️ Créer un avoir</Link>,
    brouillon && peut('FACTURATION:ANNULER') && <button key="annuler" type="button" className={`${lien} !text-red-600`} onClick={annuler}>🚫 Annuler la facture</button>,
  ];

  return (
    <div className="space-y-5">
      {groupe('Consulter', consulter)}
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

/**
 * Registre des principales tables rattachees directement a une societe (colonne societeId),
 * utilise a la fois pour l'estimation de taille de donnees et pour l'export de sauvegarde.
 * Liste volontairement non exhaustive (tables les plus representatives du volume de
 * donnees) : certaines tables plus petites ou rattachees indirectement (proformas, offres,
 * paiements, ecritures comptables...) n'y figurent pas — la taille/l'export restent donc
 * des estimations, pas une copie bit a bit de la base.
 */
import prisma from '../config/database';

export const TABLES_SOCIETE: { cle: string; label: string }[] = [
  { cle: 'dossier', label: 'Dossiers' },
  { cle: 'client', label: 'Clients' },
  { cle: 'fournisseur', label: 'Fournisseurs' },
  { cle: 'prospect', label: 'Prospects' },
  { cle: 'facture', label: 'Factures' },
  { cle: 'factureFournisseur', label: 'Factures fournisseurs' },
  { cle: 'document', label: 'Documents' },
  { cle: 'courrier', label: 'Courriers' },
  { cle: 'caution', label: 'Cautions' },
  { cle: 'admissionTemporaire', label: 'Admissions temporaires' },
  { cle: 'employe', label: 'Employés' },
  { cle: 'bulletinPaie', label: 'Bulletins de paie' },
  { cle: 'vehicule', label: 'Véhicules' },
  { cle: 'chauffeur', label: 'Chauffeurs' },
  { cle: 'course', label: 'Courses' },
  { cle: 'maintenanceVehicule', label: 'Maintenances véhicules' },
  { cle: 'utilisateur', label: 'Utilisateurs' },
  { cle: 'agence', label: 'Agences' },
  { cle: 'depense', label: 'Dépenses' },
  { cle: 'operationFinanciere', label: 'Opérations financières' },
  { cle: 'caisse', label: 'Caisses' },
  { cle: 'compteBancaire', label: 'Comptes bancaires' },
  { cle: 'compteTiers', label: 'Comptes tiers' },
  { cle: 'paiementFournisseur', label: 'Paiements fournisseurs' },
];

/** Octets occupes (poids reel des lignes, hors index) par chaque table pour une societe. */
export async function estimerTailleParTable(societeId: string): Promise<{ cle: string; label: string; octets: number; lignes: number }[]> {
  const resultats = [];
  for (const { cle, label } of TABLES_SOCIETE) {
    try {
      const delegate = (prisma as any)[cle];
      const lignes = await delegate.count({ where: { societeId } });
      let octets = 0;
      if (lignes > 0) {
        const agg: any[] = await prisma.$queryRawUnsafe(
          `SELECT COALESCE(SUM(pg_column_size(t.*)), 0)::bigint AS octets FROM "${tableName(cle)}" t WHERE "societeId" = $1`,
          societeId
        );
        octets = Number(agg?.[0]?.octets || 0);
      }
      resultats.push({ cle, label, octets, lignes });
    } catch {
      resultats.push({ cle, label, octets: 0, lignes: 0 });
    }
  }
  return resultats;
}

/** Export JSON complet des donnees d'une societe sur les tables du registre. */
export async function exporterDonneesSociete(societeId: string): Promise<Record<string, any[]>> {
  const export_: Record<string, any[]> = {};
  for (const { cle } of TABLES_SOCIETE) {
    try {
      const delegate = (prisma as any)[cle];
      export_[cle] = await delegate.findMany({ where: { societeId } });
    } catch {
      export_[cle] = [];
    }
  }
  return export_;
}

// Correspondance delegate Prisma -> nom de table reel (@@map), pour les requetes SQL brutes.
const NOMS_TABLES: Record<string, string> = {
  dossier: 'dossiers', client: 'clients', fournisseur: 'fournisseurs', prospect: 'prospects',
  facture: 'factures', factureFournisseur: 'factures_fournisseurs', document: 'documents',
  courrier: 'courriers', caution: 'cautions', admissionTemporaire: 'admissions_temporaires',
  employe: 'employes', bulletinPaie: 'bulletins_paie', vehicule: 'vehicules', chauffeur: 'chauffeurs',
  course: 'courses', maintenanceVehicule: 'maintenances_vehicules', utilisateur: 'utilisateurs',
  agence: 'agences', depense: 'depenses', operationFinanciere: 'operations_financieres',
  caisse: 'caisses', compteBancaire: 'comptes_bancaires', compteTiers: 'comptes_tiers',
  paiementFournisseur: 'paiements_fournisseurs',
};

function tableName(cle: string): string {
  return NOMS_TABLES[cle] || cle;
}

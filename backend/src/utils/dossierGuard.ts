import prisma from '../config/database';

export const STATUTS_DOSSIER_FERME = ['CLOTURE', 'ANNULE', 'ARCHIVE'];

export function dossierEstFerme(statut: string) {
  return STATUTS_DOSSIER_FERME.includes(statut);
}

export async function assertDossierOuvert(dossierId: string | string[], societeId: string) {
  const id = String(dossierId);
  const dossier = await prisma.dossier.findFirst({ where: { id, societeId } });
  if (!dossier) throw new Error('Dossier introuvable');
  if (dossierEstFerme(dossier.statut)) {
    throw new Error(`Impossible d'ajouter ou de modifier des informations : le dossier ${dossier.numero} est ${dossier.statut.toLowerCase()}`);
  }
  return dossier;
}

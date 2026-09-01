import prisma from '../config/database';

export const LETTRE_NATURE_DOSSIER: Record<string, string> = {
  IMPORT: 'I',
  EXPORT: 'E',
  TRANSIT: 'T',
  REEXPORT: 'R',
  CABOTAGE: 'C',
  TRANSBORDEMENT: 'TB',
};

export async function suggererNumeroPhysiqueDossier(
  societeId: string,
  nature: string,
  annee: number
): Promise<string> {
  const lettre = LETTRE_NATURE_DOSSIER[nature] || nature.substring(0, 1).toUpperCase();

  const dossiers = await prisma.dossier.findMany({
    where: {
      societeId,
      nature: nature as any,
      annee,
      numeroPhysique: { startsWith: `${lettre}-` },
    },
    select: { numeroPhysique: true },
  });

  const regex = new RegExp(`^${lettre}-(\\d+)/${annee}$`);
  let max = 0;
  for (const d of dossiers) {
    const m = d.numeroPhysique?.match(regex);
    if (m) {
      const n = parseInt(m[1], 10);
      if (n > max) max = n;
    }
  }

  const suivant = max + 1;
  return `${lettre}-${String(suivant).padStart(2, '0')}/${annee}`;
}

export async function genererNumero(
  societeId: string,
  module: string,
  annee?: number
): Promise<string> {
  const currentYear = annee || new Date().getFullYear();

  const numerotation = await prisma.numerotation.findUnique({
    where: {
      societeId_module_annee: {
        societeId,
        module,
        annee: currentYear,
      },
    },
  });

  if (!numerotation) {
    const created = await prisma.numerotation.create({
      data: {
        societeId,
        module,
        prefixe: getPrefixeDefault(module),
        compteur: 1,
        longueur: 6,
        annuel: true,
        annee: currentYear,
        format: '{PREFIX}/{ANNEE}/{COMPTEUR}',
      },
    });
    return formatNumero(created.prefixe, currentYear, 1, created.longueur);
  }

  const updated = await prisma.numerotation.update({
    where: { id: numerotation.id },
    data: { compteur: { increment: 1 } },
  });

  return formatNumero(
    updated.prefixe,
    currentYear,
    updated.compteur,
    updated.longueur
  );
}

function formatNumero(
  prefixe: string,
  annee: number,
  compteur: number,
  longueur: number
): string {
  const num = compteur.toString().padStart(longueur, '0');
  return `${prefixe}/${annee}/${num}`;
}

function getPrefixeDefault(module: string): string {
  const prefixes: Record<string, string> = {
    DOSSIER: 'DOS',
    FACTURE: 'FAC',
    PROFORMA: 'PRO',
    AVOIR: 'AVR',
    OFFRE: 'OFF',
    PAIEMENT: 'PAI',
    COURRIER_ENTRANT: 'CE',
    COURRIER_SORTANT: 'CS',
    AT: 'AT',
    CAUTION: 'CAU',
    DEPENSE: 'DEP',
    DOTATION: 'DOT',
    OPERATION_FINANCIERE: 'OPF',
    FACTURE_FOURNISSEUR: 'FF',
    PAIEMENT_FOURNISSEUR: 'PF',
    ECRITURE_VE: 'EVE',
    ECRITURE_AC: 'EAC',
    ECRITURE_BQ: 'EBQ',
    ECRITURE_CA: 'ECA',
    ECRITURE_OD: 'EOD',
  };
  return prefixes[module] || module.substring(0, 3).toUpperCase();
}

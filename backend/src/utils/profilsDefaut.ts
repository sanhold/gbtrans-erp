import { Prisma, PrismaClient } from '@prisma/client';

type Tx = Omit<PrismaClient, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'>;

/**
 * Cree le jeu de profils standard (Administrateur, Transitaire, Comptable, Commercial,
 * Consultation) pour une societe, avec leurs permissions par defaut. Utilise a
 * l'inscription en libre-service d'un nouveau tenant SaaS, pour que chaque societe ait
 * ses propres profils independants (et puisse les personnaliser sans impacter les
 * autres societes du SaaS). Reprend les memes regles que prisma/seed.ts.
 */
export async function creerProfilsDefautPourSociete(tx: Tx, societeId: string) {
  const profilAdmin = await tx.profil.create({
    data: { societeId, code: 'ADMIN', nom: 'Administrateur', description: 'Accès complet à toutes les fonctionnalités', estAdmin: true },
  });
  const profilTransitaire = await tx.profil.create({
    data: { societeId, code: 'TRANSITAIRE', nom: 'Transitaire', description: 'Gestion des dossiers de transit' },
  });
  const profilComptable = await tx.profil.create({
    data: { societeId, code: 'COMPTABLE', nom: 'Comptable', description: 'Gestion comptable et financière' },
  });
  const profilCommercial = await tx.profil.create({
    data: { societeId, code: 'COMMERCIAL', nom: 'Commercial', description: 'Gestion commerciale et clients' },
  });
  const profilConsultation = await tx.profil.create({
    data: { societeId, code: 'CONSULTATION', nom: 'Consultation', description: 'Accès en lecture seule' },
  });

  const lier = async (profilId: string, where: Prisma.PermissionWhereInput) => {
    const permissions = await tx.permission.findMany({ where });
    if (permissions.length === 0) return;
    await tx.profilPermission.createMany({
      data: permissions.map(p => ({ profilId, permissionId: p.id })),
      skipDuplicates: true,
    });
  };

  await lier(profilTransitaire.id, {
    OR: [
      { module: { in: ['DOSSIERS', 'CLIENTS', 'PROFORMAS'] }, action: { in: ['LIRE', 'CREER', 'MODIFIER'] } },
      { module: { in: ['AT', 'CAUTIONS', 'COURRIERS', 'TRANSPORT'] }, action: { in: ['LIRE', 'CREER', 'MODIFIER', 'SUPPRIMER', 'VALIDER', 'ARCHIVER'] } },
    ],
  });

  await lier(profilComptable.id, {
    OR: [
      { module: 'FINANCE', action: { in: ['LIRE', 'CREER', 'MODIFIER', 'VALIDER'] } },
      { module: 'FOURNISSEURS', action: { in: ['LIRE', 'CREER', 'MODIFIER', 'VALIDER'] } },
      { module: 'DOSSIERS', action: 'LIRE' },
      { module: 'COMPTABILITE', action: { in: ['LIRE', 'CREER', 'MODIFIER', 'SUPPRIMER', 'VALIDER', 'ARCHIVER', 'EXPORTER', 'IMPRIMER'] } },
      { module: 'FINANCE', action: 'VOIR_MONTANTS' },
      { module: 'RH', action: { in: ['LIRE', 'VOIR_MONTANTS'] } },
    ],
  });

  await lier(profilCommercial.id, {
    OR: [
      { module: 'CLIENTS', action: { in: ['LIRE', 'CREER', 'MODIFIER'] } },
      { module: 'PROFORMAS', action: { in: ['LIRE', 'CREER', 'MODIFIER'] } },
      { module: 'OFFRES', action: { in: ['LIRE', 'CREER', 'MODIFIER'] } },
      { module: 'DOSSIERS', action: 'LIRE' },
      { module: 'FACTURATION', action: 'LIRE' },
    ],
  });

  await lier(profilConsultation.id, { action: 'LIRE' });

  return { profilAdmin, profilTransitaire, profilComptable, profilCommercial, profilConsultation };
}

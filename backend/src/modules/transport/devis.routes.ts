import { Router, Response } from 'express';
import { authenticate, requireSociete, authorize } from '../../middleware/auth';
import { AuthRequest } from '../../types';
import { ApiResponse } from '../../utils/apiResponse';
import prisma from '../../config/database';
import { genererNumero } from '../../utils/numerotation';
import { Prisma } from '@prisma/client';

const router = Router();
router.use(authenticate, requireSociete);

const INCLUDE_DEVIS = {
  client: { select: { id: true, code: true, raisonSociale: true } },
  createur: { select: { id: true, nom: true, prenom: true } },
  lignes: { orderBy: { ordre: 'asc' as const }, include: { course: { select: { id: true, numero: true, statut: true } } } },
};

router.get('/', authorize('TRANSPORT:LIRE'), async (req: AuthRequest, res: Response) => {
  try {
    const { page = '1', limit = '20', search, statut, clientId } = req.query as Record<string, string>;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const where: Prisma.DevisTransportWhereInput = {
      societeId: req.user!.societeId,
      ...(statut && { statut: statut as any }),
      ...(clientId && { clientId }),
      ...(search && { numero: { contains: search, mode: 'insensitive' as const } }),
    };
    const [data, total] = await Promise.all([
      prisma.devisTransport.findMany({ where, skip, take: parseInt(limit), orderBy: { createdAt: 'desc' }, include: INCLUDE_DEVIS }),
      prisma.devisTransport.count({ where }),
    ]);
    ApiResponse.paginated(res, data, total, parseInt(page), parseInt(limit));
  } catch (e: any) { ApiResponse.error(res, e.message); }
});

router.get('/:id', authorize('TRANSPORT:LIRE'), async (req: AuthRequest, res: Response) => {
  try {
    const devis = await prisma.devisTransport.findFirst({
      where: { id: req.params.id, societeId: req.user!.societeId },
      include: INCLUDE_DEVIS,
    });
    if (!devis) { ApiResponse.notFound(res); return; }
    ApiResponse.success(res, devis);
  } catch (e: any) { ApiResponse.error(res, e.message); }
});

type LigneInput = { origine: string; destination: string; designationMarchandise?: string; dateDepartPrevue?: string; montantEstime: number };

function validerLignes(lignes: any): lignes is LigneInput[] {
  return Array.isArray(lignes) && lignes.length > 0 && lignes.every(
    (l) => l && typeof l.origine === 'string' && l.origine.trim() && typeof l.destination === 'string' && l.destination.trim() && l.montantEstime != null && Number(l.montantEstime) > 0
  );
}

router.post('/', authorize('TRANSPORT:CREER'), async (req: AuthRequest, res: Response) => {
  try {
    const societeId = req.user!.societeId;
    const { clientId, objet, dateValidite, observations, lignes } = req.body;

    if (!clientId) { ApiResponse.badRequest(res, 'Client requis'); return; }
    if (!validerLignes(lignes)) { ApiResponse.badRequest(res, 'Ajoutez au moins une ligne de voyage valide (origine, destination, montant estimé)'); return; }

    const client = await prisma.client.findFirst({ where: { id: clientId, societeId } });
    if (!client) { ApiResponse.badRequest(res, 'Client introuvable'); return; }

    const numero = await genererNumero(societeId, 'DEVIS_TRANSPORT');
    const montantTotal = lignes.reduce((s: number, l: LigneInput) => s + Number(l.montantEstime), 0);

    const devis = await prisma.devisTransport.create({
      data: {
        societeId, numero, clientId, createurId: req.user!.id,
        objet: objet || null, dateValidite: dateValidite ? new Date(dateValidite) : null,
        observations: observations || null, montantTotal,
        lignes: {
          create: lignes.map((l: LigneInput, i: number) => ({
            ordre: i + 1, origine: l.origine, destination: l.destination,
            designationMarchandise: l.designationMarchandise || null,
            dateDepartPrevue: l.dateDepartPrevue ? new Date(l.dateDepartPrevue) : null,
            montantEstime: Number(l.montantEstime),
          })),
        },
      },
      include: INCLUDE_DEVIS,
    });
    ApiResponse.created(res, devis, `Devis ${numero} créé`);
  } catch (e: any) { ApiResponse.badRequest(res, e.message); }
});

router.put('/:id', authorize('TRANSPORT:MODIFIER'), async (req: AuthRequest, res: Response) => {
  try {
    const societeId = req.user!.societeId;
    const existing = await prisma.devisTransport.findFirst({ where: { id: req.params.id, societeId } });
    if (!existing) { ApiResponse.notFound(res); return; }
    if (existing.statut !== 'BROUILLON') { ApiResponse.badRequest(res, 'Seul un devis en brouillon peut être modifié'); return; }

    const { clientId, objet, dateValidite, observations, lignes } = req.body;
    if (clientId) {
      const client = await prisma.client.findFirst({ where: { id: clientId, societeId } });
      if (!client) { ApiResponse.badRequest(res, 'Client introuvable'); return; }
    }
    if (lignes !== undefined && !validerLignes(lignes)) { ApiResponse.badRequest(res, 'Ajoutez au moins une ligne de voyage valide (origine, destination, montant estimé)'); return; }

    const montantTotal = lignes !== undefined ? lignes.reduce((s: number, l: LigneInput) => s + Number(l.montantEstime), 0) : undefined;

    const devis = await prisma.$transaction(async (tx) => {
      if (lignes !== undefined) {
        await tx.ligneDevisTransport.deleteMany({ where: { devisTransportId: existing.id } });
      }
      return tx.devisTransport.update({
        where: { id: existing.id },
        data: {
          ...(clientId !== undefined && { clientId }),
          ...(objet !== undefined && { objet: objet || null }),
          ...(dateValidite !== undefined && { dateValidite: dateValidite ? new Date(dateValidite) : null }),
          ...(observations !== undefined && { observations: observations || null }),
          ...(montantTotal !== undefined && { montantTotal }),
          ...(lignes !== undefined && {
            lignes: {
              create: lignes.map((l: LigneInput, i: number) => ({
                ordre: i + 1, origine: l.origine, destination: l.destination,
                designationMarchandise: l.designationMarchandise || null,
                dateDepartPrevue: l.dateDepartPrevue ? new Date(l.dateDepartPrevue) : null,
                montantEstime: Number(l.montantEstime),
              })),
            },
          }),
        },
        include: INCLUDE_DEVIS,
      });
    });
    ApiResponse.success(res, devis, 'Devis modifié');
  } catch (e: any) { ApiResponse.badRequest(res, e.message); }
});

// Accepte le devis : genere une course "Planifiee" par ligne, pretes a etre affectees
// a un vehicule/chauffeur puis executees.
router.post('/:id/valider', authorize('TRANSPORT:VALIDER'), async (req: AuthRequest, res: Response) => {
  try {
    const societeId = req.user!.societeId;
    const devis = await prisma.devisTransport.findFirst({
      where: { id: req.params.id, societeId },
      include: { lignes: true },
    });
    if (!devis) { ApiResponse.notFound(res); return; }
    if (devis.statut !== 'BROUILLON' && devis.statut !== 'ENVOYE') { ApiResponse.badRequest(res, 'Ce devis a déjà été traité'); return; }

    const { vehiculeId, chauffeurId } = req.body as { vehiculeId?: string; chauffeurId?: string };
    let vehicule = null as Awaited<ReturnType<typeof prisma.vehicule.findFirst>> | null;
    let chauffeur = null as Awaited<ReturnType<typeof prisma.chauffeur.findFirst>> | null;
    if (vehiculeId) {
      vehicule = await prisma.vehicule.findFirst({ where: { id: vehiculeId, societeId } });
      if (!vehicule) { ApiResponse.badRequest(res, 'Véhicule introuvable'); return; }
    }
    if (chauffeurId) {
      chauffeur = await prisma.chauffeur.findFirst({ where: { id: chauffeurId, societeId } });
      if (!chauffeur) { ApiResponse.badRequest(res, 'Chauffeur introuvable'); return; }
    }

    const updated = await prisma.$transaction(async (tx) => {
      for (const ligne of devis.lignes) {
        if (vehicule && chauffeur) {
          const numero = await genererNumero(societeId, 'COURSE');
          const course = await tx.course.create({
            data: {
              societeId, numero, vehiculeId: vehicule.id, chauffeurId: chauffeur.id,
              clientId: devis.clientId, montantFacturable: ligne.montantEstime,
              origine: ligne.origine, destination: ligne.destination,
              designationMarchandise: ligne.designationMarchandise,
              dateDepartPrevue: ligne.dateDepartPrevue,
              historique: { create: { statutApres: 'PLANIFIEE', utilisateur: `${req.user!.prenom} ${req.user!.nom}` } },
            },
          });
          await tx.ligneDevisTransport.update({ where: { id: ligne.id }, data: { courseId: course.id } });
        }
      }
      return tx.devisTransport.update({ where: { id: devis.id }, data: { statut: 'ACCEPTE' }, include: INCLUDE_DEVIS });
    });

    const message = vehicule && chauffeur
      ? `Devis accepté : ${devis.lignes.length} course(s) créée(s)`
      : 'Devis accepté (véhicule/chauffeur à affecter plus tard sur chaque course)';
    ApiResponse.success(res, updated, message);
  } catch (e: any) { ApiResponse.badRequest(res, e.message); }
});

router.post('/:id/refuser', authorize('TRANSPORT:VALIDER'), async (req: AuthRequest, res: Response) => {
  try {
    const existing = await prisma.devisTransport.findFirst({ where: { id: req.params.id, societeId: req.user!.societeId } });
    if (!existing) { ApiResponse.notFound(res); return; }
    if (existing.statut === 'ACCEPTE') { ApiResponse.badRequest(res, 'Ce devis a déjà été accepté'); return; }
    const devis = await prisma.devisTransport.update({ where: { id: existing.id }, data: { statut: 'REFUSE' }, include: INCLUDE_DEVIS });
    ApiResponse.success(res, devis, 'Devis refusé');
  } catch (e: any) { ApiResponse.badRequest(res, e.message); }
});

router.post('/:id/envoyer', authorize('TRANSPORT:MODIFIER'), async (req: AuthRequest, res: Response) => {
  try {
    const existing = await prisma.devisTransport.findFirst({ where: { id: req.params.id, societeId: req.user!.societeId } });
    if (!existing) { ApiResponse.notFound(res); return; }
    if (existing.statut !== 'BROUILLON') { ApiResponse.badRequest(res, 'Seul un devis en brouillon peut être envoyé'); return; }
    const devis = await prisma.devisTransport.update({ where: { id: existing.id }, data: { statut: 'ENVOYE' }, include: INCLUDE_DEVIS });
    ApiResponse.success(res, devis, 'Devis marqué comme envoyé');
  } catch (e: any) { ApiResponse.badRequest(res, e.message); }
});

router.delete('/:id', authorize('TRANSPORT:SUPPRIMER'), async (req: AuthRequest, res: Response) => {
  try {
    const existing = await prisma.devisTransport.findFirst({ where: { id: req.params.id, societeId: req.user!.societeId } });
    if (!existing) { ApiResponse.notFound(res); return; }
    if (existing.statut !== 'BROUILLON') { ApiResponse.badRequest(res, 'Seul un devis en brouillon peut être supprimé'); return; }
    await prisma.devisTransport.delete({ where: { id: req.params.id } });
    ApiResponse.success(res, null, 'Devis supprimé');
  } catch (e: any) { ApiResponse.badRequest(res, e.message); }
});

export default router;

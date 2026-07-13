import { Router, Response } from 'express';
import { authenticate, requireSociete } from '../../middleware/auth';
import { AuthRequest } from '../../types';
import { ApiResponse } from '../../utils/apiResponse';
import prisma from '../../config/database';
import { genererNumero } from '../../utils/numerotation';
import { Prisma } from '@prisma/client';

const router = Router();
router.use(authenticate, requireSociete);

const INCLUDE_COURRIER = {
  createur: { select: { id: true, nom: true, prenom: true } },
  dossiers: { include: { dossier: { select: { id: true, numero: true, numeroPhysique: true } } } },
  piecesJointes: true,
};

router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const { page = '1', limit = '20', type, statut, search, dossierId } = req.query;
    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);

    const where: Prisma.CourrierWhereInput = {
      ...(type && { type: type as any }),
      ...(statut && { statut: statut as any }),
      ...(dossierId && { dossiers: { some: { dossierId: dossierId as string } } }),
      ...(search && {
        OR: [
          { numero: { contains: search as string, mode: 'insensitive' as const } },
          { objet: { contains: search as string, mode: 'insensitive' as const } },
          { expediteur: { contains: search as string, mode: 'insensitive' as const } },
          { destinataire: { contains: search as string, mode: 'insensitive' as const } },
        ],
      }),
    };

    const [data, total] = await Promise.all([
      prisma.courrier.findMany({
        where, skip, take: parseInt(limit as string),
        orderBy: { dateCreation: 'desc' },
        include: INCLUDE_COURRIER,
      }),
      prisma.courrier.count({ where }),
    ]);

    ApiResponse.paginated(res, data, total, parseInt(page as string), parseInt(limit as string));
  } catch (e: any) { ApiResponse.error(res, e.message); }
});

router.get('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const c = await prisma.courrier.findFirst({ where: { id: req.params.id }, include: INCLUDE_COURRIER });
    if (!c) { ApiResponse.notFound(res); return; }
    ApiResponse.success(res, c);
  } catch (e: any) { ApiResponse.error(res, e.message); }
});

router.post('/', async (req: AuthRequest, res: Response) => {
  try {
    const societeId = req.user!.societeId;
    const {
      type, objet, expediteur, destinataire, contenu, reference, priorite,
      statut, dateEnvoi, dateReception, classement, dossierId, observations,
    } = req.body;

    if (!type || !objet) { ApiResponse.badRequest(res, 'Type et objet requis'); return; }

    const module = type === 'ENTRANT' ? 'COURRIER_ENTRANT' : 'COURRIER_SORTANT';
    const numero = await genererNumero(societeId, module);

    const c = await prisma.courrier.create({
      data: {
        numero, type, objet,
        expediteur: expediteur || null,
        destinataire: destinataire || null,
        contenu: contenu || null,
        reference: reference || null,
        priorite: priorite || 'NORMALE',
        statut: statut || 'BROUILLON',
        createurId: req.user!.id,
        classement: classement || null,
        observations: observations || null,
        dateEnvoi: dateEnvoi ? new Date(dateEnvoi) : (statut === 'ENVOYE' ? new Date() : null),
        dateReception: dateReception ? new Date(dateReception) : (statut === 'RECU' ? new Date() : null),
        dossiers: dossierId ? { create: { dossierId } } : undefined,
      },
      include: INCLUDE_COURRIER,
    });
    ApiResponse.created(res, c, `Courrier ${numero} créé`);
  } catch (e: any) { ApiResponse.badRequest(res, e.message); }
});

router.put('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const existing = await prisma.courrier.findFirst({ where: { id: req.params.id } });
    if (!existing) { ApiResponse.notFound(res); return; }

    const {
      objet, expediteur, destinataire, contenu, reference, priorite,
      classement, dossierId, observations,
    } = req.body;

    const c = await prisma.$transaction(async (tx) => {
      const updated = await tx.courrier.update({
        where: { id: req.params.id },
        data: {
          objet, expediteur, destinataire, contenu, reference, priorite,
          classement, observations,
        },
      });
      if (dossierId !== undefined) {
        await tx.courrierDossier.deleteMany({ where: { courrierId: req.params.id } });
        if (dossierId) await tx.courrierDossier.create({ data: { courrierId: req.params.id, dossierId } });
      }
      return updated;
    });

    const full = await prisma.courrier.findFirst({ where: { id: c.id }, include: INCLUDE_COURRIER });
    ApiResponse.success(res, full, 'Courrier modifié');
  } catch (e: any) { ApiResponse.badRequest(res, e.message); }
});

router.patch('/:id/statut', async (req: AuthRequest, res: Response) => {
  try {
    const existing = await prisma.courrier.findFirst({ where: { id: req.params.id } });
    if (!existing) { ApiResponse.notFound(res); return; }
    const { statut } = req.body;
    if (!statut) { ApiResponse.badRequest(res, 'Statut requis'); return; }

    const data: Prisma.CourrierUpdateInput = { statut };
    if (statut === 'ENVOYE' && !existing.dateEnvoi) data.dateEnvoi = new Date();
    if (statut === 'RECU' && !existing.dateReception) data.dateReception = new Date();

    const c = await prisma.courrier.update({ where: { id: req.params.id }, data, include: INCLUDE_COURRIER });
    ApiResponse.success(res, c, 'Statut du courrier modifié');
  } catch (e: any) { ApiResponse.badRequest(res, e.message); }
});

router.delete('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const existing = await prisma.courrier.findFirst({ where: { id: req.params.id } });
    if (!existing) { ApiResponse.notFound(res); return; }
    if (existing.statut !== 'BROUILLON') {
      ApiResponse.badRequest(res, 'Seuls les courriers en brouillon peuvent être supprimés'); return;
    }
    await prisma.courrier.delete({ where: { id: req.params.id } });
    ApiResponse.success(res, null, 'Courrier supprimé');
  } catch (e: any) { ApiResponse.badRequest(res, e.message); }
});

export default router;

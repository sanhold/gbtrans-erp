import { Router, Response } from 'express';
import { authenticate, requireSociete, authorize } from '../../middleware/auth';
import { AuthRequest } from '../../types';
import { ApiResponse } from '../../utils/apiResponse';
import prisma from '../../config/database';
import { Prisma } from '@prisma/client';

const router = Router();
router.use(authenticate, requireSociete);

const INCLUDE_EMPLOYE = { employe: { select: { id: true, matricule: true, poste: true } } };

router.get('/', authorize('TRANSPORT:LIRE'), async (req: AuthRequest, res: Response) => {
  try {
    const { search, statut, actif } = req.query as Record<string, string>;
    const where: Prisma.ChauffeurWhereInput = {
      societeId: req.user!.societeId,
      ...(statut && { statut: statut as any }),
      ...(actif !== undefined && { actif: actif === 'true' }),
      ...(search && {
        OR: [
          { nom: { contains: search, mode: 'insensitive' as const } },
          { prenom: { contains: search, mode: 'insensitive' as const } },
          { telephone: { contains: search, mode: 'insensitive' as const } },
        ],
      }),
    };
    const chauffeurs = await prisma.chauffeur.findMany({
      where, orderBy: { nom: 'asc' }, include: { ...INCLUDE_EMPLOYE, _count: { select: { courses: true } } },
    });
    ApiResponse.success(res, chauffeurs);
  } catch (e: any) { ApiResponse.error(res, e.message); }
});

router.get('/:id', authorize('TRANSPORT:LIRE'), async (req: AuthRequest, res: Response) => {
  try {
    const chauffeur = await prisma.chauffeur.findFirst({
      where: { id: req.params.id, societeId: req.user!.societeId },
      include: { ...INCLUDE_EMPLOYE, courses: { orderBy: { createdAt: 'desc' }, take: 10, include: { vehicule: { select: { immatriculation: true } } } } },
    });
    if (!chauffeur) { ApiResponse.notFound(res); return; }
    ApiResponse.success(res, chauffeur);
  } catch (e: any) { ApiResponse.error(res, e.message); }
});

router.post('/', authorize('TRANSPORT:CREER'), async (req: AuthRequest, res: Response) => {
  try {
    const societeId = req.user!.societeId;
    const { employeId, nom, prenom, telephone, email, numeroPermis, categoriePermis, dateExpirationPermis, observations } = req.body;
    if (!nom || !prenom) { ApiResponse.badRequest(res, 'Nom et prénom requis'); return; }

    if (employeId) {
      const employe = await prisma.employe.findFirst({ where: { id: employeId, societeId } });
      if (!employe) { ApiResponse.badRequest(res, 'Employé introuvable'); return; }
    }

    const chauffeur = await prisma.chauffeur.create({
      data: {
        societeId, employeId: employeId || null, nom, prenom,
        telephone: telephone || null, email: email || null,
        numeroPermis: numeroPermis || null, categoriePermis: categoriePermis || null,
        dateExpirationPermis: dateExpirationPermis ? new Date(dateExpirationPermis) : null,
        observations: observations || null,
      },
    });
    ApiResponse.created(res, chauffeur, 'Chauffeur ajouté');
  } catch (e: any) { ApiResponse.badRequest(res, e.message); }
});

router.put('/:id', authorize('TRANSPORT:MODIFIER'), async (req: AuthRequest, res: Response) => {
  try {
    const existing = await prisma.chauffeur.findFirst({ where: { id: req.params.id, societeId: req.user!.societeId } });
    if (!existing) { ApiResponse.notFound(res); return; }

    const { employeId, nom, prenom, telephone, email, numeroPermis, categoriePermis, dateExpirationPermis, statut, observations, actif } = req.body;

    if (employeId) {
      const employe = await prisma.employe.findFirst({ where: { id: employeId, societeId: req.user!.societeId } });
      if (!employe) { ApiResponse.badRequest(res, 'Employé introuvable'); return; }
    }

    const chauffeur = await prisma.chauffeur.update({
      where: { id: req.params.id },
      data: {
        ...(employeId !== undefined && { employeId: employeId || null }),
        nom, prenom, telephone, email, numeroPermis, categoriePermis,
        dateExpirationPermis: dateExpirationPermis !== undefined ? (dateExpirationPermis ? new Date(dateExpirationPermis) : null) : undefined,
        ...(statut !== undefined && { statut }),
        observations,
        ...(actif !== undefined && { actif: !!actif }),
      },
    });
    ApiResponse.success(res, chauffeur, 'Chauffeur modifié');
  } catch (e: any) { ApiResponse.badRequest(res, e.message); }
});

router.delete('/:id', authorize('TRANSPORT:SUPPRIMER'), async (req: AuthRequest, res: Response) => {
  try {
    const existing = await prisma.chauffeur.findFirst({ where: { id: req.params.id, societeId: req.user!.societeId }, include: { _count: { select: { courses: true } } } });
    if (!existing) { ApiResponse.notFound(res); return; }
    if (existing._count.courses > 0) { ApiResponse.badRequest(res, `Ce chauffeur est lié à ${existing._count.courses} course(s). Désactivez-le plutôt.`); return; }
    await prisma.chauffeur.delete({ where: { id: req.params.id } });
    ApiResponse.success(res, null, 'Chauffeur supprimé');
  } catch (e: any) { ApiResponse.badRequest(res, e.message); }
});

export default router;

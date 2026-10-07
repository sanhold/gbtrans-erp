import { Router, Response } from 'express';
import { authenticate, requireSociete, authorize } from '../../middleware/auth';
import { AuthRequest } from '../../types';
import { ApiResponse } from '../../utils/apiResponse';
import prisma from '../../config/database';
import { Prisma } from '@prisma/client';

const router = Router();
router.use(authenticate, requireSociete);

router.get('/', authorize('TRANSPORT:LIRE'), async (req: AuthRequest, res: Response) => {
  try {
    const { search, statut, type, actif } = req.query as Record<string, string>;
    const where: Prisma.VehiculeWhereInput = {
      societeId: req.user!.societeId,
      ...(statut && { statut: statut as any }),
      ...(type && { type: type as any }),
      ...(actif !== undefined && { actif: actif === 'true' }),
      ...(search && {
        OR: [
          { immatriculation: { contains: search, mode: 'insensitive' as const } },
          { marque: { contains: search, mode: 'insensitive' as const } },
          { modele: { contains: search, mode: 'insensitive' as const } },
        ],
      }),
    };
    const vehicules = await prisma.vehicule.findMany({
      where, orderBy: { immatriculation: 'asc' },
      include: { _count: { select: { courses: true, maintenances: true } } },
    });
    ApiResponse.success(res, vehicules);
  } catch (e: any) { ApiResponse.error(res, e.message); }
});

router.get('/:id', authorize('TRANSPORT:LIRE'), async (req: AuthRequest, res: Response) => {
  try {
    const vehicule = await prisma.vehicule.findFirst({
      where: { id: req.params.id, societeId: req.user!.societeId },
      include: {
        courses: { orderBy: { createdAt: 'desc' }, take: 10, include: { chauffeur: { select: { nom: true, prenom: true } } } },
        maintenances: { orderBy: { date: 'desc' }, take: 10 },
      },
    });
    if (!vehicule) { ApiResponse.notFound(res); return; }
    ApiResponse.success(res, vehicule);
  } catch (e: any) { ApiResponse.error(res, e.message); }
});

router.post('/', authorize('TRANSPORT:CREER'), async (req: AuthRequest, res: Response) => {
  try {
    const societeId = req.user!.societeId;
    const {
      immatriculation, marque, modele, type, capaciteChargeKg, capaciteVolumeM3,
      numeroAssurance, compagnieAssurance, dateExpirationAssurance, dateExpirationVisiteTechnique,
      kilometrage, observations,
    } = req.body;
    if (!immatriculation) { ApiResponse.badRequest(res, 'Immatriculation requise'); return; }

    const existant = await prisma.vehicule.findFirst({ where: { societeId, immatriculation } });
    if (existant) { ApiResponse.badRequest(res, 'Un véhicule avec cette immatriculation existe déjà'); return; }

    const vehicule = await prisma.vehicule.create({
      data: {
        societeId, immatriculation, marque: marque || null, modele: modele || null, type: type || 'CAMION',
        capaciteChargeKg: capaciteChargeKg != null ? Number(capaciteChargeKg) : null,
        capaciteVolumeM3: capaciteVolumeM3 != null ? Number(capaciteVolumeM3) : null,
        numeroAssurance: numeroAssurance || null, compagnieAssurance: compagnieAssurance || null,
        dateExpirationAssurance: dateExpirationAssurance ? new Date(dateExpirationAssurance) : null,
        dateExpirationVisiteTechnique: dateExpirationVisiteTechnique ? new Date(dateExpirationVisiteTechnique) : null,
        kilometrage: kilometrage != null ? parseInt(kilometrage) : null,
        observations: observations || null,
      },
    });
    ApiResponse.created(res, vehicule, 'Véhicule ajouté');
  } catch (e: any) { ApiResponse.badRequest(res, e.message); }
});

router.put('/:id', authorize('TRANSPORT:MODIFIER'), async (req: AuthRequest, res: Response) => {
  try {
    const existing = await prisma.vehicule.findFirst({ where: { id: req.params.id, societeId: req.user!.societeId } });
    if (!existing) { ApiResponse.notFound(res); return; }

    const {
      immatriculation, marque, modele, type, capaciteChargeKg, capaciteVolumeM3, statut,
      numeroAssurance, compagnieAssurance, dateExpirationAssurance, dateExpirationVisiteTechnique,
      kilometrage, observations, actif,
    } = req.body;

    if (immatriculation && immatriculation !== existing.immatriculation) {
      const doublon = await prisma.vehicule.findFirst({ where: { societeId: req.user!.societeId, immatriculation, id: { not: existing.id } } });
      if (doublon) { ApiResponse.badRequest(res, 'Un véhicule avec cette immatriculation existe déjà'); return; }
    }

    const vehicule = await prisma.vehicule.update({
      where: { id: req.params.id },
      data: {
        ...(immatriculation !== undefined && { immatriculation }),
        marque, modele,
        ...(type !== undefined && { type }),
        capaciteChargeKg: capaciteChargeKg != null ? Number(capaciteChargeKg) : undefined,
        capaciteVolumeM3: capaciteVolumeM3 != null ? Number(capaciteVolumeM3) : undefined,
        ...(statut !== undefined && { statut }),
        numeroAssurance, compagnieAssurance,
        dateExpirationAssurance: dateExpirationAssurance !== undefined ? (dateExpirationAssurance ? new Date(dateExpirationAssurance) : null) : undefined,
        dateExpirationVisiteTechnique: dateExpirationVisiteTechnique !== undefined ? (dateExpirationVisiteTechnique ? new Date(dateExpirationVisiteTechnique) : null) : undefined,
        kilometrage: kilometrage != null ? parseInt(kilometrage) : undefined,
        observations,
        ...(actif !== undefined && { actif: !!actif }),
      },
    });
    ApiResponse.success(res, vehicule, 'Véhicule modifié');
  } catch (e: any) { ApiResponse.badRequest(res, e.message); }
});

router.delete('/:id', authorize('TRANSPORT:SUPPRIMER'), async (req: AuthRequest, res: Response) => {
  try {
    const existing = await prisma.vehicule.findFirst({ where: { id: req.params.id, societeId: req.user!.societeId }, include: { _count: { select: { courses: true } } } });
    if (!existing) { ApiResponse.notFound(res); return; }
    if (existing._count.courses > 0) { ApiResponse.badRequest(res, `Ce véhicule est lié à ${existing._count.courses} course(s). Désactivez-le plutôt.`); return; }
    await prisma.vehicule.delete({ where: { id: req.params.id } });
    ApiResponse.success(res, null, 'Véhicule supprimé');
  } catch (e: any) { ApiResponse.badRequest(res, e.message); }
});

export default router;

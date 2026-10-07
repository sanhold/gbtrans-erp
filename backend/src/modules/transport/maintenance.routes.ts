import { Router, Response } from 'express';
import { authenticate, requireSociete, authorize } from '../../middleware/auth';
import { AuthRequest } from '../../types';
import { ApiResponse } from '../../utils/apiResponse';
import prisma from '../../config/database';
import { Prisma } from '@prisma/client';

const router = Router();
router.use(authenticate, requireSociete);

const INCLUDE_VEHICULE = { vehicule: { select: { id: true, immatriculation: true, marque: true, modele: true } } };

router.get('/', authorize('TRANSPORT:LIRE'), async (req: AuthRequest, res: Response) => {
  try {
    const { vehiculeId, type } = req.query as Record<string, string>;
    const where: Prisma.MaintenanceVehiculeWhereInput = {
      societeId: req.user!.societeId,
      ...(vehiculeId && { vehiculeId }),
      ...(type && { type: type as any }),
    };
    const maintenances = await prisma.maintenanceVehicule.findMany({ where, orderBy: { date: 'desc' }, include: INCLUDE_VEHICULE });
    ApiResponse.success(res, maintenances);
  } catch (e: any) { ApiResponse.error(res, e.message); }
});

// Vehicules dont une echeance (assurance, visite technique, ou rappel de maintenance) approche ou est depassee.
router.get('/alertes', authorize('TRANSPORT:LIRE'), async (req: AuthRequest, res: Response) => {
  try {
    const societeId = req.user!.societeId;
    const dans30jours = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    const [vehiculesAssurance, vehiculesVisite, maintenancesRappel] = await Promise.all([
      prisma.vehicule.findMany({ where: { societeId, actif: true, dateExpirationAssurance: { lte: dans30jours } }, select: { id: true, immatriculation: true, dateExpirationAssurance: true } }),
      prisma.vehicule.findMany({ where: { societeId, actif: true, dateExpirationVisiteTechnique: { lte: dans30jours } }, select: { id: true, immatriculation: true, dateExpirationVisiteTechnique: true } }),
      prisma.maintenanceVehicule.findMany({ where: { societeId, prochaineDateRappel: { lte: dans30jours } }, include: INCLUDE_VEHICULE, orderBy: { prochaineDateRappel: 'asc' } }),
    ]);

    ApiResponse.success(res, { vehiculesAssurance, vehiculesVisite, maintenancesRappel });
  } catch (e: any) { ApiResponse.error(res, e.message); }
});

router.post('/', authorize('TRANSPORT:CREER'), async (req: AuthRequest, res: Response) => {
  try {
    const societeId = req.user!.societeId;
    const { vehiculeId, type, date, kilometrage, cout, prestataire, description, prochaineDateRappel, observations } = req.body;
    if (!vehiculeId || !type || !date) { ApiResponse.badRequest(res, 'Véhicule, type et date requis'); return; }

    const vehicule = await prisma.vehicule.findFirst({ where: { id: vehiculeId, societeId } });
    if (!vehicule) { ApiResponse.badRequest(res, 'Véhicule introuvable'); return; }

    const maintenance = await prisma.$transaction(async (tx) => {
      const m = await tx.maintenanceVehicule.create({
        data: {
          societeId, vehiculeId, type, date: new Date(date),
          kilometrage: kilometrage != null ? parseInt(kilometrage) : null,
          cout: cout != null ? Number(cout) : null,
          prestataire: prestataire || null, description: description || null,
          prochaineDateRappel: prochaineDateRappel ? new Date(prochaineDateRappel) : null,
          observations: observations || null,
        },
        include: INCLUDE_VEHICULE,
      });
      if (kilometrage != null) {
        await tx.vehicule.update({ where: { id: vehiculeId }, data: { kilometrage: parseInt(kilometrage) } });
      }
      if (type === 'ASSURANCE' && prochaineDateRappel) {
        await tx.vehicule.update({ where: { id: vehiculeId }, data: { dateExpirationAssurance: new Date(prochaineDateRappel) } });
      }
      if (type === 'VISITE_TECHNIQUE' && prochaineDateRappel) {
        await tx.vehicule.update({ where: { id: vehiculeId }, data: { dateExpirationVisiteTechnique: new Date(prochaineDateRappel) } });
      }
      return m;
    });
    ApiResponse.created(res, maintenance, 'Maintenance enregistrée');
  } catch (e: any) { ApiResponse.badRequest(res, e.message); }
});

router.put('/:id', authorize('TRANSPORT:MODIFIER'), async (req: AuthRequest, res: Response) => {
  try {
    const existing = await prisma.maintenanceVehicule.findFirst({ where: { id: req.params.id, societeId: req.user!.societeId } });
    if (!existing) { ApiResponse.notFound(res); return; }

    const { type, date, kilometrage, cout, prestataire, description, prochaineDateRappel, observations } = req.body;
    const maintenance = await prisma.maintenanceVehicule.update({
      where: { id: req.params.id },
      data: {
        type, date: date ? new Date(date) : undefined,
        kilometrage: kilometrage != null ? parseInt(kilometrage) : undefined,
        cout: cout != null ? Number(cout) : undefined,
        prestataire, description,
        prochaineDateRappel: prochaineDateRappel !== undefined ? (prochaineDateRappel ? new Date(prochaineDateRappel) : null) : undefined,
        observations,
      },
      include: INCLUDE_VEHICULE,
    });
    ApiResponse.success(res, maintenance, 'Maintenance modifiée');
  } catch (e: any) { ApiResponse.badRequest(res, e.message); }
});

router.delete('/:id', authorize('TRANSPORT:SUPPRIMER'), async (req: AuthRequest, res: Response) => {
  try {
    const existing = await prisma.maintenanceVehicule.findFirst({ where: { id: req.params.id, societeId: req.user!.societeId } });
    if (!existing) { ApiResponse.notFound(res); return; }
    await prisma.maintenanceVehicule.delete({ where: { id: req.params.id } });
    ApiResponse.success(res, null, 'Maintenance supprimée');
  } catch (e: any) { ApiResponse.badRequest(res, e.message); }
});

export default router;

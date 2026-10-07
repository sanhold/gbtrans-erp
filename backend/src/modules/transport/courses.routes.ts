import { Router, Response } from 'express';
import { authenticate, requireSociete, authorize } from '../../middleware/auth';
import { AuthRequest } from '../../types';
import { ApiResponse } from '../../utils/apiResponse';
import prisma from '../../config/database';
import { genererNumero } from '../../utils/numerotation';
import { Prisma } from '@prisma/client';

const router = Router();
router.use(authenticate, requireSociete);

const INCLUDE_COURSE = {
  vehicule: { select: { id: true, immatriculation: true, marque: true, modele: true } },
  chauffeur: { select: { id: true, nom: true, prenom: true, telephone: true } },
  dossier: { select: { id: true, numero: true, numeroPhysique: true } },
};

router.get('/', authorize('TRANSPORT:LIRE'), async (req: AuthRequest, res: Response) => {
  try {
    const { page = '1', limit = '20', search, statut, vehiculeId, chauffeurId, dossierId } = req.query as Record<string, string>;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const where: Prisma.CourseWhereInput = {
      societeId: req.user!.societeId,
      ...(statut && { statut: statut as any }),
      ...(vehiculeId && { vehiculeId }),
      ...(chauffeurId && { chauffeurId }),
      ...(dossierId && { dossierId }),
      ...(search && {
        OR: [
          { numero: { contains: search, mode: 'insensitive' as const } },
          { origine: { contains: search, mode: 'insensitive' as const } },
          { destination: { contains: search, mode: 'insensitive' as const } },
        ],
      }),
    };
    const [data, total] = await Promise.all([
      prisma.course.findMany({ where, skip, take: parseInt(limit), orderBy: { createdAt: 'desc' }, include: INCLUDE_COURSE }),
      prisma.course.count({ where }),
    ]);
    ApiResponse.paginated(res, data, total, parseInt(page), parseInt(limit));
  } catch (e: any) { ApiResponse.error(res, e.message); }
});

router.get('/:id', authorize('TRANSPORT:LIRE'), async (req: AuthRequest, res: Response) => {
  try {
    const course = await prisma.course.findFirst({
      where: { id: req.params.id, societeId: req.user!.societeId },
      include: { ...INCLUDE_COURSE, historique: { orderBy: { createdAt: 'desc' } } },
    });
    if (!course) { ApiResponse.notFound(res); return; }
    ApiResponse.success(res, course);
  } catch (e: any) { ApiResponse.error(res, e.message); }
});

router.post('/', authorize('TRANSPORT:CREER'), async (req: AuthRequest, res: Response) => {
  try {
    const societeId = req.user!.societeId;
    const {
      vehiculeId, chauffeurId, dossierId, origine, destination, designationMarchandise,
      poidsChargeKg, distanceKm, dateDepartPrevue, dateArriveePrevue, observations,
    } = req.body;

    if (!vehiculeId || !chauffeurId || !origine || !destination) {
      ApiResponse.badRequest(res, 'Véhicule, chauffeur, origine et destination sont requis'); return;
    }

    const [vehicule, chauffeur] = await Promise.all([
      prisma.vehicule.findFirst({ where: { id: vehiculeId, societeId } }),
      prisma.chauffeur.findFirst({ where: { id: chauffeurId, societeId } }),
    ]);
    if (!vehicule) { ApiResponse.badRequest(res, 'Véhicule introuvable'); return; }
    if (!chauffeur) { ApiResponse.badRequest(res, 'Chauffeur introuvable'); return; }

    if (dossierId) {
      const dossier = await prisma.dossier.findFirst({ where: { id: dossierId, societeId } });
      if (!dossier) { ApiResponse.badRequest(res, 'Dossier introuvable'); return; }
    }

    const numero = await genererNumero(societeId, 'COURSE');

    const course = await prisma.course.create({
      data: {
        societeId, numero, vehiculeId, chauffeurId, dossierId: dossierId || null,
        origine, destination, designationMarchandise: designationMarchandise || null,
        poidsChargeKg: poidsChargeKg != null ? Number(poidsChargeKg) : null,
        distanceKm: distanceKm != null ? Number(distanceKm) : null,
        dateDepartPrevue: dateDepartPrevue ? new Date(dateDepartPrevue) : null,
        dateArriveePrevue: dateArriveePrevue ? new Date(dateArriveePrevue) : null,
        observations: observations || null,
        historique: { create: { statutApres: 'PLANIFIEE', utilisateur: `${req.user!.prenom} ${req.user!.nom}` } },
      },
      include: INCLUDE_COURSE,
    });
    ApiResponse.created(res, course, `Course ${numero} créée`);
  } catch (e: any) { ApiResponse.badRequest(res, e.message); }
});

router.put('/:id', authorize('TRANSPORT:MODIFIER'), async (req: AuthRequest, res: Response) => {
  try {
    const existing = await prisma.course.findFirst({ where: { id: req.params.id, societeId: req.user!.societeId } });
    if (!existing) { ApiResponse.notFound(res); return; }
    if (existing.statut === 'TERMINEE' || existing.statut === 'ANNULEE') {
      ApiResponse.badRequest(res, 'Cette course est clôturée et ne peut plus être modifiée'); return;
    }

    const {
      vehiculeId, chauffeurId, dossierId, origine, destination, designationMarchandise,
      poidsChargeKg, distanceKm, dateDepartPrevue, dateArriveePrevue,
      fraisCarburant, fraisPeage, autresFrais, observations,
    } = req.body;

    if (vehiculeId) {
      const vehicule = await prisma.vehicule.findFirst({ where: { id: vehiculeId, societeId: req.user!.societeId } });
      if (!vehicule) { ApiResponse.badRequest(res, 'Véhicule introuvable'); return; }
    }
    if (chauffeurId) {
      const chauffeur = await prisma.chauffeur.findFirst({ where: { id: chauffeurId, societeId: req.user!.societeId } });
      if (!chauffeur) { ApiResponse.badRequest(res, 'Chauffeur introuvable'); return; }
    }
    if (dossierId) {
      const dossier = await prisma.dossier.findFirst({ where: { id: dossierId, societeId: req.user!.societeId } });
      if (!dossier) { ApiResponse.badRequest(res, 'Dossier introuvable'); return; }
    }

    const course = await prisma.course.update({
      where: { id: req.params.id },
      data: {
        vehiculeId, chauffeurId,
        ...(dossierId !== undefined && { dossierId: dossierId || null }),
        origine, destination, designationMarchandise,
        poidsChargeKg: poidsChargeKg != null ? Number(poidsChargeKg) : undefined,
        distanceKm: distanceKm != null ? Number(distanceKm) : undefined,
        dateDepartPrevue: dateDepartPrevue !== undefined ? (dateDepartPrevue ? new Date(dateDepartPrevue) : null) : undefined,
        dateArriveePrevue: dateArriveePrevue !== undefined ? (dateArriveePrevue ? new Date(dateArriveePrevue) : null) : undefined,
        fraisCarburant: fraisCarburant != null ? Number(fraisCarburant) : undefined,
        fraisPeage: fraisPeage != null ? Number(fraisPeage) : undefined,
        autresFrais: autresFrais != null ? Number(autresFrais) : undefined,
        observations,
      },
      include: INCLUDE_COURSE,
    });
    ApiResponse.success(res, course, 'Course modifiée');
  } catch (e: any) { ApiResponse.badRequest(res, e.message); }
});

const TRANSITIONS_VALIDES: Record<string, string[]> = {
  PLANIFIEE: ['EN_COURS', 'ANNULEE'],
  EN_COURS: ['TERMINEE', 'ANNULEE'],
  TERMINEE: [],
  ANNULEE: [],
};

router.patch('/:id/statut', authorize('TRANSPORT:MODIFIER'), async (req: AuthRequest, res: Response) => {
  try {
    const existing = await prisma.course.findFirst({ where: { id: req.params.id, societeId: req.user!.societeId } });
    if (!existing) { ApiResponse.notFound(res); return; }

    const { statut, commentaire } = req.body as { statut?: string; commentaire?: string };
    if (!statut) { ApiResponse.badRequest(res, 'Statut requis'); return; }
    if (!TRANSITIONS_VALIDES[existing.statut]?.includes(statut)) {
      ApiResponse.badRequest(res, `Impossible de passer de ${existing.statut} à ${statut}`); return;
    }

    const utilisateur = `${req.user!.prenom} ${req.user!.nom}`;
    const data: Prisma.CourseUpdateInput = { statut: statut as any };
    if (statut === 'EN_COURS' && !existing.dateDepartReelle) data.dateDepartReelle = new Date();
    if (statut === 'TERMINEE' && !existing.dateArriveeReelle) data.dateArriveeReelle = new Date();

    const course = await prisma.$transaction(async (tx) => {
      const updated = await tx.course.update({
        where: { id: req.params.id }, data, include: INCLUDE_COURSE,
      });
      await tx.historiqueCourse.create({
        data: { courseId: existing.id, statutAvant: existing.statut, statutApres: statut, commentaire: commentaire || null, utilisateur },
      });
      if (statut === 'EN_COURS') {
        await tx.vehicule.update({ where: { id: existing.vehiculeId }, data: { statut: 'EN_COURSE' } });
        await tx.chauffeur.update({ where: { id: existing.chauffeurId }, data: { statut: 'EN_COURSE' } });
      } else if (statut === 'TERMINEE' || statut === 'ANNULEE') {
        await tx.vehicule.update({ where: { id: existing.vehiculeId }, data: { statut: 'DISPONIBLE' } });
        await tx.chauffeur.update({ where: { id: existing.chauffeurId }, data: { statut: 'DISPONIBLE' } });
      }
      return updated;
    });

    ApiResponse.success(res, course, 'Statut de la course mis à jour');
  } catch (e: any) { ApiResponse.badRequest(res, e.message); }
});

router.delete('/:id', authorize('TRANSPORT:SUPPRIMER'), async (req: AuthRequest, res: Response) => {
  try {
    const existing = await prisma.course.findFirst({ where: { id: req.params.id, societeId: req.user!.societeId } });
    if (!existing) { ApiResponse.notFound(res); return; }
    if (existing.statut !== 'PLANIFIEE') { ApiResponse.badRequest(res, 'Seule une course encore planifiée peut être supprimée'); return; }
    await prisma.course.delete({ where: { id: req.params.id } });
    ApiResponse.success(res, null, 'Course supprimée');
  } catch (e: any) { ApiResponse.badRequest(res, e.message); }
});

export default router;

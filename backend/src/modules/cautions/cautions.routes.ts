import { Router, Response } from 'express';
import { authenticate, requireSociete } from '../../middleware/auth';
import { AuthRequest } from '../../types';
import { ApiResponse } from '../../utils/apiResponse';
import prisma from '../../config/database';
import { Prisma } from '@prisma/client';

const router = Router();
router.use(authenticate, requireSociete);

const INCLUDE_CAUTION = {
  dossier: { select: { id: true, numero: true, numeroPhysique: true } },
  client: { select: { id: true, code: true, raisonSociale: true } },
};

router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const {
      page = '1', limit = '20', dossierId, clientId, compagnie, numeroBL,
      etat, courrier, dateDebut, dateFin,
    } = req.query;
    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);

    const where: Prisma.CautionWhereInput = {
      societeId: req.user!.societeId,
      ...(dossierId && { dossierId: dossierId as string }),
      ...(clientId && { clientId: clientId as string }),
      ...(compagnie && { compagnie: { contains: compagnie as string, mode: 'insensitive' as const } }),
      ...(numeroBL && { numeroBL: { contains: numeroBL as string, mode: 'insensitive' as const } }),
    };

    // Vue par défaut : cautions actives (non activées + en attente + courrier déposé), payées exclues (-> historique).
    if (etat === 'PAYEE') where.statut = 'PAYEE';
    else if (etat === 'NON_ACTIVE' || etat === 'EN_ATTENTE' || etat === 'COURRIER_DEPOSE') where.statut = etat;
    else if (etat !== 'TOUS') where.statut = { not: 'PAYEE' };

    if (courrier === 'DEPOSE') where.dateDepotCourrier = { not: null };
    else if (courrier === 'NON_DEPOSE') where.dateDepotCourrier = null;

    if (dateDebut || dateFin) {
      where.dateCaution = {
        ...(dateDebut && { gte: new Date(dateDebut as string) }),
        ...(dateFin && { lte: new Date(`${dateFin}T23:59:59.999Z`) }),
      };
    }

    const [data, total] = await Promise.all([
      prisma.caution.findMany({
        where, skip, take: parseInt(limit as string),
        orderBy: { numero: 'desc' },
        include: INCLUDE_CAUTION,
      }),
      prisma.caution.count({ where }),
    ]);

    ApiResponse.paginated(res, data, total, parseInt(page as string), parseInt(limit as string));
  } catch (e: any) { ApiResponse.error(res, e.message); }
});

router.get('/stats', async (req: AuthRequest, res: Response) => {
  try {
    const societeId = req.user!.societeId;
    const [nonActive, enAttente, courrierDepose, payees] = await Promise.all([
      prisma.caution.count({ where: { societeId, statut: 'NON_ACTIVE' } }),
      prisma.caution.count({ where: { societeId, statut: 'EN_ATTENTE' } }),
      prisma.caution.count({ where: { societeId, statut: 'COURRIER_DEPOSE' } }),
      prisma.caution.count({ where: { societeId, statut: 'PAYEE' } }),
    ]);
    ApiResponse.success(res, { nonActive, enAttente, courrierNonDepose: enAttente, courrierDepose, payees });
  } catch (e: any) { ApiResponse.error(res, e.message); }
});

router.post('/', async (req: AuthRequest, res: Response) => {
  try {
    const societeId = req.user!.societeId;
    const { dateCaution, dossierId, numeroBL, clientId, quantite, montant, compagnie, observations } = req.body;

    if (montant == null || montant === '') { ApiResponse.badRequest(res, 'Montant de la caution requis'); return; }

    const c = await prisma.caution.create({
      data: {
        societeId,
        dateCaution: dateCaution ? new Date(dateCaution) : null,
        dossierId: dossierId || null,
        numeroBL: numeroBL || null,
        clientId: clientId || null,
        quantite: quantite != null ? Number(quantite) : 1,
        montant: Number(montant),
        compagnie: compagnie || null,
        observations: observations || null,
        statut: 'EN_ATTENTE',
      },
      include: INCLUDE_CAUTION,
    });
    ApiResponse.created(res, c, 'Caution créée');
  } catch (e: any) { ApiResponse.badRequest(res, e.message); }
});

router.put('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const existing = await prisma.caution.findFirst({ where: { id: req.params.id, societeId: req.user!.societeId } });
    if (!existing) { ApiResponse.notFound(res); return; }

    const { dateCaution, dossierId, numeroBL, clientId, quantite, montant, compagnie, observations } = req.body;

    const c = await prisma.caution.update({
      where: { id: req.params.id },
      data: {
        dateCaution: dateCaution !== undefined ? (dateCaution ? new Date(dateCaution) : null) : undefined,
        dossierId: dossierId !== undefined ? (dossierId || null) : undefined,
        numeroBL, clientId: clientId !== undefined ? (clientId || null) : undefined,
        quantite: quantite != null ? Number(quantite) : undefined,
        montant: montant != null ? Number(montant) : undefined,
        compagnie, observations,
      },
      include: INCLUDE_CAUTION,
    });
    ApiResponse.success(res, c, 'Caution modifiée');
  } catch (e: any) { ApiResponse.badRequest(res, e.message); }
});

router.patch('/:id/activer', async (req: AuthRequest, res: Response) => {
  try {
    const existing = await prisma.caution.findFirst({ where: { id: req.params.id, societeId: req.user!.societeId } });
    if (!existing) { ApiResponse.notFound(res); return; }
    if (existing.statut === 'PAYEE') { ApiResponse.badRequest(res, 'Cette caution est déjà payée'); return; }
    const statut = existing.dateDepotCourrier ? 'COURRIER_DEPOSE' : 'EN_ATTENTE';
    const c = await prisma.caution.update({ where: { id: req.params.id }, data: { statut }, include: INCLUDE_CAUTION });
    ApiResponse.success(res, c, 'Caution activée');
  } catch (e: any) { ApiResponse.badRequest(res, e.message); }
});

router.patch('/:id/desactiver', async (req: AuthRequest, res: Response) => {
  try {
    const existing = await prisma.caution.findFirst({ where: { id: req.params.id, societeId: req.user!.societeId } });
    if (!existing) { ApiResponse.notFound(res); return; }
    if (existing.statut === 'PAYEE') { ApiResponse.badRequest(res, 'Cette caution est déjà payée'); return; }
    const c = await prisma.caution.update({ where: { id: req.params.id }, data: { statut: 'NON_ACTIVE' }, include: INCLUDE_CAUTION });
    ApiResponse.success(res, c, 'Caution désactivée');
  } catch (e: any) { ApiResponse.badRequest(res, e.message); }
});

router.patch('/:id/courrier', async (req: AuthRequest, res: Response) => {
  try {
    const existing = await prisma.caution.findFirst({ where: { id: req.params.id, societeId: req.user!.societeId } });
    if (!existing) { ApiResponse.notFound(res); return; }
    if (existing.statut === 'PAYEE') { ApiResponse.badRequest(res, 'Cette caution est déjà payée'); return; }
    if (existing.statut === 'NON_ACTIVE') { ApiResponse.badRequest(res, 'Activez la caution avant de déposer le courrier'); return; }
    const { dateDepotCourrier } = req.body;
    const c = await prisma.caution.update({
      where: { id: req.params.id },
      data: { statut: 'COURRIER_DEPOSE', dateDepotCourrier: dateDepotCourrier ? new Date(dateDepotCourrier) : new Date() },
      include: INCLUDE_CAUTION,
    });
    ApiResponse.success(res, c, 'Courrier marqué comme déposé');
  } catch (e: any) { ApiResponse.badRequest(res, e.message); }
});

router.patch('/:id/annuler-courrier', async (req: AuthRequest, res: Response) => {
  try {
    const existing = await prisma.caution.findFirst({ where: { id: req.params.id, societeId: req.user!.societeId } });
    if (!existing) { ApiResponse.notFound(res); return; }
    if (existing.statut === 'PAYEE') { ApiResponse.badRequest(res, 'Cette caution est déjà payée'); return; }
    const c = await prisma.caution.update({
      where: { id: req.params.id },
      data: { statut: 'EN_ATTENTE', dateDepotCourrier: null },
      include: INCLUDE_CAUTION,
    });
    ApiResponse.success(res, c, 'Dépôt de courrier annulé');
  } catch (e: any) { ApiResponse.badRequest(res, e.message); }
});

router.patch('/:id/payer', async (req: AuthRequest, res: Response) => {
  try {
    const existing = await prisma.caution.findFirst({ where: { id: req.params.id, societeId: req.user!.societeId } });
    if (!existing) { ApiResponse.notFound(res); return; }
    if (existing.statut === 'PAYEE') { ApiResponse.badRequest(res, 'Cette caution est déjà payée'); return; }
    const { datePaiement } = req.body;
    const c = await prisma.caution.update({
      where: { id: req.params.id },
      data: { statut: 'PAYEE', datePaiement: datePaiement ? new Date(datePaiement) : new Date() },
      include: INCLUDE_CAUTION,
    });
    ApiResponse.success(res, c, 'Caution payée — déplacée en historique');
  } catch (e: any) { ApiResponse.badRequest(res, e.message); }
});

router.delete('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const existing = await prisma.caution.findFirst({ where: { id: req.params.id, societeId: req.user!.societeId } });
    if (!existing) { ApiResponse.notFound(res); return; }
    if (existing.statut === 'COURRIER_DEPOSE' || existing.statut === 'PAYEE') {
      ApiResponse.badRequest(res, 'Le courrier a déjà été déposé pour cette caution, elle ne peut plus être supprimée'); return;
    }
    await prisma.caution.delete({ where: { id: req.params.id } });
    ApiResponse.success(res, null, 'Caution supprimée');
  } catch (e: any) { ApiResponse.badRequest(res, e.message); }
});

export default router;

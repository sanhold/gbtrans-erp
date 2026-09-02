import { Router, Response } from 'express';
import { authenticate, requireSociete } from '../../middleware/auth';
import { AuthRequest } from '../../types';
import { ApiResponse } from '../../utils/apiResponse';
import prisma from '../../config/database';
import { genererNumero } from '../../utils/numerotation';

const router = Router();
router.use(authenticate, requireSociete);

router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const { page = '1', limit = '20', search, statut, clientId, dossierId } = req.query;
    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
    const where: any = {
      client: { societeId: req.user!.societeId },
      ...(statut && { statut }),
      ...(clientId && { clientId }),
      ...(dossierId && { dossierId }),
      ...(search && {
        OR: [
          { numero: { contains: search as string, mode: 'insensitive' } },
          { objet: { contains: search as string, mode: 'insensitive' } },
          { client: { raisonSociale: { contains: search as string, mode: 'insensitive' } } },
        ],
      }),
    };
    const [data, total] = await Promise.all([
      prisma.offreCommerciale.findMany({
        where, skip, take: parseInt(limit as string),
        orderBy: { dateOffre: 'desc' },
        include: {
          client: { select: { id: true, code: true, raisonSociale: true } },
          dossier: { select: { id: true, numero: true } },
          _count: { select: { lignes: true } },
        },
      }),
      prisma.offreCommerciale.count({ where }),
    ]);
    ApiResponse.paginated(res, data, total, parseInt(page as string), parseInt(limit as string));
  } catch (e: any) { ApiResponse.error(res, e.message); }
});

router.get('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const o = await prisma.offreCommerciale.findFirst({
      where: { id: req.params.id, client: { societeId: req.user!.societeId } },
      include: {
        client: true,
        dossier: { select: { id: true, numero: true, designation: true } },
        lignes: { orderBy: { ordre: 'asc' } },
      },
    });
    if (!o) { ApiResponse.notFound(res); return; }
    ApiResponse.success(res, o);
  } catch (e: any) { ApiResponse.error(res, e.message); }
});

router.post('/', async (req: AuthRequest, res: Response) => {
  try {
    const { clientId, dossierId, objet, description, conditions, observations, dateValidite, lignes } = req.body;
    if (!clientId) { ApiResponse.badRequest(res, 'Le client est obligatoire'); return; }
    if (!objet) { ApiResponse.badRequest(res, "L'objet est obligatoire"); return; }

    const client = await prisma.client.findFirst({ where: { id: clientId, societeId: req.user!.societeId } });
    if (!client) { ApiResponse.notFound(res, 'Client introuvable'); return; }

    const numero = await genererNumero(req.user!.societeId, 'OFFRE');

    let montantHT = 0, montantTVA = 0;
    const lignesData = (lignes || []).map((l: any, i: number) => {
      const quantite = parseFloat(l.quantite) || 1;
      const prixUnitaire = parseFloat(l.prixUnitaire) || 0;
      const ht = quantite * prixUnitaire;
      const tauxTVA = l.tauxTVA != null ? parseFloat(l.tauxTVA) : 18;
      const tva = ht * (tauxTVA / 100);
      montantHT += ht; montantTVA += tva;
      return {
        ordre: i + 1, designation: l.designation, quantite, unite: l.unite || 'FORFAIT',
        prixUnitaire, montantHT: ht, tauxTVA, montantTVA: tva, remise: 0,
      };
    });

    const offre = await prisma.offreCommerciale.create({
      data: {
        numero, clientId, dossierId: dossierId || null, objet, description, conditions, observations,
        dateValidite: dateValidite ? new Date(dateValidite) : new Date(Date.now() + 30 * 86400000),
        montantHT, montantTVA, montantTTC: montantHT + montantTVA,
        lignes: { create: lignesData },
      },
      include: { lignes: { orderBy: { ordre: 'asc' } }, client: { select: { raisonSociale: true } } },
    });
    ApiResponse.created(res, offre, `Offre ${numero} créée`);
  } catch (e: any) { ApiResponse.badRequest(res, e.message); }
});

router.put('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const existing = await prisma.offreCommerciale.findFirst({ where: { id: req.params.id, client: { societeId: req.user!.societeId } } });
    if (!existing) { ApiResponse.notFound(res); return; }

    const { objet, description, conditions, observations, dateValidite, lignes } = req.body;

    if (lignes) await prisma.ligneOffre.deleteMany({ where: { offreId: req.params.id } });

    let montantHT = 0, montantTVA = 0;
    const lignesData = lignes ? lignes.map((l: any, i: number) => {
      const quantite = parseFloat(l.quantite) || 1;
      const prixUnitaire = parseFloat(l.prixUnitaire) || 0;
      const ht = quantite * prixUnitaire;
      const tauxTVA = l.tauxTVA != null ? parseFloat(l.tauxTVA) : 18;
      const tva = ht * (tauxTVA / 100);
      montantHT += ht; montantTVA += tva;
      return { ordre: i + 1, designation: l.designation, quantite, unite: l.unite || 'FORFAIT', prixUnitaire, montantHT: ht, tauxTVA, montantTVA: tva, remise: 0 };
    }) : undefined;

    const offre = await prisma.offreCommerciale.update({
      where: { id: req.params.id },
      data: {
        objet, description, conditions, observations,
        dateValidite: dateValidite ? new Date(dateValidite) : undefined,
        version: { increment: 1 },
        ...(lignes && { montantHT, montantTVA, montantTTC: montantHT + montantTVA }),
        ...(lignesData && { lignes: { create: lignesData } }),
      },
      include: { lignes: { orderBy: { ordre: 'asc' } }, client: true },
    });
    ApiResponse.success(res, offre, 'Offre modifiée');
  } catch (e: any) { ApiResponse.badRequest(res, e.message); }
});

router.patch('/:id/statut', async (req: AuthRequest, res: Response) => {
  try {
    const { statut } = req.body;
    const valides = ['BROUILLON', 'ENVOYEE', 'ACCEPTEE', 'REFUSEE', 'EXPIREE', 'ANNULEE'];
    if (!valides.includes(statut)) { ApiResponse.badRequest(res, 'Statut invalide'); return; }
    const existing = await prisma.offreCommerciale.findFirst({ where: { id: req.params.id, client: { societeId: req.user!.societeId } } });
    if (!existing) { ApiResponse.notFound(res); return; }
    const offre = await prisma.offreCommerciale.update({ where: { id: req.params.id }, data: { statut }, include: { client: true, lignes: true } });
    ApiResponse.success(res, offre, `Statut modifié : ${statut}`);
  } catch (e: any) { ApiResponse.badRequest(res, e.message); }
});

router.post('/:id/transformer-proforma', async (req: AuthRequest, res: Response) => {
  try {
    const offre = await prisma.offreCommerciale.findFirst({
      where: { id: req.params.id, client: { societeId: req.user!.societeId } },
      include: { lignes: { orderBy: { ordre: 'asc' } } },
    });
    if (!offre) { ApiResponse.notFound(res); return; }
    if (offre.proformaId) { ApiResponse.badRequest(res, 'Cette offre a déjà été transformée en proforma'); return; }

    const numero = await genererNumero(req.user!.societeId, 'PROFORMA');
    const proforma = await prisma.proforma.create({
      data: {
        numero, clientId: offre.clientId, dossierId: offre.dossierId,
        dateValidite: new Date(Date.now() + 30 * 86400000),
        objet: offre.objet, titre: offre.objet,
        montantHT: offre.montantHT, montantTVA: offre.montantTVA, montantTTC: offre.montantTTC,
        observations: offre.observations,
        lignes: {
          create: offre.lignes.map(l => ({
            ordre: l.ordre, designation: l.designation, quantite: l.quantite, unite: l.unite,
            prixUnitaire: l.prixUnitaire, montantHT: l.montantHT, tauxTVA: l.tauxTVA, montantTVA: l.montantTVA,
            estTVA: Number(l.tauxTVA) > 0, remise: l.remise,
          })),
        },
      },
      include: { lignes: true, client: { select: { raisonSociale: true } } },
    });
    await prisma.offreCommerciale.update({ where: { id: req.params.id }, data: { proformaId: proforma.id, statut: 'TRANSFORMEE' } });
    ApiResponse.created(res, proforma, `Proforma ${numero} créée à partir de l'offre ${offre.numero}`);
  } catch (e: any) { ApiResponse.badRequest(res, e.message); }
});

router.delete('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const o = await prisma.offreCommerciale.findFirst({ where: { id: req.params.id, client: { societeId: req.user!.societeId } } });
    if (!o) { ApiResponse.notFound(res); return; }
    if (o.proformaId) { ApiResponse.badRequest(res, 'Impossible de supprimer : déjà transformée en proforma'); return; }
    await prisma.offreCommerciale.delete({ where: { id: req.params.id } });
    ApiResponse.success(res, null, 'Offre supprimée');
  } catch (e: any) { ApiResponse.badRequest(res, e.message); }
});

export default router;

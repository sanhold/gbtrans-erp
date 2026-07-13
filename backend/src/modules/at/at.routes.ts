import { Router, Response } from 'express';
import { authenticate, requireSociete } from '../../middleware/auth';
import { AuthRequest } from '../../types';
import { ApiResponse } from '../../utils/apiResponse';
import prisma from '../../config/database';
import { genererNumero } from '../../utils/numerotation';
import { Prisma } from '@prisma/client';

const router = Router();
router.use(authenticate, requireSociete);

const INCLUDE_AT = {
  client: { select: { id: true, code: true, raisonSociale: true } },
  dossiers: { select: { id: true, numero: true } },
};

function withEtat(at: any) {
  const joursRestants = Math.ceil((new Date(at.dateExpiration).getTime() - Date.now()) / 86400000);
  let etat: 'APURE' | 'EXPIRE' | 'NON_APURE' = 'NON_APURE';
  if (at.dateApurement) etat = 'APURE';
  else if (joursRestants < 0) etat = 'EXPIRE';
  return { ...at, joursRestants, etat };
}

router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const { page = '1', limit = '20', search, etat, clientId, dossierId } = req.query;
    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);

    const where: Prisma.AdmissionTemporaireWhereInput = {
      societeId: req.user!.societeId,
      ...(clientId && { clientId: clientId as string }),
      ...(dossierId && { dossiers: { some: { id: dossierId as string } } }),
      ...(search && {
        OR: [
          { numero: { contains: search as string, mode: 'insensitive' as const } },
          { designation: { contains: search as string, mode: 'insensitive' as const } },
          { declarant: { contains: search as string, mode: 'insensitive' as const } },
        ],
      }),
    };
    // Défaut (pas de filtre, ou etat=NON_APURE/EXPIRE) : vue de suivi actif, AT apurées exclues.
    // etat=APURE : historique. etat=TOUS : aucun filtre de statut.
    if (etat === 'APURE') where.statut = 'APUREE';
    else if (etat !== 'TOUS') where.statut = { not: 'APUREE' };

    const [data, total] = await Promise.all([
      prisma.admissionTemporaire.findMany({
        where, skip, take: parseInt(limit as string),
        orderBy: { dateCreation: 'desc' },
        include: INCLUDE_AT,
      }),
      prisma.admissionTemporaire.count({ where }),
    ]);

    let result = data.map(withEtat);
    if (etat === 'EXPIRE') result = result.filter(r => r.etat === 'EXPIRE');
    if (etat === 'NON_APURE') result = result.filter(r => r.etat === 'NON_APURE');

    ApiResponse.paginated(res, result, total, parseInt(page as string), parseInt(limit as string));
  } catch (e: any) { ApiResponse.error(res, e.message); }
});

router.get('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const at = await prisma.admissionTemporaire.findFirst({
      where: { id: req.params.id, societeId: req.user!.societeId },
      include: INCLUDE_AT,
    });
    if (!at) { ApiResponse.notFound(res); return; }
    ApiResponse.success(res, withEtat(at));
  } catch (e: any) { ApiResponse.error(res, e.message); }
});

router.get('/:id/prolongations', async (req: AuthRequest, res: Response) => {
  try {
    const at = await prisma.admissionTemporaire.findFirst({ where: { id: req.params.id, societeId: req.user!.societeId } });
    if (!at) { ApiResponse.notFound(res); return; }
    const prolongations = await prisma.historiqueProlongationAT.findMany({
      where: { admissionTemporaireId: req.params.id },
      orderBy: { dateProlongation: 'desc' },
    });
    ApiResponse.success(res, prolongations);
  } catch (e: any) { ApiResponse.error(res, e.message); }
});

router.post('/', async (req: AuthRequest, res: Response) => {
  try {
    const societeId = req.user!.societeId;
    const {
      clientId, dossierId, declarant, nature, designation,
      dateDeclaration, dateExpiration, delaiMois, alerteJours,
      montantCaution, banqueCaution, referenceCaution, typeGarantie,
      bureauEntree, bureauSortie, declarationEntree, regimeDouanier,
      valeur, quantite, observations,
    } = req.body;

    if (!designation) { ApiResponse.badRequest(res, 'Désignation requise'); return; }
    if (!dateExpiration) { ApiResponse.badRequest(res, 'Date d\'échéance requise'); return; }
    if (!dossierId) { ApiResponse.badRequest(res, 'Une AT doit être rattachée à un dossier'); return; }

    const numero = await genererNumero(societeId, 'AT');
    const delaiMoisNum = delaiMois != null ? Number(delaiMois) : null;

    const at = await prisma.$transaction(async (tx) => {
      const created = await tx.admissionTemporaire.create({
        data: {
          societeId, numero, clientId: clientId || null, declarant: declarant || null,
          nature: nature || null, designation,
          dateDeclaration: dateDeclaration ? new Date(dateDeclaration) : null,
          dateExpiration: new Date(dateExpiration),
          delaiMois: delaiMoisNum,
          dureeInitiale: (delaiMoisNum || 0) * 30,
          alerteJours: alerteJours != null ? Number(alerteJours) : 90,
          montantCaution: montantCaution != null ? Number(montantCaution) : null,
          banqueCaution: banqueCaution || null,
          referenceCaution: referenceCaution || null,
          typeGarantie: typeGarantie || null,
          bureauEntree: bureauEntree || null,
          bureauSortie: bureauSortie || null,
          declarationEntree: declarationEntree || null,
          regimeDouanier: regimeDouanier || null,
          valeur: valeur != null ? Number(valeur) : null,
          quantite: quantite != null ? Number(quantite) : null,
          observations: observations || null,
        },
      });

      if (dossierId) {
        await tx.dossier.update({ where: { id: dossierId }, data: { admissionTemporaireId: created.id } });
      }

      return created;
    });

    const full = await prisma.admissionTemporaire.findFirst({ where: { id: at.id }, include: INCLUDE_AT });
    ApiResponse.created(res, withEtat(full), `AT ${numero} créée`);
  } catch (e: any) { ApiResponse.badRequest(res, e.message); }
});

router.put('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const existing = await prisma.admissionTemporaire.findFirst({ where: { id: req.params.id, societeId: req.user!.societeId } });
    if (!existing) { ApiResponse.notFound(res); return; }

    const {
      clientId, dossierId, declarant, nature, designation,
      dateDeclaration, dateExpiration, delaiMois, alerteJours,
      montantCaution, banqueCaution, referenceCaution, typeGarantie,
      bureauEntree, bureauSortie, declarationEntree, regimeDouanier,
      valeur, quantite, observations,
    } = req.body;

    const delaiMoisNum = delaiMois != null ? Number(delaiMois) : undefined;

    const at = await prisma.$transaction(async (tx) => {
      const updated = await tx.admissionTemporaire.update({
        where: { id: req.params.id },
        data: {
          clientId: clientId !== undefined ? (clientId || null) : undefined,
          declarant, nature, designation,
          dateDeclaration: dateDeclaration !== undefined ? (dateDeclaration ? new Date(dateDeclaration) : null) : undefined,
          dateExpiration: dateExpiration ? new Date(dateExpiration) : undefined,
          delaiMois: delaiMoisNum,
          ...(delaiMoisNum != null && { dureeInitiale: delaiMoisNum * 30 }),
          alerteJours: alerteJours != null ? Number(alerteJours) : undefined,
          montantCaution: montantCaution != null ? Number(montantCaution) : undefined,
          banqueCaution, referenceCaution, typeGarantie,
          bureauEntree, bureauSortie, declarationEntree, regimeDouanier,
          valeur: valeur != null ? Number(valeur) : undefined,
          quantite: quantite != null ? Number(quantite) : undefined,
          observations,
        },
      });

      if (dossierId) {
        await tx.dossier.update({ where: { id: dossierId }, data: { admissionTemporaireId: updated.id } });
      }

      return updated;
    });

    const full = await prisma.admissionTemporaire.findFirst({ where: { id: at.id }, include: INCLUDE_AT });
    ApiResponse.success(res, withEtat(full), 'AT modifiée');
  } catch (e: any) { ApiResponse.badRequest(res, e.message); }
});

router.patch('/:id/apurer', async (req: AuthRequest, res: Response) => {
  try {
    const existing = await prisma.admissionTemporaire.findFirst({ where: { id: req.params.id, societeId: req.user!.societeId } });
    if (!existing) { ApiResponse.notFound(res); return; }
    if (existing.statut === 'APUREE') { ApiResponse.badRequest(res, 'Cette AT est déjà apurée'); return; }

    const { dateApurement, montantApure, referenceApurement } = req.body;
    const at = await prisma.admissionTemporaire.update({
      where: { id: req.params.id },
      data: {
        statut: 'APUREE',
        dateApurement: dateApurement ? new Date(dateApurement) : new Date(),
        montantApure: montantApure != null ? Number(montantApure) : null,
        referenceApurement: referenceApurement || null,
      },
      include: INCLUDE_AT,
    });
    ApiResponse.success(res, withEtat(at), 'AT apurée');
  } catch (e: any) { ApiResponse.badRequest(res, e.message); }
});

router.patch('/:id/prolonger', async (req: AuthRequest, res: Response) => {
  try {
    const existing = await prisma.admissionTemporaire.findFirst({ where: { id: req.params.id, societeId: req.user!.societeId } });
    if (!existing) { ApiResponse.notFound(res); return; }
    if (existing.statut === 'APUREE') { ApiResponse.badRequest(res, 'Cette AT est déjà apurée, elle ne peut plus être prolongée'); return; }

    const { nouvelleDateExpiration, nouveauNumeroDeclaration } = req.body;
    if (!nouvelleDateExpiration || !nouveauNumeroDeclaration) {
      ApiResponse.badRequest(res, 'Nouvelle date d\'échéance et nouveau N° de déclaration requis'); return;
    }

    const dateRenouvellement = new Date();
    const dureeProlongationJours = Math.round((new Date(nouvelleDateExpiration).getTime() - new Date(existing.dateExpiration).getTime()) / 86400000);
    const utilisateur = `${req.user!.prenom} ${req.user!.nom}`;

    const at = await prisma.$transaction(async (tx) => {
      await tx.historiqueProlongationAT.create({
        data: {
          admissionTemporaireId: existing.id,
          dateProlongation: dateRenouvellement,
          ancienneDateExpiration: existing.dateExpiration,
          nouvelleDateExpiration: new Date(nouvelleDateExpiration),
          ancienNumeroDeclaration: existing.declarationEntree,
          nouveauNumeroDeclaration,
          dureeProlongationJours,
          utilisateur,
        },
      });

      return tx.admissionTemporaire.update({
        where: { id: req.params.id },
        data: {
          statut: 'RENOUVELEE',
          dateExpiration: new Date(nouvelleDateExpiration),
          dateRenouvellement,
          dureeProlongation: dureeProlongationJours,
          declarationEntree: nouveauNumeroDeclaration,
        },
        include: INCLUDE_AT,
      });
    });
    ApiResponse.success(res, withEtat(at), 'AT prolongée');
  } catch (e: any) { ApiResponse.badRequest(res, e.message); }
});

router.patch('/:id/annuler', async (req: AuthRequest, res: Response) => {
  try {
    const existing = await prisma.admissionTemporaire.findFirst({ where: { id: req.params.id, societeId: req.user!.societeId } });
    if (!existing) { ApiResponse.notFound(res); return; }
    const at = await prisma.admissionTemporaire.update({
      where: { id: req.params.id },
      data: { statut: 'ANNULEE' },
      include: INCLUDE_AT,
    });
    ApiResponse.success(res, withEtat(at), 'AT annulée');
  } catch (e: any) { ApiResponse.badRequest(res, e.message); }
});

export default router;

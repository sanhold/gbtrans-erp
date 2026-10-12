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
  client: { select: { id: true, code: true, raisonSociale: true } },
  facture: { select: { id: true, numero: true, statut: true } },
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
      vehiculeId, chauffeurId, dossierId, clientId, montantFacturable, origine, destination, designationMarchandise,
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

    let dossier = null as Awaited<ReturnType<typeof prisma.dossier.findFirst>> | null;
    if (dossierId) {
      dossier = await prisma.dossier.findFirst({ where: { id: dossierId, societeId } });
      if (!dossier) { ApiResponse.badRequest(res, 'Dossier introuvable'); return; }
    }

    // Le client peut etre choisi directement, ou repris automatiquement du dossier rattache.
    let clientIdFinal: string | null = clientId || (dossier as any)?.clientId || null;
    if (clientIdFinal) {
      const client = await prisma.client.findFirst({ where: { id: clientIdFinal, societeId } });
      if (!client) { ApiResponse.badRequest(res, 'Client introuvable'); return; }
    }

    const numero = await genererNumero(societeId, 'COURSE');

    const course = await prisma.course.create({
      data: {
        societeId, numero, vehiculeId, chauffeurId, dossierId: dossierId || null,
        clientId: clientIdFinal, montantFacturable: montantFacturable != null ? Number(montantFacturable) : null,
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
    const societeId = req.user!.societeId;
    const existing = await prisma.course.findFirst({ where: { id: req.params.id, societeId } });
    if (!existing) { ApiResponse.notFound(res); return; }
    if (existing.factureId) { ApiResponse.badRequest(res, 'Cette course a déjà été facturée et ne peut plus être modifiée'); return; }

    const cloturee = existing.statut === 'TERMINEE' || existing.statut === 'ANNULEE';
    const {
      vehiculeId, chauffeurId, dossierId, clientId, montantFacturable, origine, destination, designationMarchandise,
      poidsChargeKg, distanceKm, dateDepartPrevue, dateArriveePrevue,
      fraisCarburant, fraisPeage, autresFrais, observations,
    } = req.body;

    // Une fois la course terminee/annulee, seuls le client, le montant a facturer et les
    // depenses restent modifiables (on connait souvent ces montants exacts qu'apres la livraison).
    if (cloturee) {
      if (clientId) {
        const client = await prisma.client.findFirst({ where: { id: clientId, societeId } });
        if (!client) { ApiResponse.badRequest(res, 'Client introuvable'); return; }
      }
      const course = await prisma.course.update({
        where: { id: req.params.id },
        data: {
          ...(clientId !== undefined && { clientId: clientId || null }),
          ...(montantFacturable !== undefined && { montantFacturable: montantFacturable != null ? Number(montantFacturable) : null }),
          ...(fraisCarburant !== undefined && { fraisCarburant: fraisCarburant != null ? Number(fraisCarburant) : null }),
          ...(fraisPeage !== undefined && { fraisPeage: fraisPeage != null ? Number(fraisPeage) : null }),
          ...(autresFrais !== undefined && { autresFrais: autresFrais != null ? Number(autresFrais) : null }),
        },
        include: INCLUDE_COURSE,
      });
      ApiResponse.success(res, course, 'Course modifiée'); return;
    }

    if (vehiculeId) {
      const vehicule = await prisma.vehicule.findFirst({ where: { id: vehiculeId, societeId } });
      if (!vehicule) { ApiResponse.badRequest(res, 'Véhicule introuvable'); return; }
    }
    if (chauffeurId) {
      const chauffeur = await prisma.chauffeur.findFirst({ where: { id: chauffeurId, societeId } });
      if (!chauffeur) { ApiResponse.badRequest(res, 'Chauffeur introuvable'); return; }
    }
    if (dossierId) {
      const dossier = await prisma.dossier.findFirst({ where: { id: dossierId, societeId } });
      if (!dossier) { ApiResponse.badRequest(res, 'Dossier introuvable'); return; }
    }
    if (clientId) {
      const client = await prisma.client.findFirst({ where: { id: clientId, societeId } });
      if (!client) { ApiResponse.badRequest(res, 'Client introuvable'); return; }
    }

    const course = await prisma.course.update({
      where: { id: req.params.id },
      data: {
        vehiculeId, chauffeurId,
        ...(dossierId !== undefined && { dossierId: dossierId || null }),
        ...(clientId !== undefined && { clientId: clientId || null }),
        ...(montantFacturable !== undefined && { montantFacturable: montantFacturable != null ? Number(montantFacturable) : null }),
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

// Regroupe plusieurs courses TERMINEES du meme client (non encore facturees) sur une
// seule facture, qui rejoint ensuite le circuit de facturation/paiement standard.
router.post('/facturer', authorize('TRANSPORT:MODIFIER'), async (req: AuthRequest, res: Response) => {
  try {
    const societeId = req.user!.societeId;
    const { courseIds } = req.body as { courseIds?: string[] };
    if (!Array.isArray(courseIds) || courseIds.length === 0) { ApiResponse.badRequest(res, 'Sélectionnez au moins une course'); return; }

    const courses = await prisma.course.findMany({
      where: { id: { in: courseIds }, societeId },
      include: { client: true },
    });
    if (courses.length !== courseIds.length) { ApiResponse.badRequest(res, 'Une ou plusieurs courses sont introuvables'); return; }
    if (courses.some(c => c.statut !== 'TERMINEE')) { ApiResponse.badRequest(res, 'Seules les courses terminées peuvent être facturées'); return; }
    if (courses.some(c => c.factureId)) { ApiResponse.badRequest(res, 'Une ou plusieurs courses sont déjà facturées'); return; }
    if (courses.some(c => !c.clientId)) { ApiResponse.badRequest(res, 'Toutes les courses doivent avoir un client renseigné'); return; }
    if (courses.some(c => c.montantFacturable == null || Number(c.montantFacturable) <= 0)) { ApiResponse.badRequest(res, 'Toutes les courses doivent avoir un montant facturable renseigné'); return; }
    const premierClientId = courses[0].clientId;
    if (courses.some(c => c.clientId !== premierClientId)) { ApiResponse.badRequest(res, 'Toutes les courses sélectionnées doivent appartenir au même client'); return; }

    const client = courses[0].client!;
    const societe = await prisma.societe.findUnique({ where: { id: societeId }, select: { tauxTVA: true } });
    const tauxTVA = Number(societe?.tauxTVA ?? 18);

    const montantHT = courses.reduce((s, c) => s + Number(c.montantFacturable), 0);
    const montantTVA = client.exonere ? 0 : Math.round(montantHT * tauxTVA) / 100;
    const montantTTC = montantHT + montantTVA;

    const numero = await genererNumero(societeId, 'FACTURE');
    const dateEcheance = new Date(Date.now() + (client.conditionPaiement || 30) * 86400000);

    const facture = await prisma.$transaction(async (tx) => {
      const f = await tx.facture.create({
        data: {
          societeId, numero, type: 'FACTURE', clientId: client.id, createurId: req.user!.id,
          dateEcheance, objet: 'Prestations de transport', titre: 'Facture transport',
          montantHT, montantTVA, montantTTC, resteAPayer: montantTTC, tauxTVA: client.exonere ? 0 : tauxTVA,
          lignes: {
            create: courses.map((c, i) => ({
              ordre: i + 1,
              categorie: 'TRANSPORT',
              designation: `Transport ${c.numero} — ${c.origine} → ${c.destination}`,
              quantite: 1,
              prixUnitaire: Number(c.montantFacturable),
              montantHT: Number(c.montantFacturable),
              tauxTVA: client.exonere ? 0 : tauxTVA,
              montantTVA: client.exonere ? 0 : Math.round(Number(c.montantFacturable) * tauxTVA) / 100,
            })),
          },
        },
      });
      await tx.course.updateMany({ where: { id: { in: courseIds } }, data: { factureId: f.id } });
      return f;
    });

    ApiResponse.created(res, facture, `Facture ${numero} créée à partir de ${courses.length} course(s)`);
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

import { Router, Response } from 'express';
import { authenticate, requireSociete, authorize } from '../../middleware/auth';
import { audit } from '../../middleware/audit';
import { AuthRequest } from '../../types';
import { ApiResponse } from '../../utils/apiResponse';
import prisma from '../../config/database';
import { genererNumero } from '../../utils/numerotation';
import { Prisma } from '@prisma/client';
import { assertDossierOuvert } from '../../utils/dossierGuard';
import { debiterCompte } from '../../utils/debiterCompte';

const router = Router();
router.use(authenticate, requireSociete);

router.get('/', authorize('FOURNISSEURS:LIRE'), async (req: AuthRequest, res: Response) => {
  try {
    const { page = '1', limit = '20', fournisseurId, dossierId, statut } = req.query;
    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
    const where: Prisma.FactureFournisseurWhereInput = {
      societeId: req.user!.societeId,
      ...(fournisseurId && { fournisseurId: fournisseurId as string }),
      ...(dossierId && { dossierId: dossierId as string }),
      ...(statut && { statut: statut as any }),
    };
    const [data, total] = await Promise.all([
      prisma.factureFournisseur.findMany({
        where, skip, take: Math.min(parseInt(limit as string) || 20, 100),
        orderBy: { dateFacture: 'desc' },
        relationLoadStrategy: 'join', include: {
          fournisseur: { select: { id: true, code: true, raisonSociale: true } },
          dossier: { select: { id: true, numero: true, numeroPhysique: true } },
        },
      }),
      prisma.factureFournisseur.count({ where }),
    ]);
    ApiResponse.paginated(res, data, total, parseInt(page as string), parseInt(limit as string));
  } catch (e: any) { ApiResponse.error(res, e.message); }
});

router.get('/:id', authorize('FOURNISSEURS:LIRE'), async (req: AuthRequest, res: Response) => {
  try {
    const f = await prisma.factureFournisseur.findFirst({
      where: { id: req.params.id, societeId: req.user!.societeId },
      relationLoadStrategy: 'join', include: {
        lignes: { orderBy: { ordre: 'asc' } },
        fournisseur: true,
        dossier: { select: { id: true, numero: true, numeroPhysique: true } },
        paiements: {
          include: {
            paiementFournisseur: {
              include: {
                caisse: { select: { id: true, libelle: true } },
                compteBancaire: { select: { id: true, libelle: true, banque: true } },
                compteTiers: { select: { id: true, libelle: true, type: true } },
                createur: { select: { id: true, nom: true, prenom: true } },
              },
            },
          },
        },
      },
    });
    if (!f) { ApiResponse.notFound(res); return; }
    ApiResponse.success(res, f);
  } catch (e: any) { ApiResponse.error(res, e.message); }
});

router.post('/', authorize('FOURNISSEURS:CREER'), audit('FOURNISSEURS', 'CREER'), async (req: AuthRequest, res: Response) => {
  try {
    const societeId = req.user!.societeId;
    const { fournisseurId, dossierId, dateFacture, dateEcheance, reference, objet, observations } = req.body;
    if (!fournisseurId) { ApiResponse.badRequest(res, 'Fournisseur requis'); return; }
    const fournisseur = await prisma.fournisseur.findFirst({ where: { id: fournisseurId, societeId } });
    if (!fournisseur) { ApiResponse.badRequest(res, 'Fournisseur introuvable'); return; }
    if (dossierId) await assertDossierOuvert(dossierId, societeId);
    const numero = await genererNumero(societeId, 'FACTURE_FOURNISSEUR');
    const f = await prisma.factureFournisseur.create({
      data: {
        societeId, numero, fournisseurId, dossierId, createurId: req.user!.id,
        ...(dateFacture && { dateFacture: new Date(dateFacture) }),
        dateEcheance: new Date(dateEcheance),
        reference, objet, observations,
      },
    });
    ApiResponse.created(res, f, 'Facture fournisseur créée');
  } catch (e: any) { ApiResponse.badRequest(res, e.message); }
});

router.post('/:id/lignes', authorize('FOURNISSEURS:MODIFIER'), audit('FOURNISSEURS', 'MODIFIER'), async (req: AuthRequest, res: Response) => {
  try {
    const facture = await prisma.factureFournisseur.findFirst({ where: { id: req.params.id, societeId: req.user!.societeId } });
    if (!facture) { ApiResponse.notFound(res); return; }
    if (facture.statut !== 'BROUILLON') { ApiResponse.badRequest(res, 'Modification impossible: facture non brouillon'); return; }

    const lastLigne = await prisma.ligneFactureFournisseur.findFirst({ where: { factureFournisseurId: req.params.id }, orderBy: { ordre: 'desc' } });
    const quantite = Number(req.body.quantite) || 1;
    const prixUnitaire = Number(req.body.prixUnitaire) || 0;
    const tauxTVA = req.body.tauxTVA != null ? Number(req.body.tauxTVA) : 18;
    const montantHT = quantite * prixUnitaire;
    const montantTVA = montantHT * (tauxTVA / 100);

    await prisma.ligneFactureFournisseur.create({
      data: {
        factureFournisseurId: req.params.id,
        ordre: (lastLigne?.ordre || 0) + 1,
        designation: req.body.designation,
        quantite, prixUnitaire, tauxTVA, montantHT, montantTVA,
      },
    });

    await recalculerTotauxFactureFournisseur(req.params.id);
    const updated = await prisma.factureFournisseur.findFirst({ where: { id: req.params.id }, relationLoadStrategy: 'join', include: { lignes: { orderBy: { ordre: 'asc' } }, fournisseur: true } });
    ApiResponse.created(res, updated, 'Ligne ajoutée');
  } catch (e: any) { ApiResponse.badRequest(res, e.message); }
});

router.put('/:id/lignes/:ligneId', authorize('FOURNISSEURS:MODIFIER'), audit('FOURNISSEURS', 'MODIFIER'), async (req: AuthRequest, res: Response) => {
  try {
    const facture = await prisma.factureFournisseur.findFirst({ where: { id: req.params.id, societeId: req.user!.societeId } });
    if (!facture) { ApiResponse.notFound(res); return; }
    if (facture.statut !== 'BROUILLON') { ApiResponse.badRequest(res, 'Modification impossible: facture non brouillon'); return; }

    const ligne = await prisma.ligneFactureFournisseur.findFirst({ where: { id: req.params.ligneId, factureFournisseurId: facture.id } });
    if (!ligne) { ApiResponse.notFound(res); return; }

    const quantite = Number(req.body.quantite) || 1;
    const prixUnitaire = Number(req.body.prixUnitaire) || 0;
    const tauxTVA = req.body.tauxTVA != null ? Number(req.body.tauxTVA) : 18;
    const montantHT = quantite * prixUnitaire;
    const montantTVA = montantHT * (tauxTVA / 100);

    await prisma.ligneFactureFournisseur.update({
      where: { id: req.params.ligneId },
      data: { designation: req.body.designation, quantite, prixUnitaire, tauxTVA, montantHT, montantTVA },
    });
    await recalculerTotauxFactureFournisseur(req.params.id);

    const updated = await prisma.factureFournisseur.findFirst({ where: { id: req.params.id }, relationLoadStrategy: 'join', include: { lignes: { orderBy: { ordre: 'asc' } }, fournisseur: true } });
    ApiResponse.success(res, updated, 'Ligne modifiée');
  } catch (e: any) { ApiResponse.badRequest(res, e.message); }
});

router.delete('/:id/lignes/:ligneId', authorize('FOURNISSEURS:MODIFIER'), audit('FOURNISSEURS', 'MODIFIER'), async (req: AuthRequest, res: Response) => {
  try {
    const facture = await prisma.factureFournisseur.findFirst({ where: { id: req.params.id, societeId: req.user!.societeId } });
    if (!facture) { ApiResponse.notFound(res); return; }
    if (facture.statut !== 'BROUILLON') { ApiResponse.badRequest(res, 'Modification impossible: facture non brouillon'); return; }

    const ligne = await prisma.ligneFactureFournisseur.findFirst({ where: { id: req.params.ligneId, factureFournisseurId: facture.id } });
    if (!ligne) { ApiResponse.notFound(res); return; }

    await prisma.ligneFactureFournisseur.delete({ where: { id: req.params.ligneId } });
    await recalculerTotauxFactureFournisseur(req.params.id);

    const updated = await prisma.factureFournisseur.findFirst({ where: { id: req.params.id }, relationLoadStrategy: 'join', include: { lignes: { orderBy: { ordre: 'asc' } }, fournisseur: true } });
    ApiResponse.success(res, updated, 'Ligne supprimée');
  } catch (e: any) { ApiResponse.badRequest(res, e.message); }
});

router.patch('/:id/valider', authorize('FOURNISSEURS:VALIDER'), audit('FOURNISSEURS', 'VALIDER'), async (req: AuthRequest, res: Response) => {
  try {
    const facture = await prisma.factureFournisseur.findFirst({ where: { id: req.params.id, societeId: req.user!.societeId } });
    if (!facture) { ApiResponse.notFound(res); return; }
    if (facture.statut !== 'BROUILLON') { ApiResponse.badRequest(res, 'Seule une facture brouillon peut être validée'); return; }
    const updated = await prisma.factureFournisseur.update({ where: { id: req.params.id }, data: { statut: 'VALIDEE' } });
    ApiResponse.success(res, updated, 'Facture fournisseur validée');
  } catch (e: any) { ApiResponse.badRequest(res, e.message); }
});

router.post('/:id/paiement', authorize('FOURNISSEURS:MODIFIER'), audit('FOURNISSEURS', 'PAIEMENT'), async (req: AuthRequest, res: Response) => {
  try {
    const societeId = req.user!.societeId;
    const factureId = req.params.id as string;
    const { montant, modePaiement, reference, banque, caisseId, compteBancaireId, compteTiersId } = req.body;

    const facture = await prisma.factureFournisseur.findFirst({ where: { id: factureId, societeId }, relationLoadStrategy: 'join', include: { fournisseur: true } });
    if (!facture) { ApiResponse.notFound(res, 'Facture fournisseur non trouvée'); return; }
    if (!['VALIDEE', 'PARTIELLEMENT_PAYEE'].includes(facture.statut)) {
      ApiResponse.badRequest(res, 'Seule une facture validée peut recevoir un paiement'); return;
    }

    const montantNum = Number(montant);
    if (!(montantNum > 0)) { ApiResponse.badRequest(res, 'Montant invalide'); return; }
    if (montantNum > Number(facture.resteAPayer)) { ApiResponse.badRequest(res, 'Le montant dépasse le reste à payer'); return; }

    let account: any = null;
    if (caisseId) account = await prisma.caisse.findFirst({ where: { id: caisseId, societeId } });
    else if (compteBancaireId) account = await prisma.compteBancaire.findFirst({ where: { id: compteBancaireId, societeId } });
    else if (compteTiersId) account = await prisma.compteTiers.findFirst({ where: { id: compteTiersId, societeId } });
    if ((caisseId || compteBancaireId || compteTiersId) && !account) { ApiResponse.notFound(res, 'Compte introuvable'); return; }
    // Le contrôle de suffisance du solde (avec découvert autorisé pour un
    // compte bancaire) est fait de façon atomique dans la transaction ci-dessous.

    const numeroPaiement = await genererNumero(societeId, 'PAIEMENT_FOURNISSEUR');
    const beneficiaire = facture.fournisseur?.raisonSociale;
    const factureNumero = facture.numero;

    const paiement = await prisma.$transaction(async (tx) => {
      // Verrou atomique : empêche deux paiements concurrents de dépasser le reste à payer
      // réel (meme pattern que le paiement de facture client).
      const verrou = await tx.factureFournisseur.updateMany({
        where: { id: factureId, societeId, statut: { in: ['VALIDEE', 'PARTIELLEMENT_PAYEE'] }, resteAPayer: { gte: montantNum } },
        data: { resteAPayer: { decrement: montantNum }, montantPaye: { increment: montantNum } },
      });
      if (verrou.count !== 1) throw new Error('Le montant dépasse le reste à payer ou la facture a changé de statut entre-temps');

      const miseAJour = await tx.factureFournisseur.findUniqueOrThrow({ where: { id: factureId }, select: { resteAPayer: true } });
      await tx.factureFournisseur.update({
        where: { id: factureId },
        data: { statut: Number(miseAJour.resteAPayer) <= 0 ? 'PAYEE' : 'PARTIELLEMENT_PAYEE' },
      });

      const p = await tx.paiementFournisseur.create({
        data: {
          societeId, numero: numeroPaiement, fournisseurId: facture.fournisseurId,
          montant: montantNum, modePaiement, reference, banque, statut: 'VALIDE',
          caisseId, compteBancaireId, compteTiersId, createurId: req.user!.id,
          affectations: { create: { factureFournisseurId: factureId, montant: montantNum } },
        },
      });

      if (caisseId || compteBancaireId || compteTiersId) {
        const numeroOp = await genererNumero(societeId, 'OPERATION_FINANCIERE');
        await tx.operationFinanciere.create({
          data: {
            societeId, numero: numeroOp, type: 'DECAISSEMENT', sens: 'SORTIE',
            caisseId, compteBancaireId, compteTiersId,
            montant: montantNum, libelle: `Paiement facture fournisseur ${factureNumero}`,
            reference: numeroPaiement, beneficiaire,
          },
        });
        await debiterCompte(tx, { caisseId, compteBancaireId, compteTiersId }, montantNum);
      }

      return p;
    });

    ApiResponse.created(res, paiement, 'Paiement enregistré');
  } catch (e: any) { ApiResponse.badRequest(res, e.message); }
});

async function recalculerTotauxFactureFournisseur(factureFournisseurId: string) {
  const [lignes, facture] = await Promise.all([
    prisma.ligneFactureFournisseur.findMany({ where: { factureFournisseurId } }),
    prisma.factureFournisseur.findUnique({ where: { id: factureFournisseurId }, select: { montantPaye: true } }),
  ]);
  const montantHT = lignes.reduce((s, l) => s + Number(l.montantHT), 0);
  const montantTVA = lignes.reduce((s, l) => s + Number(l.montantTVA), 0);
  const montantTTC = montantHT + montantTVA;
  const resteAPayer = montantTTC - Number(facture?.montantPaye || 0);
  await prisma.factureFournisseur.update({
    where: { id: factureFournisseurId },
    data: { montantHT, montantTVA, montantTTC, resteAPayer },
  });
}

export default router;

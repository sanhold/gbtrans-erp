import { Router, Response } from 'express';
import { authenticate, requireSociete, authorize } from '../../middleware/auth';
import { audit } from '../../middleware/audit';
import { AuthRequest } from '../../types';
import { ApiResponse } from '../../utils/apiResponse';
import prisma from '../../config/database';
import { genererNumero } from '../../utils/numerotation';
import { Prisma } from '@prisma/client';
import { assertDossierOuvert } from '../../utils/dossierGuard';

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
        where, skip, take: parseInt(limit as string),
        orderBy: { dateFacture: 'desc' },
        include: {
          fournisseur: { select: { id: true, code: true, raisonSociale: true } },
          dossier: { select: { id: true, numero: true } },
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
      include: {
        lignes: { orderBy: { ordre: 'asc' } },
        fournisseur: true,
        dossier: { select: { id: true, numero: true } },
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
    const updated = await prisma.factureFournisseur.findFirst({ where: { id: req.params.id }, include: { lignes: { orderBy: { ordre: 'asc' } }, fournisseur: true } });
    ApiResponse.created(res, updated, 'Ligne ajoutée');
  } catch (e: any) { ApiResponse.badRequest(res, e.message); }
});

router.put('/:id/lignes/:ligneId', authorize('FOURNISSEURS:MODIFIER'), audit('FOURNISSEURS', 'MODIFIER'), async (req: AuthRequest, res: Response) => {
  try {
    const facture = await prisma.factureFournisseur.findFirst({ where: { id: req.params.id, societeId: req.user!.societeId } });
    if (!facture) { ApiResponse.notFound(res); return; }
    if (facture.statut !== 'BROUILLON') { ApiResponse.badRequest(res, 'Modification impossible: facture non brouillon'); return; }

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

    const updated = await prisma.factureFournisseur.findFirst({ where: { id: req.params.id }, include: { lignes: { orderBy: { ordre: 'asc' } }, fournisseur: true } });
    ApiResponse.success(res, updated, 'Ligne modifiée');
  } catch (e: any) { ApiResponse.badRequest(res, e.message); }
});

router.delete('/:id/lignes/:ligneId', authorize('FOURNISSEURS:MODIFIER'), audit('FOURNISSEURS', 'MODIFIER'), async (req: AuthRequest, res: Response) => {
  try {
    const facture = await prisma.factureFournisseur.findFirst({ where: { id: req.params.id, societeId: req.user!.societeId } });
    if (!facture) { ApiResponse.notFound(res); return; }
    if (facture.statut !== 'BROUILLON') { ApiResponse.badRequest(res, 'Modification impossible: facture non brouillon'); return; }

    await prisma.ligneFactureFournisseur.delete({ where: { id: req.params.ligneId } });
    await recalculerTotauxFactureFournisseur(req.params.id);

    const updated = await prisma.factureFournisseur.findFirst({ where: { id: req.params.id }, include: { lignes: { orderBy: { ordre: 'asc' } }, fournisseur: true } });
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

    const facture = await prisma.factureFournisseur.findFirst({ where: { id: factureId, societeId }, include: { fournisseur: true } });
    if (!facture) { ApiResponse.notFound(res, 'Facture fournisseur non trouvée'); return; }

    const montantNum = Number(montant);
    const resteAPayer = Number(facture.resteAPayer);
    if (montantNum > resteAPayer) { ApiResponse.badRequest(res, 'Le montant dépasse le reste à payer'); return; }

    let account: any = null;
    if (caisseId) account = await prisma.caisse.findFirst({ where: { id: caisseId, societeId } });
    else if (compteBancaireId) account = await prisma.compteBancaire.findFirst({ where: { id: compteBancaireId, societeId } });
    else if (compteTiersId) account = await prisma.compteTiers.findFirst({ where: { id: compteTiersId, societeId } });
    if ((caisseId || compteBancaireId || compteTiersId) && !account) { ApiResponse.notFound(res, 'Compte introuvable'); return; }
    if (account && Number(account.solde) - montantNum < 0) { ApiResponse.badRequest(res, 'Solde insuffisant pour ce paiement'); return; }

    const numeroPaiement = await genererNumero(societeId, 'PAIEMENT_FOURNISSEUR');
    const beneficiaire = facture.fournisseur?.raisonSociale;
    const factureNumero = facture.numero;

    const paiement = await prisma.$transaction(async (tx) => {
      const p = await tx.paiementFournisseur.create({
        data: {
          societeId, numero: numeroPaiement, fournisseurId: facture.fournisseurId,
          montant: montantNum, modePaiement, reference, banque, statut: 'VALIDE',
          caisseId, compteBancaireId, compteTiersId, createurId: req.user!.id,
          affectations: { create: { factureFournisseurId: factureId, montant: montantNum } },
        },
      });

      const nouveauReste = resteAPayer - montantNum;
      await tx.factureFournisseur.update({
        where: { id: factureId },
        data: {
          montantPaye: { increment: montantNum },
          resteAPayer: nouveauReste,
          statut: nouveauReste <= 0 ? 'PAYEE' : 'PARTIELLEMENT_PAYEE',
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
        if (caisseId) await tx.caisse.update({ where: { id: caisseId }, data: { solde: { decrement: montantNum } } });
        else if (compteBancaireId) await tx.compteBancaire.update({ where: { id: compteBancaireId }, data: { solde: { decrement: montantNum } } });
        else if (compteTiersId) await tx.compteTiers.update({ where: { id: compteTiersId }, data: { solde: { decrement: montantNum } } });
      }

      return p;
    });

    ApiResponse.created(res, paiement, 'Paiement enregistré');
  } catch (e: any) { ApiResponse.badRequest(res, e.message); }
});

async function recalculerTotauxFactureFournisseur(factureFournisseurId: string) {
  const lignes = await prisma.ligneFactureFournisseur.findMany({ where: { factureFournisseurId } });
  const montantHT = lignes.reduce((s, l) => s + Number(l.montantHT), 0);
  const montantTVA = lignes.reduce((s, l) => s + Number(l.montantTVA), 0);
  const montantTTC = montantHT + montantTVA;
  await prisma.factureFournisseur.update({
    where: { id: factureFournisseurId },
    data: { montantHT, montantTVA, montantTTC, resteAPayer: montantTTC },
  });
}

export default router;

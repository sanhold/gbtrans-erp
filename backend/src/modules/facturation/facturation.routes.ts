import { Router, Response } from 'express';
import { FacturationController } from './facturation.controller';
import { authenticate, authorize, requireSociete } from '../../middleware/auth';
import { audit } from '../../middleware/audit';
import { AuthRequest } from '../../types';
import { ApiResponse } from '../../utils/apiResponse';
import prisma from '../../config/database';

const router = Router();
const controller = new FacturationController();

router.use(authenticate, requireSociete);

router.post('/', authorize('FACTURATION:CREER'), audit('FACTURATION', 'CREER'), (req, res) => controller.create(req, res));
router.get('/', authorize('FACTURATION:LIRE'), (req, res) => controller.findAll(req, res));
router.get('/statistiques', authorize('FACTURATION:LIRE'), (req, res) => controller.statistiques(req, res));
router.get('/:id', authorize('FACTURATION:LIRE'), (req, res) => controller.findById(req, res));
router.patch('/:id/valider', authorize('FACTURATION:VALIDER'), audit('FACTURATION', 'VALIDER'), (req, res) => controller.valider(req, res));
router.patch('/:id/annuler', authorize('FACTURATION:ANNULER'), audit('FACTURATION', 'ANNULER'), (req, res) => controller.annuler(req, res));
router.post('/:id/avoir', authorize('FACTURATION:CREER'), audit('FACTURATION', 'AVOIR'), (req, res) => controller.creerAvoir(req, res));
router.post('/:id/paiement', authorize('FACTURATION:PAYER'), audit('FACTURATION', 'PAIEMENT'), (req, res) => controller.payer(req, res));

// Ajouter une ligne à une facture BROUILLON
router.post('/:id/lignes', async (req: AuthRequest, res: Response) => {
  try {
    const facture = await prisma.facture.findFirst({ where: { id: req.params.id, societeId: req.user!.societeId } });
    if (!facture) { ApiResponse.notFound(res); return; }
    if (facture.statut !== 'BROUILLON') { ApiResponse.badRequest(res, 'Modification impossible: facture non brouillon'); return; }

    const lastLigne = await prisma.ligneFacture.findFirst({ where: { factureId: req.params.id }, orderBy: { ordre: 'desc' } });
    const montant = parseFloat(req.body.montant) || 0;

    await prisma.ligneFacture.create({
      data: {
        factureId: req.params.id,
        ordre: (lastLigne?.ordre || 0) + 1,
        categorie: req.body.categorie || null,
        codePrestation: req.body.codePrestation || null,
        designation: req.body.designation,
        estTVA: req.body.estTVA || false,
        quantite: 1,
        prixUnitaire: montant,
        montantHT: req.body.estTVA ? 0 : montant,
        tauxTVA: req.body.estTVA ? 18 : 0,
        montantTVA: req.body.estTVA ? montant : 0,
        remise: 0,
      },
    });

    await recalculerTotauxFacture(req.params.id);
    const updated = await prisma.facture.findFirst({ where: { id: req.params.id }, include: { lignes: { orderBy: { ordre: 'asc' } }, client: true } });
    ApiResponse.created(res, updated, 'Ligne ajoutée');
  } catch (e: any) { ApiResponse.badRequest(res, e.message); }
});

// Supprimer une ligne
router.delete('/:id/lignes/:ligneId', async (req: AuthRequest, res: Response) => {
  try {
    const facture = await prisma.facture.findFirst({ where: { id: req.params.id, societeId: req.user!.societeId } });
    if (!facture) { ApiResponse.notFound(res); return; }
    if (facture.statut !== 'BROUILLON') { ApiResponse.badRequest(res, 'Modification impossible: facture non brouillon'); return; }

    await prisma.ligneFacture.delete({ where: { id: req.params.ligneId } });
    await recalculerTotauxFacture(req.params.id);

    const updated = await prisma.facture.findFirst({ where: { id: req.params.id }, include: { lignes: { orderBy: { ordre: 'asc' } }, client: true } });
    ApiResponse.success(res, updated, 'Ligne supprimée');
  } catch (e: any) { ApiResponse.badRequest(res, e.message); }
});

// Modifier une ligne
router.put('/:id/lignes/:ligneId', async (req: AuthRequest, res: Response) => {
  try {
    const facture = await prisma.facture.findFirst({ where: { id: req.params.id, societeId: req.user!.societeId } });
    if (!facture) { ApiResponse.notFound(res); return; }
    if (facture.statut !== 'BROUILLON') { ApiResponse.badRequest(res, 'Modification impossible: facture non brouillon'); return; }

    const montant = parseFloat(req.body.montant) || 0;
    await prisma.ligneFacture.update({
      where: { id: req.params.ligneId },
      data: {
        designation: req.body.designation,
        categorie: req.body.categorie,
        estTVA: req.body.estTVA,
        prixUnitaire: montant,
        montantHT: req.body.estTVA ? 0 : montant,
        montantTVA: req.body.estTVA ? montant : 0,
      },
    });
    await recalculerTotauxFacture(req.params.id);

    const updated = await prisma.facture.findFirst({ where: { id: req.params.id }, include: { lignes: { orderBy: { ordre: 'asc' } }, client: true } });
    ApiResponse.success(res, updated, 'Ligne modifiée');
  } catch (e: any) { ApiResponse.badRequest(res, e.message); }
});

async function recalculerTotauxFacture(factureId: string) {
  const lignes = await prisma.ligneFacture.findMany({ where: { factureId } });
  const montantHT = lignes.filter(l => !l.estTVA).reduce((s, l) => s + Number(l.prixUnitaire), 0);
  const montantTVA = lignes.filter(l => l.estTVA).reduce((s, l) => s + Number(l.prixUnitaire), 0);
  const montantPrestation = lignes.filter(l => !l.estTVA && (l.categorie === 'AUTRES FRAIS' || l.codePrestation?.startsWith('AF'))).reduce((s, l) => s + Number(l.prixUnitaire), 0);
  const tvaPrestation = montantTVA;
  const montantTTC = montantHT + montantTVA;

  await prisma.facture.update({
    where: { id: factureId },
    data: { montantHT, montantTVA, montantTTC, resteAPayer: montantTTC, montantPrestation, tvaPrestation },
  });
}

export default router;

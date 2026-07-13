import { Router, Response } from 'express';
import { authenticate, requireSociete } from '../../middleware/auth';
import { AuthRequest } from '../../types';
import { ApiResponse } from '../../utils/apiResponse';
import prisma from '../../config/database';
import { genererNumero } from '../../utils/numerotation';

const router = Router();
router.use(authenticate, requireSociete);

const STATUTS_DOSSIER_FERME = ['CLOTURE', 'ANNULE', 'ARCHIVE'];

// ===== CATALOGUE PRESTATIONS =====

router.get('/catalogue', async (req: AuthRequest, res: Response) => {
  try {
    const data = await prisma.prestationCatalogue.findMany({
      where: { societeId: req.user!.societeId, actif: true },
      orderBy: [{ categorie: 'asc' }, { ordre: 'asc' }],
    });
    ApiResponse.success(res, data);
  } catch (e: any) { ApiResponse.error(res, e.message); }
});

router.post('/catalogue', async (req: AuthRequest, res: Response) => {
  try {
    const p = await prisma.prestationCatalogue.create({
      data: { ...req.body, societeId: req.user!.societeId },
    });
    ApiResponse.created(res, p, 'Prestation ajoutée au catalogue');
  } catch (e: any) { ApiResponse.badRequest(res, e.message); }
});

router.put('/catalogue/:id', async (req: AuthRequest, res: Response) => {
  try {
    const p = await prisma.prestationCatalogue.update({ where: { id: req.params.id }, data: req.body });
    ApiResponse.success(res, p, 'Prestation modifiée');
  } catch (e: any) { ApiResponse.badRequest(res, e.message); }
});

router.delete('/catalogue/:id', async (req: AuthRequest, res: Response) => {
  try {
    await prisma.prestationCatalogue.delete({ where: { id: req.params.id } });
    ApiResponse.success(res, null, 'Prestation supprimée');
  } catch (e: any) { ApiResponse.badRequest(res, e.message); }
});

// ===== PROFORMAS =====

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
          { titre: { contains: search as string, mode: 'insensitive' } },
          { client: { raisonSociale: { contains: search as string, mode: 'insensitive' } } },
        ],
      }),
    };
    const [data, total] = await Promise.all([
      prisma.proforma.findMany({
        where, skip, take: parseInt(limit as string),
        orderBy: { dateProforma: 'desc' },
        include: {
          client: { select: { id: true, code: true, raisonSociale: true } },
          dossier: { select: { id: true, numero: true } },
          _count: { select: { lignes: true } },
        },
      }),
      prisma.proforma.count({ where }),
    ]);
    ApiResponse.paginated(res, data, total, parseInt(page as string), parseInt(limit as string));
  } catch (e: any) { ApiResponse.error(res, e.message); }
});

// Liste proformas en attente de facturation (AVANT /:id)
router.get('/en-attente', async (req: AuthRequest, res: Response) => {
  try {
    const data = await prisma.proforma.findMany({
      where: {
        statut: 'EN_ATTENTE_FACTURATION',
        factureId: null,
        client: { societeId: req.user!.societeId },
      },
      include: {
        client: { select: { id: true, code: true, raisonSociale: true } },
        dossier: { select: { id: true, numero: true } },
        lignes: { orderBy: { ordre: 'asc' } },
      },
      orderBy: { dateProforma: 'desc' },
    });
    ApiResponse.success(res, data);
  } catch (e: any) { ApiResponse.error(res, e.message); }
});

router.get('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const p = await prisma.proforma.findFirst({
      where: { id: req.params.id },
      include: {
        client: true,
        dossier: {
          select: {
            id: true, numero: true, nature: true, valeurFOB: true, fret: true, assurance: true, valeurCAF: true, designation: true,
            numeroBL: true, navire: true, portOrigine: true, portDestination: true, incoterm: true,
            poidsBrut: true, volume: true, nombreColis: true,
            agent: { select: { nom: true, prenom: true } },
            conteneurs: { select: { numero: true } },
          },
        },
        lignes: { orderBy: { ordre: 'asc' } },
      },
    });
    if (!p) { ApiResponse.notFound(res); return; }
    ApiResponse.success(res, p);
  } catch (e: any) { ApiResponse.error(res, e.message); }
});

router.post('/', async (req: AuthRequest, res: Response) => {
  try {
    const { clientId, dossierId, titre, objet, fobUnitaire, fretUnitaire, assurance, fraisDivers, nombreUnites, observations, lignes } = req.body;

    if (dossierId) {
      const dossier = await prisma.dossier.findFirst({ where: { id: dossierId, societeId: req.user!.societeId } });
      if (!dossier) { ApiResponse.notFound(res, 'Dossier introuvable'); return; }
      if (STATUTS_DOSSIER_FERME.includes(dossier.statut)) {
        ApiResponse.badRequest(res, `Impossible de créer une proforma : le dossier ${dossier.numero} est ${dossier.statut.toLowerCase()}`); return;
      }
    }

    const numero = await genererNumero(req.user!.societeId, 'PROFORMA');

    let montantHT = 0;
    let montantTVA = 0;
    const lignesData = (lignes || []).map((l: any, i: number) => {
      const montant = parseFloat(l.montant) || 0;
      if (l.estTVA) montantTVA += montant;
      else montantHT += montant;
      return {
        ordre: i + 1,
        categorie: l.categorie || null,
        codePrestation: l.codePrestation || null,
        designation: l.designation,
        quantite: 1,
        prixUnitaire: montant,
        montantHT: l.estTVA ? 0 : montant,
        tauxTVA: l.estTVA ? 18 : (parseFloat(l.tauxTVA) || 0),
        montantTVA: l.estTVA ? montant : 0,
        estTVA: l.estTVA || false,
        remise: 0,
      };
    });

    const nbUnites = parseInt(nombreUnites) || 1;
    const valeurCAF = ((parseFloat(fobUnitaire) || 0) + (parseFloat(fretUnitaire) || 0) + (parseFloat(assurance) || 0) + (parseFloat(fraisDivers) || 0)) * nbUnites;

    const proforma = await prisma.proforma.create({
      data: {
        numero, clientId, dossierId: dossierId || null, titre, objet,
        dateValidite: new Date(Date.now() + 30 * 86400000),
        fobUnitaire: parseFloat(fobUnitaire) || null,
        fretUnitaire: parseFloat(fretUnitaire) || null,
        assurance: parseFloat(assurance) || null,
        fraisDivers: parseFloat(fraisDivers) || null,
        nombreUnites: nbUnites,
        valeurCAF: valeurCAF || null,
        montantHT, montantTVA, montantTTC: montantHT + montantTVA,
        observations,
        lignes: { create: lignesData },
      },
      include: { lignes: { orderBy: { ordre: 'asc' } }, client: { select: { raisonSociale: true } } },
    });
    ApiResponse.created(res, proforma, `Proforma ${numero} créée`);
  } catch (e: any) { ApiResponse.badRequest(res, e.message); }
});

router.put('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { titre, objet, fobUnitaire, fretUnitaire, assurance, fraisDivers, nombreUnites, observations, lignes } = req.body;

    if (lignes) {
      await prisma.ligneProforma.deleteMany({ where: { proformaId: req.params.id } });
    }

    let montantHT = 0;
    let montantTVA = 0;
    const lignesData = lignes ? lignes.map((l: any, i: number) => {
      const montant = parseFloat(l.montant) || 0;
      if (l.estTVA) montantTVA += montant;
      else montantHT += montant;
      return {
        ordre: i + 1, categorie: l.categorie || null, codePrestation: l.codePrestation || null,
        designation: l.designation, quantite: 1, prixUnitaire: montant,
        montantHT: l.estTVA ? 0 : montant, tauxTVA: l.estTVA ? 18 : 0,
        montantTVA: l.estTVA ? montant : 0, estTVA: l.estTVA || false, remise: 0,
      };
    }) : undefined;

    const nbUnites = parseInt(nombreUnites) || 1;
    const valeurCAF = ((parseFloat(fobUnitaire) || 0) + (parseFloat(fretUnitaire) || 0) + (parseFloat(assurance) || 0) + (parseFloat(fraisDivers) || 0)) * nbUnites;

    const proforma = await prisma.proforma.update({
      where: { id: req.params.id },
      data: {
        titre, objet, observations,
        fobUnitaire: fobUnitaire != null ? parseFloat(fobUnitaire) : undefined,
        fretUnitaire: fretUnitaire != null ? parseFloat(fretUnitaire) : undefined,
        assurance: assurance != null ? parseFloat(assurance) : undefined,
        fraisDivers: fraisDivers != null ? parseFloat(fraisDivers) : undefined,
        nombreUnites: nombreUnites != null ? nbUnites : undefined,
        valeurCAF: valeurCAF || undefined,
        ...(lignes && { montantHT, montantTVA, montantTTC: montantHT + montantTVA }),
        ...(lignesData && { lignes: { create: lignesData } }),
      },
      include: { lignes: { orderBy: { ordre: 'asc' } }, client: true },
    });
    ApiResponse.success(res, proforma, 'Proforma modifiée');
  } catch (e: any) { ApiResponse.badRequest(res, e.message); }
});

router.patch('/:id/valider', async (req: AuthRequest, res: Response) => {
  try {
    const proforma = await prisma.proforma.findFirst({ where: { id: req.params.id } });
    if (!proforma) { ApiResponse.notFound(res, 'Proforma non trouvée'); return; }
    if (proforma.factureId) { ApiResponse.badRequest(res, 'Proforma déjà facturée'); return; }
    if (proforma.statut !== 'BROUILLON') { ApiResponse.badRequest(res, 'Seule une proforma en brouillon peut être validée'); return; }

    const updated = await prisma.proforma.update({
      where: { id: req.params.id },
      data: { statut: 'EN_ATTENTE_FACTURATION' },
      include: { lignes: { orderBy: { ordre: 'asc' } }, client: true },
    });

    ApiResponse.success(res, updated, 'Proforma validée — en attente de facturation');
  } catch (e: any) { ApiResponse.badRequest(res, e.message); }
});


// ===== TRANSFORMER PROFORMA EN FACTURE =====

router.post('/:id/transformer-facture', async (req: AuthRequest, res: Response) => {
  try {
    const proforma = await prisma.proforma.findFirst({
      where: { id: req.params.id },
      include: { lignes: { orderBy: { ordre: 'asc' } }, client: true },
    });

    if (!proforma) { ApiResponse.notFound(res, 'Proforma non trouvée'); return; }
    if (proforma.factureId) { ApiResponse.badRequest(res, 'Cette proforma a déjà été transformée en facture'); return; }

    if (proforma.dossierId) {
      const dossier = await prisma.dossier.findFirst({ where: { id: proforma.dossierId, societeId: req.user!.societeId } });
      if (dossier && STATUTS_DOSSIER_FERME.includes(dossier.statut)) {
        ApiResponse.badRequest(res, `Impossible de créer une facture : le dossier ${dossier.numero} est ${dossier.statut.toLowerCase()}`); return;
      }
    }

    const numeroFacture = await genererNumero(req.user!.societeId, 'FACTURE');

    const montantPrestation = proforma.lignes
      .filter(l => !l.estTVA && (l.categorie === 'AUTRES FRAIS' || l.codePrestation?.startsWith('AF')))
      .reduce((s, l) => s + Number(l.prixUnitaire), 0);
    const tvaPrestation = proforma.lignes
      .filter(l => l.estTVA)
      .reduce((s, l) => s + Number(l.prixUnitaire), 0);

    const facture = await prisma.facture.create({
      data: {
        societeId: req.user!.societeId,
        numero: numeroFacture,
        type: 'FACTURE',
        clientId: proforma.clientId,
        dossierId: proforma.dossierId,
        createurId: req.user!.id,
        dateEcheance: new Date(Date.now() + 30 * 86400000),
        objet: proforma.titre || proforma.objet || `Facture issue de ${proforma.numero}`,
        titre: proforma.titre,
        montantHT: proforma.montantHT,
        montantTVA: proforma.montantTVA,
        montantTTC: proforma.montantTTC,
        resteAPayer: proforma.montantTTC,
        montantPrestation: montantPrestation || null,
        tvaPrestation: tvaPrestation || null,
        proformaSourceId: proforma.id,
        tauxTVA: 18,
        lignes: {
          create: proforma.lignes.map(l => ({
            ordre: l.ordre,
            categorie: l.categorie,
            codePrestation: l.codePrestation,
            designation: l.designation,
            estTVA: l.estTVA,
            quantite: l.quantite,
            prixUnitaire: l.prixUnitaire,
            montantHT: l.montantHT,
            tauxTVA: l.tauxTVA,
            montantTVA: l.montantTVA,
            remise: l.remise,
          })),
        },
      },
      include: { lignes: true, client: { select: { raisonSociale: true } } },
    });

    await prisma.proforma.update({
      where: { id: req.params.id },
      data: { factureId: facture.id, statut: 'TRANSFORMEE' },
    });

    ApiResponse.created(res, facture, `Facture ${numeroFacture} créée à partir de ${proforma.numero}`);
  } catch (e: any) { ApiResponse.badRequest(res, e.message); }
});

router.delete('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const p = await prisma.proforma.findFirst({ where: { id: req.params.id } });
    if (p?.factureId) { ApiResponse.badRequest(res, 'Impossible de supprimer: déjà transformée en facture'); return; }
    await prisma.proforma.delete({ where: { id: req.params.id } });
    ApiResponse.success(res, null, 'Proforma supprimée');
  } catch (e: any) { ApiResponse.badRequest(res, e.message); }
});

export default router;

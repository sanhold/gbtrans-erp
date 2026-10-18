import { Router, Response } from 'express';
import { authenticate, authorize, requireSociete } from '../../middleware/auth';
import { audit } from '../../middleware/audit';
import { AuthRequest } from '../../types';
import { ApiResponse } from '../../utils/apiResponse';
import prisma from '../../config/database';
import { genererNumero } from '../../utils/numerotation';
import { STATUTS_DOSSIER_FERME, assertDossierOuvert } from '../../utils/dossierGuard';

const router = Router();
router.use(authenticate, requireSociete);

// ===== CATALOGUE PRESTATIONS =====

router.get('/catalogue', authorize('PROFORMAS:LIRE'), async (req: AuthRequest, res: Response) => {
  try {
    const data = await prisma.prestationCatalogue.findMany({
      where: { societeId: req.user!.societeId, actif: true },
      orderBy: [{ categorie: 'asc' }, { ordre: 'asc' }],
    });
    ApiResponse.success(res, data);
  } catch (e: any) { ApiResponse.error(res, e.message); }
});

// ===== MODÈLES DE CATALOGUE (remplissage automatique d'une proforma) =====

type LigneModele = { categorie: string; codePrestation: string | null; designation: string; montant: number; estTVA: boolean };

// Modèles types créés au premier accès, à partir du catalogue de prestations de la société.
const MODELES_PAR_DEFAUT: { nom: string; description: string; codes?: string[]; categories?: string[] }[] = [
  { nom: 'Transit import — dédouanement standard', description: 'Ouverture de dossier, droits et taxes, visite, commission, frais de dossier.',
    codes: ['DC-013', 'DOU-LIQ', 'DOU-VIS', 'DC-006', 'DC-001', 'DC-004', 'DIV-DOS', 'DIV-TIM', 'DIV-COU'] },
  { nom: 'Import avec compagnie maritime', description: 'Frais de compagnie (magasinage, surestarie, BSC, retrait documentaire) et échange BL.',
    categories: ['COMPAGNIE MARITIME'], codes: ['DC-004', 'DOU-LIQ', 'DOU-VIS', 'DIV-DOS'] },
  { nom: 'Export et fret', description: 'Toutes les prestations export et fret du catalogue.', categories: ['EXPORT ET FRET'] },
  { nom: 'Transport', description: 'Toutes les prestations de transport du catalogue.', categories: ['TRANSPORT'] },
];

async function creerModelesParDefaut(societeId: string) {
  const catalogue = await prisma.prestationCatalogue.findMany({ where: { societeId, actif: true }, orderBy: [{ categorie: 'asc' }, { ordre: 'asc' }] });
  const enLigne = (p: (typeof catalogue)[number]): LigneModele => ({
    categorie: p.categorie, codePrestation: p.code, designation: p.designation, montant: Number(p.montantDefaut) || 0, estTVA: p.estTVA,
  });
  let ordre = 1;
  for (const def of MODELES_PAR_DEFAUT) {
    const lignes: LigneModele[] = [];
    for (const cat of def.categories || []) catalogue.filter(p => p.categorie === cat).forEach(p => lignes.push(enLigne(p)));
    for (const code of def.codes || []) {
      const p = catalogue.find(x => x.code === code);
      if (p && !lignes.some(l => l.codePrestation === code)) lignes.push(enLigne(p));
    }
    if (lignes.length === 0) continue;
    await prisma.modeleCatalogue.create({ data: { societeId, nom: def.nom, description: def.description, lignes: lignes as any, ordre: ordre++ } });
  }
}

function lignesModeleValides(v: unknown): LigneModele[] | null {
  if (!Array.isArray(v) || v.length > 200) return null;
  const out: LigneModele[] = [];
  for (const l of v) {
    if (!l || typeof l.designation !== 'string' || !l.designation.trim() || typeof l.categorie !== 'string') return null;
    out.push({ categorie: l.categorie.slice(0, 100), codePrestation: l.codePrestation ? String(l.codePrestation).slice(0, 50) : null, designation: l.designation.slice(0, 500), montant: Number(l.montant) || 0, estTVA: !!l.estTVA });
  }
  return out;
}

router.get('/modeles-catalogue', authorize('PROFORMAS:LIRE'), async (req: AuthRequest, res: Response) => {
  try {
    const societeId = req.user!.societeId;
    if ((await prisma.modeleCatalogue.count({ where: { societeId } })) === 0) await creerModelesParDefaut(societeId);
    const data = await prisma.modeleCatalogue.findMany({ where: { societeId, actif: true }, orderBy: [{ ordre: 'asc' }, { nom: 'asc' }] });
    ApiResponse.success(res, data);
  } catch (e: any) { ApiResponse.error(res, e.message); }
});

router.post('/modeles-catalogue', authorize('PROFORMAS:CREER'), async (req: AuthRequest, res: Response) => {
  try {
    const { nom, description } = req.body;
    const lignes = lignesModeleValides(req.body.lignes);
    if (!nom || !String(nom).trim() || !lignes || lignes.length === 0) { ApiResponse.badRequest(res, 'Nom et au moins une ligne valide requis'); return; }
    const count = await prisma.modeleCatalogue.count({ where: { societeId: req.user!.societeId } });
    const m = await prisma.modeleCatalogue.create({ data: { societeId: req.user!.societeId, nom: String(nom).slice(0, 150), description: description ? String(description).slice(0, 500) : null, lignes: lignes as any, ordre: count + 1 } });
    ApiResponse.created(res, m, 'Modèle enregistré');
  } catch (e: any) { ApiResponse.badRequest(res, e.message); }
});

router.delete('/modeles-catalogue/:id', authorize('PROFORMAS:MODIFIER'), async (req: AuthRequest, res: Response) => {
  try {
    const r = await prisma.modeleCatalogue.updateMany({ where: { id: req.params.id, societeId: req.user!.societeId }, data: { actif: false } });
    if (r.count === 0) { ApiResponse.notFound(res, 'Modèle non trouvé'); return; }
    ApiResponse.success(res, null, 'Modèle supprimé');
  } catch (e: any) { ApiResponse.badRequest(res, e.message); }
});

router.post('/catalogue', authorize('PROFORMAS:CREER'), async (req: AuthRequest, res: Response) => {
  try {
    const p = await prisma.prestationCatalogue.create({
      data: { ...req.body, societeId: req.user!.societeId },
    });
    ApiResponse.created(res, p, 'Prestation ajoutée au catalogue');
  } catch (e: any) { ApiResponse.badRequest(res, e.message); }
});

router.put('/catalogue/:id', authorize('PROFORMAS:MODIFIER'), async (req: AuthRequest, res: Response) => {
  try {
    const existing = await prisma.prestationCatalogue.findFirst({ where: { id: req.params.id, societeId: req.user!.societeId } });
    if (!existing) { ApiResponse.notFound(res); return; }
    const { categorie, code, designation, montantDefaut, tauxTVA, estTVA, ordre, actif } = req.body;
    const p = await prisma.prestationCatalogue.update({
      where: { id: req.params.id },
      data: { categorie, code, designation, montantDefaut, tauxTVA, estTVA, ordre, actif },
    });
    ApiResponse.success(res, p, 'Prestation modifiée');
  } catch (e: any) { ApiResponse.badRequest(res, e.message); }
});

router.delete('/catalogue/:id', authorize('PROFORMAS:SUPPRIMER'), async (req: AuthRequest, res: Response) => {
  try {
    const existing = await prisma.prestationCatalogue.findFirst({ where: { id: req.params.id, societeId: req.user!.societeId } });
    if (!existing) { ApiResponse.notFound(res); return; }
    await prisma.prestationCatalogue.delete({ where: { id: req.params.id } });
    ApiResponse.success(res, null, 'Prestation supprimée');
  } catch (e: any) { ApiResponse.badRequest(res, e.message); }
});

// ===== PROFORMAS =====

router.get('/', authorize('PROFORMAS:LIRE'), async (req: AuthRequest, res: Response) => {
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
        where, skip, take: Math.min(parseInt(limit as string) || 20, 100),
        orderBy: { dateProforma: 'desc' },
        relationLoadStrategy: 'join', include: {
          client: { select: { id: true, code: true, raisonSociale: true } },
          dossier: { select: { id: true, numero: true, numeroPhysique: true } },
          _count: { select: { lignes: true } },
        },
      }),
      prisma.proforma.count({ where }),
    ]);
    ApiResponse.paginated(res, data, total, parseInt(page as string), parseInt(limit as string));
  } catch (e: any) { ApiResponse.error(res, e.message); }
});

// Liste proformas en attente de facturation (AVANT /:id)
router.get('/en-attente', authorize('PROFORMAS:LIRE'), async (req: AuthRequest, res: Response) => {
  try {
    const data = await prisma.proforma.findMany({
      where: {
        statut: 'EN_ATTENTE_FACTURATION',
        factureId: null,
        client: { societeId: req.user!.societeId },
      },
      relationLoadStrategy: 'join', include: {
        client: { select: { id: true, code: true, raisonSociale: true } },
        dossier: { select: { id: true, numero: true, numeroPhysique: true } },
        lignes: { orderBy: { ordre: 'asc' } },
      },
      orderBy: { dateProforma: 'desc' },
    });
    ApiResponse.success(res, data);
  } catch (e: any) { ApiResponse.error(res, e.message); }
});

router.get('/:id', authorize('PROFORMAS:LIRE'), async (req: AuthRequest, res: Response) => {
  try {
    const p = await prisma.proforma.findFirst({
      where: { id: req.params.id, client: { societeId: req.user!.societeId } },
      relationLoadStrategy: 'join', include: {
        client: true,
        dossier: {
          select: {
            id: true, numero: true, numeroPhysique: true, nature: true, valeurFOB: true, fret: true, assurance: true, valeurCAF: true, designation: true,
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

router.post('/', authorize('PROFORMAS:CREER'), audit('PROFORMAS', 'CREER'), async (req: AuthRequest, res: Response) => {
  try {
    const { clientId, dossierId, titre, objet, fobUnitaire, fretUnitaire, assurance, fraisDivers, nombreUnites, observations, lignes, afficherSignature } = req.body;

    if (dossierId) {
      const dossier = await prisma.dossier.findFirst({ where: { id: dossierId, societeId: req.user!.societeId } });
      if (!dossier) { ApiResponse.notFound(res, 'Dossier introuvable'); return; }
      if (STATUTS_DOSSIER_FERME.includes(dossier.statut)) {
        ApiResponse.badRequest(res, `Impossible de créer une proforma : le dossier ${dossier.numero} est ${dossier.statut.toLowerCase()}`); return;
      }
    }

    const client = await prisma.client.findFirst({ where: { id: clientId, societeId: req.user!.societeId } });
    if (!client) { ApiResponse.notFound(res, 'Client introuvable'); return; }

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
        afficherSignature: !!afficherSignature,
        lignes: { create: lignesData },
      },
      include: { lignes: { orderBy: { ordre: 'asc' } }, client: { select: { raisonSociale: true } } },
    });

    ApiResponse.created(res, proforma, `Proforma ${numero} créée`);
  } catch (e: any) { ApiResponse.badRequest(res, e.message); }
});

router.put('/:id', authorize('PROFORMAS:MODIFIER'), audit('PROFORMAS', 'MODIFIER'), async (req: AuthRequest, res: Response) => {
  try {
    const existing = await prisma.proforma.findFirst({ where: { id: req.params.id, client: { societeId: req.user!.societeId } } });
    if (!existing) { ApiResponse.notFound(res, 'Proforma non trouvée'); return; }
    if (existing.factureId || existing.statut === 'TRANSFORMEE') {
      ApiResponse.badRequest(res, 'Impossible de modifier : cette proforma a déjà été transformée en facture'); return;
    }
    if (existing.statut !== 'BROUILLON') {
      ApiResponse.badRequest(res, `Impossible de modifier une proforma ${existing.statut.toLowerCase().replace(/_/g, ' ')} ; repassez-la d'abord en brouillon`); return;
    }
    if (existing.dossierId) await assertDossierOuvert(existing.dossierId, req.user!.societeId);

    const { titre, objet, fobUnitaire, fretUnitaire, assurance, fraisDivers, nombreUnites, observations, lignes, afficherSignature } = req.body;

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
        afficherSignature: afficherSignature != null ? !!afficherSignature : undefined,
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

router.patch('/:id/valider', authorize('PROFORMAS:MODIFIER'), audit('PROFORMAS', 'VALIDER'), async (req: AuthRequest, res: Response) => {
  try {
    const proforma = await prisma.proforma.findFirst({ where: { id: req.params.id, client: { societeId: req.user!.societeId } } });
    if (!proforma) { ApiResponse.notFound(res, 'Proforma non trouvée'); return; }
    if (proforma.factureId) { ApiResponse.badRequest(res, 'Proforma déjà facturée'); return; }
    if (proforma.statut !== 'BROUILLON') { ApiResponse.badRequest(res, 'Seule une proforma en brouillon peut être validée'); return; }

    const updated = await prisma.proforma.update({
      where: { id: req.params.id },
      data: { statut: 'EN_ATTENTE_FACTURATION' },
      include: { lignes: { orderBy: { ordre: 'asc' } }, client: true },
    });

    // Un dossier « Nouveau » passe « En cours » dès que sa proforma est validée.
    if (updated.dossierId) {
      const dossierActuel = await prisma.dossier.findFirst({ where: { id: updated.dossierId, societeId: req.user!.societeId }, select: { statut: true } });
      if (dossierActuel?.statut === 'NOUVEAU') {
        await prisma.dossier.update({ where: { id: updated.dossierId }, data: { statut: 'EN_COURS' } });
        await prisma.historiqueDossier.create({
          data: {
            dossierId: updated.dossierId,
            action: 'CHANGEMENT_STATUT',
            statutAvant: 'NOUVEAU',
            statutApres: 'EN_COURS',
            commentaire: `Passage automatique en cours suite à la validation de la proforma ${updated.numero}`,
            utilisateur: 'Système',
          },
        });
      }
    }

    ApiResponse.success(res, updated, 'Proforma validée — en attente de facturation');
  } catch (e: any) { ApiResponse.badRequest(res, e.message); }
});

// Dévalidation explicite : repasse une proforma validée (en attente de facturation) en
// brouillon pour permettre sa modification. Jamais possible si déjà transformée en facture.
router.patch('/:id/devalider', authorize('PROFORMAS:MODIFIER'), audit('PROFORMAS', 'MODIFIER'), async (req: AuthRequest, res: Response) => {
  try {
    const proforma = await prisma.proforma.findFirst({ where: { id: req.params.id, client: { societeId: req.user!.societeId } } });
    if (!proforma) { ApiResponse.notFound(res, 'Proforma non trouvée'); return; }
    if (proforma.factureId || proforma.statut === 'TRANSFORMEE') {
      ApiResponse.badRequest(res, 'Impossible de dévalider : cette proforma a déjà été transformée en facture'); return;
    }
    if (proforma.statut !== 'EN_ATTENTE_FACTURATION') {
      ApiResponse.badRequest(res, 'Seule une proforma validée (en attente de facturation) peut être repassée en brouillon'); return;
    }

    const updated = await prisma.proforma.update({
      where: { id: req.params.id },
      data: { statut: 'BROUILLON' },
      include: { lignes: { orderBy: { ordre: 'asc' } }, client: true },
    });

    ApiResponse.success(res, updated, 'Proforma repassée en brouillon');
  } catch (e: any) { ApiResponse.badRequest(res, e.message); }
});


// ===== TRANSFORMER PROFORMA EN FACTURE =====

router.post('/:id/transformer-facture', authorize('PROFORMAS:MODIFIER'), audit('PROFORMAS', 'TRANSFORMER'), async (req: AuthRequest, res: Response) => {
  try {
    const proforma = await prisma.proforma.findFirst({
      where: { id: req.params.id, client: { societeId: req.user!.societeId } },
      relationLoadStrategy: 'join', include: { lignes: { orderBy: { ordre: 'asc' } }, client: true },
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
        afficherSignature: proforma.afficherSignature,
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

router.delete('/:id', authorize('PROFORMAS:SUPPRIMER'), audit('PROFORMAS', 'SUPPRIMER'), async (req: AuthRequest, res: Response) => {
  try {
    const p = await prisma.proforma.findFirst({ where: { id: req.params.id, client: { societeId: req.user!.societeId } } });
    if (!p) { ApiResponse.notFound(res); return; }
    if (p.factureId || p.statut === 'TRANSFORMEE') {
      ApiResponse.badRequest(res, 'Impossible de supprimer: déjà transformée en facture'); return;
    }
    if (p.statut !== 'BROUILLON') {
      ApiResponse.badRequest(res, `Impossible de supprimer une proforma ${p.statut.toLowerCase().replace(/_/g, ' ')} ; repassez-la d'abord en brouillon`); return;
    }
    if (p.dossierId) await assertDossierOuvert(p.dossierId, req.user!.societeId);
    await prisma.proforma.delete({ where: { id: req.params.id } });
    ApiResponse.success(res, null, 'Proforma supprimée');
  } catch (e: any) { ApiResponse.badRequest(res, e.message); }
});

export default router;

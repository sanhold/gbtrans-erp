import { Router, Response } from 'express';
import multer from 'multer';
import * as XLSX from 'xlsx';
import { authenticate, requireSociete } from '../../middleware/auth';
import { AuthRequest } from '../../types';
import { ApiResponse } from '../../utils/apiResponse';
import prisma from '../../config/database';
import { assertDossierOuvert } from '../../utils/dossierGuard';

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

router.use(authenticate, requireSociete);

// Liste articles d'un dossier
router.get('/dossier/:dossierId', async (req: AuthRequest, res: Response) => {
  try {
    const articles = await prisma.article.findMany({
      where: { dossierId: req.params.dossierId },
      orderBy: { numero: 'asc' },
    });
    ApiResponse.success(res, articles);
  } catch (e: any) { ApiResponse.error(res, e.message); }
});

// Créer un article
router.post('/dossier/:dossierId', async (req: AuthRequest, res: Response) => {
  try {
    const dossierId = req.params.dossierId;
    await assertDossierOuvert(dossierId, req.user!.societeId);

    const lastArticle = await prisma.article.findFirst({
      where: { dossierId },
      orderBy: { numero: 'desc' },
      select: { numero: true },
    });
    const nextNumero = (lastArticle?.numero || 0) + 1;

    const article = await prisma.article.create({
      data: {
        dossierId,
        numero: nextNumero,
        designation: req.body.designation,
        type: req.body.type || null,
        marque: req.body.marque || null,
        modele: req.body.modele || null,
        quantite: req.body.quantite || 1,
        unite: req.body.unite || null,
        positionTarifaire: req.body.positionTarifaire || null,
        poids: req.body.poids || null,
        valeur: req.body.valeur || null,
        origine: req.body.origine || null,
        dateLivraison: req.body.dateLivraison ? new Date(req.body.dateLivraison) : null,
        bonLivraison: req.body.bonLivraison || null,
        observations: req.body.observations || null,
      },
    });
    ApiResponse.created(res, article, 'Article ajouté');
  } catch (e: any) { ApiResponse.badRequest(res, e.message); }
});

// Modifier un article
router.put('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const existing = await prisma.article.findFirst({ where: { id: req.params.id } });
    if (!existing) { ApiResponse.notFound(res, 'Article non trouvé'); return; }
    await assertDossierOuvert(existing.dossierId, req.user!.societeId);

    const article = await prisma.article.update({
      where: { id: req.params.id },
      data: {
        designation: req.body.designation,
        type: req.body.type,
        marque: req.body.marque,
        modele: req.body.modele,
        quantite: req.body.quantite,
        unite: req.body.unite,
        positionTarifaire: req.body.positionTarifaire,
        poids: req.body.poids,
        valeur: req.body.valeur,
        origine: req.body.origine,
        dateLivraison: req.body.dateLivraison ? new Date(req.body.dateLivraison) : null,
        bonLivraison: req.body.bonLivraison,
        observations: req.body.observations,
      },
    });
    ApiResponse.success(res, article, 'Article modifié');
  } catch (e: any) { ApiResponse.badRequest(res, e.message); }
});

// Supprimer un article
router.delete('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const existing = await prisma.article.findFirst({ where: { id: req.params.id } });
    if (!existing) { ApiResponse.notFound(res, 'Article non trouvé'); return; }
    await assertDossierOuvert(existing.dossierId, req.user!.societeId);

    await prisma.article.delete({ where: { id: req.params.id } });
    ApiResponse.success(res, null, 'Article supprimé');
  } catch (e: any) { ApiResponse.badRequest(res, e.message); }
});

// Import Excel
router.post('/dossier/:dossierId/import-excel', upload.single('file'), async (req: AuthRequest, res: Response) => {
  try {
    const dossierId = req.params.dossierId;
    await assertDossierOuvert(dossierId, req.user!.societeId);
    if (!req.file) { ApiResponse.badRequest(res, 'Fichier requis'); return; }

    const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const rows: any[] = XLSX.utils.sheet_to_json(sheet);

    if (rows.length === 0) { ApiResponse.badRequest(res, 'Fichier vide'); return; }

    const lastArticle = await prisma.article.findFirst({
      where: { dossierId },
      orderBy: { numero: 'desc' },
      select: { numero: true },
    });
    let currentNumero = (lastArticle?.numero || 0);

    const columnMap: Record<string, string> = {
      'n°': 'numero', 'no': 'numero', 'numero': 'numero', 'n° article': 'numero',
      'designation': 'designation', 'désignation': 'designation', 'description': 'designation', 'libelle': 'designation', 'libellé': 'designation',
      'type': 'type', 'categorie': 'type', 'catégorie': 'type',
      'marque': 'marque', 'brand': 'marque',
      'modele': 'modele', 'modèle': 'modele', 'model': 'modele',
      'quantite': 'quantite', 'quantité': 'quantite', 'qte': 'quantite', 'qty': 'quantite', 'nbre': 'quantite', 'nombre': 'quantite',
      'unite': 'unite', 'unité': 'unite', 'unit': 'unite',
      'position tarifaire': 'positionTarifaire', 'position': 'positionTarifaire', 'sh code': 'positionTarifaire', 'hs code': 'positionTarifaire', 'tarif': 'positionTarifaire',
      'poids': 'poids', 'weight': 'poids', 'poids (kg)': 'poids',
      'valeur': 'valeur', 'value': 'valeur', 'montant': 'valeur', 'prix': 'valeur',
      'origine': 'origine', 'origin': 'origine', 'pays': 'origine',
      'date livraison': 'dateLivraison', 'date de livraison': 'dateLivraison',
      'bon livraison': 'bonLivraison', 'n° bon livraison': 'bonLivraison', 'bl': 'bonLivraison',
      'observations': 'observations', 'remarques': 'observations', 'notes': 'observations',
    };

    const articles = [];
    for (const row of rows) {
      const mapped: any = {};
      for (const [key, value] of Object.entries(row)) {
        const normalizedKey = key.toLowerCase().trim();
        const fieldName = columnMap[normalizedKey];
        if (fieldName) mapped[fieldName] = value;
      }

      if (!mapped.designation && !mapped.type) continue;

      currentNumero++;
      articles.push({
        dossierId,
        numero: currentNumero,
        designation: String(mapped.designation || 'Article importé'),
        type: mapped.type ? String(mapped.type) : null,
        marque: mapped.marque ? String(mapped.marque) : null,
        modele: mapped.modele ? String(mapped.modele) : null,
        quantite: mapped.quantite ? parseFloat(String(mapped.quantite)) : 1,
        unite: mapped.unite ? String(mapped.unite) : null,
        positionTarifaire: mapped.positionTarifaire ? String(mapped.positionTarifaire) : null,
        poids: mapped.poids ? parseFloat(String(mapped.poids)) : null,
        valeur: mapped.valeur ? parseFloat(String(mapped.valeur)) : null,
        origine: mapped.origine ? String(mapped.origine) : null,
        bonLivraison: mapped.bonLivraison ? String(mapped.bonLivraison) : null,
        observations: mapped.observations ? String(mapped.observations) : null,
      });
    }

    if (articles.length === 0) { ApiResponse.badRequest(res, 'Aucun article valide trouvé dans le fichier'); return; }

    const result = await prisma.article.createMany({ data: articles });
    ApiResponse.created(res, { count: result.count, articles }, `${result.count} article(s) importé(s)`);
  } catch (e: any) { ApiResponse.badRequest(res, e.message); }
});

export default router;

import { Router, Response } from 'express';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { authenticate, authorize, requireSociete } from '../../middleware/auth';
import { AuthRequest } from '../../types';
import { ApiResponse } from '../../utils/apiResponse';
import prisma from '../../config/database';
import { Prisma } from '@prisma/client';

const router = Router();

// Liste blanche des formats de documents de transit/transport acceptés à l'archivage.
const EXTENSIONS_AUTORISEES = new Set(['pdf', 'jpg', 'jpeg', 'png', 'doc', 'docx', 'xls', 'xlsx']);
const MIMES_AUTORISES = new Set([
  'application/pdf',
  'image/jpeg', 'image/png',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
]);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const extension = path.extname(file.originalname).replace('.', '').toLowerCase();
    if (!EXTENSIONS_AUTORISEES.has(extension) || !MIMES_AUTORISES.has(file.mimetype)) {
      cb(new Error('Type de fichier non autorisé. Formats acceptés : PDF, JPG, PNG, DOC(X), XLS(X).'));
      return;
    }
    cb(null, true);
  },
});

const UPLOAD_ROOT = path.join(__dirname, '../../../uploads');

router.use(authenticate, requireSociete);

router.get('/', authorize('ARCHIVES:LIRE'), async (req: AuthRequest, res: Response) => {
  try {
    const { page = '1', limit = '20', categorie, dossierId, clientId, admissionTemporaireId, search } = req.query;
    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
    const where: Prisma.DocumentWhereInput = {
      societeId: req.user!.societeId,
      ...(categorie && { categorie: categorie as any }),
      ...(dossierId && { dossierId: dossierId as string }),
      ...(clientId && { clientId: clientId as string }),
      ...(admissionTemporaireId && { admissionTemporaireId: admissionTemporaireId as string }),
      ...(search && {
        OR: [
          { nomOriginal: { contains: search as string, mode: 'insensitive' as const } },
          { description: { contains: search as string, mode: 'insensitive' as const } },
        ],
      }),
    };
    const [data, total] = await Promise.all([
      prisma.document.findMany({
        where, skip, take: Math.min(parseInt(limit as string) || 20, 100),
        orderBy: { createdAt: 'desc' },
        relationLoadStrategy: 'join', include: {
          dossier: { select: { id: true, numero: true, numeroPhysique: true } },
          admissionTemporaire: { select: { id: true, numero: true } },
          client: { select: { id: true, raisonSociale: true } },
        },
      }),
      prisma.document.count({ where }),
    ]);
    ApiResponse.paginated(res, data, total, parseInt(page as string), parseInt(limit as string));
  } catch (e: any) { ApiResponse.error(res, e.message); }
});

// Comptage par catégorie (pour les cartes de filtre) — évite de charger tous les documents côté client
router.get('/comptage-categories', authorize('ARCHIVES:LIRE'), async (req: AuthRequest, res: Response) => {
  try {
    const groupes = await prisma.document.groupBy({
      by: ['categorie'],
      where: { societeId: req.user!.societeId },
      _count: true,
    });
    const counts: Record<string, number> = {};
    for (const g of groupes) counts[g.categorie] = g._count;
    ApiResponse.success(res, counts);
  } catch (e: any) { ApiResponse.error(res, e.message); }
});

// Sert le fichier physique d'un document archivé, après vérification qu'il appartient bien
// à la société de l'utilisateur authentifié. Content-Disposition: attachment force le
// téléchargement (neutralise un éventuel HTML/JS malveillant qui serait exécuté en ligne).
router.get('/:id/fichier', authorize('ARCHIVES:LIRE'), async (req: AuthRequest, res: Response) => {
  try {
    const doc = await prisma.document.findFirst({ where: { id: req.params.id, societeId: req.user!.societeId } });
    if (!doc) { ApiResponse.notFound(res, 'Document introuvable'); return; }

    const cheminAbsolu = path.join(UPLOAD_ROOT, doc.chemin);
    if (!cheminAbsolu.startsWith(UPLOAD_ROOT) || !fs.existsSync(cheminAbsolu)) {
      ApiResponse.notFound(res, 'Fichier introuvable'); return;
    }

    res.download(cheminAbsolu, doc.nomOriginal);
  } catch (e: any) { ApiResponse.error(res, e.message); }
});

router.post('/', authorize('ARCHIVES:CREER'), upload.single('file'), async (req: AuthRequest, res: Response) => {
  try {
    if (!req.file) { ApiResponse.badRequest(res, 'Fichier requis'); return; }
    const societeId = req.user!.societeId;
    const { categorie, description, dossierId, clientId, fournisseurId, admissionTemporaireId, cautionId } = req.body;
    if (!categorie) { ApiResponse.badRequest(res, 'Catégorie requise'); return; }

    if (dossierId) {
      const dossier = await prisma.dossier.findFirst({ where: { id: dossierId, societeId } });
      if (!dossier) { ApiResponse.badRequest(res, 'Dossier introuvable'); return; }
    }
    if (clientId) {
      const client = await prisma.client.findFirst({ where: { id: clientId, societeId } });
      if (!client) { ApiResponse.badRequest(res, 'Client introuvable'); return; }
    }
    if (fournisseurId) {
      const fournisseur = await prisma.fournisseur.findFirst({ where: { id: fournisseurId, societeId } });
      if (!fournisseur) { ApiResponse.badRequest(res, 'Fournisseur introuvable'); return; }
    }
    if (admissionTemporaireId) {
      const at = await prisma.admissionTemporaire.findFirst({ where: { id: admissionTemporaireId, societeId } });
      if (!at) { ApiResponse.badRequest(res, 'Admission temporaire introuvable'); return; }
    }
    if (cautionId) {
      const caution = await prisma.caution.findFirst({ where: { id: cautionId, societeId } });
      if (!caution) { ApiResponse.badRequest(res, 'Caution introuvable'); return; }
    }

    const extension = (path.extname(req.file.originalname) || '.bin').replace('.', '');
    const nom = `${crypto.randomUUID()}.${extension}`;
    const relativeDir = path.join('documents', societeId);
    const absoluteDir = path.join(UPLOAD_ROOT, relativeDir);
    fs.mkdirSync(absoluteDir, { recursive: true });
    fs.writeFileSync(path.join(absoluteDir, nom), req.file.buffer);

    const doc = await prisma.document.create({
      data: {
        societeId, nom, nomOriginal: req.file.originalname,
        chemin: path.join(relativeDir, nom).replace(/\\/g, '/'),
        taille: req.file.size, typeMime: req.file.mimetype, extension,
        categorie, description: description || null,
        dossierId: dossierId || null, clientId: clientId || null,
        fournisseurId: fournisseurId || null, admissionTemporaireId: admissionTemporaireId || null,
        cautionId: cautionId || null,
      },
    });
    ApiResponse.created(res, doc, 'Document archivé');
  } catch (e: any) { ApiResponse.badRequest(res, e.message); }
});

export default router;

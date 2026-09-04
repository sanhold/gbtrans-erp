import { Router, Response } from 'express';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { authenticate, requireSociete } from '../../middleware/auth';
import { AuthRequest } from '../../types';
import { ApiResponse } from '../../utils/apiResponse';
import prisma from '../../config/database';
import { Prisma } from '@prisma/client';

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

const UPLOAD_ROOT = path.join(__dirname, '../../../uploads');

router.use(authenticate, requireSociete);

router.get('/', async (req: AuthRequest, res: Response) => {
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
        where, skip, take: parseInt(limit as string),
        orderBy: { createdAt: 'desc' },
        include: {
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
router.get('/comptage-categories', async (req: AuthRequest, res: Response) => {
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

router.post('/', upload.single('file'), async (req: AuthRequest, res: Response) => {
  try {
    if (!req.file) { ApiResponse.badRequest(res, 'Fichier requis'); return; }
    const societeId = req.user!.societeId;
    const { categorie, description, dossierId, clientId, fournisseurId, admissionTemporaireId, cautionId } = req.body;
    if (!categorie) { ApiResponse.badRequest(res, 'Catégorie requise'); return; }

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

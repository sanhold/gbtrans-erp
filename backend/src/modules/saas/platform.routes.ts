/**
 * Espace super-admin de la plateforme (vous) : vue d'ensemble des societes clientes et
 * de leur abonnement. Volontairement minimal pour cette premiere version — pas encore
 * d'interface dediee cote frontend, a construire dans une prochaine etape.
 */
import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../../config/database';
import { config } from '../../config';
import { ApiResponse } from '../../utils/apiResponse';

const router = Router();

interface PlatformRequest extends Request {
  platformAdminId?: string;
  platformSuperAdmin?: boolean;
}

async function authenticatePlatform(req: PlatformRequest, res: Response, next: () => void) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) { ApiResponse.unauthorized(res, 'Token manquant'); return; }
    const token = authHeader.split(' ')[1];
    const payload = jwt.verify(token, config.jwt.secret) as any;
    if (payload.type !== 'platform') { ApiResponse.unauthorized(res, 'Token invalide'); return; }
    const admin = await prisma.platformAdmin.findUnique({ where: { id: payload.id } });
    if (!admin || !admin.actif) { ApiResponse.unauthorized(res, 'Accès refusé'); return; }
    req.platformAdminId = admin.id;
    req.platformSuperAdmin = admin.superAdmin;
    next();
  } catch {
    ApiResponse.unauthorized(res, 'Token invalide ou expiré');
  }
}

/** Les comptes non super-admin (ex: compte de demonstration) ne peuvent que consulter. */
function requireSuperAdmin(req: PlatformRequest, res: Response, next: () => void) {
  if (!req.platformSuperAdmin) { ApiResponse.unauthorized(res, "Ce compte est en lecture seule : action reservee a l'administrateur principal"); return; }
  next();
}

router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, motDePasse } = req.body;
    const admin = await prisma.platformAdmin.findUnique({ where: { email } });
    if (!admin || !admin.actif || !(await bcrypt.compare(motDePasse || '', admin.motDePasse))) {
      ApiResponse.unauthorized(res, 'Identifiants incorrects'); return;
    }
    const token = jwt.sign({ id: admin.id, type: 'platform' }, config.jwt.secret, { expiresIn: '12h' });
    ApiResponse.success(res, { token, admin: { id: admin.id, nom: admin.nom, prenom: admin.prenom, email: admin.email, superAdmin: admin.superAdmin } });
  } catch (e: any) { ApiResponse.badRequest(res, e.message); }
});

router.get('/societes', authenticatePlatform, async (_req: Request, res: Response) => {
  try {
    const societes = await prisma.societe.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        abonnement: { include: { plan: { select: { nom: true, code: true } } } },
        _count: { select: { utilisateurs: true, dossiers: true } },
      },
    });
    ApiResponse.success(res, societes);
  } catch (e: any) { ApiResponse.error(res, e.message); }
});

router.patch('/societes/:id/abonnement', authenticatePlatform, requireSuperAdmin, async (req: Request, res: Response) => {
  try {
    const { statut, dateFin } = req.body as { statut?: string; dateFin?: string };
    const abonnement = await prisma.abonnement.findUnique({ where: { societeId: req.params.id } });
    if (!abonnement) { ApiResponse.notFound(res, 'Abonnement introuvable'); return; }
    const updated = await prisma.abonnement.update({
      where: { id: abonnement.id },
      data: { ...(statut && { statut: statut as any }), ...(dateFin && { dateFin: new Date(dateFin) }) },
    });
    ApiResponse.success(res, updated, 'Abonnement mis à jour manuellement');
  } catch (e: any) { ApiResponse.badRequest(res, e.message); }
});

router.get('/plans', authenticatePlatform, async (_req: Request, res: Response) => {
  try {
    const plans = await prisma.plan.findMany({ orderBy: { ordre: 'asc' } });
    ApiResponse.success(res, plans);
  } catch (e: any) { ApiResponse.error(res, e.message); }
});

router.put('/plans/:id', authenticatePlatform, requireSuperAdmin, async (req: Request, res: Response) => {
  try {
    const { nom, description, prixMensuel, prixAnnuel, maxUtilisateurs, maxDossiersParMois, fonctionnalites, essaiJours, misEnAvant, ordre, actif } = req.body;
    const plan = await prisma.plan.update({
      where: { id: req.params.id },
      data: {
        ...(nom !== undefined && { nom }),
        ...(description !== undefined && { description }),
        ...(prixMensuel !== undefined && { prixMensuel }),
        ...(prixAnnuel !== undefined && { prixAnnuel }),
        ...(maxUtilisateurs !== undefined && { maxUtilisateurs }),
        ...(maxDossiersParMois !== undefined && { maxDossiersParMois }),
        ...(fonctionnalites !== undefined && { fonctionnalites }),
        ...(essaiJours !== undefined && { essaiJours }),
        ...(misEnAvant !== undefined && { misEnAvant }),
        ...(ordre !== undefined && { ordre }),
        ...(actif !== undefined && { actif }),
      },
    });
    ApiResponse.success(res, plan, 'Formule modifiée');
  } catch (e: any) { ApiResponse.badRequest(res, e.message); }
});

export default router;

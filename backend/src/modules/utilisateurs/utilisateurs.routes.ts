import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import { authenticate, authorize, requireSociete } from '../../middleware/auth';
import { AuthRequest } from '../../types';
import { ApiResponse } from '../../utils/apiResponse';
import prisma from '../../config/database';
import { config } from '../../config';

const router = Router();
router.use(authenticate, requireSociete);

const USER_SELECT = {
  id: true, matricule: true, nom: true, prenom: true, email: true, telephone: true,
  actif: true, verrouille: true, tentativesEchouees: true, derniereConnexion: true,
  doitChangerMdp: true, doubleAuth: true, profilId: true, agenceId: true, createdAt: true,
  profil: { select: { id: true, code: true, nom: true, estAdmin: true } },
  agence: { select: { id: true, nom: true } },
};

// ---------- Utilisateurs ----------

router.get('/', authorize('UTILISATEURS:LIRE'), async (req: AuthRequest, res: Response) => {
  try {
    const utilisateurs = await prisma.utilisateur.findMany({
      where: { societeId: req.user!.societeId },
      select: USER_SELECT,
      orderBy: { nom: 'asc' },
    });
    ApiResponse.success(res, utilisateurs);
  } catch (e: any) { ApiResponse.error(res, e.message); }
});

router.post('/', authorize('UTILISATEURS:CREER'), async (req: AuthRequest, res: Response) => {
  try {
    const { matricule, nom, prenom, email, telephone, motDePasse, profilId, agenceId } = req.body;
    if (!matricule || !nom || !prenom || !email || !motDePasse) {
      ApiResponse.badRequest(res, 'Matricule, nom, prénom, email et mot de passe sont requis');
      return;
    }
    const existing = await prisma.utilisateur.findFirst({ where: { OR: [{ email }, { matricule }] } });
    if (existing) { ApiResponse.badRequest(res, 'Un utilisateur avec cet email ou matricule existe déjà'); return; }

    const hashedPassword = await bcrypt.hash(motDePasse, 12);
    const utilisateur = await prisma.utilisateur.create({
      data: {
        societeId: req.user!.societeId,
        agenceId: agenceId || null,
        matricule, nom, prenom, email,
        telephone: telephone || null,
        motDePasse: hashedPassword,
        profilId: profilId || null,
        doitChangerMdp: true,
        expirationMdp: new Date(Date.now() + config.security.passwordExpiryDays * 24 * 60 * 60 * 1000),
      },
      select: USER_SELECT,
    });
    ApiResponse.created(res, utilisateur, 'Utilisateur créé');
  } catch (e: any) { ApiResponse.badRequest(res, e.message); }
});

router.put('/:id', authorize('UTILISATEURS:MODIFIER'), async (req: AuthRequest, res: Response) => {
  try {
    const existing = await prisma.utilisateur.findFirst({ where: { id: req.params.id, societeId: req.user!.societeId } });
    if (!existing) { ApiResponse.notFound(res, 'Utilisateur introuvable'); return; }

    const { nom, prenom, telephone, profilId, agenceId } = req.body;
    const utilisateur = await prisma.utilisateur.update({
      where: { id: req.params.id },
      data: {
        ...(nom !== undefined && { nom }),
        ...(prenom !== undefined && { prenom }),
        ...(telephone !== undefined && { telephone: telephone || null }),
        ...(profilId !== undefined && { profilId: profilId || null }),
        ...(agenceId !== undefined && { agenceId: agenceId || null }),
      },
      select: USER_SELECT,
    });
    ApiResponse.success(res, utilisateur, 'Utilisateur modifié');
  } catch (e: any) { ApiResponse.badRequest(res, e.message); }
});

router.patch('/:id/statut', authorize('UTILISATEURS:MODIFIER'), async (req: AuthRequest, res: Response) => {
  try {
    const existing = await prisma.utilisateur.findFirst({ where: { id: req.params.id, societeId: req.user!.societeId } });
    if (!existing) { ApiResponse.notFound(res, 'Utilisateur introuvable'); return; }
    if (existing.id === req.user!.id) { ApiResponse.badRequest(res, 'Vous ne pouvez pas désactiver votre propre compte'); return; }

    const actif = !existing.actif;
    const utilisateur = await prisma.utilisateur.update({
      where: { id: req.params.id },
      data: { actif },
      select: USER_SELECT,
    });
    if (!actif) {
      await prisma.session.updateMany({ where: { utilisateurId: req.params.id }, data: { actif: false } });
    }
    ApiResponse.success(res, utilisateur, actif ? 'Utilisateur activé' : 'Utilisateur désactivé');
  } catch (e: any) { ApiResponse.badRequest(res, e.message); }
});

router.patch('/:id/deverrouiller', authorize('UTILISATEURS:MODIFIER'), async (req: AuthRequest, res: Response) => {
  try {
    const existing = await prisma.utilisateur.findFirst({ where: { id: req.params.id, societeId: req.user!.societeId } });
    if (!existing) { ApiResponse.notFound(res, 'Utilisateur introuvable'); return; }
    const utilisateur = await prisma.utilisateur.update({
      where: { id: req.params.id },
      data: { verrouille: false, tentativesEchouees: 0 },
      select: USER_SELECT,
    });
    ApiResponse.success(res, utilisateur, 'Compte déverrouillé');
  } catch (e: any) { ApiResponse.badRequest(res, e.message); }
});

router.put('/:id/reset-password', authorize('UTILISATEURS:MODIFIER'), async (req: AuthRequest, res: Response) => {
  try {
    const { motDePasse } = req.body;
    if (!motDePasse || motDePasse.length < 8) { ApiResponse.badRequest(res, 'Le mot de passe doit contenir au moins 8 caractères'); return; }
    const existing = await prisma.utilisateur.findFirst({ where: { id: req.params.id, societeId: req.user!.societeId } });
    if (!existing) { ApiResponse.notFound(res, 'Utilisateur introuvable'); return; }

    const hashedPassword = await bcrypt.hash(motDePasse, 12);
    await prisma.utilisateur.update({
      where: { id: req.params.id },
      data: { motDePasse: hashedPassword, doitChangerMdp: true },
    });
    await prisma.session.updateMany({ where: { utilisateurId: req.params.id }, data: { actif: false } });
    ApiResponse.success(res, null, 'Mot de passe réinitialisé');
  } catch (e: any) { ApiResponse.badRequest(res, e.message); }
});

// ---------- Profils ----------

router.get('/profils/liste', authorize('UTILISATEURS:LIRE'), async (req: AuthRequest, res: Response) => {
  try {
    const profils = await prisma.profil.findMany({
      orderBy: { nom: 'asc' },
      include: {
        permissions: { select: { permissionId: true } },
        _count: { select: { utilisateurs: true } },
      },
    });
    ApiResponse.success(res, profils.map(p => ({
      id: p.id, code: p.code, nom: p.nom, description: p.description, estAdmin: p.estAdmin, actif: p.actif,
      nbUtilisateurs: p._count.utilisateurs,
      permissionIds: p.permissions.map(pp => pp.permissionId),
    })));
  } catch (e: any) { ApiResponse.error(res, e.message); }
});

router.post('/profils', authorize('UTILISATEURS:MODIFIER'), async (req: AuthRequest, res: Response) => {
  try {
    const { code, nom, description } = req.body;
    if (!code || !nom) { ApiResponse.badRequest(res, 'Code et nom requis'); return; }
    const profil = await prisma.profil.create({ data: { code: code.toUpperCase(), nom, description: description || null } });
    ApiResponse.created(res, profil, 'Profil créé');
  } catch (e: any) { ApiResponse.badRequest(res, e.code === 'P2002' ? 'Ce code de profil existe déjà' : e.message); }
});

router.put('/profils/:id', authorize('UTILISATEURS:MODIFIER'), async (req: AuthRequest, res: Response) => {
  try {
    const existing = await prisma.profil.findUnique({ where: { id: req.params.id } });
    if (!existing) { ApiResponse.notFound(res, 'Profil introuvable'); return; }
    if (existing.estAdmin) { ApiResponse.badRequest(res, 'Le profil Administrateur ne peut pas être modifié'); return; }
    const { nom, description } = req.body;
    const profil = await prisma.profil.update({
      where: { id: req.params.id },
      data: { ...(nom !== undefined && { nom }), ...(description !== undefined && { description }) },
    });
    ApiResponse.success(res, profil, 'Profil modifié');
  } catch (e: any) { ApiResponse.badRequest(res, e.message); }
});

router.delete('/profils/:id', authorize('UTILISATEURS:MODIFIER'), async (req: AuthRequest, res: Response) => {
  try {
    const existing = await prisma.profil.findUnique({ where: { id: req.params.id }, include: { _count: { select: { utilisateurs: true } } } });
    if (!existing) { ApiResponse.notFound(res, 'Profil introuvable'); return; }
    if (existing.estAdmin) { ApiResponse.badRequest(res, 'Le profil Administrateur ne peut pas être supprimé'); return; }
    if (existing._count.utilisateurs > 0) { ApiResponse.badRequest(res, `Ce profil est encore assigné à ${existing._count.utilisateurs} utilisateur(s)`); return; }
    await prisma.profil.delete({ where: { id: req.params.id } });
    ApiResponse.success(res, null, 'Profil supprimé');
  } catch (e: any) { ApiResponse.badRequest(res, e.message); }
});

router.put('/profils/:id/permissions', authorize('UTILISATEURS:MODIFIER'), async (req: AuthRequest, res: Response) => {
  try {
    const { permissionIds } = req.body;
    if (!Array.isArray(permissionIds)) { ApiResponse.badRequest(res, 'permissionIds doit être un tableau'); return; }
    const existing = await prisma.profil.findUnique({ where: { id: req.params.id } });
    if (!existing) { ApiResponse.notFound(res, 'Profil introuvable'); return; }
    if (existing.estAdmin) { ApiResponse.badRequest(res, "Le profil Administrateur a accès à tout, inutile de gérer ses permissions"); return; }

    await prisma.$transaction([
      prisma.profilPermission.deleteMany({ where: { profilId: req.params.id } }),
      prisma.profilPermission.createMany({
        data: permissionIds.map((permissionId: string) => ({ profilId: req.params.id, permissionId })),
        skipDuplicates: true,
      }),
    ]);
    ApiResponse.success(res, null, 'Permissions mises à jour');
  } catch (e: any) { ApiResponse.badRequest(res, e.message); }
});

// ---------- Permissions ----------

router.get('/permissions/liste', authorize('UTILISATEURS:LIRE'), async (_req: AuthRequest, res: Response) => {
  try {
    const permissions = await prisma.permission.findMany({ orderBy: [{ module: 'asc' }, { action: 'asc' }] });
    ApiResponse.success(res, permissions);
  } catch (e: any) { ApiResponse.error(res, e.message); }
});

export default router;

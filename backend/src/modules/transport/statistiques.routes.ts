import { Router, Response } from 'express';
import { authenticate, requireSociete, authorize } from '../../middleware/auth';
import { AuthRequest } from '../../types';
import { ApiResponse } from '../../utils/apiResponse';
import prisma from '../../config/database';

const router = Router();
router.use(authenticate, requireSociete);

const depensesCourse = (c: { fraisCarburant: any; fraisPeage: any; autresFrais: any }) =>
  Number(c.fraisCarburant || 0) + Number(c.fraisPeage || 0) + Number(c.autresFrais || 0);

router.get('/', authorize('TRANSPORT:LIRE'), async (req: AuthRequest, res: Response) => {
  try {
    const societeId = req.user!.societeId;
    const { dateDebut, dateFin } = req.query as Record<string, string>;

    const where: any = { societeId };
    if (dateDebut || dateFin) {
      where.createdAt = {
        ...(dateDebut && { gte: new Date(dateDebut) }),
        ...(dateFin && { lte: new Date(dateFin) }),
      };
    }

    const courses = await prisma.course.findMany({
      where,
      include: {
        vehicule: { select: { id: true, immatriculation: true } },
        chauffeur: { select: { id: true, nom: true, prenom: true } },
      },
    });

    const nbCoursesParStatut: Record<string, number> = { PLANIFIEE: 0, EN_COURS: 0, TERMINEE: 0, ANNULEE: 0 };
    let chiffreAffaires = 0;
    let depensesTotales = 0;
    const parVehicule = new Map<string, { id: string; immatriculation: string; nbCourses: number; chiffreAffaires: number; depenses: number }>();
    const parChauffeur = new Map<string, { id: string; nom: string; prenom: string; nbCourses: number; chiffreAffaires: number; depenses: number }>();
    const parMois = new Map<string, { mois: string; chiffreAffaires: number; depenses: number; nbCourses: number }>();

    for (const c of courses) {
      nbCoursesParStatut[c.statut] = (nbCoursesParStatut[c.statut] || 0) + 1;
      const ca = Number(c.montantFacturable || 0);
      const dep = depensesCourse(c);
      chiffreAffaires += ca;
      depensesTotales += dep;

      if (!parVehicule.has(c.vehiculeId)) {
        parVehicule.set(c.vehiculeId, { id: c.vehicule.id, immatriculation: c.vehicule.immatriculation, nbCourses: 0, chiffreAffaires: 0, depenses: 0 });
      }
      const v = parVehicule.get(c.vehiculeId)!;
      v.nbCourses += 1; v.chiffreAffaires += ca; v.depenses += dep;

      if (!parChauffeur.has(c.chauffeurId)) {
        parChauffeur.set(c.chauffeurId, { id: c.chauffeur.id, nom: c.chauffeur.nom, prenom: c.chauffeur.prenom, nbCourses: 0, chiffreAffaires: 0, depenses: 0 });
      }
      const ch = parChauffeur.get(c.chauffeurId)!;
      ch.nbCourses += 1; ch.chiffreAffaires += ca; ch.depenses += dep;

      const d = c.dateDepartReelle || c.createdAt;
      const cle = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      if (!parMois.has(cle)) parMois.set(cle, { mois: cle, chiffreAffaires: 0, depenses: 0, nbCourses: 0 });
      const m = parMois.get(cle)!;
      m.chiffreAffaires += ca; m.depenses += dep; m.nbCourses += 1;
    }

    const vehicules = Array.from(parVehicule.values())
      .map(v => ({ ...v, resultat: v.chiffreAffaires - v.depenses }))
      .sort((a, b) => b.chiffreAffaires - a.chiffreAffaires);
    const chauffeurs = Array.from(parChauffeur.values())
      .map(c => ({ ...c, resultat: c.chiffreAffaires - c.depenses }))
      .sort((a, b) => b.chiffreAffaires - a.chiffreAffaires);
    const evolutionMensuelle = Array.from(parMois.values())
      .map(m => ({ ...m, resultat: m.chiffreAffaires - m.depenses }))
      .sort((a, b) => a.mois.localeCompare(b.mois));

    ApiResponse.success(res, {
      global: {
        chiffreAffaires, depensesTotales, resultatNet: chiffreAffaires - depensesTotales,
        nbCourses: courses.length, nbCoursesParStatut,
      },
      vehicules, chauffeurs, evolutionMensuelle,
    });
  } catch (e: any) { ApiResponse.error(res, e.message); }
});

export default router;

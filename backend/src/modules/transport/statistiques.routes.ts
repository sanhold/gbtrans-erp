import { Router, Response } from 'express';
import { authenticate, requireSociete, authorize } from '../../middleware/auth';
import { AuthRequest } from '../../types';
import { ApiResponse } from '../../utils/apiResponse';
import prisma from '../../config/database';
import { Prisma } from '@prisma/client';
import { cacheSociete } from '../../utils/cacheMemoire';

const router = Router();
router.use(authenticate, requireSociete);

const num = (v: any) => Number(v || 0);

router.get('/', authorize('TRANSPORT:LIRE'), async (req: AuthRequest, res: Response) => {
  try {
    const societeId = req.user!.societeId;
    const { dateDebut, dateFin } = req.query as Record<string, string>;

    const resultat = await cacheSociete('stats:transport', societeId, 30_000, async () => {
      const where: any = { societeId };
      if (dateDebut || dateFin) {
        where.createdAt = {
          ...(dateDebut && { gte: new Date(dateDebut) }),
          ...(dateFin && { lte: new Date(dateFin) }),
        };
      }
      const sommes = { montantFacturable: true, fraisCarburant: true, fraisPeage: true, autresFrais: true } as const;

      const conditionsSql = [Prisma.sql`"societeId" = ${societeId}`];
      if (dateDebut) conditionsSql.push(Prisma.sql`"createdAt" >= ${new Date(dateDebut)}`);
      if (dateFin) conditionsSql.push(Prisma.sql`"createdAt" <= ${new Date(dateFin)}`);

      // Agrégations faites par PostgreSQL (au lieu de charger toutes les courses + jointures en mémoire),
      // toutes en parallèle : 4 requêtes simultanées puis 1 pour les libellés = ~2 allers-retours.
      const [parStatut, parVehiculeRaw, parChauffeurRaw, parMoisRaw] = await Promise.all([
        prisma.course.groupBy({ by: ['statut'], where, _count: { _all: true }, _sum: sommes }),
        prisma.course.groupBy({ by: ['vehiculeId'], where, _count: { _all: true }, _sum: sommes }),
        prisma.course.groupBy({ by: ['chauffeurId'], where, _count: { _all: true }, _sum: sommes }),
        prisma.$queryRaw<{ mois: string; ca: any; depenses: any; nb: number }[]>`
          SELECT to_char(COALESCE("dateDepartReelle", "createdAt"), 'YYYY-MM') AS mois,
                 COALESCE(SUM("montantFacturable"), 0) AS ca,
                 COALESCE(SUM(COALESCE("fraisCarburant",0) + COALESCE("fraisPeage",0) + COALESCE("autresFrais",0)), 0) AS depenses,
                 COUNT(*)::int AS nb
          FROM courses
          WHERE ${Prisma.join(conditionsSql, ' AND ')}
          GROUP BY 1
          ORDER BY 1
        `,
      ]);

      const [vehiculesInfo, chauffeursInfo] = await Promise.all([
        prisma.vehicule.findMany({ where: { id: { in: parVehiculeRaw.map((g) => g.vehiculeId) }, societeId }, select: { id: true, immatriculation: true } }),
        prisma.chauffeur.findMany({ where: { id: { in: parChauffeurRaw.map((g) => g.chauffeurId) }, societeId }, select: { id: true, nom: true, prenom: true } }),
      ]);
      const vehMap = new Map(vehiculesInfo.map((v) => [v.id, v]));
      const chMap = new Map(chauffeursInfo.map((c) => [c.id, c]));

      const depensesDe = (g: { _sum: { fraisCarburant: any; fraisPeage: any; autresFrais: any } }) =>
        num(g._sum.fraisCarburant) + num(g._sum.fraisPeage) + num(g._sum.autresFrais);

      const nbCoursesParStatut: Record<string, number> = { PLANIFIEE: 0, EN_COURS: 0, TERMINEE: 0, ANNULEE: 0 };
      let chiffreAffaires = 0;
      let depensesTotales = 0;
      let nbCourses = 0;
      for (const g of parStatut) {
        nbCoursesParStatut[g.statut] = g._count._all;
        nbCourses += g._count._all;
        chiffreAffaires += num(g._sum.montantFacturable);
        depensesTotales += depensesDe(g);
      }

      const vehicules = parVehiculeRaw
        .filter((g) => vehMap.has(g.vehiculeId))
        .map((g) => {
          const ca = num(g._sum.montantFacturable); const dep = depensesDe(g);
          return { id: g.vehiculeId, immatriculation: vehMap.get(g.vehiculeId)!.immatriculation, nbCourses: g._count._all, chiffreAffaires: ca, depenses: dep, resultat: ca - dep };
        })
        .sort((a, b) => b.chiffreAffaires - a.chiffreAffaires);
      const chauffeurs = parChauffeurRaw
        .filter((g) => chMap.has(g.chauffeurId))
        .map((g) => {
          const c = chMap.get(g.chauffeurId)!; const ca = num(g._sum.montantFacturable); const dep = depensesDe(g);
          return { id: g.chauffeurId, nom: c.nom, prenom: c.prenom, nbCourses: g._count._all, chiffreAffaires: ca, depenses: dep, resultat: ca - dep };
        })
        .sort((a, b) => b.chiffreAffaires - a.chiffreAffaires);
      const evolutionMensuelle = parMoisRaw.map((m) => ({
        mois: m.mois, chiffreAffaires: num(m.ca), depenses: num(m.depenses), nbCourses: num(m.nb), resultat: num(m.ca) - num(m.depenses),
      }));

      return {
        global: { chiffreAffaires, depensesTotales, resultatNet: chiffreAffaires - depensesTotales, nbCourses, nbCoursesParStatut },
        vehicules, chauffeurs, evolutionMensuelle,
      };
    }, `${dateDebut || ''}|${dateFin || ''}`);

    ApiResponse.success(res, resultat);
  } catch (e: any) { ApiResponse.error(res, e.message); }
});

export default router;

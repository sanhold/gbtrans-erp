import { Router, Response } from 'express';
import { authenticate, requireSociete } from '../../middleware/auth';
import { AuthRequest } from '../../types';
import { ApiResponse } from '../../utils/apiResponse';
import prisma from '../../config/database';

const router = Router();
router.use(authenticate, requireSociete);

// ===== EXERCICES =====

router.get('/exercices', async (req: AuthRequest, res: Response) => {
  try {
    const data = await prisma.exercice.findMany({
      where: { societeId: req.user!.societeId },
      orderBy: { code: 'desc' },
    });
    ApiResponse.success(res, data);
  } catch (e: any) { ApiResponse.error(res, e.message); }
});

// ===== JOURNAUX =====

router.get('/journaux', async (req: AuthRequest, res: Response) => {
  try {
    const data = await prisma.journalComptable.findMany({
      where: { societeId: req.user!.societeId },
      orderBy: { code: 'asc' },
    });
    ApiResponse.success(res, data);
  } catch (e: any) { ApiResponse.error(res, e.message); }
});

// ===== ECRITURES (détail d'un journal) =====

router.get('/ecritures', async (req: AuthRequest, res: Response) => {
  try {
    const { page = '1', limit = '30', journalId, exerciceId, dateDebut, dateFin } = req.query;
    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
    const where: any = {
      journal: { societeId: req.user!.societeId },
      ...(journalId && { journalId }),
      ...(exerciceId && { exerciceId }),
      ...(dateDebut && dateFin && { dateEcriture: { gte: new Date(dateDebut as string), lte: new Date(dateFin as string) } }),
    };
    const [data, total] = await Promise.all([
      prisma.ecritureComptable.findMany({
        where, skip, take: parseInt(limit as string),
        orderBy: { dateEcriture: 'desc' },
        include: {
          journal: { select: { code: true, libelle: true } },
          mouvements: { include: { compte: { select: { numero: true, libelle: true } } } },
        },
      }),
      prisma.ecritureComptable.count({ where }),
    ]);
    ApiResponse.paginated(res, data, total, parseInt(page as string), parseInt(limit as string));
  } catch (e: any) { ApiResponse.error(res, e.message); }
});

// ===== GRAND LIVRE (mouvements par compte) =====

router.get('/grand-livre', async (req: AuthRequest, res: Response) => {
  try {
    const { exerciceId, compteId, classe, dateDebut, dateFin } = req.query;
    const societeId = req.user!.societeId;

    const comptes = await prisma.compteComptable.findMany({
      where: {
        societeId,
        ...(compteId && { id: compteId as string }),
        ...(classe && { classe: parseInt(classe as string) }),
      },
      orderBy: { numero: 'asc' },
    });

    const mouvementWhere: any = {
      compte: { societeId },
      ecriture: {
        ...(exerciceId && { exerciceId }),
        ...(dateDebut && dateFin && { dateEcriture: { gte: new Date(dateDebut as string), lte: new Date(dateFin as string) } }),
      },
    };

    const result = await Promise.all(comptes.map(async (compte) => {
      const mouvements = await prisma.mouvementComptable.findMany({
        where: { ...mouvementWhere, compteId: compte.id },
        include: { ecriture: { select: { id: true, numero: true, dateEcriture: true, libelle: true, reference: true, journal: { select: { code: true } } } } },
        orderBy: { ecriture: { dateEcriture: 'asc' } },
      });
      if (mouvements.length === 0) return null;
      const totalDebit = mouvements.reduce((s, m) => s + Number(m.debit), 0);
      const totalCredit = mouvements.reduce((s, m) => s + Number(m.credit), 0);
      return {
        compte: { id: compte.id, numero: compte.numero, libelle: compte.libelle },
        totalDebit, totalCredit, solde: totalDebit - totalCredit,
        mouvements: mouvements.map(m => ({
          id: m.id, date: m.ecriture.dateEcriture, numeroEcriture: m.ecriture.numero,
          journal: m.ecriture.journal.code, libelle: m.libelle || m.ecriture.libelle,
          reference: m.ecriture.reference, debit: Number(m.debit), credit: Number(m.credit),
        })),
      };
    }));

    ApiResponse.success(res, result.filter(Boolean));
  } catch (e: any) { ApiResponse.error(res, e.message); }
});

// ===== BALANCE (générale) =====

router.get('/balance', async (req: AuthRequest, res: Response) => {
  try {
    const { exerciceId, dateDebut, dateFin } = req.query;
    const societeId = req.user!.societeId;

    const comptes = await prisma.compteComptable.findMany({ where: { societeId }, orderBy: { numero: 'asc' } });

    const ecritureFilter: any = {
      ...(exerciceId && { exerciceId }),
      ...(dateDebut && dateFin && { dateEcriture: { gte: new Date(dateDebut as string), lte: new Date(dateFin as string) } }),
    };

    const mouvements = await prisma.mouvementComptable.groupBy({
      by: ['compteId'],
      where: { compte: { societeId }, ecriture: ecritureFilter },
      _sum: { debit: true, credit: true },
    });
    const parCompte = new Map(mouvements.map(m => [m.compteId, { debit: Number(m._sum.debit || 0), credit: Number(m._sum.credit || 0) }]));

    const lignes = comptes
      .map(c => {
        const m = parCompte.get(c.id);
        if (!m) return null;
        const solde = m.debit - m.credit;
        return {
          compte: c.numero, libelle: c.libelle, classe: c.classe,
          debit: m.debit, credit: m.credit,
          soldeDebiteur: solde > 0 ? solde : 0, soldeCrediteur: solde < 0 ? -solde : 0,
        };
      })
      .filter(Boolean);

    const totaux = lignes.reduce((acc: any, l: any) => ({
      debit: acc.debit + l.debit, credit: acc.credit + l.credit,
      soldeDebiteur: acc.soldeDebiteur + l.soldeDebiteur, soldeCrediteur: acc.soldeCrediteur + l.soldeCrediteur,
    }), { debit: 0, credit: 0, soldeDebiteur: 0, soldeCrediteur: 0 });

    ApiResponse.success(res, { lignes, totaux });
  } catch (e: any) { ApiResponse.error(res, e.message); }
});

// ===== BILAN & COMPTE DE RESULTAT (simplifié SYSCOHADA) =====

router.get('/bilan', async (req: AuthRequest, res: Response) => {
  try {
    const { exerciceId } = req.query;
    const societeId = req.user!.societeId;

    const comptes = await prisma.compteComptable.findMany({ where: { societeId } });
    const mouvements = await prisma.mouvementComptable.groupBy({
      by: ['compteId'],
      where: { compte: { societeId }, ecriture: { ...(exerciceId && { exerciceId: exerciceId as string }) } },
      _sum: { debit: true, credit: true },
    });
    const parCompte = new Map(mouvements.map(m => [m.compteId, { debit: Number(m._sum.debit || 0), credit: Number(m._sum.credit || 0) }]));

    const soldeCompte = (c: { id: string }) => {
      const m = parCompte.get(c.id);
      return m ? m.debit - m.credit : 0;
    };

    // Bilan : classes 1-2-3-4-5 (comptes de bilan) ; Actif = soldes débiteurs, Passif = soldes créditeurs
    const comptesBilan = comptes.filter(c => c.type === 'BILAN');
    let totalActif = 0, totalPassif = 0;
    const actif: any[] = [], passif: any[] = [];
    for (const c of comptesBilan) {
      const solde = soldeCompte(c);
      if (Math.abs(solde) < 0.01) continue;
      if (solde > 0) { actif.push({ compte: c.numero, libelle: c.libelle, montant: solde }); totalActif += solde; }
      else { passif.push({ compte: c.numero, libelle: c.libelle, montant: -solde }); totalPassif += -solde; }
    }

    // Compte de résultat : classe 6 = charges (débit), classe 7 = produits (crédit)
    const comptesCharges = comptes.filter(c => c.classe === 6);
    const comptesProduits = comptes.filter(c => c.classe === 7);
    let totalCharges = 0, totalProduits = 0;
    const charges = comptesCharges.map(c => { const s = soldeCompte(c); totalCharges += s; return { compte: c.numero, libelle: c.libelle, montant: s }; }).filter(l => Math.abs(l.montant) >= 0.01);
    const produits = comptesProduits.map(c => { const s = -soldeCompte(c); totalProduits += s; return { compte: c.numero, libelle: c.libelle, montant: s }; }).filter(l => Math.abs(l.montant) >= 0.01);

    const resultatNet = totalProduits - totalCharges;

    ApiResponse.success(res, {
      bilan: { actif, passif, totalActif, totalPassif: totalPassif + (resultatNet !== 0 ? resultatNet : 0), resultatNet },
      compteResultat: { charges, produits, totalCharges, totalProduits, resultatNet },
    });
  } catch (e: any) { ApiResponse.error(res, e.message); }
});

export default router;

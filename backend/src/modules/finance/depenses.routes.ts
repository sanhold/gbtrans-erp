import { Router, Response } from 'express';
import { authenticate, requireSociete, authorize } from '../../middleware/auth';
import { audit } from '../../middleware/audit';
import { AuthRequest } from '../../types';
import { ApiResponse } from '../../utils/apiResponse';
import prisma from '../../config/database';
import { genererNumero } from '../../utils/numerotation';
import { Prisma } from '@prisma/client';
import { assertDossierOuvert } from '../../utils/dossierGuard';
import { debiterCompte } from '../../utils/debiterCompte';

const router = Router();
router.use(authenticate, requireSociete);

router.get('/', authorize('FINANCE:LIRE'), async (req: AuthRequest, res: Response) => {
  try {
    const { page = '1', limit = '20', categorie, dossierId, fournisseurId, dotationId, statut, dateDebut, dateFin } = req.query;
    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
    const where: Prisma.DepenseWhereInput = {
      societeId: req.user!.societeId,
      ...(categorie && { categorie: categorie as string }),
      ...(dossierId && { dossierId: dossierId as string }),
      ...(fournisseurId && { fournisseurId: fournisseurId as string }),
      ...(dotationId && { dotationId: dotationId as string }),
      ...(statut && { statut: statut as string }),
      ...((dateDebut || dateFin) && {
        dateDepense: {
          ...(dateDebut && { gte: new Date(dateDebut as string) }),
          ...(dateFin && { lte: new Date(dateFin as string) }),
        },
      }),
    };
    const [data, total] = await Promise.all([
      prisma.depense.findMany({
        where, skip, take: Math.min(parseInt(limit as string) || 20, 100),
        orderBy: { dateDepense: 'desc' },
        include: {
          dossier: { select: { id: true, numero: true, numeroPhysique: true } },
          fournisseur: { select: { id: true, raisonSociale: true } },
          caisse: { select: { id: true, code: true, libelle: true } },
          compteBancaire: { select: { id: true, code: true, libelle: true } },
          dotation: { select: { id: true, numero: true } },
        },
      }),
      prisma.depense.count({ where }),
    ]);
    ApiResponse.paginated(res, data, total, parseInt(page as string), parseInt(limit as string));
  } catch (e: any) { ApiResponse.error(res, e.message); }
});

router.post('/', authorize('FINANCE:CREER'), audit('FINANCE', 'CREER'), async (req: AuthRequest, res: Response) => {
  try {
    const societeId = req.user!.societeId;
    const {
      dossierId, fournisseurId, caisseId, compteBancaireId, dotationId, categorie, designation,
      montant, modePaiement, reference, observations, dateDepense,
    } = req.body;

    if ((caisseId && compteBancaireId) || (!caisseId && !compteBancaireId)) {
      ApiResponse.badRequest(res, 'Choisissez exactement une caisse OU un compte bancaire à débiter'); return;
    }
    const montantNum = Number(montant);
    if (!montantNum || montantNum <= 0) { ApiResponse.badRequest(res, 'Montant invalide'); return; }

    if (dossierId) await assertDossierOuvert(dossierId, societeId);

    if (fournisseurId) {
      const fournisseur = await prisma.fournisseur.findFirst({ where: { id: fournisseurId, societeId } });
      if (!fournisseur) { ApiResponse.notFound(res, 'Fournisseur introuvable'); return; }
    }

    const account = caisseId
      ? await prisma.caisse.findFirst({ where: { id: caisseId, societeId } })
      : await prisma.compteBancaire.findFirst({ where: { id: compteBancaireId, societeId } });
    if (!account) { ApiResponse.notFound(res, 'Compte introuvable'); return; }
    // Le contrôle de suffisance du solde (avec découvert autorisé pour un
    // compte bancaire) est fait de façon atomique dans la transaction ci-dessous.

    if (dotationId) {
      const dotation = await prisma.dotation.findFirst({ where: { id: dotationId, societeId } });
      if (!dotation) { ApiResponse.notFound(res, 'Dotation introuvable'); return; }
      if (dotation.statut !== 'VALIDE') { ApiResponse.badRequest(res, 'Cette dotation est annulée'); return; }
      const sum = await prisma.depense.aggregate({ _sum: { montant: true }, where: { dotationId, statut: { not: 'ANNULEE' } } });
      const montantRestant = Number(dotation.montant) - Number(sum._sum.montant || 0);
      if (montantNum > montantRestant) { ApiResponse.badRequest(res, `Montant supérieur au reste disponible sur cette dotation (${montantRestant})`); return; }
    }

    const numero = await genererNumero(societeId, 'DEPENSE');

    const depense = await prisma.$transaction(async (tx) => {
      const d = await tx.depense.create({
        data: {
          societeId, numero, dossierId, fournisseurId, caisseId, compteBancaireId, dotationId,
          categorie, designation, montant: montantNum, modePaiement, reference, observations,
          ...(dateDepense && { dateDepense: new Date(dateDepense) }),
        },
      });

      await tx.operationFinanciere.create({
        data: {
          societeId,
          numero: await genererNumero(societeId, 'OPERATION_FINANCIERE'),
          type: 'DECAISSEMENT', sens: 'SORTIE',
          caisseId, compteBancaireId,
          montant: montantNum, libelle: designation, reference: numero,
        },
      });

      await debiterCompte(tx, { caisseId, compteBancaireId }, montantNum);

      return d;
    });

    ApiResponse.created(res, depense, 'Dépense enregistrée');
  } catch (e: any) { ApiResponse.badRequest(res, e.message); }
});

router.put('/:id', authorize('FINANCE:MODIFIER'), audit('FINANCE', 'MODIFIER'), async (req: AuthRequest, res: Response) => {
  try {
    const existing = await prisma.depense.findFirst({ where: { id: req.params.id, societeId: req.user!.societeId } });
    if (!existing) { ApiResponse.notFound(res); return; }
    if (existing.dossierId) await assertDossierOuvert(existing.dossierId, req.user!.societeId);
    const { categorie, designation, observations } = req.body;
    const d = await prisma.depense.update({ where: { id: req.params.id }, data: { categorie, designation, observations } });
    ApiResponse.success(res, d, 'Dépense modifiée');
  } catch (e: any) { ApiResponse.badRequest(res, e.message); }
});

router.post('/:id/annuler', authorize('FINANCE:MODIFIER'), audit('FINANCE', 'ANNULER'), async (req: AuthRequest, res: Response) => {
  try {
    const societeId = req.user!.societeId;
    const motif = req.body.motif ? String(req.body.motif).trim() : '';
    if (!motif) { ApiResponse.badRequest(res, 'Un motif est obligatoire pour annuler une dépense'); return; }

    const depense = await prisma.depense.findFirst({ where: { id: req.params.id, societeId } });
    if (!depense) { ApiResponse.notFound(res, 'Dépense introuvable'); return; }
    if (depense.dossierId) await assertDossierOuvert(depense.dossierId, societeId);

    const montantNum = Number(depense.montant);
    const observationsMaj = depense.observations ? `${depense.observations}\n[Annulée] ${motif}` : `[Annulée] ${motif}`;

    const resultat = await prisma.$transaction(async (tx) => {
      const miseAJour = await tx.depense.updateMany({
        where: { id: depense.id, statut: 'VALIDE' },
        data: { statut: 'ANNULEE', observations: observationsMaj },
      });
      if (miseAJour.count !== 1) {
        throw new Error("Cette dépense a déjà été annulée ou n'est plus dans un état annulable");
      }

      const numeroOp = await genererNumero(societeId, 'OPERATION_FINANCIERE');
      await tx.operationFinanciere.create({
        data: {
          societeId,
          numero: numeroOp,
          type: 'ENCAISSEMENT',
          sens: 'ENTREE',
          caisseId: depense.caisseId,
          compteBancaireId: depense.compteBancaireId,
          montant: montantNum,
          libelle: `Annulation de la dépense ${depense.numero}`,
          reference: depense.numero,
          observations: motif,
        },
      });

      if (depense.caisseId) await tx.caisse.update({ where: { id: depense.caisseId }, data: { solde: { increment: montantNum } } });
      else if (depense.compteBancaireId) await tx.compteBancaire.update({ where: { id: depense.compteBancaireId }, data: { solde: { increment: montantNum } } });

      // La dotation éventuellement associée n'a pas de compteur de consommation
      // dédié : son montant utilisé est calculé à la volée en sommant les
      // dépenses non annulées qui la référencent (voir dotations.routes.ts et
      // la vérification ci-dessus à la création d'une dépense). En passant
      // cette dépense à ANNULEE, elle est exclue de cette somme et le montant
      // redevient donc automatiquement disponible sur la dotation.

      // Si cette dépense avait déjà été comptabilisée (Compta Auto ou manuellement), son
      // écriture n'est jamais corrigée automatiquement par l'annulation : on génère ici
      // l'extourne (mêmes comptes, débit/crédit inversés), datée du jour de l'annulation.
      // Pas de lien factureId/paiementId/... sur l'extourne : la contrainte d'unicité par
      // document source (une seule écriture par dépense) ne doit viser que l'écriture
      // d'origine, pas sa contre-passation.
      const ecritureExistante = await tx.ecritureComptable.findFirst({
        where: { depenseId: depense.id },
        include: { mouvements: true, journal: { select: { id: true, code: true } } },
      });
      let extourneGeneree = false;
      let extourneImpossibleCar: string | null = null;
      if (ecritureExistante) {
        const exerciceOuvert = await tx.exercice.findFirst({
          where: { societeId, cloture: false, dateDebut: { lte: new Date() }, dateFin: { gte: new Date() } },
        });
        if (!exerciceOuvert) {
          extourneImpossibleCar = "aucun exercice ouvert ne couvre la date d'annulation : extournez cette dépense manuellement depuis la Comptabilité";
        } else {
          const numeroExtourne = await genererNumero(societeId, `ECRITURE_AUTO_${ecritureExistante.journal.code}`);
          await tx.ecritureComptable.create({
            data: {
              exerciceId: exerciceOuvert.id,
              journalId: ecritureExistante.journalId,
              numero: numeroExtourne,
              dateEcriture: new Date(),
              libelle: `Extourne — annulation dépense ${depense.numero}`,
              reference: depense.numero,
              createurId: req.user!.id,
              validee: true,
              dateValidation: new Date(),
              mouvements: {
                create: ecritureExistante.mouvements.map((m) => ({
                  compteId: m.compteId,
                  libelle: m.libelle,
                  debit: m.credit,
                  credit: m.debit,
                })),
              },
            },
          });
          extourneGeneree = true;
        }
      }

      return { depense: await tx.depense.findUnique({ where: { id: depense.id } }), extourneGeneree, extourneImpossibleCar };
    });

    const messageExtourne = resultat.extourneGeneree
      ? ' ; écriture comptable extournée'
      : resultat.extourneImpossibleCar
        ? ` ; écriture comptable NON extournée automatiquement (${resultat.extourneImpossibleCar})`
        : '';
    ApiResponse.success(res, resultat.depense, `Dépense annulée et montant recrédité${messageExtourne}`);
  } catch (e: any) { ApiResponse.badRequest(res, e.message); }
});

export default router;

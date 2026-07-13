import { Router, Response } from 'express';
import { authenticate, requireSociete, authorize } from '../../middleware/auth';
import { audit } from '../../middleware/audit';
import { AuthRequest } from '../../types';
import { ApiResponse } from '../../utils/apiResponse';
import prisma from '../../config/database';
import { genererNumero } from '../../utils/numerotation';
import { Prisma, PrismaClient } from '@prisma/client';

type AccountType = 'CAISSE' | 'BANQUE' | 'TIERS';
type TxClient = Omit<PrismaClient, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'>;

const router = Router();
router.use(authenticate, requireSociete);

router.get('/', authorize('FINANCE:LIRE'), async (req: AuthRequest, res: Response) => {
  try {
    const { page = '1', limit = '20', type, caisseId, compteBancaireId, compteTiersId, agentId, dateDebut, dateFin } = req.query;
    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
    const where: Prisma.OperationFinanciereWhereInput = {
      societeId: req.user!.societeId,
      ...(type && { type: type as any }),
      ...(caisseId && { caisseId: caisseId as string }),
      ...(compteBancaireId && { compteBancaireId: compteBancaireId as string }),
      ...(compteTiersId && { compteTiersId: compteTiersId as string }),
      ...(agentId && { agentId: agentId as string }),
      ...((dateDebut || dateFin) && {
        dateOperation: {
          ...(dateDebut && { gte: new Date(dateDebut as string) }),
          ...(dateFin && { lte: new Date(dateFin as string) }),
        },
      }),
    };
    const [data, total] = await Promise.all([
      prisma.operationFinanciere.findMany({
        where, skip, take: parseInt(limit as string),
        orderBy: { dateOperation: 'desc' },
        include: {
          caisse: { select: { id: true, code: true, libelle: true } },
          compteBancaire: { select: { id: true, code: true, libelle: true, banque: true } },
          compteTiers: { select: { id: true, code: true, libelle: true, type: true } },
          agent: { select: { id: true, nom: true, prenom: true } },
        },
      }),
      prisma.operationFinanciere.count({ where }),
    ]);
    ApiResponse.paginated(res, data, total, parseInt(page as string), parseInt(limit as string));
  } catch (e: any) { ApiResponse.error(res, e.message); }
});

router.get('/agents', authorize('FINANCE:LIRE'), async (req: AuthRequest, res: Response) => {
  try {
    const agents = await prisma.utilisateur.findMany({
      where: { societeId: req.user!.societeId, actif: true },
      select: { id: true, nom: true, prenom: true, matricule: true },
      orderBy: { nom: 'asc' },
    });
    ApiResponse.success(res, agents);
  } catch (e: any) { ApiResponse.error(res, e.message); }
});

function accountFK(accountType: AccountType, accountId: string) {
  if (accountType === 'CAISSE') return { caisseId: accountId };
  if (accountType === 'BANQUE') return { compteBancaireId: accountId };
  return { compteTiersId: accountId };
}

async function findAccount(tx: TxClient, accountType: AccountType, accountId: string) {
  if (accountType === 'CAISSE') return tx.caisse.findUnique({ where: { id: accountId } });
  if (accountType === 'BANQUE') return tx.compteBancaire.findUnique({ where: { id: accountId } });
  return tx.compteTiers.findUnique({ where: { id: accountId } });
}

async function updateSolde(tx: TxClient, accountType: AccountType, accountId: string, delta: { increment: number } | { decrement: number }) {
  if (accountType === 'CAISSE') return tx.caisse.update({ where: { id: accountId }, data: { solde: delta } });
  if (accountType === 'BANQUE') return tx.compteBancaire.update({ where: { id: accountId }, data: { solde: delta } });
  return tx.compteTiers.update({ where: { id: accountId }, data: { solde: delta } });
}

router.post('/', authorize('FINANCE:CREER'), audit('FINANCE', 'CREER'), async (req: AuthRequest, res: Response) => {
  try {
    const societeId = req.user!.societeId;
    const {
      type, montant, libelle, dateOperation, reference, beneficiaire, observations,
      sourceType, sourceId, destinationType, destinationId, agentId,
    } = req.body;

    const montantNum = Number(montant);
    if (!montantNum || montantNum <= 0) { ApiResponse.badRequest(res, 'Montant invalide'); return; }
    if (!libelle) { ApiResponse.badRequest(res, 'Libellé requis'); return; }

    const isEntree = type === 'ENCAISSEMENT' || type === 'DOTATION';
    const isSortie = type === 'DECAISSEMENT' || type === 'RETRAIT';
    const isVirement = type === 'VIREMENT_INTERNE';
    if (!isEntree && !isSortie && !isVirement) { ApiResponse.badRequest(res, 'Type d\'opération invalide'); return; }

    if ((isSortie || isVirement) && (!sourceType || !sourceId)) { ApiResponse.badRequest(res, 'Compte source requis'); return; }
    if ((isEntree || isVirement) && (!destinationType || !destinationId)) { ApiResponse.badRequest(res, 'Compte de destination requis'); return; }
    if (isVirement && sourceType === destinationType && sourceId === destinationId) {
      ApiResponse.badRequest(res, 'Le compte source et le compte de destination doivent être différents'); return;
    }

    const getSolde = async (accountType: AccountType, accountId: string) => {
      if (accountType === 'CAISSE') return prisma.caisse.findFirst({ where: { id: accountId, societeId } });
      if (accountType === 'BANQUE') return prisma.compteBancaire.findFirst({ where: { id: accountId, societeId } });
      return prisma.compteTiers.findFirst({ where: { id: accountId, societeId } });
    };

    if (isSortie || isVirement) {
      const source = await getSolde(sourceType, sourceId);
      if (!source) { ApiResponse.notFound(res, 'Compte source introuvable'); return; }
      if (Number(source.solde) - montantNum < 0) {
        ApiResponse.badRequest(res, 'Solde insuffisant pour cette opération'); return;
      }
    }

    const numero = await genererNumero(societeId, 'OPERATION_FINANCIERE');
    const dateOp = dateOperation ? new Date(dateOperation) : undefined;

    const result = await prisma.$transaction(async (tx) => {
      if (isVirement) {
        const [sourceAccount, destAccount] = await Promise.all([
          findAccount(tx, sourceType, sourceId),
          findAccount(tx, destinationType, destinationId),
        ]);

        const sortieRow = await tx.operationFinanciere.create({
          data: {
            societeId, numero, type: 'VIREMENT_INTERNE', sens: 'SORTIE',
            ...accountFK(sourceType, sourceId),
            montant: montantNum, libelle, reference, beneficiaire,
            observations: observations || `Virement vers ${(destAccount as any)?.libelle || ''}`,
            ...(dateOp && { dateOperation: dateOp }),
          },
        });
        const entreeRow = await tx.operationFinanciere.create({
          data: {
            societeId, numero, type: 'VIREMENT_INTERNE', sens: 'ENTREE',
            ...accountFK(destinationType, destinationId),
            montant: montantNum, libelle, reference, beneficiaire,
            observations: observations || `Virement depuis ${(sourceAccount as any)?.libelle || ''}`,
            ...(dateOp && { dateOperation: dateOp }),
          },
        });

        await updateSolde(tx, sourceType, sourceId, { decrement: montantNum });
        await updateSolde(tx, destinationType, destinationId, { increment: montantNum });

        return [sortieRow, entreeRow];
      }

      const sens = isEntree ? 'ENTREE' : 'SORTIE';
      const accType: AccountType = isEntree ? destinationType : sourceType;
      const accId = isEntree ? destinationId : sourceId;

      const row = await tx.operationFinanciere.create({
        data: {
          societeId, numero, type, sens,
          ...accountFK(accType, accId),
          montant: montantNum, libelle, reference, beneficiaire, observations,
          ...(type === 'DOTATION' && agentId && { agentId }),
          ...(dateOp && { dateOperation: dateOp }),
        },
      });

      await updateSolde(tx, accType, accId, isEntree ? { increment: montantNum } : { decrement: montantNum });

      return [row];
    });

    ApiResponse.created(res, result, 'Opération enregistrée');
  } catch (e: any) { ApiResponse.badRequest(res, e.message); }
});

export default router;

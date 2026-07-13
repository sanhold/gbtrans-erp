import prisma from '../../config/database';
import { genererNumero } from '../../utils/numerotation';
import { PaginationParams } from '../../types';
import { Prisma } from '@prisma/client';

const STATUTS_DOSSIER_FERME = ['CLOTURE', 'ANNULE', 'ARCHIVE'];

export class FacturationService {
  async createFacture(societeId: string, createurId: string, data: any) {
    if (data.dossierId) {
      const dossier = await prisma.dossier.findFirst({ where: { id: data.dossierId, societeId } });
      if (!dossier) throw new Error('Dossier introuvable');
      if (STATUTS_DOSSIER_FERME.includes(dossier.statut)) {
        throw new Error(`Impossible de créer une facture : le dossier ${dossier.numero} est ${dossier.statut.toLowerCase()}`);
      }
    }

    const numero = await genererNumero(societeId, 'FACTURE');

    const montantHT = data.lignes.reduce(
      (sum: number, l: any) => sum + (l.quantite * l.prixUnitaire - (l.remise || 0)),
      0
    );
    const montantTVA = data.lignes.reduce(
      (sum: number, l: any) => {
        const ht = l.quantite * l.prixUnitaire - (l.remise || 0);
        return sum + (ht * (l.tauxTVA || 18)) / 100;
      },
      0
    );
    const timbreFiscal = data.timbreFiscal || 0;
    const retenue = data.retenue || 0;
    const montantTTC = montantHT + montantTVA + timbreFiscal - retenue;

    const dateEcheance = data.dateEcheance
      ? new Date(data.dateEcheance)
      : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    const facture = await prisma.facture.create({
      data: {
        societeId,
        numero,
        type: data.type || 'FACTURE',
        dossierId: data.dossierId,
        clientId: data.clientId,
        createurId,
        dateEcheance,
        objet: data.objet,
        montantHT,
        montantTVA,
        timbreFiscal,
        retenue,
        montantTTC,
        resteAPayer: montantTTC,
        remise: data.remise || 0,
        tauxTVA: data.tauxTVA || 18,
        devise: data.devise || 'XOF',
        conditions: data.conditions,
        observations: data.observations,
        lignes: {
          create: data.lignes.map((l: any, index: number) => ({
            ordre: index + 1,
            codePrestation: l.codePrestation,
            designation: l.designation,
            quantite: l.quantite,
            unite: l.unite,
            prixUnitaire: l.prixUnitaire,
            montantHT: l.quantite * l.prixUnitaire - (l.remise || 0),
            tauxTVA: l.tauxTVA || 18,
            montantTVA:
              ((l.quantite * l.prixUnitaire - (l.remise || 0)) * (l.tauxTVA || 18)) / 100,
            remise: l.remise || 0,
            compteComptable: l.compteComptable,
          })),
        },
      },
      include: {
        lignes: true,
        client: { select: { id: true, code: true, raisonSociale: true } },
      },
    });

    return facture;
  }

  async findAll(societeId: string, pagination: PaginationParams, filters: any = {}) {
    const { page = 1, limit = 20, sortBy = 'dateFacture', sortOrder = 'desc', search } = pagination;
    const skip = (page - 1) * limit;

    const where: Prisma.FactureWhereInput = {
      societeId,
      ...(filters.clientId && { clientId: filters.clientId }),
      ...(filters.dossierId && { dossierId: filters.dossierId }),
      ...(filters.statut && { statut: filters.statut }),
      ...(filters.type && { type: filters.type }),
      ...(search && {
        OR: [
          { numero: { contains: search, mode: 'insensitive' as const } },
          { objet: { contains: search, mode: 'insensitive' as const } },
          { client: { raisonSociale: { contains: search, mode: 'insensitive' as const } } },
        ],
      }),
    };

    const [data, total] = await Promise.all([
      prisma.facture.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        include: {
          client: { select: { id: true, code: true, raisonSociale: true } },
          dossier: { select: { id: true, numero: true } },
          _count: { select: { paiements: true } },
        },
      }),
      prisma.facture.count({ where }),
    ]);

    return { data, total, page, limit };
  }

  async findById(id: string, societeId: string) {
    return prisma.facture.findFirst({
      where: { id, societeId },
      include: {
        lignes: { orderBy: { ordre: 'asc' } },
        client: true,
        dossier: {
          select: {
            id: true, numero: true, nature: true, designation: true,
            numeroBL: true, navire: true, portOrigine: true, portDestination: true, incoterm: true,
            poidsBrut: true, volume: true, nombreColis: true,
            agent: { select: { nom: true, prenom: true } },
            conteneurs: { select: { numero: true } },
          },
        },
        createur: { select: { id: true, nom: true, prenom: true } },
        paiements: {
          include: {
            paiement: {
              include: {
                caisse: { select: { id: true, libelle: true } },
                compteBancaire: { select: { id: true, libelle: true, banque: true } },
                createur: { select: { id: true, nom: true, prenom: true } },
              },
            },
          },
        },
        avoirs: true,
        proforma: true,
      },
    });
  }

  async valider(id: string, societeId: string) {
    const facture = await prisma.facture.findFirst({ where: { id, societeId } });
    if (!facture) throw new Error('Facture non trouvée');
    if (facture.statut !== 'BROUILLON') throw new Error('Seule une facture brouillon peut être validée');

    return prisma.facture.update({
      where: { id },
      data: { statut: 'VALIDEE' },
    });
  }

  async annuler(id: string, societeId: string) {
    return prisma.facture.update({
      where: { id },
      data: { statut: 'ANNULEE' },
    });
  }

  async creerAvoir(id: string, societeId: string, createurId: string, motif: string) {
    const factureOrigine = await prisma.facture.findFirst({
      where: { id, societeId },
      include: { lignes: true },
    });
    if (!factureOrigine) throw new Error('Facture non trouvée');

    const numero = await genererNumero(societeId, 'AVOIR');

    return prisma.facture.create({
      data: {
        societeId,
        numero,
        type: 'AVOIR',
        clientId: factureOrigine.clientId,
        dossierId: factureOrigine.dossierId,
        createurId,
        dateEcheance: new Date(),
        factureOrigineId: id,
        motifAvoir: motif,
        montantHT: factureOrigine.montantHT,
        montantTVA: factureOrigine.montantTVA,
        montantTTC: factureOrigine.montantTTC,
        resteAPayer: factureOrigine.montantTTC,
        tauxTVA: factureOrigine.tauxTVA,
        lignes: {
          create: factureOrigine.lignes.map((l) => ({
            ordre: l.ordre,
            designation: l.designation,
            quantite: l.quantite,
            prixUnitaire: l.prixUnitaire,
            montantHT: l.montantHT,
            tauxTVA: l.tauxTVA,
            montantTVA: l.montantTVA,
            remise: l.remise,
          })),
        },
      },
      include: { lignes: true },
    });
  }

  async enregistrerPaiement(
    societeId: string,
    factureId: string,
    montant: number,
    modePaiement: string,
    reference?: string,
    banque?: string,
    caisseId?: string,
    compteBancaireId?: string,
    createurId?: string
  ) {
    const facture = await prisma.facture.findFirst({ where: { id: factureId, societeId }, include: { client: true } });
    if (!facture) throw new Error('Facture non trouvée');

    const resteAPayer = Number(facture.resteAPayer);
    if (montant > resteAPayer) throw new Error('Le montant dépasse le reste à payer');

    if (caisseId || compteBancaireId) {
      const account = caisseId
        ? await prisma.caisse.findFirst({ where: { id: caisseId, societeId } })
        : await prisma.compteBancaire.findFirst({ where: { id: compteBancaireId, societeId } });
      if (!account) throw new Error('Compte de destination introuvable');
    }

    const numeroPaiement = await genererNumero(societeId, 'PAIEMENT');

    const paiement = await prisma.$transaction(async (tx) => {
      const p = await tx.paiement.create({
        data: {
          numero: numeroPaiement,
          clientId: facture.clientId,
          montant,
          modePaiement: modePaiement as any,
          reference,
          banque,
          caisseId,
          compteBancaireId,
          createurId,
          statut: 'VALIDE',
          affectations: {
            create: {
              factureId,
              montant,
            },
          },
        },
      });

      const nouveauReste = resteAPayer - montant;
      await tx.facture.update({
        where: { id: factureId },
        data: {
          montantPaye: { increment: montant },
          resteAPayer: nouveauReste,
          statut: nouveauReste <= 0 ? 'PAYEE' : 'PARTIELLEMENT_PAYEE',
        },
      });

      if (caisseId || compteBancaireId) {
        const numeroOp = await genererNumero(societeId, 'OPERATION_FINANCIERE');
        await tx.operationFinanciere.create({
          data: {
            societeId,
            numero: numeroOp,
            type: 'ENCAISSEMENT',
            sens: 'ENTREE',
            caisseId,
            compteBancaireId,
            montant,
            libelle: `Paiement facture ${facture.numero}`,
            reference: numeroPaiement,
            beneficiaire: facture.client?.raisonSociale,
          },
        });
        if (caisseId) await tx.caisse.update({ where: { id: caisseId }, data: { solde: { increment: montant } } });
        else if (compteBancaireId) await tx.compteBancaire.update({ where: { id: compteBancaireId }, data: { solde: { increment: montant } } });
      }

      return p;
    });

    return paiement;
  }

  async getStatistiques(societeId: string, annee?: number) {
    const dateDebut = new Date(annee || new Date().getFullYear(), 0, 1);
    const dateFin = new Date((annee || new Date().getFullYear()) + 1, 0, 1);

    const [totalFacture, totalEncaisse, factureeParMois] = await Promise.all([
      prisma.facture.aggregate({
        where: {
          societeId,
          statut: { not: 'ANNULEE' },
          dateFacture: { gte: dateDebut, lt: dateFin },
        },
        _sum: { montantTTC: true, montantPaye: true, resteAPayer: true },
        _count: true,
      }),
      prisma.paiement.aggregate({
        where: {
          statut: 'VALIDE',
          datePaiement: { gte: dateDebut, lt: dateFin },
        },
        _sum: { montant: true },
        _count: true,
      }),
      prisma.$queryRaw`
        SELECT EXTRACT(MONTH FROM "dateFacture")::int as mois,
               SUM("montantTTC")::float as total,
               COUNT(*)::int as nombre
        FROM factures
        WHERE "societeId" = ${societeId}
          AND "statut" != 'ANNULEE'
          AND "dateFacture" >= ${dateDebut}
          AND "dateFacture" < ${dateFin}
        GROUP BY EXTRACT(MONTH FROM "dateFacture")
        ORDER BY mois
      `,
    ]);

    return {
      totalFacture: totalFacture._sum.montantTTC || 0,
      totalEncaisse: totalFacture._sum.montantPaye || 0,
      totalImpaye: totalFacture._sum.resteAPayer || 0,
      nombreFactures: totalFacture._count,
      nombrePaiements: totalEncaisse._count,
      factureeParMois,
    };
  }
}

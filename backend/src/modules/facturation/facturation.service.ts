import prisma from '../../config/database';
import { genererNumero } from '../../utils/numerotation';
import { PaginationParams } from '../../types';
import { Prisma, StatutFacture, TypeFacture } from '@prisma/client';
import { STATUTS_DOSSIER_FERME } from '../../utils/dossierGuard';

const STATUTS_FACTURE_PAYABLES: StatutFacture[] = ['VALIDEE', 'ENVOYEE', 'PARTIELLEMENT_PAYEE', 'EN_RETARD', 'CONTENTIEUX'];
const TYPES_FACTURE_PAYABLES: TypeFacture[] = ['FACTURE', 'DIVERSE'];

function validerLignesFacture(lignes: any[]) {
  for (const l of lignes) {
    const quantite = Number(l.quantite);
    const prixUnitaire = Number(l.prixUnitaire);
    if (!(quantite > 0)) {
      throw new Error(`Quantité invalide pour la ligne "${l.designation || ''}" : elle doit être strictement positive`);
    }
    if (!(prixUnitaire >= 0)) {
      throw new Error(`Prix unitaire invalide pour la ligne "${l.designation || ''}" : il ne peut pas être négatif`);
    }
    const montantBrut = quantite * prixUnitaire;
    const remise = Number(l.remise ?? 0);
    if (remise < 0 || remise > montantBrut) {
      throw new Error(`Remise invalide pour la ligne "${l.designation || ''}" : elle doit être comprise entre 0 et le montant brut de la ligne`);
    }
  }
}

export class FacturationService {
  async createFacture(societeId: string, createurId: string, data: any) {
    if (data.dossierId) {
      const dossier = await prisma.dossier.findFirst({ where: { id: data.dossierId, societeId } });
      if (!dossier) throw new Error('Dossier introuvable');
      if (STATUTS_DOSSIER_FERME.includes(dossier.statut)) {
        throw new Error(`Impossible de créer une facture : le dossier ${dossier.numero} est ${dossier.statut.toLowerCase()}`);
      }
    }

    const client = await prisma.client.findFirst({ where: { id: data.clientId, societeId } });
    if (!client) throw new Error('Client introuvable');

    validerLignesFacture(data.lignes);

    const numero = await genererNumero(societeId, 'FACTURE');

    const montantHT = data.lignes.reduce(
      (sum: number, l: any) => sum + (l.quantite * l.prixUnitaire - (l.remise || 0)),
      0
    );
    const montantTVA = data.lignes.reduce(
      (sum: number, l: any) => {
        const ht = l.quantite * l.prixUnitaire - (l.remise || 0);
        return sum + (ht * (l.tauxTVA ?? 18)) / 100;
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
        numeroNormalise: data.numeroNormalise || null,
        montantHT,
        montantTVA,
        timbreFiscal,
        retenue,
        montantTTC,
        resteAPayer: montantTTC,
        remise: data.remise || 0,
        tauxTVA: data.tauxTVA ?? 18,
        devise: data.devise || 'XOF',
        conditions: data.conditions,
        observations: data.observations,
        afficherSignature: !!data.afficherSignature,
        lignes: {
          create: data.lignes.map((l: any, index: number) => ({
            ordre: index + 1,
            categorie: l.categorie,
            codePrestation: l.codePrestation,
            designation: l.designation,
            quantite: l.quantite,
            unite: l.unite,
            prixUnitaire: l.prixUnitaire,
            montantHT: l.quantite * l.prixUnitaire - (l.remise || 0),
            tauxTVA: l.tauxTVA ?? 18,
            montantTVA:
              ((l.quantite * l.prixUnitaire - (l.remise || 0)) * (l.tauxTVA ?? 18)) / 100,
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
          dossier: { select: { id: true, numero: true, numeroPhysique: true } },
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
            id: true, numero: true, numeroPhysique: true, nature: true, designation: true,
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
    const facture = await prisma.facture.findFirst({ where: { id, societeId } });
    if (!facture) throw new Error('Facture non trouvée');
    if (facture.statut !== 'BROUILLON') {
      throw new Error('Seule une facture en brouillon peut être annulée directement ; pour une facture déjà validée, émettez un avoir');
    }
    return prisma.facture.update({
      where: { id },
      data: { statut: 'ANNULEE' },
    });
  }

  async creerAvoir(
    id: string,
    societeId: string,
    createurId: string,
    motif: string,
    lignesSelectionnees?: { ligneFactureId: string; montant: number }[]
  ) {
    if (!motif || !motif.trim()) throw new Error('Un motif est obligatoire pour créer un avoir');

    return prisma.$transaction(async (tx) => {
      // Verrou de ligne : serialise toute creation concurrente d'avoir sur cette meme facture,
      // pour que le controle du plafond et la mise a jour du resteAPayer restent coherents.
      const verrou = await tx.$queryRaw<{ id: string }[]>`SELECT id FROM "factures" WHERE id = ${id} AND "societeId" = ${societeId} FOR UPDATE`;
      if (verrou.length === 0) throw new Error('Facture non trouvée');

      const factureOrigine = await tx.facture.findFirst({
        where: { id, societeId },
        include: { lignes: true },
      });
      if (!factureOrigine) throw new Error('Facture non trouvée');
      if (factureOrigine.type === 'AVOIR') throw new Error('Impossible de créer un avoir sur un avoir');
      if (['BROUILLON', 'ANNULEE'].includes(factureOrigine.statut)) {
        throw new Error(`Impossible de créer un avoir sur une facture ${factureOrigine.statut.toLowerCase()}`);
      }

      // La TVA peut être portée soit par chaque ligne (tauxTVA > 0, factures saisies
      // directement), soit par une ligne dédiée estTVA:true à côté de lignes de prestation à
      // tauxTVA 0 (factures issues d'une proforma, cf. proformas.routes.ts). Dans ce second
      // cas, la TVA à extourner ne peut pas être lue sur les lignes de prestation elles-mêmes :
      // elle doit être calculée au prorata du HT crédité, à partir de la ligne de TVA d'origine.
      const lignesTVAOrigine = factureOrigine.lignes.filter((l) => l.estTVA);
      const lignesPrestationOrigine = factureOrigine.lignes.filter((l) => !l.estTVA);
      const totalTVASeparee = lignesTVAOrigine.reduce((s, l) => s + Number(l.montantTVA), 0);
      const totalHTZeroTauxOrigine = lignesPrestationOrigine
        .filter((l) => Number(l.tauxTVA) === 0)
        .reduce((s, l) => s + Number(l.montantHT), 0);

      let lignesAvoir: { ligne: (typeof factureOrigine.lignes)[number]; montant: number }[];
      if (lignesSelectionnees && lignesSelectionnees.length > 0) {
        lignesAvoir = lignesSelectionnees.map((sel) => {
          const ligneOrigine = factureOrigine.lignes.find((l) => l.id === sel.ligneFactureId);
          if (!ligneOrigine) throw new Error("Une des lignes sélectionnées n'appartient pas à cette facture");
          if (ligneOrigine.estTVA) {
            throw new Error('La ligne de TVA ne peut pas être sélectionnée directement : elle est recréditée automatiquement au prorata des lignes de prestation sélectionnées');
          }
          const montantDemande = Number(sel.montant);
          if (!(montantDemande > 0)) throw new Error("Le montant de chaque ligne d'avoir doit être positif");
          if (montantDemande > Number(ligneOrigine.montantHT)) {
            throw new Error(`Le montant de l'avoir pour la ligne "${ligneOrigine.designation}" dépasse son montant HT d'origine`);
          }
          return { ligne: ligneOrigine, montant: montantDemande };
        });
      } else {
        lignesAvoir = lignesPrestationOrigine.map((l) => ({ ligne: l, montant: Number(l.montantHT) }));
      }

      const montantHT = lignesAvoir.reduce((s, x) => s + x.montant, 0);
      // Les deux composantes de la TVA sont distinguées car seule la seconde (proratée) doit
      // être restituée via une ligne de TVA séparée : la première est déjà portée par chaque
      // ligne de prestation à tauxTVA > 0.
      let montantTVALignes = 0;
      let montantTVAProratee = 0;
      for (const x of lignesAvoir) {
        const taux = Number(x.ligne.tauxTVA);
        if (taux > 0) montantTVALignes += (x.montant * taux) / 100;
        else if (totalHTZeroTauxOrigine > 0 && totalTVASeparee > 0) montantTVAProratee += (x.montant / totalHTZeroTauxOrigine) * totalTVASeparee;
      }
      const montantTVA = montantTVALignes + montantTVAProratee;
      const montantTTC = montantHT + montantTVA;

      const avoirsExistants = await tx.facture.aggregate({
        where: { factureOrigineId: id, societeId, statut: { not: 'ANNULEE' } },
        _sum: { montantTTC: true },
      });
      const totalAvoirsExistants = Number(avoirsExistants._sum.montantTTC || 0);
      if (totalAvoirsExistants + montantTTC > Number(factureOrigine.montantTTC)) {
        throw new Error(
          `Le montant total des avoirs (${(totalAvoirsExistants + montantTTC).toFixed(2)}) dépasserait le montant TTC de la facture d'origine (${factureOrigine.montantTTC})`
        );
      }

      const numero = await genererNumero(societeId, 'AVOIR');

      const avoir = await tx.facture.create({
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
          montantHT,
          montantTVA,
          montantTTC,
          resteAPayer: 0,
          tauxTVA: factureOrigine.tauxTVA,
          lignes: {
            create: [
              ...lignesAvoir.map((x, index) => {
                const taux = Number(x.ligne.tauxTVA);
                const tvaLigne = taux > 0 ? (x.montant * taux) / 100 : 0;
                return {
                  ordre: index + 1,
                  categorie: x.ligne.categorie,
                  codePrestation: x.ligne.codePrestation,
                  compteComptable: x.ligne.compteComptable,
                  designation: x.ligne.designation,
                  quantite: x.ligne.quantite,
                  prixUnitaire: x.montant,
                  montantHT: x.montant,
                  tauxTVA: x.ligne.tauxTVA,
                  montantTVA: tvaLigne,
                  remise: 0,
                };
              }),
              // Lignes issues d'une proforma : la TVA extournée ci-dessus (prorata) n'est
              // portée par aucune ligne de prestation (tauxTVA 0) ; on la restitue comme ligne
              // distincte, à l'image de la ligne estTVA de la facture d'origine.
              ...(lignesTVAOrigine.length > 0 && montantTVAProratee > 0.001
                ? [{
                    ordre: lignesAvoir.length + 1,
                    categorie: lignesTVAOrigine[0].categorie,
                    codePrestation: lignesTVAOrigine[0].codePrestation,
                    compteComptable: null,
                    designation: lignesTVAOrigine[0].designation,
                    quantite: 1,
                    prixUnitaire: montantTVAProratee,
                    montantHT: 0,
                    tauxTVA: lignesTVAOrigine[0].tauxTVA,
                    montantTVA: montantTVAProratee,
                    estTVA: true,
                    remise: 0,
                  }]
                : []),
            ],
          },
        },
        include: { lignes: true },
      });

      // NB: si la facture d'origine est déjà intégralement payée, le reste à payer est
      // simplement plafonné à 0 (pas de génération de crédit/avance client pour l'instant,
      // chantier séparé à prévoir pour rembourser ou imputer le trop-perçu).
      const nouveauResteOrigine = Math.max(0, Number(factureOrigine.resteAPayer) - montantTTC);
      await tx.facture.update({
        where: { id },
        data: { resteAPayer: nouveauResteOrigine },
      });

      return avoir;
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

    if (!(montant > 0)) throw new Error('Montant invalide');
    if (!TYPES_FACTURE_PAYABLES.includes(facture.type)) {
      throw new Error("Un avoir ne peut pas faire l'objet d'un paiement client");
    }
    if (!STATUTS_FACTURE_PAYABLES.includes(facture.statut)) {
      throw new Error(`Paiement impossible : la facture est ${facture.statut.toLowerCase()}`);
    }
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
      const miseAJour = await tx.facture.updateMany({
        where: { id: factureId, statut: { in: STATUTS_FACTURE_PAYABLES }, resteAPayer: { gte: montant } },
        data: { resteAPayer: { decrement: montant }, montantPaye: { increment: montant } },
      });
      if (miseAJour.count !== 1) {
        throw new Error("Le paiement n'a pas pu être enregistré : la facture a changé d'état ou le montant dépasse le reste à payer");
      }

      const factureMaj = await tx.facture.findUniqueOrThrow({ where: { id: factureId } });
      const nouveauReste = Number(factureMaj.resteAPayer);
      await tx.facture.update({
        where: { id: factureId },
        data: { statut: nouveauReste <= 0 ? 'PAYEE' : 'PARTIELLEMENT_PAYEE' },
      });

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
          client: { societeId },
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

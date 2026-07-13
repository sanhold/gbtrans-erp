import prisma from '../../config/database';
import { genererNumero, suggererNumeroPhysiqueDossier } from '../../utils/numerotation';
import { FilterDossier, PaginationParams } from '../../types';
import { Prisma, StatutDossier } from '@prisma/client';
import { dossierEstFerme } from '../../utils/dossierGuard';

export class DossierService {
  async suggestionNumeroPhysique(societeId: string, nature: string, annee?: number) {
    const year = annee || new Date().getFullYear();
    return suggererNumeroPhysiqueDossier(societeId, nature, year);
  }

  async create(data: any, createurId: string) {
    if (!data.numeroPhysique || !String(data.numeroPhysique).trim()) {
      throw new Error('Le numéro physique du dossier est obligatoire');
    }

    const numero = await genererNumero(data.societeId, 'DOSSIER');
    const annee = new Date().getFullYear();

    let dossier;
    try {
      dossier = await prisma.dossier.create({
        data: {
          ...data,
          numeroPhysique: String(data.numeroPhysique).trim(),
          numero,
          annee,
          createurId,
          statut: 'NOUVEAU',
        },
        include: {
          client: { select: { id: true, code: true, raisonSociale: true } },
          createur: { select: { id: true, nom: true, prenom: true } },
          agent: { select: { id: true, nom: true, prenom: true } },
        },
      });
    } catch (error: any) {
      if (error.code === 'P2002' && error.meta?.target?.includes('numeroPhysique')) {
        throw new Error('Ce numéro physique est déjà utilisé par un autre dossier');
      }
      throw error;
    }

    await prisma.historiqueDossier.create({
      data: {
        dossierId: dossier.id,
        action: 'CREATION',
        statutApres: 'NOUVEAU',
        commentaire: 'Création du dossier',
        utilisateur: `${data.createurNom || 'Système'}`,
      },
    });

    return dossier;
  }

  async findAll(
    societeId: string,
    filters: FilterDossier,
    pagination: PaginationParams
  ) {
    const { page = 1, limit = 20, sortBy = 'dateCreation', sortOrder = 'desc' } = pagination;
    const skip = (page - 1) * limit;

    const where: Prisma.DossierWhereInput = {
      societeId,
      ...(filters.agenceId && { agenceId: filters.agenceId }),
      ...(filters.clientId && { clientId: filters.clientId }),
      ...(filters.nature && { nature: filters.nature as any }),
      ...(filters.type && { type: filters.type as any }),
      ...(filters.statut && { statut: filters.statut as any }),
      ...(filters.annee && { annee: filters.annee }),
      ...(filters.dateDebut &&
        filters.dateFin && {
          dateCreation: {
            gte: filters.dateDebut,
            lte: filters.dateFin,
          },
        }),
      ...(filters.search && {
        OR: [
          { numero: { contains: filters.search, mode: 'insensitive' as const } },
          { numeroPhysique: { contains: filters.search, mode: 'insensitive' as const } },
          { numeroBL: { contains: filters.search, mode: 'insensitive' as const } },
          { numeroDeclaration: { contains: filters.search, mode: 'insensitive' as const } },
          { designation: { contains: filters.search, mode: 'insensitive' as const } },
          { client: { raisonSociale: { contains: filters.search, mode: 'insensitive' as const } } },
        ],
      }),
    };

    const [data, total] = await Promise.all([
      prisma.dossier.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        include: {
          client: { select: { id: true, code: true, raisonSociale: true } },
          agent: { select: { id: true, nom: true, prenom: true } },
          conteneurs: true,
          _count: {
            select: { documents: true, factures: true, proformas: true },
          },
        },
      }),
      prisma.dossier.count({ where }),
    ]);

    return { data, total, page, limit };
  }

  async findById(id: string, societeId: string) {
    return prisma.dossier.findFirst({
      where: { id, societeId },
      include: {
        client: true,
        createur: { select: { id: true, nom: true, prenom: true } },
        agent: { select: { id: true, nom: true, prenom: true } },
        conteneurs: true,
        articles: { orderBy: { numero: 'asc' } },
        processus: { include: { etapes: { orderBy: { ordre: 'asc' } } } },
        documents: true,
        factures: {
          include: { lignes: true },
        },
        proformas: {
          include: { lignes: true },
        },
        historiqueDossier: {
          orderBy: { createdAt: 'desc' },
        },
        depenses: true,
        courriers: {
          include: { courrier: true },
        },
        admissionTemporaire: true,
      },
    });
  }

  async update(id: string, societeId: string, data: any, utilisateur: string) {
    const existing = await prisma.dossier.findFirst({
      where: { id, societeId },
    });

    if (!existing) throw new Error('Dossier non trouvé');
    if (dossierEstFerme(existing.statut)) {
      throw new Error(`Ce dossier est ${existing.statut.toLowerCase()} : impossible de le modifier`);
    }

    if ('numeroPhysique' in data && !String(data.numeroPhysique || '').trim()) {
      throw new Error('Le numéro physique du dossier est obligatoire');
    }

    let dossier;
    try {
      dossier = await prisma.dossier.update({
        where: { id },
        data,
        include: {
          client: { select: { id: true, code: true, raisonSociale: true } },
        },
      });
    } catch (error: any) {
      if (error.code === 'P2002' && error.meta?.target?.includes('numeroPhysique')) {
        throw new Error('Ce numéro physique est déjà utilisé par un autre dossier');
      }
      throw error;
    }

    await prisma.historiqueDossier.create({
      data: {
        dossierId: id,
        action: 'MODIFICATION',
        commentaire: 'Modification du dossier',
        utilisateur,
      },
    });

    return dossier;
  }

  async changeStatut(
    id: string,
    societeId: string,
    nouveauStatut: StatutDossier,
    utilisateur: string,
    commentaire?: string
  ) {
    const existing = await prisma.dossier.findFirst({
      where: { id, societeId },
    });

    if (!existing) throw new Error('Dossier non trouvé');
    if (dossierEstFerme(existing.statut) && nouveauStatut !== 'ARCHIVE') {
      throw new Error(`Ce dossier est déjà ${existing.statut.toLowerCase()} : impossible de changer son statut`);
    }

    const data: any = { statut: nouveauStatut };
    if (nouveauStatut === 'CLOTURE') data.dateCloture = new Date();
    if (nouveauStatut === 'ANNULE') data.dateAnnulation = new Date();

    const dossier = await prisma.dossier.update({
      where: { id },
      data,
    });

    await prisma.historiqueDossier.create({
      data: {
        dossierId: id,
        action: 'CHANGEMENT_STATUT',
        statutAvant: existing.statut,
        statutApres: nouveauStatut,
        commentaire: commentaire || `Passage au statut ${nouveauStatut}`,
        utilisateur,
      },
    });

    return dossier;
  }

  async archiver(id: string, societeId: string, utilisateur: string) {
    return this.changeStatut(id, societeId, 'ARCHIVE', utilisateur, 'Archivage du dossier');
  }

  async delete(id: string, societeId: string) {
    const existing = await prisma.dossier.findFirst({
      where: { id, societeId },
    });

    if (!existing) throw new Error('Dossier non trouvé');
    if (existing.statut !== 'NOUVEAU' && existing.statut !== 'ANNULE') {
      throw new Error('Seuls les dossiers NOUVEAU ou ANNULÉ peuvent être supprimés');
    }

    await prisma.dossier.delete({ where: { id } });
    return { message: 'Dossier supprimé' };
  }

  async getStatistiques(societeId: string, annee?: number) {
    const currentYear = annee || new Date().getFullYear();

    const [
      total,
      parStatut,
      parNature,
      parMois,
    ] = await Promise.all([
      prisma.dossier.count({
        where: { societeId, annee: currentYear },
      }),
      prisma.dossier.groupBy({
        by: ['statut'],
        where: { societeId, annee: currentYear },
        _count: true,
      }),
      prisma.dossier.groupBy({
        by: ['nature'],
        where: { societeId, annee: currentYear },
        _count: true,
      }),
      prisma.$queryRaw`
        SELECT EXTRACT(MONTH FROM "dateCreation") as mois, COUNT(*)::int as total
        FROM dossiers
        WHERE "societeId" = ${societeId} AND annee = ${currentYear}
        GROUP BY EXTRACT(MONTH FROM "dateCreation")
        ORDER BY mois
      `,
    ]);

    return { total, parStatut, parNature, parMois };
  }

  async getBilanDossiers(societeId: string, params: { annee?: number; statut?: string; clientId?: string; page?: number; limit?: number }) {
    const page = params.page || 1;
    const limit = params.limit || 20;
    const skip = (page - 1) * limit;

    const conditions: Prisma.Sql[] = [Prisma.sql`d."societeId" = ${societeId}`];
    if (params.annee) conditions.push(Prisma.sql`d.annee = ${params.annee}`);
    if (params.statut) conditions.push(Prisma.sql`d.statut = ${params.statut}::"StatutDossier"`);
    if (params.clientId) conditions.push(Prisma.sql`d."clientId" = ${params.clientId}`);
    const whereClause = Prisma.join(conditions, ' AND ');

    const data: any[] = await prisma.$queryRaw`
      SELECT d.id, d.numero, d.statut, d.annee, d."dateCreation",
        COALESCE(p.montant_proforma, 0)::float AS "montantProforma",
        COALESCE(f.montant_tva, 0)::float AS "montantTVA",
        COALESCE(f.montant_prestation, 0)::float AS "montantPrestation",
        COALESCE(f.montant_paye, 0)::float AS "montantPaye",
        COALESCE(f.montant_restant, 0)::float AS "montantRestant",
        COALESCE(dep.montant_depense, 0)::float AS "montantDepense"
      FROM dossiers d
      LEFT JOIN (
        SELECT "dossierId", SUM("montantTTC") AS montant_proforma
        FROM proformas WHERE statut NOT IN ('ANNULEE', 'EXPIREE') GROUP BY "dossierId"
      ) p ON p."dossierId" = d.id
      LEFT JOIN (
        SELECT "dossierId", SUM("montantTVA") AS montant_tva, SUM("montantPrestation") AS montant_prestation,
               SUM("montantPaye") AS montant_paye, SUM("resteAPayer") AS montant_restant
        FROM factures WHERE statut NOT IN ('ANNULEE', 'BROUILLON') GROUP BY "dossierId"
      ) f ON f."dossierId" = d.id
      LEFT JOIN (
        SELECT "dossierId", SUM(montant) AS montant_depense FROM depenses GROUP BY "dossierId"
      ) dep ON dep."dossierId" = d.id
      WHERE ${whereClause}
      ORDER BY d."dateCreation" DESC
      LIMIT ${limit} OFFSET ${skip}
    `;

    const totalResult: any[] = await prisma.$queryRaw`
      SELECT COUNT(*)::int AS count FROM dossiers d WHERE ${whereClause}
    `;

    return { data, total: totalResult[0]?.count || 0, page, limit };
  }
}

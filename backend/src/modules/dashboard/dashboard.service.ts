import prisma from '../../config/database';
import { DashboardStats } from '../../types';

export class DashboardService {
  async getStats(societeId: string, annee?: number): Promise<DashboardStats> {
    const year = annee || new Date().getFullYear();
    const dateDebutAnnee = new Date(year, 0, 1);
    const dateFinAnnee = new Date(year + 1, 0, 1);
    const maintenant = new Date();
    const dateDebutMois = new Date(maintenant.getFullYear(), maintenant.getMonth(), 1);
    const dateFinMois = new Date(maintenant.getFullYear(), maintenant.getMonth() + 1, 1);

    const dossierFilter = { societeId, annee: year };

    const [
      totalDossiers,
      dossiersImport,
      dossiersExport,
      dossiersTransit,
      totalClients,
      totalFournisseurs,
      facturesAgg,
      paiementsAgg,
      totalProformas,
      totalFactures,
      atActives,
      atExpirees,
      totalCautions,
      totalCourriers,
      documentsArchives,
      depensesAgg,
      dossiersParAnneeRaw,
      dossiersEnCours,
      facturesImpayeesCount,
      factureMoisAgg,
    ] = await Promise.all([
      prisma.dossier.count({ where: dossierFilter }),
      prisma.dossier.count({ where: { ...dossierFilter, nature: 'IMPORT' } }),
      prisma.dossier.count({ where: { ...dossierFilter, nature: 'EXPORT' } }),
      prisma.dossier.count({ where: { ...dossierFilter, nature: 'TRANSIT' } }),
      prisma.client.count({ where: { societeId, actif: true } }),
      prisma.fournisseur.count({ where: { societeId, actif: true } }),
      prisma.facture.aggregate({
        where: {
          societeId,
          statut: { not: 'ANNULEE' },
          dateFacture: { gte: dateDebutAnnee, lt: dateFinAnnee },
        },
        _sum: { montantTTC: true, montantPaye: true, resteAPayer: true },
      }),
      prisma.paiement.aggregate({
        where: {
          statut: 'VALIDE',
          datePaiement: { gte: dateDebutAnnee, lt: dateFinAnnee },
        },
        _sum: { montant: true },
      }),
      prisma.proforma.count({
        where: {
          client: { societeId },
          statut: { not: 'ANNULEE' },
        },
      }),
      prisma.facture.count({
        where: {
          societeId,
          statut: { not: 'ANNULEE' },
          dateFacture: { gte: dateDebutAnnee, lt: dateFinAnnee },
        },
      }),
      prisma.admissionTemporaire.count({ where: { statut: 'ACTIVE' } }),
      prisma.admissionTemporaire.count({ where: { statut: 'EXPIREE' } }),
      prisma.caution.count({ where: { societeId, statut: { not: 'PAYEE' } } }),
      prisma.courrier.count(),
      prisma.document.count({ where: { archive: true } }),
      prisma.depense.aggregate({
        where: {
          dateDepense: { gte: dateDebutAnnee, lt: dateFinAnnee },
          statut: 'VALIDE',
        },
        _sum: { montant: true },
      }),
      prisma.dossier.groupBy({
        by: ['annee'],
        where: { societeId },
        _count: true,
        orderBy: { annee: 'desc' },
        take: 5,
      }),
      prisma.dossier.count({
        where: { societeId, statut: { notIn: ['CLOTURE', 'ANNULE', 'ARCHIVE'] } },
      }),
      prisma.facture.count({
        where: {
          societeId,
          statut: { in: ['VALIDEE', 'ENVOYEE', 'PARTIELLEMENT_PAYEE'] },
          resteAPayer: { gt: 0 },
        },
      }),
      prisma.facture.aggregate({
        where: {
          societeId,
          statut: { not: 'ANNULEE' },
          dateFacture: { gte: dateDebutMois, lt: dateFinMois },
        },
        _sum: { montantTTC: true },
      }),
    ]);

    const montantFacture = Number(facturesAgg._sum.montantTTC || 0);
    const montantEncaisse = Number(facturesAgg._sum.montantPaye || 0);
    const montantImpaye = Number(facturesAgg._sum.resteAPayer || 0);
    const recettes = Number(paiementsAgg._sum.montant || 0);
    const depenses = Number(depensesAgg._sum.montant || 0);
    const montantFactureMois = Number(factureMoisAgg._sum.montantTTC || 0);

    const dossiersParAnnee: Record<string, number> = {};
    dossiersParAnneeRaw.forEach((d) => {
      dossiersParAnnee[d.annee.toString()] = d._count;
    });

    return {
      totalDossiers,
      dossiersParAnnee,
      dossiersImport,
      dossiersExport,
      dossiersTransit,
      totalClients,
      totalFournisseurs,
      montantFacture,
      montantEncaisse,
      montantImpaye,
      totalProformas,
      totalFactures,
      atActives,
      atExpirees,
      totalCautions,
      totalCourriers,
      documentsArchives,
      recettes,
      depenses,
      benefice: recettes - depenses,
      dossiersEnCours,
      facturesImpayeesCount,
      montantFactureMois,
    };
  }

  async getChiffreAffairesMensuel(societeId: string, annee?: number) {
    const year = annee || new Date().getFullYear();
    return prisma.$queryRaw`
      SELECT
        EXTRACT(MONTH FROM "dateFacture")::int as mois,
        SUM("montantTTC")::float as ca,
        SUM("montantPaye")::float as encaisse,
        SUM("resteAPayer")::float as impaye,
        COUNT(*)::int as nombre_factures
      FROM factures
      WHERE "societeId" = ${societeId}
        AND "statut" != 'ANNULEE'
        AND EXTRACT(YEAR FROM "dateFacture") = ${year}
      GROUP BY EXTRACT(MONTH FROM "dateFacture")
      ORDER BY mois
    `;
  }

  async getTopClients(societeId: string, limit = 10, annee?: number) {
    const year = annee || new Date().getFullYear();
    return prisma.$queryRaw`
      SELECT
        c.id,
        c.code,
        c."raisonSociale",
        COUNT(DISTINCT d.id)::int as nombre_dossiers,
        COALESCE(SUM(f."montantTTC"), 0)::float as ca_total,
        COALESCE(SUM(f."resteAPayer"), 0)::float as impaye
      FROM clients c
      LEFT JOIN dossiers d ON d."clientId" = c.id AND d.annee = ${year}
      LEFT JOIN factures f ON f."clientId" = c.id AND f."statut" != 'ANNULEE'
        AND EXTRACT(YEAR FROM f."dateFacture") = ${year}
      WHERE c."societeId" = ${societeId} AND c.actif = true
      GROUP BY c.id, c.code, c."raisonSociale"
      HAVING COALESCE(SUM(f."montantTTC"), 0) > 0
      ORDER BY ca_total DESC
      LIMIT ${limit}
    `;
  }

  async getAlertes(societeId: string) {
    const maintenant = new Date();
    const dans30jours = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    const [atExpirationProche, cautionsCourrierEnAttente, facturesEnRetard] = await Promise.all([
      prisma.admissionTemporaire.findMany({
        where: {
          statut: 'ACTIVE',
          dateExpiration: { lte: dans30jours, gte: maintenant },
        },
        orderBy: { dateExpiration: 'asc' },
        take: 10,
      }),
      prisma.caution.findMany({
        where: {
          societeId,
          statut: 'EN_ATTENTE',
          dateDepotCourrier: null,
        },
        orderBy: { dateCaution: 'asc' },
        take: 10,
      }),
      prisma.facture.findMany({
        where: {
          societeId,
          statut: { in: ['VALIDEE', 'ENVOYEE', 'PARTIELLEMENT_PAYEE'] },
          dateEcheance: { lt: maintenant },
          resteAPayer: { gt: 0 },
        },
        include: {
          client: { select: { raisonSociale: true } },
        },
        orderBy: { dateEcheance: 'asc' },
        take: 20,
      }),
    ]);

    return {
      atExpirationProche,
      cautionsCourrierEnAttente,
      facturesEnRetard,
    };
  }
}

import { Router } from 'express';
import authRoutes from '../modules/auth/auth.routes';
import dashboardRoutes from '../modules/dashboard/dashboard.routes';
import dossierRoutes from '../modules/dossiers/dossiers.routes';
import clientRoutes from '../modules/clients/clients.routes';
import facturationRoutes from '../modules/facturation/facturation.routes';
import fournisseurRoutes from '../modules/fournisseurs/fournisseurs.routes';
import atRoutes from '../modules/at/at.routes';
import cautionRoutes from '../modules/cautions/cautions.routes';
import courrierRoutes from '../modules/courriers/courriers.routes';
import modelesCourrierRoutes from '../modules/modeles-courrier/modeles-courrier.routes';
import articleRoutes from '../modules/articles/articles.routes';
import processusRoutes from '../modules/processus/processus.routes';
import proformaRoutes from '../modules/proformas/proformas.routes';
import prospectRoutes from '../modules/prospects/prospects.routes';
import offresRoutes from '../modules/offres/offres.routes';
import comptabiliteRoutes from '../modules/comptabilite/comptabilite.routes';
import utilisateursRoutes from '../modules/utilisateurs/utilisateurs.routes';
import caissesRoutes from '../modules/finance/caisses.routes';
import comptesBancairesRoutes from '../modules/finance/comptes-bancaires.routes';
import operationsRoutes from '../modules/finance/operations.routes';
import depensesRoutes from '../modules/finance/depenses.routes';
import paiementsFinanceRoutes from '../modules/finance/paiements.routes';
import rapprochementsRoutes from '../modules/finance/rapprochements.routes';
import facturesFournisseursRoutes from '../modules/finance/factures-fournisseurs.routes';
import comptesTiersRoutes from '../modules/finance/comptes-tiers.routes';
import comptesClientsRoutes from '../modules/finance/comptes-clients.routes';
import comptesFournisseursRoutes from '../modules/finance/comptes-fournisseurs.routes';
import dotationsRoutes from '../modules/finance/dotations.routes';
import documentsRoutes from '../modules/documents/documents.routes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/dossiers', dossierRoutes);
router.use('/clients', clientRoutes);
router.use('/factures', facturationRoutes);
router.use('/fournisseurs', fournisseurRoutes);
router.use('/at', atRoutes);
router.use('/cautions', cautionRoutes);
router.use('/courriers', courrierRoutes);
router.use('/modeles-courrier', modelesCourrierRoutes);
router.use('/articles', articleRoutes);
router.use('/processus', processusRoutes);
router.use('/proformas', proformaRoutes);
router.use('/prospects', prospectRoutes);
router.use('/offres', offresRoutes);
router.use('/comptabilite', comptabiliteRoutes);
router.use('/utilisateurs', utilisateursRoutes);
router.use('/finance/caisses', caissesRoutes);
router.use('/finance/comptes-bancaires', comptesBancairesRoutes);
router.use('/finance/operations', operationsRoutes);
router.use('/finance/depenses', depensesRoutes);
router.use('/finance/paiements', paiementsFinanceRoutes);
router.use('/finance/rapprochements', rapprochementsRoutes);
router.use('/finance/factures-fournisseurs', facturesFournisseursRoutes);
router.use('/finance/comptes-tiers', comptesTiersRoutes);
router.use('/finance/comptes-clients', comptesClientsRoutes);
router.use('/finance/comptes-fournisseurs', comptesFournisseursRoutes);
router.use('/finance/dotations', dotationsRoutes);
router.use('/documents', documentsRoutes);

router.get('/health', (_req, res) => {
  res.json({
    status: 'OK',
    application: 'GBTRANS ERP',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

export default router;

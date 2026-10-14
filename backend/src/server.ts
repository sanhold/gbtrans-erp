import { config } from './config';
import { logger } from './utils/logger';
import prisma from './config/database';
import app from './app';

// Préchauffage du pool de connexions Prisma (évite la pénalité d'ouverture
// de connexions lors de la première requête réelle sur une base distante)
async function prechaufferPoolConnexions() {
  const nbConnexions = 10;
  try {
    await Promise.all(Array.from({ length: nbConnexions }, () => prisma.$queryRaw`SELECT 1`));
    logger.info(`Pool de connexions préchauffé (${nbConnexions} connexions)`);
  } catch (error) {
    logger.warn('Préchauffage du pool de connexions échoué (non bloquant):', error);
  }
}

// Démarrage du serveur
const PORT = config.port;
app.listen(PORT, () => {
  logger.info(`
╔══════════════════════════════════════════════════════╗
║                                                      ║
║           GBTRANS ERP - Serveur démarré              ║
║                                                      ║
║   Port:          ${PORT}                                ║
║   Environnement: ${config.env.padEnd(20)}             ║
║   API:           ${config.apiPrefix.padEnd(20)}       ║
║                                                      ║
╚══════════════════════════════════════════════════════╝
  `);
  prechaufferPoolConnexions();

  // Minuteur interne des sauvegardes dues (verification horaire). Best-effort : un service
  // Render gratuit peut s'endormir apres inactivite et interrompre ce minuteur — un appel
  // cron externe sur POST /api/v1/cron/sauvegardes sert de filet de securite (cf.
  // modules/sauvegarde/cron.routes.ts).
  setInterval(() => {
    import('./modules/sauvegarde/sauvegarde.service').then(({ executerSauvegardesDues }) => {
      executerSauvegardesDues()
        .then(r => { if (r.total > 0) logger.info(`Sauvegardes automatiques : ${r.reussies}/${r.total} reussies`); })
        .catch(err => logger.warn('Erreur sauvegardes automatiques:', err));
    });
  }, 60 * 60 * 1000);
});

export default app;

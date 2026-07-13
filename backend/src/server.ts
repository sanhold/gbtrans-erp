import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import path from 'path';
import { config } from './config';
import { logger } from './utils/logger';
import routes from './routes';

const app = express();

// Sécurité
app.use(helmet());
app.use(cors({
  origin: config.cors.origin,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Rate Limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
  message: { success: false, message: 'Trop de requêtes. Réessayez dans 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { success: false, message: 'Trop de tentatives. Réessayez dans 15 minutes.' },
});
app.use('/api/v1/auth/login', authLimiter);

// Parsing & Compression
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(compression());

// Logging HTTP
app.use(morgan('combined', {
  stream: {
    write: (message: string) => logger.info(message.trim()),
  },
}));

// Fichiers statiques (uploads)
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Routes API
app.use(config.apiPrefix, routes);

// Route racine
app.get('/', (_req, res) => {
  res.json({
    application: 'GBTRANS ERP',
    description: 'Solution complète de gestion de bureau de transit',
    version: '1.0.0',
    api: `${config.apiPrefix}`,
    documentation: `${config.apiPrefix}/docs`,
    sante: `${config.apiPrefix}/health`,
  });
});

// 404
app.use((_req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route non trouvée',
    timestamp: new Date().toISOString(),
  });
});

// Gestion d'erreurs globale
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  logger.error('Erreur non gérée:', err);
  res.status(500).json({
    success: false,
    message: config.env === 'production' ? 'Erreur interne du serveur' : err.message,
    timestamp: new Date().toISOString(),
  });
});

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
});

export default app;

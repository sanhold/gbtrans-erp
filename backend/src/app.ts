import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import { config } from './config';
import { logger } from './utils/logger';
import routes from './routes';

// Création de l'application Express, séparée du démarrage du serveur HTTP (app.listen).
// Permet de l'importer directement dans les tests (Supertest) sans ouvrir de port réel.
const app = express();

// L'application est déployée derrière le proxy Render : sans ce réglage, req.ip
// renvoie l'IP du proxy et le rate limit (ex: /auth/login) devient global à toute
// la plateforme au lieu d'être appliqué par IP cliente.
app.set('trust proxy', 1);

// Sécurité
app.use(helmet());
app.use(cors({
  origin: config.cors.origin,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Tenant-Slug'],
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
app.use('/api/v1/auth/verify-2fa', authLimiter);
app.use('/api/v1/auth/confirm-2fa', authLimiter);
app.use('/api/v1/platform/login', authLimiter);
app.use('/api/v1/saas/inscription', authLimiter);

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

// Les fichiers uploades (documents/archives) ne sont plus servis en statique et sans
// authentification : ils transitent desormais par la route authentifiee et filtree par
// societe GET /api/v1/documents/:id/fichier (cf. modules/documents/documents.routes.ts).

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

export default app;

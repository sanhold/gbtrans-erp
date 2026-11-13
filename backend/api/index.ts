/**
 * Point d'entrée Vercel (fonction serverless). Réutilise l'application Express sans
 * app.listen ni minuteurs (ils restent dans src/server.ts, utilisé par Render).
 */
import app from '../src/app';

export default app;

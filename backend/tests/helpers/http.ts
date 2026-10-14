import request from 'supertest';
import app from '../../src/app';
import { MOT_DE_PASSE_TEST } from './seed';

/** Point d'entrée Supertest sur l'app Express réelle (aucun port ouvert). */
export function api() {
  return request(app);
}

/**
 * Authentifie un utilisateur de test via POST /api/v1/auth/login (comme un vrai client
 * HTTP) et retourne le token JWT de session.
 */
export async function connecter(email: string, motDePasse = MOT_DE_PASSE_TEST): Promise<string> {
  const res = await request(app).post('/api/v1/auth/login').send({ email, motDePasse });
  if (res.status !== 200 || !res.body?.data?.token) {
    throw new Error(`Échec de connexion pour ${email} (statut ${res.status}): ${JSON.stringify(res.body)}`);
  }
  return res.body.data.token as string;
}

export function authHeader(token: string) {
  return { Authorization: `Bearer ${token}` };
}

export { app };

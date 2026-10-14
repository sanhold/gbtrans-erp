import { creerSocieteAvecAdmin } from './seed';
import { connecter } from './http';

export { authHeader } from './http';

/** Contexte HTTP authentifié d'une société de test (token admin prêt à l'emploi). */
export interface ContexteSociete {
  societeId: string;
  token: string;
  email: string;
}

export async function creerContexteSociete(libelle: string): Promise<ContexteSociete> {
  const societe = await creerSocieteAvecAdmin(libelle);
  const token = await connecter(societe.email);
  return { societeId: societe.societeId, token, email: societe.email };
}

/** Crée les deux sociétés de test A et B utilisées par toutes les suites d'isolation. */
export async function creerSocietesAB(): Promise<{ A: ContexteSociete; B: ContexteSociete }> {
  const [A, B] = await Promise.all([
    creerContexteSociete('Société A'),
    creerContexteSociete('Société B'),
  ]);
  return { A, B };
}

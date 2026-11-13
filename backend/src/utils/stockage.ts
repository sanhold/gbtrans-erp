/**
 * Stockage des fichiers uploadés (documents/archives).
 * - Par défaut : disque local (Render, développement), comportement historique.
 * - Si SUPABASE_URL et SUPABASE_SERVICE_KEY sont définis : bucket Supabase Storage (privé),
 *   indispensable sur Vercel dont le système de fichiers est éphémère et en lecture seule.
 * Le chemin enregistré en base (document.chemin) reste identique dans les deux modes.
 */
import fs from 'fs';
import path from 'path';

const RACINE_DISQUE = path.join(__dirname, '../../uploads');

export const BUCKET = process.env.SUPABASE_STORAGE_BUCKET || 'documents';

export function stockageDistant(): boolean {
  return Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_KEY);
}

function urlObjet(chemin: string): string {
  const base = (process.env.SUPABASE_URL as string).replace(/\/$/, '');
  const encode = chemin.split('/').map(encodeURIComponent).join('/');
  return `${base}/storage/v1/object/${BUCKET}/${encode}`;
}

function entetes(extra: Record<string, string> = {}): Record<string, string> {
  const cle = process.env.SUPABASE_SERVICE_KEY as string;
  return { Authorization: `Bearer ${cle}`, apikey: cle, ...extra };
}

export async function enregistrerFichier(chemin: string, contenu: Buffer, typeMime: string): Promise<void> {
  if (stockageDistant()) {
    const rep = await fetch(urlObjet(chemin), {
      method: 'POST',
      headers: entetes({ 'Content-Type': typeMime || 'application/octet-stream', 'x-upsert': 'false' }),
      body: contenu,
    });
    if (!rep.ok) throw new Error(`Échec de l'enregistrement du fichier (${rep.status})`);
    return;
  }
  const absolu = path.join(RACINE_DISQUE, chemin);
  fs.mkdirSync(path.dirname(absolu), { recursive: true });
  fs.writeFileSync(absolu, contenu);
}

/** Retourne le contenu du fichier, ou null s'il n'existe pas. */
export async function lireFichier(chemin: string): Promise<Buffer | null> {
  if (stockageDistant()) {
    const rep = await fetch(urlObjet(chemin), { headers: entetes() });
    if (rep.status === 404 || rep.status === 400) return null;
    if (!rep.ok) throw new Error(`Échec de la lecture du fichier (${rep.status})`);
    return Buffer.from(await rep.arrayBuffer());
  }
  const absolu = path.join(RACINE_DISQUE, chemin);
  if (!absolu.startsWith(RACINE_DISQUE) || !fs.existsSync(absolu)) return null;
  return fs.readFileSync(absolu);
}

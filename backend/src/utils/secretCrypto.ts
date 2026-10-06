/**
 * Chiffrement symetrique (AES-256-GCM) des identifiants de fournisseurs de paiement
 * stockes en base. La cle de chiffrement (ENCRYPTION_KEY, 32 octets en base64) reste
 * exclusivement une variable d'environnement serveur : meme en cas de fuite de la
 * base de donnees, les secrets chiffres restent inexploitables sans cette cle.
 *
 * A configurer sur Render : ENCRYPTION_KEY=<32 octets aleatoires encodes en base64>
 * Generer avec : node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
 */
import crypto from 'crypto';

function cle(): Buffer {
  const b64 = process.env.ENCRYPTION_KEY;
  if (!b64) throw new Error("ENCRYPTION_KEY manquante : impossible de chiffrer/dechiffrer les identifiants de paiement");
  const buf = Buffer.from(b64, 'base64');
  if (buf.length !== 32) throw new Error('ENCRYPTION_KEY doit faire 32 octets (256 bits) encodes en base64');
  return buf;
}

export function chiffrer(texteClair: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', cle(), iv);
  const chiffre = Buffer.concat([cipher.update(texteClair, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, chiffre]).toString('base64');
}

export function dechiffrer(valeurChiffree: string): string {
  const data = Buffer.from(valeurChiffree, 'base64');
  const iv = data.subarray(0, 12);
  const tag = data.subarray(12, 28);
  const chiffre = data.subarray(28);
  const decipher = crypto.createDecipheriv('aes-256-gcm', cle(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(chiffre), decipher.final()]).toString('utf8');
}

export function chiffrementConfigure(): boolean {
  return !!process.env.ENCRYPTION_KEY;
}

/**
 * Envoi d'emails depuis la plateforme (sauvegardes, notifications...). Utilise un compte
 * SMTP propre a la plateforme (pas celui de chaque societe, qui sert a leurs propres envois
 * clients) : variables d'environnement PLATFORM_SMTP_HOST / PORT / USER / PASS / SECURE,
 * a configurer sur Render.
 */
import nodemailer from 'nodemailer';

export function emailPlateformeConfigure(): boolean {
  return !!(process.env.PLATFORM_SMTP_HOST && process.env.PLATFORM_SMTP_USER && process.env.PLATFORM_SMTP_PASS);
}

function transporteur() {
  return nodemailer.createTransport({
    host: process.env.PLATFORM_SMTP_HOST,
    port: parseInt(process.env.PLATFORM_SMTP_PORT || '587'),
    secure: process.env.PLATFORM_SMTP_SECURE === 'true',
    auth: { user: process.env.PLATFORM_SMTP_USER, pass: process.env.PLATFORM_SMTP_PASS },
  });
}

export interface EnvoiEmailParams {
  destinataire: string;
  sujet: string;
  texte: string;
  pieceJointe?: { nomFichier: string; contenu: Buffer };
}

export async function envoyerEmail(params: EnvoiEmailParams): Promise<void> {
  if (!emailPlateformeConfigure()) throw new Error("Envoi d'email non configuré : variables PLATFORM_SMTP_* manquantes sur le serveur");
  await transporteur().sendMail({
    from: process.env.PLATFORM_SMTP_FROM || process.env.PLATFORM_SMTP_USER,
    to: params.destinataire,
    subject: params.sujet,
    text: params.texte,
    attachments: params.pieceJointe ? [{ filename: params.pieceJointe.nomFichier, content: params.pieceJointe.contenu }] : undefined,
  });
}

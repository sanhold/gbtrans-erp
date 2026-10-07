import { gzipSync } from 'zlib';
import prisma from '../../config/database';
import { exporterDonneesSociete } from '../../utils/tablesSocietes';
import { envoyerEmail, emailPlateformeConfigure } from '../../utils/email';

export async function executerSauvegarde(societeId: string): Promise<{ statut: string; tailleOctets: number; destinataire: string | null; message: string | null }> {
  const societe = await prisma.societe.findUnique({ where: { id: societeId } });
  if (!societe) throw new Error('Société introuvable');

  const destinataire = societe.backupEmailDestination || societe.email;
  let statut = 'ECHEC';
  let message: string | null = null;
  let tailleOctets = 0;

  try {
    if (!destinataire) throw new Error('Aucune adresse email de destination configurée');
    if (!emailPlateformeConfigure()) throw new Error("Service d'envoi d'email non configuré sur le serveur");

    const donnees = await exporterDonneesSociete(societeId);
    const json = JSON.stringify({ societe: societe.raisonSociale, dateExport: new Date().toISOString(), donnees }, null, 0);
    const buffer = gzipSync(Buffer.from(json, 'utf8'));
    tailleOctets = buffer.length;

    const dateStr = new Date().toISOString().slice(0, 10);
    await envoyerEmail({
      destinataire,
      sujet: `Sauvegarde GBTRANS — ${societe.raisonSociale} — ${dateStr}`,
      texte: `Bonjour,\n\nVoici la sauvegarde automatique des données de ${societe.raisonSociale} au ${dateStr}.\n\nCe fichier contient un export de vos données (dossiers, clients, factures, etc.) au format JSON compressé. Conservez-le en lieu sûr.\n\nNote : les fichiers joints aux dossiers (documents numérisés) ne sont pas inclus dans cet export, seules leurs références le sont.\n\nL'équipe GBTRANS`,
      pieceJointe: { nomFichier: `sauvegarde_${societe.code}_${dateStr}.json.gz`, contenu: buffer },
    });

    statut = 'REUSSI';
  } catch (e: any) {
    message = e.message;
  }

  await prisma.$transaction([
    prisma.sauvegardeSociete.create({ data: { societeId, statut, tailleOctets: tailleOctets || null, destinataire: destinataire || null, message } }),
    prisma.societe.update({ where: { id: societeId }, data: { derniereSauvegardeAt: new Date() } }),
  ]);

  return { statut, tailleOctets, destinataire: destinataire || null, message };
}

/** Societes dont la sauvegarde periodique est due (active, jamais faite ou echeance depassee). */
export async function societesSauvegardeDue() {
  const societes = await prisma.societe.findMany({ where: { actif: true, backupActif: true } });
  const maintenant = Date.now();
  return societes.filter(s => {
    if (!s.derniereSauvegardeAt) return true;
    const echeance = s.derniereSauvegardeAt.getTime() + s.backupFrequenceJours * 24 * 60 * 60 * 1000;
    return echeance <= maintenant;
  });
}

export async function executerSauvegardesDues(): Promise<{ total: number; reussies: number }> {
  const dues = await societesSauvegardeDue();
  let reussies = 0;
  for (const societe of dues) {
    try {
      const r = await executerSauvegarde(societe.id);
      if (r.statut === 'REUSSI') reussies++;
    } catch { /* passe a la suivante */ }
  }
  return { total: dues.length, reussies };
}

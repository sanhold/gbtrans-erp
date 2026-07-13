import { PrismaClient, TypeCourrier } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const societe = await prisma.societe.findFirst({ where: { code: 'GBTRANS' } });
  if (!societe) { console.error('❌ Société GBTRANS non trouvée. Lancez d\'abord le seed principal.'); return; }

  const modeles: { nom: string; type: TypeCourrier; objet: string; contenu: string }[] = [
    {
      nom: "Avis d'arrivée marchandise",
      type: 'SORTANT',
      objet: "Avis d'arrivée — Dossier {DOSSIER}",
      contenu: `Cher(e) {CLIENT},

Nous vous informons de l'arrivée de votre marchandise, transportée par {COMPAGNIE}, sous connaissement N° {NUMERO_BL}, rattachée à notre dossier {DOSSIER}.

Merci de bien vouloir nous transmettre les documents nécessaires au dédouanement dans les meilleurs délais.

Cordialement,
{SOCIETE}`,
    },
    {
      nom: 'Demande de main levée',
      type: 'SORTANT',
      objet: 'Demande de main levée — Dossier {DOSSIER}',
      contenu: `Bureau des Douanes,

Nous sollicitons la main levée de la marchandise relative au dossier {DOSSIER} (BL {NUMERO_BL}), pour le compte de notre client {CLIENT}.

Vous trouverez ci-joint les pièces justificatives requises.

Cordialement,
{SOCIETE}`,
    },
    {
      nom: 'Relance paiement facture',
      type: 'SORTANT',
      objet: 'Relance de paiement — Dossier {DOSSIER}',
      contenu: `Cher(e) {CLIENT},

Sauf erreur de notre part, nous n'avons pas encore reçu le règlement de la facture relative au dossier {DOSSIER}.

Nous vous remercions de bien vouloir régulariser cette situation dans les plus brefs délais.

Cordialement,
{SOCIETE}`,
    },
    {
      nom: 'Accusé de réception',
      type: 'SORTANT',
      objet: 'Accusé de réception — {DOSSIER}',
      contenu: `Cher(e) {CLIENT},

Nous accusons réception de votre courrier / de vos documents en date du {DATE}, relatifs au dossier {DOSSIER}.

Nous ne manquerons pas de vous tenir informé(e) de la suite donnée.

Cordialement,
{SOCIETE}`,
    },
    {
      nom: 'Enregistrement demande client',
      type: 'ENTRANT',
      objet: 'Demande reçue — {CLIENT}',
      contenu: `Courrier reçu de {CLIENT} le {DATE}, concernant le dossier {DOSSIER}.

Objet de la demande : (à compléter)

Suite à donner : (à compléter)`,
    },
    {
      nom: 'Enregistrement avis compagnie maritime',
      type: 'ENTRANT',
      objet: 'Avis {COMPAGNIE} — BL {NUMERO_BL}',
      contenu: `Avis reçu de {COMPAGNIE} le {DATE} concernant le BL {NUMERO_BL} (dossier {DOSSIER}).

Détail : (à compléter)`,
    },
  ];

  let total = 0;
  for (const m of modeles) {
    const existing = await prisma.modeleCourrier.findFirst({ where: { societeId: societe.id, nom: m.nom } });
    if (!existing) {
      await prisma.modeleCourrier.create({ data: { ...m, societeId: societe.id } });
      total++;
    }
  }
  console.log(`✅ ${total} modèle(s) de courrier créé(s) (${modeles.length - total} déjà existants)`);
}

main().catch(e => console.error(e)).finally(() => prisma.$disconnect());

import { PrismaClient, StatutCaution } from '@prisma/client';

const prisma = new PrismaClient();

function randomItem<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

async function main() {
  const societe = await prisma.societe.findFirst({ where: { code: 'GBTRANS' } });
  if (!societe) { console.error('❌ Société GBTRANS non trouvée.'); return; }

  const dossiers = await prisma.dossier.findMany({
    where: { societeId: societe.id, numeroBL: { not: null } },
    orderBy: { dateCreation: 'desc' },
  });

  if (dossiers.length === 0) { console.log('Aucun dossier avec N° BL trouvé, rien à faire.'); return; }

  let total = 0;
  for (let i = 0; i < dossiers.length; i++) {
    const d = dossiers[i];
    const dateCaution = new Date(d.dateCreation.getTime() + randomInt(1, 5) * 86400000);

    let statut: StatutCaution = 'EN_ATTENTE';
    if (i === 0) statut = 'NON_ACTIVE';
    else if (Math.random() < 0.35) statut = 'PAYEE';

    const dateDepotCourrier = statut !== 'NON_ACTIVE' && Math.random() < 0.5
      ? new Date(dateCaution.getTime() + randomInt(1, 10) * 86400000) : null;
    const datePaiement = statut === 'PAYEE'
      ? new Date((dateDepotCourrier || dateCaution).getTime() + randomInt(2, 15) * 86400000) : null;

    await prisma.caution.create({
      data: {
        societeId: societe.id,
        dateCaution,
        dossierId: d.id,
        numeroBL: d.numeroBL,
        clientId: d.clientId,
        quantite: randomInt(1, 5),
        montant: randomItem([400000, 400000, 600000, 800000, 2000000]),
        compagnie: d.compagnieMaritime || randomItem(['MSC', 'MAERSK', 'CMA CGM', 'OOCL', 'ARKAS']),
        dateDepotCourrier,
        datePaiement,
        statut,
        observations: `SEG / GTS / ${d.compagnieMaritime || 'MSC'}`,
      },
    });
    total++;
  }
  console.log(`✅ ${total} cautions créées`);
}

main().catch(e => console.error(e)).finally(() => prisma.$disconnect());

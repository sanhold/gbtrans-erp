import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Création du catalogue de prestations...');

  const societe = await prisma.societe.findFirst({ where: { code: 'GBTRANS' } });
  if (!societe) { console.error('Société non trouvée'); return; }

  const prestations = [
    // DOUANE & COMPAGNIE
    { categorie: 'DOUANE & COMPAGNIE', code: 'DC01', designation: 'OUVERTURE DOSSIER', montantDefaut: 20000, ordre: 1 },
    { categorie: 'DOUANE & COMPAGNIE', code: 'DC02', designation: 'DROITS ET TAXES DE DOUANE HT', montantDefaut: null, ordre: 2 },
    { categorie: 'DOUANE & COMPAGNIE', code: 'DC03', designation: 'REDEVANCE D\'IMPORTATION (RPI)', montantDefaut: null, ordre: 3 },
    { categorie: 'DOUANE & COMPAGNIE', code: 'DC04', designation: 'TS DOUANE', montantDefaut: 20000, ordre: 4 },
    { categorie: 'DOUANE & COMPAGNIE', code: 'DC05', designation: 'TIRAGE', montantDefaut: 150000, ordre: 5 },
    { categorie: 'DOUANE & COMPAGNIE', code: 'DC06', designation: 'SYDAM', montantDefaut: 20000, ordre: 6 },
    { categorie: 'DOUANE & COMPAGNIE', code: 'DC07', designation: 'GESTION CREDIT', montantDefaut: null, ordre: 7 },
    { categorie: 'DOUANE & COMPAGNIE', code: 'DC08', designation: 'FRAIS BSC/BESC', montantDefaut: null, ordre: 8 },
    { categorie: 'DOUANE & COMPAGNIE', code: 'DC09', designation: 'PENALITÉS DOUANE', montantDefaut: null, ordre: 9 },
    { categorie: 'DOUANE & COMPAGNIE', code: 'DC10', designation: 'CAUTIONNEMENT', montantDefaut: null, ordre: 10 },

    // FRAIS PORTUAIRES
    { categorie: 'FRAIS PORTUAIRES', code: 'FP01', designation: 'ECHANGE BL', montantDefaut: null, ordre: 1 },
    { categorie: 'FRAIS PORTUAIRES', code: 'FP02', designation: 'ACCONAGE', montantDefaut: null, ordre: 2 },
    { categorie: 'FRAIS PORTUAIRES', code: 'FP03', designation: 'LIVRAISON + MANUTENTION', montantDefaut: null, ordre: 3 },
    { categorie: 'FRAIS PORTUAIRES', code: 'FP04', designation: 'MAGASINAGE', montantDefaut: null, ordre: 4 },
    { categorie: 'FRAIS PORTUAIRES', code: 'FP05', designation: 'SURESTARIES', montantDefaut: null, ordre: 5 },
    { categorie: 'FRAIS PORTUAIRES', code: 'FP06', designation: 'THC (Terminal Handling Charge)', montantDefaut: null, ordre: 6 },
    { categorie: 'FRAIS PORTUAIRES', code: 'FP07', designation: 'SCANNER', montantDefaut: null, ordre: 7 },
    { categorie: 'FRAIS PORTUAIRES', code: 'FP08', designation: 'EMPOTAGE / DÉPOTAGE', montantDefaut: null, ordre: 8 },
    { categorie: 'FRAIS PORTUAIRES', code: 'FP09', designation: 'PESAGE', montantDefaut: null, ordre: 9 },

    // AUTRES FRAIS
    { categorie: 'AUTRES FRAIS', code: 'AF01', designation: 'PASSAGE, VACATION DOUANE', montantDefaut: 300000, ordre: 1 },
    { categorie: 'AUTRES FRAIS', code: 'AF02', designation: 'PRESTATION', montantDefaut: 250000, ordre: 2 },
    { categorie: 'AUTRES FRAIS', code: 'AF03', designation: 'TVA/PRESTATION', montantDefaut: 45000, tauxTVA: 18, estTVA: true, ordre: 3 },
    { categorie: 'AUTRES FRAIS', code: 'AF04', designation: 'TRANSPORT', montantDefaut: null, ordre: 4 },
    { categorie: 'AUTRES FRAIS', code: 'AF05', designation: 'ASSURANCE LOCALE', montantDefaut: null, ordre: 5 },
    { categorie: 'AUTRES FRAIS', code: 'AF06', designation: 'FRAIS BANCAIRES', montantDefaut: null, ordre: 6 },
    { categorie: 'AUTRES FRAIS', code: 'AF07', designation: 'COMMISSION BANCAIRE', montantDefaut: null, ordre: 7 },
    { categorie: 'AUTRES FRAIS', code: 'AF08', designation: 'FRAIS DE DOSSIER', montantDefaut: null, ordre: 8 },

    // TRANSPORT
    { categorie: 'TRANSPORT', code: 'TR01', designation: 'TRANSPORT ABIDJAN', montantDefaut: null, ordre: 1 },
    { categorie: 'TRANSPORT', code: 'TR02', designation: 'TRANSPORT INTÉRIEUR', montantDefaut: null, ordre: 2 },
    { categorie: 'TRANSPORT', code: 'TR03', designation: 'ESCORTE DOUANIÈRE', montantDefaut: null, ordre: 3 },
    { categorie: 'TRANSPORT', code: 'TR04', designation: 'PÉAGE', montantDefaut: null, ordre: 4 },
  ];

  let created = 0;
  for (const p of prestations) {
    const existing = await prisma.prestationCatalogue.findFirst({
      where: { societeId: societe.id, code: p.code },
    });
    if (!existing) {
      await prisma.prestationCatalogue.create({
        data: {
          societeId: societe.id,
          categorie: p.categorie,
          code: p.code,
          designation: p.designation,
          montantDefaut: p.montantDefaut,
          tauxTVA: (p as any).tauxTVA || 0,
          estTVA: (p as any).estTVA || false,
          ordre: p.ordre,
        },
      });
      created++;
    }
  }

  console.log(`  ${created} prestations créées (${prestations.length} total)`);

  const result = await prisma.prestationCatalogue.findMany({
    where: { societeId: societe.id },
    orderBy: [{ categorie: 'asc' }, { ordre: 'asc' }],
  });

  const categories = [...new Set(result.map(r => r.categorie))];
  for (const cat of categories) {
    const items = result.filter(r => r.categorie === cat);
    console.log(`  ${cat}: ${items.length} éléments`);
  }
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());

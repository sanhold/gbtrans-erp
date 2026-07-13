import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

function randomItem<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}
function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

const articlesParType: Record<string, { designation: string; marques: string[]; unite: string; positionTarifaire: string }[]> = {
  IMPORT: [
    { designation: 'Pièces détachées automobiles', marques: ['Bosch', 'Valeo', 'Denso'], unite: 'Pcs', positionTarifaire: '8708.99.00' },
    { designation: 'Matériel informatique et réseau', marques: ['HP', 'Dell', 'Cisco'], unite: 'Pcs', positionTarifaire: '8471.30.00' },
    { designation: 'Produits pharmaceutiques', marques: ['Sanofi', 'Pfizer', 'GSK'], unite: 'Cartons', positionTarifaire: '3004.90.00' },
    { designation: 'Câbles électriques', marques: ['Nexans', 'Prysmian'], unite: 'Rouleaux', positionTarifaire: '8544.49.00' },
    { designation: 'Groupes électrogènes', marques: ['Caterpillar', 'Cummins', 'Perkins'], unite: 'Pcs', positionTarifaire: '8502.11.00' },
    { designation: 'Matériel médical', marques: ['Philips', 'GE Healthcare'], unite: 'Pcs', positionTarifaire: '9018.90.00' },
    { designation: 'Produits cosmétiques', marques: ["L'Oréal", 'Unilever'], unite: 'Cartons', positionTarifaire: '3304.99.00' },
    { designation: 'Riz importé', marques: ['Thaï Hom Mali'], unite: 'Tonnes', positionTarifaire: '1006.30.00' },
    { designation: 'Ciment et clinker', marques: ['Lafarge', 'Heidelberg'], unite: 'Tonnes', positionTarifaire: '2523.29.00' },
  ],
  EXPORT: [
    { designation: 'Fèves de cacao', marques: [], unite: 'Sacs 60kg', positionTarifaire: '1801.00.00' },
    { designation: 'Caoutchouc brut', marques: [], unite: 'Balles', positionTarifaire: '4001.29.00' },
    { designation: 'Noix de cajou', marques: [], unite: 'Sacs 50kg', positionTarifaire: '0801.32.00' },
    { designation: 'Huile de palme', marques: [], unite: 'Tonnes', positionTarifaire: '1511.10.00' },
    { designation: 'Bois en grumes', marques: [], unite: 'm³', positionTarifaire: '4403.49.00' },
    { designation: 'Café vert', marques: [], unite: 'Sacs 60kg', positionTarifaire: '0901.11.00' },
  ],
  TRANSIT: [
    { designation: 'Engins de BTP', marques: ['Caterpillar', 'Komatsu'], unite: 'Pcs', positionTarifaire: '8429.51.00' },
    { designation: 'Véhicules neufs', marques: ['Toyota', 'Hyundai'], unite: 'Pcs', positionTarifaire: '8703.23.00' },
    { designation: 'Machines agricoles', marques: ['John Deere', 'Massey Ferguson'], unite: 'Pcs', positionTarifaire: '8432.80.00' },
    { designation: 'Tuyaux PVC et raccords', marques: ['Wavin'], unite: 'Pcs', positionTarifaire: '3917.23.00' },
    { designation: 'Mobilier de bureau', marques: ['IKEA', 'Herman Miller'], unite: 'Pcs', positionTarifaire: '9403.30.00' },
  ],
};

async function main() {
  console.log("📦 Ajout d'articles sur les dossiers existants...\n");

  const dossiers = await prisma.dossier.findMany({
    include: { _count: { select: { articles: true } } },
  });

  let totalArticles = 0;
  let dossiersTraites = 0;

  for (const dossier of dossiers) {
    if (dossier._count.articles > 0) continue; // ne touche pas aux dossiers qui ont déjà des articles

    const pool = articlesParType[dossier.nature] || articlesParType.IMPORT;
    const nbArticles = randomInt(1, 4);
    const choisis = [...pool].sort(() => Math.random() - 0.5).slice(0, Math.min(nbArticles, pool.length));

    for (let i = 0; i < choisis.length; i++) {
      const ref = choisis[i];
      const quantite = randomInt(1, 200);
      const poidsUnitaire = randomInt(5, 500);
      await prisma.article.create({
        data: {
          dossierId: dossier.id,
          numero: i + 1,
          designation: ref.designation,
          type: dossier.nature === 'EXPORT' ? 'Produit agricole (export)' : 'Marchandise générale',
          marque: ref.marques.length > 0 ? randomItem(ref.marques) : null,
          quantite,
          unite: ref.unite,
          positionTarifaire: ref.positionTarifaire,
          poids: quantite * poidsUnitaire,
          valeur: randomInt(200000, 25000000),
          origine: dossier.nature === 'EXPORT' ? "Côte d'Ivoire" : randomItem(['Chine', 'France', 'Allemagne', 'Inde', 'Turquie', 'États-Unis']),
          bonLivraison: `BL${randomInt(10000, 99999)}`,
        },
      });
      totalArticles++;
    }
    dossiersTraites++;
  }

  console.log(`✅ ${totalArticles} articles ajoutés sur ${dossiersTraites} dossiers (sur ${dossiers.length} au total).`);
}

main()
  .catch((e) => { console.error('❌ Erreur:', e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Création des processus de suivi...');

  const societe = await prisma.societe.findFirst({ where: { code: 'GBTRANS' } });
  if (!societe) { console.error('Société GBTRANS non trouvée'); return; }

  const processus = [
    {
      code: 'IMP_STD',
      nom: 'Import Standard',
      description: 'Processus standard pour dossier import maritime',
      nature: 'IMPORT' as const,
      etapes: [
        { code: 'RECEPTION', nom: 'Réception BL', couleur: '#3B82F6', delaiJours: 1 },
        { code: 'SAISIE', nom: 'Saisie déclaration', couleur: '#8B5CF6', delaiJours: 2 },
        { code: 'LIQUIDATION', nom: 'Liquidation douane', couleur: '#F59E0B', delaiJours: 5 },
        { code: 'PAIEMENT', nom: 'Paiement droits', couleur: '#EC4899', delaiJours: 3 },
        { code: 'MAIN_LEVEE', nom: 'Obtention BAE', couleur: '#10B981', delaiJours: 2 },
        { code: 'ENLEVEMENT', nom: 'Enlèvement marchandise', couleur: '#06B6D4', delaiJours: 3 },
        { code: 'LIVRAISON', nom: 'Livraison client', couleur: '#14B8A6', delaiJours: 2 },
        { code: 'CLOTURE', nom: 'Clôture dossier', couleur: '#6B7280', delaiJours: null },
      ],
    },
    {
      code: 'EXP_STD',
      nom: 'Export Standard',
      description: 'Processus standard pour dossier export',
      nature: 'EXPORT' as const,
      etapes: [
        { code: 'COLLECTE', nom: 'Collecte marchandise', couleur: '#3B82F6', delaiJours: 3 },
        { code: 'EMPOTAGE', nom: 'Empotage conteneur', couleur: '#8B5CF6', delaiJours: 2 },
        { code: 'DECLARATION', nom: 'Déclaration export', couleur: '#F59E0B', delaiJours: 2 },
        { code: 'VERIFICATION', nom: 'Vérification douane', couleur: '#EC4899', delaiJours: 3 },
        { code: 'EMBARQUEMENT', nom: 'Embarquement', couleur: '#10B981', delaiJours: 2 },
        { code: 'CLOTURE', nom: 'Clôture', couleur: '#6B7280', delaiJours: null },
      ],
    },
    {
      code: 'TRANSIT_STD',
      nom: 'Transit Standard',
      description: 'Processus transit inter-pays CEDEAO',
      nature: 'TRANSIT' as const,
      etapes: [
        { code: 'RECEPTION', nom: 'Réception documents', couleur: '#3B82F6', delaiJours: 1 },
        { code: 'T1', nom: 'Déclaration T1', couleur: '#8B5CF6', delaiJours: 2 },
        { code: 'ESCORTE', nom: 'Mise sous escorte', couleur: '#F59E0B', delaiJours: 1 },
        { code: 'TRANSPORT', nom: 'Transport', couleur: '#EC4899', delaiJours: 5 },
        { code: 'ARRIVEE', nom: 'Arrivée destination', couleur: '#10B981', delaiJours: 1 },
        { code: 'APUREMENT', nom: 'Apurement T1', couleur: '#06B6D4', delaiJours: 3 },
        { code: 'CLOTURE', nom: 'Clôture', couleur: '#6B7280', delaiJours: null },
      ],
    },
  ];

  for (const p of processus) {
    const existing = await prisma.processusSuivi.findFirst({
      where: { societeId: societe.id, code: p.code },
    });
    if (existing) {
      console.log(`  Processus ${p.code} existe déjà`);
      continue;
    }

    await prisma.processusSuivi.create({
      data: {
        societeId: societe.id,
        code: p.code,
        nom: p.nom,
        description: p.description,
        nature: p.nature,
        etapes: {
          create: p.etapes.map((e, i) => ({
            ordre: i + 1,
            code: e.code,
            nom: e.nom,
            couleur: e.couleur,
            delaiJours: e.delaiJours,
            obligatoire: true,
          })),
        },
      },
    });
    console.log(`  OK: ${p.nom} (${p.etapes.length} étapes)`);
  }

  // Vérification
  const result = await prisma.processusSuivi.findMany({
    where: { societeId: societe.id },
    include: { etapes: { orderBy: { ordre: 'asc' } } },
  });
  for (const r of result) {
    const etapeNoms = r.etapes.map(e => e.nom).join(' → ');
    console.log(`  ${r.nom}: ${etapeNoms}`);
  }

  console.log('\nProcessus créés avec succès!');
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());

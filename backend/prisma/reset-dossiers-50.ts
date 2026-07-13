import { PrismaClient, NatureDossier, TypeDossier, StatutDossier, StatutFacture, ModePaiement } from '@prisma/client';

const prisma = new PrismaClient();

const LETTRE_NATURE: Record<string, string> = {
  IMPORT: 'I', EXPORT: 'E', TRANSIT: 'T', REEXPORT: 'R', CABOTAGE: 'C', TRANSBORDEMENT: 'TB',
};

function randomDate(start: Date, end: Date): Date {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}
function randomItem<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}
function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

async function main() {
  console.log('🔄 Reset des dossiers de test (remplacement par 50 dossiers 2026)...\n');

  const societe = await prisma.societe.findFirst({ where: { code: 'GBTRANS' } });
  if (!societe) { console.error('❌ Société GBTRANS non trouvée.'); return; }

  const agences = await prisma.agence.findMany({ where: { societeId: societe.id } });
  const admin = await prisma.utilisateur.findFirst({ where: { email: 'admin@gbtrans.ci' } });
  const users = await prisma.utilisateur.findMany({ where: { societeId: societe.id } });
  const clients = await prisma.client.findMany({ where: { societeId: societe.id } });
  if (!admin || users.length === 0 || clients.length === 0) {
    console.error('❌ Données de référence manquantes (users/clients). Lancez d\'abord seed.ts + seed-demo.ts.');
    return;
  }

  // ============================================================
  // SUPPRESSION DES ANCIENNES DONNÉES DE TEST
  // ============================================================
  console.log('🗑️  Suppression des anciens dossiers et données liées...');

  const anciensDossiers = await prisma.dossier.count({ where: { societeId: societe.id } });

  const facturesLiees = await prisma.facture.findMany({
    where: { societeId: societe.id, dossierId: { not: null } },
    select: { id: true },
  });
  const factureIds = facturesLiees.map(f => f.id);

  if (factureIds.length > 0) {
    await prisma.paiementFacture.deleteMany({ where: { factureId: { in: factureIds } } });
    await prisma.facture.deleteMany({ where: { id: { in: factureIds } } });
  }

  await prisma.proforma.deleteMany({ where: { dossierId: { not: null } } });
  await prisma.courrierDossier.deleteMany({ where: { dossier: { societeId: societe.id } } });
  await prisma.dossier.deleteMany({ where: { societeId: societe.id } });

  console.log(`   ✅ ${anciensDossiers} dossiers, ${factureIds.length} factures et proformas liées supprimés\n`);

  // Reset des compteurs de numérotation
  await prisma.numerotation.deleteMany({
    where: { societeId: societe.id, module: { in: ['DOSSIER', 'FACTURE', 'PAIEMENT'] } },
  });

  for (const module of ['DOSSIER', 'FACTURE', 'PAIEMENT']) {
    await prisma.numerotation.create({
      data: {
        societeId: societe.id, module,
        prefixe: module === 'DOSSIER' ? 'DOS' : module === 'FACTURE' ? 'FAC' : 'PAI',
        compteur: 0, longueur: 6, annuel: true, annee: 2026,
      },
    });
  }

  // ============================================================
  // CRÉATION DE 50 NOUVEAUX DOSSIERS (2026), N° PHYSIQUE 01 À 50 PAR NATURE
  // ============================================================
  console.log('📁 Création de 50 nouveaux dossiers 2026...');

  const compagnies = ['CMA CGM', 'MAERSK', 'MSC', 'EVERGREEN', 'HAPAG-LLOYD', 'COSCO', 'ONE', 'ZIM', 'PIL', 'GRIMALDI'];
  const navires = ['FORT DESAIX', 'MAERSK SELETAR', 'MSC OSCAR', 'EVER GOLDEN', 'CMA CGM MARCO POLO', 'COSCO FORTUNE', 'MOL TRIUMPH', 'CONTI PARIS', 'HANJIN ATHENS', 'VALENCIA EXPRESS'];
  const ports = ['Shanghai', 'Anvers', 'Rotterdam', 'Hambourg', 'Le Havre', 'Marseille', 'Gênes', 'Istanbul', 'Dubaï', 'Singapour', 'Mumbai', 'Dakar', 'Lomé', 'Tema', 'Lagos'];
  const designations = [
    'Pièces détachées automobiles', 'Matériaux de construction', 'Équipements industriels',
    'Produits pharmaceutiques', 'Matériel informatique et réseau', 'Engins de BTP',
    'Denrées alimentaires', 'Produits cosmétiques', 'Textiles et habillement',
    'Machines agricoles', 'Câbles électriques', 'Tuyaux PVC et raccords',
    'Huile végétale', 'Riz importé', 'Ciment et clinker',
    'Fèves de cacao (export)', 'Caoutchouc brut (export)', 'Bois en grumes (export)',
    'Noix de cajou (export)', 'Huile de palme (export)',
  ];
  const prestations = [
    { designation: 'Frais de transit', min: 150000, max: 750000, categorie: 'DOUANE & COMPAGNIE' },
    { designation: 'Frais de dédouanement', min: 200000, max: 1500000, categorie: 'DOUANE & COMPAGNIE' },
    { designation: 'Frais de magasinage', min: 50000, max: 400000, categorie: 'FRAIS PORTUAIRES' },
    { designation: 'Frais de manutention', min: 100000, max: 600000, categorie: 'FRAIS PORTUAIRES' },
    { designation: 'Frais de transport', min: 150000, max: 2000000, categorie: 'TRANSPORT' },
  ];
  const containerTypes = ["20'", "40'", "40'HC", "20' REEFER", "40' REEFER"];
  const statuts: StatutDossier[] = ['NOUVEAU', 'EN_COURS', 'ATTENTE_CLIENT', 'ATTENTE_DOUANE', 'LIQUIDATION', 'PAIEMENT', 'MAIN_LEVEE', 'LIVRAISON', 'CLOTURE', 'CLOTURE'];

  const annee = 2026;
  const debut = new Date('2026-01-05');
  const fin = new Date('2026-07-08');

  const compteurParNature: Record<string, number> = {
    IMPORT: 0, EXPORT: 0, TRANSIT: 0, REEXPORT: 0, CABOTAGE: 0, TRANSBORDEMENT: 0,
  };

  let totalFactures = 0;
  let totalPaiements = 0;

  for (let i = 0; i < 50; i++) {
    const numDos = await prisma.numerotation.update({
      where: { societeId_module_annee: { societeId: societe.id, module: 'DOSSIER', annee } },
      data: { compteur: { increment: 1 } },
    });
    const numero = `DOS/${annee}/${numDos.compteur.toString().padStart(6, '0')}`;

    const nature = randomItem(['IMPORT', 'IMPORT', 'IMPORT', 'EXPORT', 'EXPORT', 'TRANSIT'] as NatureDossier[]);
    compteurParNature[nature]++;
    const lettre = LETTRE_NATURE[nature];
    const numeroPhysique = `${lettre}-${String(compteurParNature[nature]).padStart(2, '0')}/${annee}`;

    const client = randomItem(clients);
    const dateCreation = randomDate(debut, fin);
    const statut = randomItem(statuts);
    const valeurFOB = randomInt(500000, 150000000);
    const fret = Math.round(valeurFOB * (randomInt(3, 12) / 100));
    const assurance = Math.round(valeurFOB * (randomInt(1, 3) / 100));
    const valeurCAF = valeurFOB + fret + assurance;

    const dossier = await prisma.dossier.create({
      data: {
        societeId: societe.id,
        agenceId: randomItem(agences)?.id,
        createurId: randomItem(users).id,
        agentId: randomItem(users).id,
        numero, numeroPhysique, annee, nature, type: 'MARITIME' as TypeDossier, statut,
        clientId: client.id,
        compagnieMaritime: randomItem(compagnies),
        navire: randomItem(navires),
        voyage: `V${randomInt(100, 999)}`,
        numeroBL: `CMAU${randomInt(1000000, 9999999)}`,
        portOrigine: randomItem(ports),
        portDestination: randomItem(['Abidjan', 'Abidjan', 'San Pedro']),
        designation: randomItem(designations),
        poidsBrut: randomInt(500, 50000),
        nombreColis: randomInt(5, 500),
        valeurFOB, fret, assurance, valeurCAF,
        incoterm: randomItem(['CIF', 'FOB', 'CFR', 'EXW']),
        devise: 'XOF',
        bureauDouane: randomItem(['Abidjan Port', 'Abidjan Aéroport', 'San Pedro']),
        regimeDouanier: nature === 'EXPORT' ? 'Exportation' : 'Mise à la consommation',
        dateCreation,
        dateModification: dateCreation,
        dateCloture: statut === 'CLOTURE' ? new Date(dateCreation.getTime() + randomInt(7, 45) * 86400000) : null,
        numeroDeclaration: statut !== 'NOUVEAU' ? `D${annee}${randomInt(10000, 99999)}` : null,
      },
    });

    const nbContainers = randomInt(1, 4);
    for (let c = 0; c < nbContainers; c++) {
      await prisma.conteneur.create({
        data: {
          dossierId: dossier.id,
          numero: `${randomItem(['CMAU', 'MSCU', 'MSKU', 'TCLU', 'TRLU'])}${randomInt(1000000, 9999999)}`,
          type: randomItem(containerTypes),
          poids: randomInt(5000, 28000),
          scelle: `S${randomInt(100000, 999999)}`,
        },
      });
    }

    await prisma.historiqueDossier.create({
      data: { dossierId: dossier.id, action: 'CREATION', statutApres: 'NOUVEAU', commentaire: 'Création du dossier', utilisateur: 'Système', createdAt: dateCreation },
    });
    if (statut !== 'NOUVEAU') {
      await prisma.historiqueDossier.create({
        data: { dossierId: dossier.id, action: 'CHANGEMENT_STATUT', statutAvant: 'NOUVEAU', statutApres: statut, commentaire: `Passage au statut ${statut}`, utilisateur: randomItem(users).nom, createdAt: new Date(dateCreation.getTime() + randomInt(1, 10) * 86400000) },
      });
    }

    if (statut !== 'NOUVEAU' && Math.random() > 0.2) {
      const numFac = await prisma.numerotation.update({
        where: { societeId_module_annee: { societeId: societe.id, module: 'FACTURE', annee } },
        data: { compteur: { increment: 1 } },
      });
      const facNumero = `FAC/${annee}/${numFac.compteur.toString().padStart(6, '0')}`;
      const nbLignes = randomInt(2, 5);
      const lignes = [];
      let montantHT = 0;
      for (let l = 0; l < nbLignes; l++) {
        const p = randomItem(prestations);
        const prix = randomInt(p.min, p.max);
        montantHT += prix;
        lignes.push({ ordre: l + 1, categorie: p.categorie, designation: p.designation, quantite: 1, prixUnitaire: prix, montantHT: prix, tauxTVA: 18, montantTVA: Math.round(prix * 0.18), remise: 0 });
      }
      const montantTVA = Math.round(montantHT * 0.18);
      const montantTTC = montantHT + montantTVA;
      const dateFacture = new Date(dateCreation.getTime() + randomInt(2, 15) * 86400000);

      let statutFac: StatutFacture = 'BROUILLON';
      let montantPaye = 0;
      if (['CLOTURE', 'LIVRAISON', 'MAIN_LEVEE'].includes(statut)) {
        if (Math.random() > 0.3) { statutFac = 'PAYEE'; montantPaye = montantTTC; }
        else { statutFac = 'PARTIELLEMENT_PAYEE'; montantPaye = Math.round(montantTTC * (randomInt(30, 80) / 100)); }
      } else if (['PAIEMENT', 'LIQUIDATION'].includes(statut)) {
        statutFac = 'VALIDEE';
      }

      const facture = await prisma.facture.create({
        data: {
          societeId: societe.id, numero: facNumero, type: 'FACTURE', dossierId: dossier.id, clientId: client.id, createurId: admin.id,
          dateFacture, dateEcheance: new Date(dateFacture.getTime() + 30 * 86400000),
          objet: `Prestations transit - ${dossier.numero}`,
          montantHT, montantTVA, montantTTC, montantPaye, resteAPayer: montantTTC - montantPaye,
          tauxTVA: 18, statut: statutFac,
          lignes: { create: lignes },
        },
      });
      totalFactures++;

      if (montantPaye > 0) {
        const numPai = await prisma.numerotation.update({
          where: { societeId_module_annee: { societeId: societe.id, module: 'PAIEMENT', annee } },
          data: { compteur: { increment: 1 } },
        });
        await prisma.paiement.create({
          data: {
            numero: `PAI/${annee}/${numPai.compteur.toString().padStart(6, '0')}`,
            clientId: client.id, montant: montantPaye,
            modePaiement: randomItem(['VIREMENT', 'CHEQUE', 'ESPECES', 'VIREMENT', 'MOBILE_MONEY'] as ModePaiement[]),
            reference: `REF${randomInt(100000, 999999)}`, statut: 'VALIDE',
            datePaiement: new Date(dateFacture.getTime() + randomInt(5, 40) * 86400000),
            affectations: { create: { factureId: facture.id, montant: montantPaye } },
          },
        });
        totalPaiements++;
      }
    }
  }

  console.log('\n╔══════════════════════════════════════════╗');
  console.log('║   RESET DOSSIERS TERMINÉ                  ║');
  console.log('╠══════════════════════════════════════════╣');
  console.log(`║  📁 Dossiers créés  : ${'50'.padStart(5)}              ║`);
  console.log(`║  🧾 Factures créées : ${totalFactures.toString().padStart(5)}              ║`);
  console.log(`║  💰 Paiements créés : ${totalPaiements.toString().padStart(5)}              ║`);
  console.log('╠══════════════════════════════════════════╣');
  console.log(`║  Import : I-01 → I-${String(compteurParNature.IMPORT).padStart(2, '0')}/2026            ║`);
  console.log(`║  Export : E-01 → E-${String(compteurParNature.EXPORT).padStart(2, '0')}/2026            ║`);
  console.log(`║  Transit: T-01 → T-${String(compteurParNature.TRANSIT).padStart(2, '0')}/2026            ║`);
  console.log('╚══════════════════════════════════════════╝');
}

main()
  .catch((e) => { console.error('❌ Erreur:', e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });

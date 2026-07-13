import { PrismaClient, NatureDossier, TypeDossier, StatutDossier, StatutFacture, ModePaiement, TypeCourrier, Priorite, StatutCourrier, StatutCaution, StatutAT } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

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
  console.log('🌱 Injection des données de démonstration 2024-2025-2026...\n');

  const societe = await prisma.societe.findFirst({ where: { code: 'GBTRANS' } });
  if (!societe) { console.error('❌ Société GBTRANS non trouvée. Lancez d\'abord le seed principal.'); return; }

  const agences = await prisma.agence.findMany({ where: { societeId: societe.id } });
  const admin = await prisma.utilisateur.findFirst({ where: { email: 'admin@gbtrans.ci' } });
  if (!admin) { console.error('❌ Admin non trouvé'); return; }

  // ============================================================
  // UTILISATEURS SUPPLÉMENTAIRES
  // ============================================================
  console.log('👤 Création des utilisateurs...');
  const pwd = await bcrypt.hash('User@2024!', 12);
  const profilTransitaire = await prisma.profil.findFirst({ where: { code: 'TRANSITAIRE' } });
  const profilComptable = await prisma.profil.findFirst({ where: { code: 'COMPTABLE' } });
  const profilCommercial = await prisma.profil.findFirst({ where: { code: 'COMMERCIAL' } });

  const usersData = [
    { matricule: 'TRS001', nom: 'KOUASSI', prenom: 'Jean-Marc', email: 'jm.kouassi@gbtrans.ci', profilId: profilTransitaire?.id },
    { matricule: 'TRS002', nom: 'TRAORE', prenom: 'Aminata', email: 'a.traore@gbtrans.ci', profilId: profilTransitaire?.id },
    { matricule: 'TRS003', nom: 'BAMBA', prenom: 'Moussa', email: 'm.bamba@gbtrans.ci', profilId: profilTransitaire?.id },
    { matricule: 'CPT001', nom: 'DIALLO', prenom: 'Fatou', email: 'f.diallo@gbtrans.ci', profilId: profilComptable?.id },
    { matricule: 'COM001', nom: 'KONE', prenom: 'Ibrahim', email: 'i.kone@gbtrans.ci', profilId: profilCommercial?.id },
  ];

  const users: any[] = [admin];
  for (const u of usersData) {
    const existing = await prisma.utilisateur.findFirst({ where: { email: u.email } });
    if (!existing) {
      const created = await prisma.utilisateur.create({
        data: { ...u, societeId: societe.id, agenceId: agences[0]?.id, motDePasse: pwd },
      });
      users.push(created);
    } else {
      users.push(existing);
    }
  }
  console.log(`   ✅ ${users.length} utilisateurs`);

  // ============================================================
  // CLIENTS (30 clients réalistes CI)
  // ============================================================
  console.log('🏢 Création des clients...');
  const clientsData = [
    { raisonSociale: 'SAHEL INDUSTRIES SA', sigle: 'SI', type: 'ENTREPRISE', ncc: 'CI-2019-0001234', rccm: 'CI-ABJ-2019-B-12345', ville: 'Abidjan', telephone: '+225 27 20 30 40 50', email: 'contact@sahel-industries.ci' },
    { raisonSociale: 'AFRIQUE CONSTRUCTION SARL', sigle: 'AC', type: 'ENTREPRISE', ncc: 'CI-2020-0005678', rccm: 'CI-ABJ-2020-B-56789', ville: 'Abidjan', telephone: '+225 27 20 31 41 51', email: 'info@afrique-construction.ci' },
    { raisonSociale: 'SOCOCE DISTRIBUTION', sigle: 'SOCOCE', type: 'ENTREPRISE', ncc: 'CI-2018-0009012', ville: 'Abidjan', telephone: '+225 27 20 32 42 52', email: 'import@sococe.ci' },
    { raisonSociale: 'GROUPE CEMOI CÔTE D\'IVOIRE', sigle: 'CEMOI', type: 'ENTREPRISE', ncc: 'CI-2017-0003456', ville: 'Abidjan', telephone: '+225 27 20 33 43 53', email: 'logistique@cemoi.ci' },
    { raisonSociale: 'SOLIBRA SA', sigle: 'SOLIBRA', type: 'ENTREPRISE', ncc: 'CI-2015-0007890', ville: 'Abidjan', telephone: '+225 27 20 34 44 54', email: 'transit@solibra.ci' },
    { raisonSociale: 'PETROCI HOLDING', sigle: 'PETROCI', type: 'ENTREPRISE', ncc: 'CI-2010-0002345', ville: 'Abidjan', telephone: '+225 27 20 35 45 55', email: 'supply@petroci.ci' },
    { raisonSociale: 'CARGILL WEST AFRICA', sigle: 'CARGILL', type: 'ENTREPRISE', ncc: 'CI-2016-0006789', ville: 'Abidjan', telephone: '+225 27 20 36 46 56', email: 'import@cargill-wa.ci' },
    { raisonSociale: 'COMPAGNIE IVOIRIENNE D\'ÉLECTRICITÉ', sigle: 'CIE', type: 'ENTREPRISE', ncc: 'CI-2005-0001122', ville: 'Abidjan', telephone: '+225 27 20 37 47 57', email: 'transit@cie.ci' },
    { raisonSociale: 'SIFCA GROUP', sigle: 'SIFCA', type: 'ENTREPRISE', ncc: 'CI-2012-0003344', ville: 'Abidjan', telephone: '+225 27 20 38 48 58', email: 'logistic@sifca.ci' },
    { raisonSociale: 'MOOV AFRICA CI', sigle: 'MOOV', type: 'ENTREPRISE', ncc: 'CI-2019-0005566', ville: 'Abidjan', telephone: '+225 27 20 39 49 59', email: 'procurement@moov.ci' },
    { raisonSociale: 'UNILEVER CÔTE D\'IVOIRE', sigle: 'UNILEVER', type: 'ENTREPRISE', ncc: 'CI-2008-0007788', ville: 'Abidjan', telephone: '+225 27 20 40 50 60', email: 'import@unilever.ci' },
    { raisonSociale: 'NESTLÉ CI', sigle: 'NESTLE', type: 'ENTREPRISE', ncc: 'CI-2007-0009900', ville: 'Abidjan', telephone: '+225 27 20 41 51 61', email: 'supply.chain@nestle.ci' },
    { raisonSociale: 'ORANGE CÔTE D\'IVOIRE', sigle: 'OCI', type: 'ENTREPRISE', ncc: 'CI-2006-0001133', ville: 'Abidjan', telephone: '+225 27 20 42 52 62', email: 'procurement@orange.ci' },
    { raisonSociale: 'TOTAL ENERGIES CI', sigle: 'TOTAL', type: 'ENTREPRISE', ncc: 'CI-2004-0003355', ville: 'Abidjan', telephone: '+225 27 20 43 53 63', email: 'transit@totalenergies.ci' },
    { raisonSociale: 'SOCIÉTÉ GÉNÉRALE CI', sigle: 'SGCI', type: 'ENTREPRISE', ncc: 'CI-2003-0005577', ville: 'Abidjan', telephone: '+225 27 20 44 54 64', email: 'facility@sgci.ci' },
    { raisonSociale: 'CARENA SA', sigle: 'CARENA', type: 'ENTREPRISE', ncc: 'CI-2020-0007799', ville: 'San Pedro', telephone: '+225 27 34 71 00 00', email: 'transit@carena.ci' },
    { raisonSociale: 'PALM-CI', sigle: 'PALM', type: 'ENTREPRISE', ncc: 'CI-2011-0001144', ville: 'Abidjan', telephone: '+225 27 20 45 55 65', email: 'export@palmci.ci' },
    { raisonSociale: 'SUCRIVOIRE SA', sigle: 'SUCRI', type: 'ENTREPRISE', ncc: 'CI-2013-0003366', ville: 'Abidjan', telephone: '+225 27 20 46 56 66', email: 'import@sucrivoire.ci' },
    { raisonSociale: 'MINISTÈRE DES INFRASTRUCTURES', sigle: 'MI', type: 'ADMINISTRATION', ncc: 'CI-GOV-0001', ville: 'Abidjan', telephone: '+225 27 20 47 57 67', email: 'transit@infrastructure.gouv.ci' },
    { raisonSociale: 'AMBASSADE DU JAPON', sigle: 'AMB-JP', type: 'DIPLOMATIQUE', ville: 'Abidjan', telephone: '+225 27 20 48 58 68', email: 'logistic@japan-embassy.ci' },
    { raisonSociale: 'ONG SAVE THE CHILDREN', sigle: 'STC', type: 'ONG', ville: 'Abidjan', telephone: '+225 27 20 49 59 69', email: 'logistics@savethechildren.ci' },
    { raisonSociale: 'KOUAME TRADING', sigle: 'KT', type: 'ENTREPRISE', ville: 'Bouaké', telephone: '+225 07 01 02 03 04', email: 'kouame.trading@gmail.com' },
    { raisonSociale: 'ETS DIOMANDE & FILS', sigle: 'EDF', type: 'ENTREPRISE', ville: 'Korhogo', telephone: '+225 07 05 06 07 08', email: 'diomande.fils@yahoo.fr' },
    { raisonSociale: 'SARL MABRI IMPORT-EXPORT', sigle: 'MIE', type: 'ENTREPRISE', ville: 'Man', telephone: '+225 07 09 10 11 12' },
    { raisonSociale: 'PHARMACIE DU PLATEAU', sigle: 'PP', type: 'ENTREPRISE', ncc: 'CI-2021-0009922', ville: 'Abidjan', telephone: '+225 27 20 50 60 70', email: 'pharma.plateau@gmail.com' },
  ];

  const clients: any[] = [];
  for (let i = 0; i < clientsData.length; i++) {
    const c = clientsData[i];
    const code = `CLI${(i + 1).toString().padStart(5, '0')}`;
    const existing = await prisma.client.findFirst({ where: { societeId: societe.id, code } });
    if (existing) { clients.push(existing); continue; }
    const created = await prisma.client.create({
      data: { ...c, type: c.type as any, societeId: societe.id, code, conditionPaiement: randomItem([15, 30, 45, 60]), pays: 'Côte d\'Ivoire' },
    });
    clients.push(created);
  }
  console.log(`   ✅ ${clients.length} clients`);

  // ============================================================
  // FOURNISSEURS (15)
  // ============================================================
  console.log('🏭 Création des fournisseurs...');
  const fournData = [
    { raisonSociale: 'MAERSK LINE CI', type: 'COMPAGNIE_MARITIME', ville: 'Abidjan', email: 'booking@maersk.ci' },
    { raisonSociale: 'CMA CGM CÔTE D\'IVOIRE', type: 'COMPAGNIE_MARITIME', ville: 'Abidjan', email: 'abidjan@cma-cgm.com' },
    { raisonSociale: 'MSC CI', type: 'COMPAGNIE_MARITIME', ville: 'Abidjan', email: 'ops@msc.ci' },
    { raisonSociale: 'BOLLORE TRANSPORT LOGISTICS', type: 'ACCONIER', ville: 'Abidjan', email: 'ops@bollore-tl.ci' },
    { raisonSociale: 'ABIDJAN TERMINAL', type: 'MANUTENTION', ville: 'Abidjan', email: 'info@abidjan-terminal.ci' },
    { raisonSociale: 'SIVOM SA', type: 'ACCONIER', ville: 'Abidjan', email: 'transit@sivom.ci' },
    { raisonSociale: 'SOCIÉTÉ IVOIRIENNE DE TRANSIT', type: 'TRANSITAIRE', ville: 'Abidjan', email: 'contact@sit.ci' },
    { raisonSociale: 'BICICI', type: 'BANQUE', ville: 'Abidjan', email: 'entreprise@bicici.ci' },
    { raisonSociale: 'SGBCI', type: 'BANQUE', ville: 'Abidjan', email: 'trade@sgbci.ci' },
    { raisonSociale: 'ECOBANK CI', type: 'BANQUE', ville: 'Abidjan', email: 'trade.finance@ecobank.ci' },
    { raisonSociale: 'TRANSPORTS RAPIDES IVOIRE', type: 'TRANSPORTEUR', ville: 'Abidjan', email: 'dispatch@tri.ci' },
    { raisonSociale: 'MAGASIN GÉNÉRAL VRIDI', type: 'MAGASIN', ville: 'Abidjan', email: 'entreposage@mgv.ci' },
    { raisonSociale: 'AXA ASSURANCES CI', type: 'ASSURANCE', ville: 'Abidjan', email: 'cargo@axa.ci' },
    { raisonSociale: 'AIR FRANCE CARGO', type: 'COMPAGNIE_AERIENNE', ville: 'Abidjan', email: 'cargo.abj@airfrance.fr' },
    { raisonSociale: 'DOUANES CI - BUREAU PORT', type: 'DOUANE', ville: 'Abidjan', email: 'bureau.port@douanes.ci' },
  ];

  const fournisseurs: any[] = [];
  for (let i = 0; i < fournData.length; i++) {
    const f = fournData[i];
    const code = `FRN${(i + 1).toString().padStart(5, '0')}`;
    const existing = await prisma.fournisseur.findFirst({ where: { societeId: societe.id, code } });
    if (existing) { fournisseurs.push(existing); continue; }
    const created = await prisma.fournisseur.create({
      data: { ...f, type: f.type as any, societeId: societe.id, code, pays: 'Côte d\'Ivoire' },
    });
    fournisseurs.push(created);
  }
  console.log(`   ✅ ${fournisseurs.length} fournisseurs`);

  // ============================================================
  // DOSSIERS + FACTURES (200 dossiers : 60 en 2024, 70 en 2025, 70 en 2026)
  // ============================================================
  console.log('📁 Création des dossiers et factures...');

  const compagnies = ['CMA CGM', 'MAERSK', 'MSC', 'EVERGREEN', 'HAPAG-LLOYD', 'COSCO', 'ONE', 'ZIM', 'PIL', 'GRIMALDI'];
  const navires = ['FORT DESAIX', 'MAERSK SELETAR', 'MSC OSCAR', 'EVER GOLDEN', 'CMA CGM MARCO POLO', 'COSCO FORTUNE', 'MOL TRIUMPH', 'CONTI PARIS', 'HANJIN ATHENS', 'VALENCIA EXPRESS'];
  const ports = ['Shanghai', 'Anvers', 'Rotterdam', 'Hambourg', 'Le Havre', 'Marseille', 'Gênes', 'Istanbul', 'Dubaï', 'Singapour', 'Mumbai', 'Dakar', 'Lomé', 'Tema', 'Lagos'];
  const designations = [
    'Pièces détachées automobiles', 'Matériaux de construction', 'Équipements industriels',
    'Produits pharmaceutiques', 'Matériel informatique et réseau', 'Engins de BTP',
    'Denrées alimentaires', 'Produits cosmétiques', 'Textiles et habillement',
    'Machines agricoles', 'Câbles électriques', 'Tuyaux PVC et raccords',
    'Huile végétale', 'Riz importé', 'Ciment et clinker',
    'Véhicules neufs', 'Mobilier de bureau', 'Matériel médical',
    'Groupes électrogènes', 'Produits chimiques industriels',
    'Fèves de cacao (export)', 'Caoutchouc brut (export)', 'Bois en grumes (export)',
    'Noix de cajou (export)', 'Huile de palme (export)',
  ];
  const prestations = [
    { designation: 'Frais de transit', min: 150000, max: 750000 },
    { designation: 'Frais de dédouanement', min: 200000, max: 1500000 },
    { designation: 'Frais de magasinage', min: 50000, max: 400000 },
    { designation: 'Frais de manutention', min: 100000, max: 600000 },
    { designation: 'Frais de transport', min: 150000, max: 2000000 },
    { designation: 'Honoraires commissionnaire', min: 100000, max: 500000 },
    { designation: 'Surestaries conteneur', min: 200000, max: 3000000 },
    { designation: 'Frais portuaires', min: 75000, max: 350000 },
    { designation: 'Frais d\'assurance', min: 50000, max: 500000 },
  ];
  const containerTypes = ['20\'', '40\'', '40\'HC', '20\' REEFER', '40\' REEFER'];
  const statuts: StatutDossier[] = ['NOUVEAU', 'EN_COURS', 'ATTENTE_CLIENT', 'ATTENTE_DOUANE', 'LIQUIDATION', 'PAIEMENT', 'MAIN_LEVEE', 'LIVRAISON', 'CLOTURE', 'CLOTURE', 'CLOTURE'];

  const annees = [
    { annee: 2024, count: 60, debut: new Date('2024-01-05'), fin: new Date('2024-12-28') },
    { annee: 2025, count: 70, debut: new Date('2025-01-03'), fin: new Date('2025-12-30') },
    { annee: 2026, count: 70, debut: new Date('2026-01-05'), fin: new Date('2026-06-25') },
  ];

  let totalDossiers = 0;
  let totalFactures = 0;
  let totalPaiements = 0;

  for (const a of annees) {
    // Numérotation
    await prisma.numerotation.upsert({
      where: { societeId_module_annee: { societeId: societe.id, module: 'DOSSIER', annee: a.annee } },
      update: { compteur: 0 }, create: { societeId: societe.id, module: 'DOSSIER', prefixe: 'DOS', compteur: 0, longueur: 6, annuel: true, annee: a.annee },
    });
    await prisma.numerotation.upsert({
      where: { societeId_module_annee: { societeId: societe.id, module: 'FACTURE', annee: a.annee } },
      update: { compteur: 0 }, create: { societeId: societe.id, module: 'FACTURE', prefixe: 'FAC', compteur: 0, longueur: 6, annuel: true, annee: a.annee },
    });
    await prisma.numerotation.upsert({
      where: { societeId_module_annee: { societeId: societe.id, module: 'PAIEMENT', annee: a.annee } },
      update: { compteur: 0 }, create: { societeId: societe.id, module: 'PAIEMENT', prefixe: 'PAI', compteur: 0, longueur: 6, annuel: true, annee: a.annee },
    });

    for (let i = 0; i < a.count; i++) {
      const numDos = await prisma.numerotation.update({
        where: { societeId_module_annee: { societeId: societe.id, module: 'DOSSIER', annee: a.annee } },
        data: { compteur: { increment: 1 } },
      });
      const numero = `DOS/${a.annee}/${numDos.compteur.toString().padStart(6, '0')}`;
      const client = randomItem(clients);
      const nature = randomItem(['IMPORT', 'IMPORT', 'IMPORT', 'EXPORT', 'TRANSIT'] as NatureDossier[]);
      const dateCreation = randomDate(a.debut, a.fin);
      const statut = a.annee < 2026 ? randomItem(statuts) : randomItem(['NOUVEAU', 'EN_COURS', 'ATTENTE_CLIENT', 'ATTENTE_DOUANE', 'LIQUIDATION', 'PAIEMENT', 'MAIN_LEVEE', 'LIVRAISON'] as StatutDossier[]);
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
          numero, annee: a.annee, nature, type: 'MARITIME' as TypeDossier, statut,
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
          numeroDeclaration: statut !== 'NOUVEAU' ? `D${a.annee}${randomInt(10000, 99999)}` : null,
        },
      });
      totalDossiers++;

      // Conteneurs
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

      // Historique
      await prisma.historiqueDossier.create({
        data: { dossierId: dossier.id, action: 'CREATION', statutApres: 'NOUVEAU', commentaire: 'Création du dossier', utilisateur: 'Système', createdAt: dateCreation },
      });
      if (statut !== 'NOUVEAU') {
        await prisma.historiqueDossier.create({
          data: { dossierId: dossier.id, action: 'CHANGEMENT_STATUT', statutAvant: 'NOUVEAU', statutApres: statut, commentaire: `Passage au statut ${statut}`, utilisateur: randomItem(users).nom, createdAt: new Date(dateCreation.getTime() + randomInt(1, 10) * 86400000) },
        });
      }

      // Facture (80% des dossiers non NOUVEAU)
      if (statut !== 'NOUVEAU' && Math.random() > 0.2) {
        const numFac = await prisma.numerotation.update({
          where: { societeId_module_annee: { societeId: societe.id, module: 'FACTURE', annee: a.annee } },
          data: { compteur: { increment: 1 } },
        });
        const facNumero = `FAC/${a.annee}/${numFac.compteur.toString().padStart(6, '0')}`;
        const nbLignes = randomInt(2, 5);
        const lignes = [];
        let montantHT = 0;
        for (let l = 0; l < nbLignes; l++) {
          const p = randomItem(prestations);
          const prix = randomInt(p.min, p.max);
          montantHT += prix;
          lignes.push({ ordre: l + 1, designation: p.designation, quantite: 1, prixUnitaire: prix, montantHT: prix, tauxTVA: 18, montantTVA: Math.round(prix * 0.18), remise: 0 });
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

        // Paiement
        if (montantPaye > 0) {
          const numPai = await prisma.numerotation.update({
            where: { societeId_module_annee: { societeId: societe.id, module: 'PAIEMENT', annee: a.annee } },
            data: { compteur: { increment: 1 } },
          });
          await prisma.paiement.create({
            data: {
              numero: `PAI/${a.annee}/${numPai.compteur.toString().padStart(6, '0')}`,
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
    console.log(`   📅 ${a.annee}: ${a.count} dossiers créés`);
  }

  // ============================================================
  // ADMISSIONS TEMPORAIRES (12)
  // ============================================================
  console.log('⏱️  Création des admissions temporaires...');
  const atData = [
    { numero: 'AT/2024/000001', designation: 'Engins de chantier - Projet autoroute', dureeInitiale: 365, montantCaution: 45000000, statut: 'APUREE' as StatutAT, dateCreation: new Date('2024-02-15'), dateExpiration: new Date('2025-02-15') },
    { numero: 'AT/2024/000002', designation: 'Matériel de forage pétrolier', dureeInitiale: 180, montantCaution: 120000000, statut: 'APUREE' as StatutAT, dateCreation: new Date('2024-05-10'), dateExpiration: new Date('2024-11-10') },
    { numero: 'AT/2024/000003', designation: 'Véhicules de tourisme - Rallye', dureeInitiale: 90, montantCaution: 15000000, statut: 'APUREE' as StatutAT, dateCreation: new Date('2024-08-01'), dateExpiration: new Date('2024-10-30') },
    { numero: 'AT/2025/000001', designation: 'Grues et engins levage - Port', dureeInitiale: 365, montantCaution: 85000000, statut: 'ACTIVE' as StatutAT, dateCreation: new Date('2025-01-20'), dateExpiration: new Date('2026-01-20') },
    { numero: 'AT/2025/000002', designation: 'Équipements médicaux - OMS', dureeInitiale: 180, montantCaution: 35000000, statut: 'EXPIREE' as StatutAT, dateCreation: new Date('2025-03-15'), dateExpiration: new Date('2025-09-15') },
    { numero: 'AT/2025/000003', designation: 'Matériel audiovisuel - CAN', dureeInitiale: 120, montantCaution: 22000000, statut: 'APUREE' as StatutAT, dateCreation: new Date('2025-06-01'), dateExpiration: new Date('2025-10-01') },
    { numero: 'AT/2025/000004', designation: 'Conteneurs frigorifiques', dureeInitiale: 365, montantCaution: 18000000, statut: 'ACTIVE' as StatutAT, dateCreation: new Date('2025-09-01'), dateExpiration: new Date('2026-09-01') },
    { numero: 'AT/2026/000001', designation: 'Machines BTP - Pont HKB Phase 2', dureeInitiale: 365, montantCaution: 250000000, statut: 'ACTIVE' as StatutAT, dateCreation: new Date('2026-01-10'), dateExpiration: new Date('2027-01-10') },
    { numero: 'AT/2026/000002', designation: 'Équipement télécoms 5G', dureeInitiale: 180, montantCaution: 75000000, statut: 'ACTIVE' as StatutAT, dateCreation: new Date('2026-02-20'), dateExpiration: new Date('2026-08-20') },
    { numero: 'AT/2026/000003', designation: 'Véhicules utilitaires - Mission UN', dureeInitiale: 90, montantCaution: 30000000, statut: 'ACTIVE' as StatutAT, dateCreation: new Date('2026-04-01'), dateExpiration: new Date('2026-07-01') },
    { numero: 'AT/2026/000004', designation: 'Matériel de laboratoire', dureeInitiale: 365, montantCaution: 45000000, statut: 'ACTIVE' as StatutAT, dateCreation: new Date('2026-05-15'), dateExpiration: new Date('2027-05-15') },
    { numero: 'AT/2026/000005', designation: 'Groupe électrogène géant', dureeInitiale: 180, montantCaution: 60000000, statut: 'ACTIVE' as StatutAT, dateCreation: new Date('2026-06-01'), dateExpiration: new Date('2026-12-01') },
  ];

  for (const at of atData) {
    const existing = await prisma.admissionTemporaire.findFirst({ where: { numero: at.numero } });
    if (!existing) await prisma.admissionTemporaire.create({ data: { ...at, banqueCaution: randomItem(['BICICI', 'SGBCI', 'ECOBANK', 'BOA']) } });
  }
  console.log(`   ✅ ${atData.length} admissions temporaires`);

  // ============================================================
  // CAUTIONS (dépôts conteneurs compagnies maritimes, par dossier/BL)
  // ============================================================
  console.log('🛡️  Création des cautions...');
  const dossiersPourCautions = await prisma.dossier.findMany({
    where: { societeId: societe.id, numeroBL: { not: null } },
    take: 25,
    orderBy: { dateCreation: 'desc' },
    include: { client: true },
  });

  const existingCautions = await prisma.caution.count({ where: { societeId: societe.id } });
  let totalCautions = 0;
  if (existingCautions === 0) {
    for (let i = 0; i < dossiersPourCautions.length; i++) {
      const d = dossiersPourCautions[i];
      const dateCaution = new Date(d.dateCreation.getTime() + randomInt(1, 5) * 86400000);
      // Répartition : 1 non activée, ~40% payées (historique), le reste en attente (dont une partie avec courrier déjà déposé)
      let statut: StatutCaution = 'EN_ATTENTE';
      if (i === dossiersPourCautions.length - 1) statut = 'NON_ACTIVE';
      else if (Math.random() < 0.4) statut = 'PAYEE';

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
      totalCautions++;
    }
  }
  console.log(`   ✅ ${totalCautions} cautions`);

  // ============================================================
  // COURRIERS (20)
  // ============================================================
  console.log('✉️  Création des courriers...');
  const courriersData = [
    { numero: 'CE/2025/000001', type: 'ENTRANT' as TypeCourrier, objet: 'Demande de cotation transit import', expediteur: 'SAHEL INDUSTRIES', statut: 'TRAITE' as StatutCourrier, priorite: 'NORMALE' as Priorite },
    { numero: 'CS/2025/000001', type: 'SORTANT' as TypeCourrier, objet: 'Réponse cotation - Offre commerciale', destinataire: 'SAHEL INDUSTRIES', statut: 'ENVOYE' as StatutCourrier, priorite: 'HAUTE' as Priorite },
    { numero: 'CE/2025/000002', type: 'ENTRANT' as TypeCourrier, objet: 'Notification arrivée navire FORT DESAIX', expediteur: 'CMA CGM', statut: 'TRAITE' as StatutCourrier, priorite: 'URGENTE' as Priorite },
    { numero: 'CS/2025/000002', type: 'SORTANT' as TypeCourrier, objet: 'Demande de main levée', destinataire: 'Douanes CI', statut: 'ENVOYE' as StatutCourrier, priorite: 'HAUTE' as Priorite },
    { numero: 'CE/2026/000001', type: 'ENTRANT' as TypeCourrier, objet: 'Instruction de dédouanement conteneur', expediteur: 'NESTLÉ CI', statut: 'TRAITE' as StatutCourrier, priorite: 'HAUTE' as Priorite },
    { numero: 'CE/2026/000002', type: 'ENTRANT' as TypeCourrier, objet: 'Réclamation retard livraison', expediteur: 'ORANGE CI', statut: 'RECU' as StatutCourrier, priorite: 'URGENTE' as Priorite },
    { numero: 'CS/2026/000001', type: 'SORTANT' as TypeCourrier, objet: 'Relance paiement facture FAC/2026/000012', destinataire: 'SOCOCE', statut: 'ENVOYE' as StatutCourrier, priorite: 'HAUTE' as Priorite },
    { numero: 'CS/2026/000002', type: 'SORTANT' as TypeCourrier, objet: 'Attestation de transit', destinataire: 'Ministère Commerce', statut: 'ENVOYE' as StatutCourrier, priorite: 'NORMALE' as Priorite },
    { numero: 'CE/2026/000003', type: 'ENTRANT' as TypeCourrier, objet: 'Demande renouvellement AT', expediteur: 'PETROCI', statut: 'RECU' as StatutCourrier, priorite: 'HAUTE' as Priorite },
    { numero: 'CS/2026/000003', type: 'SORTANT' as TypeCourrier, objet: 'Envoi facture et documents BL', destinataire: 'TOTAL ENERGIES', statut: 'BROUILLON' as StatutCourrier, priorite: 'NORMALE' as Priorite },
  ];

  for (const c of courriersData) {
    const existing = await prisma.courrier.findFirst({ where: { numero: c.numero } });
    if (!existing) await prisma.courrier.create({ data: { ...c, createurId: admin.id, dateCreation: randomDate(new Date('2025-01-01'), new Date('2026-06-25')) } });
  }
  console.log(`   ✅ ${courriersData.length} courriers`);

  // ============================================================
  // DÉPENSES (30)
  // ============================================================
  console.log('💸 Création des dépenses...');
  const depCategories = ['Transport', 'Magasinage', 'Manutention', 'Douane', 'Portuaire', 'Carburant', 'Fournitures', 'Salaires', 'Loyer', 'Télécoms'];
  for (let i = 0; i < 30; i++) {
    await prisma.depense.create({
      data: {
        numero: `DEP/${randomItem([2024, 2025, 2026])}/${(i + 1).toString().padStart(6, '0')}`,
        dateDepense: randomDate(new Date('2024-01-01'), new Date('2026-06-25')),
        categorie: randomItem(depCategories),
        designation: `${randomItem(depCategories)} - ${randomItem(['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin'])}`,
        montant: randomInt(50000, 5000000),
        modePaiement: randomItem(['ESPECES', 'VIREMENT', 'CHEQUE', 'MOBILE_MONEY'] as ModePaiement[]),
        statut: 'VALIDE',
      },
    });
  }
  console.log(`   ✅ 30 dépenses`);

  // ============================================================
  // RÉSUMÉ
  // ============================================================
  console.log('\n╔══════════════════════════════════════════╗');
  console.log('║     DONNÉES DE DÉMONSTRATION INJECTÉES    ║');
  console.log('╠══════════════════════════════════════════╣');
  console.log(`║  👤 Utilisateurs    : ${users.length.toString().padStart(5)}              ║`);
  console.log(`║  🏢 Clients         : ${clients.length.toString().padStart(5)}              ║`);
  console.log(`║  🏭 Fournisseurs    : ${fournisseurs.length.toString().padStart(5)}              ║`);
  console.log(`║  📁 Dossiers        : ${totalDossiers.toString().padStart(5)}              ║`);
  console.log(`║  🧾 Factures        : ${totalFactures.toString().padStart(5)}              ║`);
  console.log(`║  💰 Paiements       : ${totalPaiements.toString().padStart(5)}              ║`);
  console.log(`║  ⏱️  AT              : ${atData.length.toString().padStart(5)}              ║`);
  console.log(`║  🛡️  Cautions        : ${totalCautions.toString().padStart(5)}              ║`);
  console.log(`║  ✉️  Courriers       : ${courriersData.length.toString().padStart(5)}              ║`);
  console.log(`║  💸 Dépenses        :    30              ║`);
  console.log('╚══════════════════════════════════════════╝');
  console.log('\n✅ Terminé ! Rafraîchissez le dashboard.');
}

main()
  .catch((e) => { console.error('❌ Erreur:', e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });

import { PrismaClient, Prisma } from '@prisma/client';
import { randomUUID } from 'crypto';

const prisma = new PrismaClient();

// ============================================================================
// HELPERS
// ============================================================================

const TODAY = new Date();

function rand(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
function randf(min: number, max: number, decimals = 2): number {
  const v = Math.random() * (max - min) + min;
  const p = Math.pow(10, decimals);
  return Math.round(v * p) / p;
}
function pick<T>(arr: T[]): T {
  return arr[rand(0, arr.length - 1)];
}
function pickN<T>(arr: T[], n: number): T[] {
  const copy = [...arr];
  const out: T[] = [];
  for (let i = 0; i < n && copy.length > 0; i++) {
    out.push(copy.splice(rand(0, copy.length - 1), 1)[0]);
  }
  return out;
}
function pickWeighted<T>(pairs: [T, number][]): T {
  const total = pairs.reduce((s, [, w]) => s + w, 0);
  let r = Math.random() * total;
  for (const [v, w] of pairs) {
    if (r < w) return v;
    r -= w;
  }
  return pairs[pairs.length - 1][0];
}
function pad(n: number, len: number): string {
  return String(n).padStart(len, '0');
}
function dateInYear(annee: number): Date {
  const start = new Date(annee, 0, 1).getTime();
  const end = annee === TODAY.getFullYear()
    ? Math.min(new Date(annee, 11, 31).getTime(), TODAY.getTime() - 86400000)
    : new Date(annee, 11, 31).getTime();
  return new Date(start + Math.random() * (end - start));
}
function addDays(d: Date, days: number): Date {
  return new Date(d.getTime() + days * 86400000);
}
async function chunkedCreateMany<T>(model: any, data: T[], size = 300) {
  for (let i = 0; i < data.length; i += size) {
    await model.createMany({ data: data.slice(i, i + size) });
  }
}

// ============================================================================
// DONNÉES DE RÉFÉRENCE (listes réalistes CI / transit international)
// ============================================================================

const RAISONS_SOCIALES_CLIENTS = [
  'SIVOA DISTRIBUTION SARL', 'COMPTOIR IVOIRIEN DES METAUX SA', 'AGRIBUSINESS CI SARL',
  'TROPICAL FOODS SA', 'IVOIRE ELECTRO SARL', 'GOLFE INDUSTRIES SA',
  'NOUVELLE PHARMACIE DE COCODY', 'GARAGE MODERNE ABIDJAN SARL', 'CI MOTORS SARL',
  'PLASTICA IVOIRE SA', 'TEXTILE DE LAGUNE SARL', 'BATIPRO CONSTRUCTION SA',
  'AGRO SAHEL EXPORT SARL', 'MINES ET CARRIERES DU GOLFE SA', 'SOCIETE IVOIRIENNE DE NEGOCE',
  'COTON TRANS CI SARL', 'CACAO PRIME EXPORT SA', 'OR VERT INDUSTRIES SARL',
  'DISTRIBUTION PHARMA PLUS SARL', 'IMPORT EXPORT SAHEL SARL', 'LAGUNE AGRO INDUSTRIES SA',
  'ATLANTIQUE COMMERCE SARL', 'ETS KONE ET FRERES', 'GROUPE YAO INDUSTRIES SA',
  'COMPTOIR DU BATIMENT ABIDJAN', 'STE IVOIRIENNE DE QUINCAILLERIE', 'AFRIQUE PIECES AUTO SARL',
  'NEW GENERATION FOODS SA', 'CI CHIMIE INDUSTRIES SA', 'WEST AFRICA TRADING SARL',
];
const RAISONS_SOCIALES_FOURNISSEURS: Record<string, string[]> = {
  TRANSITAIRE: ['TRANSIT EXPRESS CI SARL', 'RAPID TRANSIT SERVICES SA'],
  TRANSPORTEUR: ['TRANSPORTS RAPIDES DU GOLFE', 'CI LOGISTIQUE ROUTIERE SARL', 'TRANS-SAHEL CARGO SARL'],
  COMPAGNIE_MARITIME: ['MAERSK LINE CI', 'CMA CGM COTE D\'IVOIRE', 'MSC COTE D\'IVOIRE SA', 'PIL COTE D\'IVOIRE'],
  COMPAGNIE_AERIENNE: ['AIR FRANCE CARGO', 'ETHIOPIAN AIRLINES CARGO', 'BRUSSELS AIRLINES CARGO'],
  ACCONIER: ['ACCONAGE SERVICES ABIDJAN SA', 'STE ACCONAGE DU PORT SA'],
  MAGASIN: ['MAGASIN GENERAL DU PORT SA', 'ENTREPOTS SOUS DOUANE CI'],
  BANQUE: ['ECOBANK COTE D\'IVOIRE', 'SGBCI', 'NSIA BANQUE CI', 'BICICI'],
  DOUANE: ['REGIE DES DOUANES DE COTE D\'IVOIRE'],
  ASSURANCE: ['ASSURANCES ATLANTIQUE CI', 'NSIA ASSURANCES', 'SAHAM ASSURANCE CI'],
  MANUTENTION: ['SOTRA MANUTENTION SA', 'SDV MANUTENTION CI'],
  PRESTATAIRE: ['CONSULTING DOUANE PLUS SARL', 'SERVICES PORTUAIRES INTEGRES SA'],
  AUTRE: ['DIVERS PRESTATAIRES CI SARL'],
};
const VILLES_CI = ['Abidjan', 'San Pedro', 'Bouaké', 'Yamoussoukro', 'Korhogo', 'Man', 'Daloa', 'Gagnoa'];
const PORTS_ORIGINE = ['Anvers (Belgique)', 'Rotterdam (Pays-Bas)', 'Shanghai (Chine)', 'Guangzhou (Chine)',
  'Hambourg (Allemagne)', 'Le Havre (France)', 'Dubaï (EAU)', 'Casablanca (Maroc)', 'Singapour'];
const AEROPORTS_ORIGINE = ['Paris CDG (France)', 'Bruxelles (Belgique)', 'Dubaï (EAU)', 'Istanbul (Turquie)', 'Addis-Abeba (Ethiopie)'];
const MARCHANDISES = [
  'Pièces détachées automobiles', 'Matériel électroménager', 'Produits pharmaceutiques',
  'Matériaux de construction', 'Equipements industriels', 'Textiles et confection',
  'Denrées alimentaires en conserve', 'Riz importé en sacs', 'Ciment en sacs',
  'Véhicules d\'occasion', 'Matériel informatique', 'Engrais agricoles',
  'Cacao en fèves', 'Coton fibre', 'Bois débité', 'Café vert', 'Huile de palme brute',
  'Anacarde décortiqué', 'Produits chimiques industriels', 'Pièces mécaniques lourdes',
];
const EMBALLAGES = ['Cartons', 'Palettes', 'Fûts', 'Vrac', 'Sacs', 'Caisses en bois'];
const INCOTERMS = ['FOB', 'CFR', 'CIF', 'EXW', 'FCA'];
const REGIMES_DOUANIERS = ['Mise à la consommation', 'Admission temporaire', 'Transit international routier',
  'Entrepôt sous douane', 'Exportation définitive', 'Réexportation'];
const BUREAUX_DOUANE = ['Bureau Port Autonome Abidjan', 'Bureau Aéroport FHB', 'Bureau San Pedro', 'Bureau Frontière Nord (Ouangolodougou)'];
const COMPAGNIES_MARITIMES = ['MAERSK LINE', 'CMA CGM', 'MSC', 'PIL', 'ONE', 'HAPAG-LLOYD'];
const CATEGORIES_DEPENSE = ['TRANSPORT', 'MANUTENTION', 'DOUANE', 'CARBURANT', 'FRAIS_BUREAU', 'ENTRETIEN', 'DIVERS'];

const PRENOMS = ['Aya', 'Kouadio', 'Adjoua', 'Yao', 'Akissi', 'Kouassi', 'Affoué', 'Konan', 'Aminata', 'Sekou'];
const NOMS = ['Kouassi', 'Yao', 'Traoré', 'Diallo', 'Koné', 'Bamba', 'Ouattara', 'N\'Guessan', 'Kouamé', 'Fofana'];

const MODULES_DOCUMENT: string[] = ['BL', 'FACTURE_COMMERCIALE', 'PACKING_LIST', 'CERTIFICAT_ORIGINE',
  'DECLARATION_DOUANE', 'BON_LIVRAISON', 'CONNAISSEMENT', 'ASSURANCE', 'AUTORISATION', 'CORRESPONDANCE'];

const LETTRE_NATURE: Record<string, string> = {
  IMPORT: 'I', EXPORT: 'E', TRANSIT: 'T', REEXPORT: 'R', CABOTAGE: 'C', TRANSBORDEMENT: 'TB',
};

// ============================================================================
// MAIN
// ============================================================================

async function main() {
  console.log('🌱 Génération des données de test GBTRANS ERP (2025 : 50 dossiers, 2026 : 100 dossiers)...');

  const societe = await prisma.societe.findUniqueOrThrow({ where: { code: 'GBTRANS' } });
  const agenceSiege = await prisma.agence.findFirstOrThrow({ where: { societeId: societe.id, code: 'SIEGE' } });
  const agenceSPE = await prisma.agence.findFirstOrThrow({ where: { societeId: societe.id, code: 'SPE' } });
  const exercice2025 = await prisma.exercice.findFirstOrThrow({ where: { societeId: societe.id, code: '2025' } });
  const exercice2026 = await prisma.exercice.findFirstOrThrow({ where: { societeId: societe.id, code: '2026' } });
  const exerciceParAnnee: Record<number, string> = { 2025: exercice2025.id, 2026: exercice2026.id };

  const users = await prisma.utilisateur.findMany({ where: { societeId: societe.id } });
  const admin = users.find(u => u.email === 'admin@gbtrans.ci')!;
  const transitaire = users.find(u => u.email === 'transitaire@gbtrans.ci') || admin;
  const comptable = users.find(u => u.email === 'comptable@gbtrans.ci') || admin;
  const commercial = users.find(u => u.email === 'commercial@gbtrans.ci') || admin;
  const agentUsers = [transitaire, admin, commercial];
  const createurUsers = [transitaire, admin, commercial, comptable];

  const comptes = await prisma.compteComptable.findMany({ where: { societeId: societe.id } });
  const compte = (numero: string) => comptes.find(c => c.numero === numero)!.numero;
  const journaux = await prisma.journalComptable.findMany({ where: { societeId: societe.id } });
  const journal = (code: string) => journaux.find(j => j.code === code)!;

  // --------------------------------------------------------------------
  // 1. Comptes bancaires, caisses, comptes tiers
  // --------------------------------------------------------------------
  const compteBancaireSGBCI = { id: randomUUID(), societeId: societe.id, code: 'BQ-SGBCI', libelle: 'Compte principal SGBCI', banque: 'SGBCI', rib: 'CI93CI0080123456789012345678', devise: 'XOF', solde: 15000000, compteComptable: '512' };
  const compteBancaireECO = { id: randomUUID(), societeId: societe.id, code: 'BQ-ECO', libelle: 'Compte secondaire Ecobank', banque: 'ECOBANK COTE D\'IVOIRE', rib: 'CI93CI0090987654321098765432', devise: 'XOF', solde: 6500000, compteComptable: '512' };
  await prisma.compteBancaire.createMany({ data: [compteBancaireSGBCI, compteBancaireECO] });

  const caisseSiege = { id: randomUUID(), societeId: societe.id, code: 'CA-SIEGE', libelle: 'Caisse Siège Abidjan', devise: 'XOF', solde: 850000, plafond: 2000000, compteComptable: '571' };
  const caisseSPE = { id: randomUUID(), societeId: societe.id, code: 'CA-SPE', libelle: 'Caisse Agence San Pedro', devise: 'XOF', solde: 320000, plafond: 1000000, compteComptable: '571' };
  await prisma.caisse.createMany({ data: [caisseSiege, caisseSPE] });

  const comptesTiers = ['Avances sur frais', 'Consignations douane', 'Comptes agents', 'Divers débiteurs/créditeurs'].map((libelle, i) => ({
    id: randomUUID(), societeId: societe.id, code: `CT-${pad(i + 1, 3)}`, libelle, type: 'DIVERS', devise: 'XOF', solde: randf(-500000, 1500000, 0),
  }));
  await prisma.compteTiers.createMany({ data: comptesTiers });

  // --------------------------------------------------------------------
  // 2. Prospects, Catalogue de prestations, Modèles de courrier, Processus
  // --------------------------------------------------------------------
  const prospects = pickN(RAISONS_SOCIALES_CLIENTS, 10).map(raisonSociale => ({
    id: randomUUID(), societeId: societe.id, raisonSociale,
    contact: `${pick(PRENOMS)} ${pick(NOMS)}`, telephone: `+225 07 ${rand(10, 99)} ${rand(10, 99)} ${rand(10, 99)} ${rand(10, 99)}`,
    email: `contact@${raisonSociale.toLowerCase().replace(/[^a-z]/g, '').slice(0, 12)}.ci`,
    activite: pick(['Négoce international', 'Industrie agroalimentaire', 'BTP', 'Distribution', 'Import-export']),
    source: pick(['Recommandation', 'Site web', 'Salon professionnel', 'Prospection directe']),
    statut: pick(['NOUVEAU', 'CONTACTE', 'QUALIFIE', 'PERDU']),
  }));
  await prisma.prospect.createMany({ data: prospects });

  const prestations = [
    { categorie: 'TRANSIT', code: 'TRA-DED', designation: 'Déclaration en douane import', montantDefaut: 150000 },
    { categorie: 'TRANSIT', code: 'TRA-DEE', designation: 'Déclaration en douane export', montantDefaut: 100000 },
    { categorie: 'TRANSIT', code: 'TRA-SUI', designation: 'Suivi et coordination du dossier', montantDefaut: 75000 },
    { categorie: 'DOUANE', code: 'DOU-LIQ', designation: 'Liquidation des droits de douane', montantDefaut: 50000 },
    { categorie: 'DOUANE', code: 'DOU-VIS', designation: 'Visite douanière', montantDefaut: 35000 },
    { categorie: 'TRANSPORT', code: 'TRP-ENL', designation: 'Enlèvement port / aéroport', montantDefaut: 120000 },
    { categorie: 'TRANSPORT', code: 'TRP-LIV', designation: 'Livraison à domicile', montantDefaut: 90000 },
    { categorie: 'MANUTENTION', code: 'MAN-CHG', designation: 'Chargement / déchargement', montantDefaut: 45000 },
    { categorie: 'MANUTENTION', code: 'MAN-STO', designation: 'Frais de magasinage', montantDefaut: 60000 },
    { categorie: 'DIVERS', code: 'DIV-DOS', designation: 'Frais de dossier', montantDefaut: 25000 },
    { categorie: 'DIVERS', code: 'DIV-TIM', designation: 'Timbre fiscal', montantDefaut: 5000 },
    { categorie: 'DIVERS', code: 'DIV-COU', designation: 'Frais de courrier / expédition documents', montantDefaut: 15000 },
    { categorie: 'ASSURANCE', code: 'ASS-MAR', designation: 'Assurance transport marchandises', montantDefaut: 80000 },
    { categorie: 'TRANSIT', code: 'TRA-AT', designation: 'Gestion admission temporaire', montantDefaut: 200000 },
    { categorie: 'TRANSPORT', code: 'TRP-CON', designation: 'Location conteneur supplémentaire', montantDefaut: 175000 },
    { categorie: 'DIVERS', code: 'DIV-CAU', designation: 'Frais de caution conteneur', montantDefaut: 500000 },
  ].map((p, i) => ({ id: randomUUID(), societeId: societe.id, ordre: i, tauxTVA: 18, estTVA: true, ...p }));
  await prisma.prestationCatalogue.createMany({ data: prestations });

  const modeles = [
    { nom: 'Demande de mainlevée', type: 'SORTANT' as const, objet: 'Demande de mainlevée - Dossier {NUMERO_DOSSIER}', contenu: 'Nous sollicitons la mainlevée de votre marchandise référencée sous le dossier {NUMERO_DOSSIER}.' },
    { nom: 'Relance impayé client', type: 'SORTANT' as const, objet: 'Relance de facture impayée {NUMERO_FACTURE}', contenu: 'Nous constatons que la facture {NUMERO_FACTURE} demeure impayée à ce jour. Merci de régulariser votre situation.' },
    { nom: 'Accusé de réception BL', type: 'ENTRANT' as const, objet: 'Réception connaissement (BL) {NUMERO_BL}', contenu: 'Accusé de réception du connaissement {NUMERO_BL} transmis par la compagnie maritime.' },
    { nom: 'Note interne suivi dossier', type: 'INTERNE' as const, objet: 'Suivi dossier {NUMERO_DOSSIER}', contenu: 'Merci de faire un point de situation sur le dossier {NUMERO_DOSSIER}.' },
  ].map(m => ({ id: randomUUID(), societeId: societe.id, ...m }));
  await prisma.modeleCourrier.createMany({ data: modeles });

  const processusImport = { id: randomUUID(), societeId: societe.id, code: 'PROC-IMP', nom: 'Processus Import Standard', nature: 'IMPORT' as const };
  const processusExport = { id: randomUUID(), societeId: societe.id, code: 'PROC-EXP', nom: 'Processus Export Standard', nature: 'EXPORT' as const };
  await prisma.processusSuivi.createMany({ data: [processusImport, processusExport] });
  const etapesImport = ['Ouverture dossier', 'Réception documents', 'Déclaration en douane', 'Liquidation', 'Paiement droits', 'Mainlevée', 'Livraison'];
  const etapesExport = ['Ouverture dossier', 'Constitution documents', 'Déclaration export', 'Visite douane', 'Embarquement', 'Clôture dossier'];
  await prisma.etapeProcessus.createMany({
    data: [
      ...etapesImport.map((nom, i) => ({ id: randomUUID(), processusId: processusImport.id, ordre: i + 1, code: `ETP-${i + 1}`, nom })),
      ...etapesExport.map((nom, i) => ({ id: randomUUID(), processusId: processusExport.id, ordre: i + 1, code: `ETP-${i + 1}`, nom })),
    ],
  });

  // --------------------------------------------------------------------
  // 3. Clients & Fournisseurs
  // --------------------------------------------------------------------
  const clients = RAISONS_SOCIALES_CLIENTS.map((raisonSociale, i) => ({
    id: randomUUID(), societeId: societe.id, code: `CLI${pad(i + 1, 4)}`,
    type: pickWeighted<'ENTREPRISE' | 'PARTICULIER' | 'ADMINISTRATION' | 'ONG'>([['ENTREPRISE', 85], ['PARTICULIER', 8], ['ADMINISTRATION', 4], ['ONG', 3]]),
    raisonSociale, ncc: `${rand(1000000, 9999999)}${pick(['A', 'B', 'C'])}`, rccm: `CI-ABJ-${rand(2010, 2024)}-${pick(['A', 'B'])}-${rand(1000, 9999)}`,
    adresse: `${rand(1, 200)} Rue ${pick(['des Jardins', 'du Commerce', 'de la Lagune', 'Principale'])}, ${pick(['Plateau', 'Cocody', 'Marcory', 'Treichville', 'Zone 4', 'Yopougon'])}`,
    ville: 'Abidjan', telephone: `+225 27 ${rand(20, 25)} ${rand(10, 99)} ${rand(10, 99)} ${rand(10, 99)}`,
    mobile: `+225 07 ${rand(10, 99)} ${rand(10, 99)} ${rand(10, 99)} ${rand(10, 99)}`,
    email: `contact@${raisonSociale.toLowerCase().replace(/[^a-z]/g, '').slice(0, 15)}.ci`,
    conditionPaiement: pick([0, 15, 30, 45, 60]), tauxRemise: pick([0, 0, 0, 5, 10]),
    bloque: Math.random() < 0.05, actif: true,
  }));
  await chunkedCreateMany(prisma.client, clients);

  const contactsClients = clients.filter(() => Math.random() < 0.8).map(c => ({
    id: randomUUID(), clientId: c.id, nom: pick(NOMS), prenom: pick(PRENOMS), fonction: pick(['Directeur Général', 'Responsable Logistique', 'Responsable Import', 'Comptable']),
    telephone: `+225 07 ${rand(10, 99)} ${rand(10, 99)} ${rand(10, 99)} ${rand(10, 99)}`, principal: true,
  }));
  await chunkedCreateMany(prisma.contactClient, contactsClients);

  const fournisseurs: any[] = [];
  let fCode = 1;
  for (const [type, noms] of Object.entries(RAISONS_SOCIALES_FOURNISSEURS)) {
    for (const raisonSociale of noms) {
      fournisseurs.push({
        id: randomUUID(), societeId: societe.id, code: `FOU${pad(fCode++, 4)}`, type: type as any, raisonSociale,
        ncc: `${rand(1000000, 9999999)}${pick(['A', 'B'])}`, ville: pick(VILLES_CI),
        telephone: `+225 27 ${rand(20, 25)} ${rand(10, 99)} ${rand(10, 99)} ${rand(10, 99)}`,
        email: `contact@${raisonSociale.toLowerCase().replace(/[^a-z]/g, '').slice(0, 15)}.ci`,
        conditionPaiement: pick([0, 15, 30]), actif: true,
      });
    }
  }
  await chunkedCreateMany(prisma.fournisseur, fournisseurs);
  const fournisseursTransport = fournisseurs.filter(f => ['TRANSPORTEUR', 'COMPAGNIE_MARITIME', 'ACCONIER', 'MANUTENTION', 'MAGASIN'].includes(f.type));

  const contactsFournisseurs = fournisseurs.filter(() => Math.random() < 0.7).map(f => ({
    id: randomUUID(), fournisseurId: f.id, nom: pick(NOMS), prenom: pick(PRENOMS), fonction: 'Responsable commercial',
    telephone: `+225 07 ${rand(10, 99)} ${rand(10, 99)} ${rand(10, 99)} ${rand(10, 99)}`, principal: true,
  }));
  await chunkedCreateMany(prisma.contactFournisseur, contactsFournisseurs);

  // --------------------------------------------------------------------
  // 4. Boucle principale par exercice : Dossiers + modules liés
  // --------------------------------------------------------------------
  const ANNEES: { annee: number; nb: number }[] = [{ annee: 2025, nb: 50 }, { annee: 2026, nb: 100 }];

  const numerotationCompteurs: Record<string, number> = {};
  const nextNumero = (module: string, prefixe: string, annee: number) => {
    const key = `${module}-${annee}`;
    numerotationCompteurs[key] = (numerotationCompteurs[key] || 0) + 1;
    return `${prefixe}/${annee}/${pad(numerotationCompteurs[key], 6)}`;
  };
  const numeroPhysiqueCompteurs: Record<string, number> = {};
  const nextNumeroPhysique = (nature: string, annee: number) => {
    const lettre = LETTRE_NATURE[nature];
    const key = `${lettre}-${annee}`;
    numeroPhysiqueCompteurs[key] = (numeroPhysiqueCompteurs[key] || 0) + 1;
    return `${lettre}-${pad(numeroPhysiqueCompteurs[key], 2)}/${annee}`;
  };

  let ecritureCounter = 0;
  const nextEcritureNumero = (code: string, annee: number) => `${code}-${annee}-${pad(++ecritureCounter, 6)}`;

  for (const { annee, nb } of ANNEES) {
    console.log(`\n📁 Exercice ${annee} : génération de ${nb} dossiers...`);
    const estAnneeCourante = annee === TODAY.getFullYear();

    const dossiers: any[] = [];
    const conteneurs: any[] = [];
    const articles: any[] = [];
    const historiques: any[] = [];

    for (let i = 0; i < nb; i++) {
      const nature = pickWeighted<'IMPORT' | 'EXPORT' | 'TRANSIT' | 'REEXPORT' | 'CABOTAGE' | 'TRANSBORDEMENT'>([
        ['IMPORT', 55], ['EXPORT', 25], ['TRANSIT', 12], ['REEXPORT', 5], ['CABOTAGE', 2], ['TRANSBORDEMENT', 1],
      ]);
      const type = pickWeighted<'MARITIME' | 'AERIEN' | 'TERRESTRE' | 'MULTIMODAL'>([
        ['MARITIME', 70], ['AERIEN', 20], ['TERRESTRE', 8], ['MULTIMODAL', 2],
      ]);
      const statut = estAnneeCourante
        ? pickWeighted<any>([['NOUVEAU', 10], ['EN_COURS', 20], ['ATTENTE_CLIENT', 8], ['ATTENTE_DOUANE', 8],
            ['LIQUIDATION', 8], ['PAIEMENT', 8], ['MAIN_LEVEE', 8], ['LIVRAISON', 10], ['CLOTURE', 15], ['ANNULE', 3], ['ARCHIVE', 2]])
        : pickWeighted<any>([['CLOTURE', 45], ['ARCHIVE', 30], ['LIVRAISON', 10], ['MAIN_LEVEE', 8], ['PAIEMENT', 2], ['ANNULE', 5]]);

      const dateCreation = dateInYear(annee);
      const estFerme = ['CLOTURE', 'ARCHIVE', 'ANNULE'].includes(statut);
      const dateCloture = estFerme && statut !== 'ANNULE' ? addDays(dateCreation, rand(5, 60)) : null;
      const dateAnnulation = statut === 'ANNULE' ? addDays(dateCreation, rand(2, 20)) : null;

      const valeurFOB = randf(1000000, 25000000, 0);
      const fret = randf(valeurFOB * 0.03, valeurFOB * 0.08, 0);
      const assurance = randf(valeurFOB * 0.003, valeurFOB * 0.008, 0);
      const valeurCAF = valeurFOB + fret + assurance;
      const auDelaDouane = ['LIQUIDATION', 'PAIEMENT', 'MAIN_LEVEE', 'LIVRAISON', 'CLOTURE', 'ARCHIVE'].includes(statut);
      const droitDouane = auDelaDouane ? randf(valeurCAF * 0.05, valeurCAF * 0.2, 0) : null;
      const tva = auDelaDouane ? randf((valeurCAF + (droitDouane || 0)) * 0.18 * 0.9, (valeurCAF + (droitDouane || 0)) * 0.18 * 1.1, 0) : null;
      const autresTaxes = auDelaDouane ? randf(10000, 150000, 0) : null;

      const dossier = {
        id: randomUUID(),
        societeId: societe.id,
        agenceId: Math.random() < 0.85 ? agenceSiege.id : agenceSPE.id,
        createurId: pick(createurUsers).id,
        agentId: Math.random() < 0.9 ? pick(agentUsers).id : null,
        numero: nextNumero('DOSSIER', 'DOS', annee),
        numeroPhysique: nextNumeroPhysique(nature, annee),
        annee,
        nature, type, statut,
        clientId: pick(clients).id,
        referenceClient: Math.random() < 0.4 ? `REF-${rand(1000, 9999)}` : null,
        compagnieMaritime: type === 'MARITIME' ? pick(COMPAGNIES_MARITIMES) : null,
        navire: type === 'MARITIME' ? `MV ${pick(['ATLANTIC', 'PACIFIC', 'GULF', 'AFRICA', 'IVOIRE'])} ${pick(['STAR', 'TRADER', 'EXPRESS', 'PIONEER'])}` : null,
        voyage: type === 'MARITIME' ? `${rand(100, 999)}${pick(['E', 'W', 'N', 'S'])}` : null,
        numeroBL: type === 'MARITIME' ? `${pick(['MAEU', 'MSCU', 'CMDU', 'ONEY'])}${rand(100000000, 999999999)}` : null,
        portOrigine: nature === 'IMPORT' ? pick(type === 'AERIEN' ? AEROPORTS_ORIGINE : PORTS_ORIGINE) : 'Abidjan',
        portDestination: nature === 'EXPORT' ? pick(type === 'AERIEN' ? AEROPORTS_ORIGINE : PORTS_ORIGINE) : 'Abidjan',
        dateArrivee: nature === 'IMPORT' ? addDays(dateCreation, -rand(0, 10)) : null,
        dateDepart: nature === 'EXPORT' ? addDays(dateCreation, rand(1, 15)) : null,
        designation: pick(MARCHANDISES),
        poidsBrut: randf(500, 25000, 0),
        poidsNet: null as number | null,
        volume: randf(5, 80, 2),
        nombreColis: rand(1, 500),
        emballage: pick(EMBALLAGES),
        valeurFOB, fret, assurance, valeurCAF,
        incoterm: pick(INCOTERMS), devise: 'XOF', tauxChange: 1,
        numeroDeclaration: auDelaDouane ? `${rand(10000, 99999)} D ${annee}` : null,
        dateDeclaration: auDelaDouane ? addDays(dateCreation, rand(1, 5)) : null,
        regimeDouanier: pick(REGIMES_DOUANIERS),
        bureauDouane: pick(BUREAUX_DOUANE),
        positionTarifaire: `${rand(1000, 9999)}.${rand(10, 99)}.${rand(10, 99)}.00`,
        droitDouane, tva, autresTaxes,
        totalDroits: auDelaDouane ? (droitDouane || 0) + (tva || 0) + (autresTaxes || 0) : null,
        dateLivraison: ['LIVRAISON', 'CLOTURE', 'ARCHIVE'].includes(statut) ? addDays(dateCreation, rand(15, 45)) : null,
        lieuLivraison: ['LIVRAISON', 'CLOTURE', 'ARCHIVE'].includes(statut) ? `Entrepôt client, ${pick(VILLES_CI)}` : null,
        bonLivraison: ['LIVRAISON', 'CLOTURE', 'ARCHIVE'].includes(statut) ? `BL-${rand(1000, 9999)}` : null,
        observations: Math.random() < 0.3 ? pick(['Dossier prioritaire client fidèle', 'Marchandise fragile - manutention soignée', 'Litige documentaire résolu', 'RAS']) : null,
        dateCreation,
        dateCloture, dateAnnulation,
        motifAnnulation: statut === 'ANNULE' ? pick(['Annulation à la demande du client', 'Marchandise non embarquée', 'Erreur de saisie']) : null,
      };
      dossier.poidsNet = dossier.poidsBrut ? Number((dossier.poidsBrut * 0.92).toFixed(0)) : null;
      dossiers.push(dossier);

      if (type === 'MARITIME') {
        const nbConteneurs = rand(1, 3);
        for (let c = 0; c < nbConteneurs; c++) {
          const conteneurType = pick(['20', '40', '40HC']);
          conteneurs.push({
            id: randomUUID(), dossierId: dossier.id,
            numero: `${pick(['MSKU', 'CMAU', 'MSCU', 'TCLU'])}${rand(1000000, 9999999)}`,
            type: conteneurType, taille: conteneurType === '20' ? '20' : '40',
            poids: randf(2000, 25000, 0), scelle: `SC${rand(100000, 999999)}`, etat: 'BON ETAT',
          });
        }
      }

      const nbArticles = rand(1, 4);
      for (let a = 0; a < nbArticles; a++) {
        articles.push({
          id: randomUUID(), dossierId: dossier.id, numero: a + 1,
          designation: pick(MARCHANDISES), quantite: randf(1, 500, 0),
          unite: pick(['PCS', 'KG', 'CARTON', 'PALETTE']), positionTarifaire: `${rand(1000, 9999)}.${rand(10, 99)}`,
          poids: randf(50, 5000, 0), valeur: randf(50000, 5000000, 0), origine: pick(['Chine', 'France', 'Belgique', 'Allemagne', 'Emirats Arabes Unis', 'Maroc']),
        });
      }

      historiques.push({ id: randomUUID(), dossierId: dossier.id, action: 'CREATION', statutApres: 'NOUVEAU', commentaire: 'Création du dossier (donnée de test)', utilisateur: 'Système', createdAt: dateCreation });
      if (statut !== 'NOUVEAU') {
        historiques.push({ id: randomUUID(), dossierId: dossier.id, action: 'CHANGEMENT_STATUT', statutAvant: 'NOUVEAU', statutApres: statut, commentaire: `Passage au statut ${statut}`, utilisateur: 'Système', createdAt: addDays(dateCreation, rand(1, 10)) });
      }
    }

    await chunkedCreateMany(prisma.dossier, dossiers);
    await chunkedCreateMany(prisma.conteneur, conteneurs);
    await chunkedCreateMany(prisma.article, articles);
    await chunkedCreateMany(prisma.historiqueDossier, historiques);
    console.log(`   ✓ ${dossiers.length} dossiers, ${conteneurs.length} conteneurs, ${articles.length} articles, ${historiques.length} historiques`);

    // ------------------------------------------------------------------
    // Proformas
    // ------------------------------------------------------------------
    const proformas: any[] = [];
    const lignesProforma: any[] = [];
    const dossiersAvecProforma = dossiers.filter(() => Math.random() < 0.6);
    for (const d of dossiersAvecProforma) {
      const proforma = {
        id: randomUUID(), numero: nextNumero('PROFORMA', 'PRO', annee), dossierId: d.id, clientId: d.clientId,
        dateProforma: addDays(d.dateCreation, rand(0, 3)), dateValidite: addDays(d.dateCreation, 30),
        objet: `Prestations transit - Dossier ${d.numero}`,
        statut: pickWeighted<any>([['BROUILLON', 10], ['VALIDEE', 15], ['ENVOYEE', 15], ['ACCEPTEE', 15], ['TRANSFORMEE', 35], ['EXPIREE', 5], ['ANNULEE', 5]]),
        montantHT: 0, montantTVA: 0, montantTTC: 0,
      };
      const nbLignes = rand(2, 4);
      let mHT = 0, mTVA = 0;
      const prestationsChoisies = pickN(prestations, nbLignes);
      prestationsChoisies.forEach((p, idx) => {
        const qte = 1;
        const pu = Number(p.montantDefaut) * randf(0.9, 1.15, 2);
        const ht = qte * pu;
        const tvaLigne = p.estTVA ? ht * 0.18 : 0;
        mHT += ht; mTVA += tvaLigne;
        lignesProforma.push({
          id: randomUUID(), proformaId: proforma.id, ordre: idx + 1, categorie: p.categorie, codePrestation: p.code,
          designation: p.designation, quantite: qte, unite: 'FORFAIT', prixUnitaire: pu, montantHT: ht,
          tauxTVA: p.estTVA ? 18 : 0, montantTVA: tvaLigne, estTVA: p.estTVA,
        });
      });
      proforma.montantHT = mHT; proforma.montantTVA = mTVA; proforma.montantTTC = mHT + mTVA;
      proformas.push(proforma);
    }
    await chunkedCreateMany(prisma.proforma, proformas);
    await chunkedCreateMany(prisma.ligneProforma, lignesProforma);
    console.log(`   ✓ ${proformas.length} proformas, ${lignesProforma.length} lignes`);

    // ------------------------------------------------------------------
    // Offres commerciales (dossier ou client direct)
    // ------------------------------------------------------------------
    const offres: any[] = [];
    const lignesOffre: any[] = [];
    const nbOffres = Math.round(nb * 0.18);
    for (let i = 0; i < nbOffres; i++) {
      const surDossier = Math.random() < 0.6;
      const d = surDossier ? pick(dossiers) : null;
      const dateOffre = d ? addDays(d.dateCreation, -rand(0, 5)) : dateInYear(annee);
      const offre = {
        id: randomUUID(), numero: nextNumero('OFFRE', 'OFF', annee), dossierId: d?.id || null, clientId: d?.clientId || pick(clients).id,
        dateOffre, dateValidite: addDays(dateOffre, 30), objet: 'Offre de services de transit et dédouanement',
        statut: pickWeighted<any>([['BROUILLON', 15], ['ENVOYEE', 20], ['ACCEPTEE', 30], ['REFUSEE', 15], ['EXPIREE', 10], ['ANNULEE', 10]]),
        montantHT: 0, montantTVA: 0, montantTTC: 0,
      };
      const nbLignes = rand(1, 3);
      let mHT = 0, mTVA = 0;
      pickN(prestations, nbLignes).forEach((p, idx) => {
        const pu = Number(p.montantDefaut) * randf(0.9, 1.2, 2);
        mHT += pu; mTVA += p.estTVA ? pu * 0.18 : 0;
        lignesOffre.push({ id: randomUUID(), offreId: offre.id, ordre: idx + 1, designation: p.designation, quantite: 1, unite: 'FORFAIT', prixUnitaire: pu, montantHT: pu, tauxTVA: p.estTVA ? 18 : 0, montantTVA: p.estTVA ? pu * 0.18 : 0 });
      });
      offre.montantHT = mHT; offre.montantTVA = mTVA; offre.montantTTC = mHT + mTVA;
      offres.push(offre);
    }
    await chunkedCreateMany(prisma.offreCommerciale, offres);
    await chunkedCreateMany(prisma.ligneOffre, lignesOffre);
    console.log(`   ✓ ${offres.length} offres commerciales, ${lignesOffre.length} lignes`);

    // ------------------------------------------------------------------
    // Factures clients + lignes + paiements
    // ------------------------------------------------------------------
    const factures: any[] = [];
    const lignesFacture: any[] = [];
    const paiements: any[] = [];
    const paiementFactures: any[] = [];
    const dossiersAvecFacture = dossiers.filter(d => d.statut !== 'NOUVEAU' && Math.random() < 0.85);

    for (const d of dossiersAvecFacture) {
      const dateFacture = addDays(d.dateCreation, rand(3, 15));
      let statutFacture: any;
      if (d.statut === 'ANNULE') statutFacture = pick(['ANNULEE', 'BROUILLON']);
      else if (['CLOTURE', 'ARCHIVE'].includes(d.statut)) statutFacture = pickWeighted<any>([['PAYEE', 75], ['PARTIELLEMENT_PAYEE', 10], ['EN_RETARD', 10], ['CONTENTIEUX', 5]]);
      else statutFacture = pickWeighted<any>([['BROUILLON', 15], ['VALIDEE', 20], ['ENVOYEE', 20], ['PARTIELLEMENT_PAYEE', 20], ['PAYEE', 15], ['EN_RETARD', 10]]);

      const facture = {
        id: randomUUID(), societeId: societe.id, numero: nextNumero('FACTURE', 'FAC', annee), type: 'FACTURE' as const,
        dossierId: d.id, clientId: d.clientId, createurId: comptable.id, dateFacture, dateEcheance: addDays(dateFacture, 30),
        objet: `Prestations de transit - Dossier ${d.numero}`, statut: statutFacture,
        montantHT: 0, montantTVA: 0, montantTTC: 0, montantPaye: 0, resteAPayer: 0, tauxTVA: 18,
      };
      const nbLignes = rand(2, 5);
      let mHT = 0, mTVA = 0;
      pickN(prestations, nbLignes).forEach((p, idx) => {
        const pu = Number(p.montantDefaut) * randf(0.9, 1.2, 2);
        const ht = pu; const tvaLigne = p.estTVA ? ht * 0.18 : 0;
        mHT += ht; mTVA += tvaLigne;
        lignesFacture.push({ id: randomUUID(), factureId: facture.id, ordre: idx + 1, categorie: p.categorie, codePrestation: p.code, designation: p.designation, estTVA: p.estTVA, quantite: 1, unite: 'FORFAIT', prixUnitaire: pu, montantHT: ht, tauxTVA: p.estTVA ? 18 : 0, montantTVA: tvaLigne, compteComptable: '706' });
      });
      facture.montantHT = mHT; facture.montantTVA = mTVA; facture.montantTTC = mHT + mTVA;

      if (statutFacture === 'PAYEE') { facture.montantPaye = facture.montantTTC; facture.resteAPayer = 0; }
      else if (statutFacture === 'PARTIELLEMENT_PAYEE') { facture.montantPaye = Number((facture.montantTTC * randf(0.3, 0.7, 2)).toFixed(0)); facture.resteAPayer = facture.montantTTC - facture.montantPaye; }
      else { facture.montantPaye = 0; facture.resteAPayer = statutFacture === 'ANNULEE' ? 0 : facture.montantTTC; }

      factures.push(facture);

      if (facture.montantPaye > 0) {
        const surCaisse = Math.random() < 0.4;
        const paiement = {
          id: randomUUID(), numero: nextNumero('PAIEMENT', 'PAI', annee), clientId: d.clientId,
          datePaiement: addDays(dateFacture, rand(1, 25)), montant: facture.montantPaye,
          modePaiement: pickWeighted<any>([['VIREMENT', 35], ['CHEQUE', 20], ['ESPECES', 15], ['MOBILE_MONEY', 10], ['ORANGE_MONEY', 10], ['WAVE', 10]]),
          reference: `REF-PAI-${rand(10000, 99999)}`, statut: 'VALIDE' as const,
          caisseId: surCaisse ? pick([caisseSiege, caisseSPE]).id : null,
          compteBancaireId: !surCaisse ? pick([compteBancaireSGBCI, compteBancaireECO]).id : null,
          createurId: comptable.id,
        };
        paiements.push(paiement);
        paiementFactures.push({ id: randomUUID(), paiementId: paiement.id, factureId: facture.id, montant: facture.montantPaye });
      }
    }
    await chunkedCreateMany(prisma.facture, factures);
    await chunkedCreateMany(prisma.ligneFacture, lignesFacture);
    await chunkedCreateMany(prisma.paiement, paiements);
    await chunkedCreateMany(prisma.paiementFacture, paiementFactures);
    console.log(`   ✓ ${factures.length} factures, ${lignesFacture.length} lignes, ${paiements.length} paiements clients`);

    // ------------------------------------------------------------------
    // Factures fournisseurs + lignes + paiements
    // ------------------------------------------------------------------
    const facturesFrs: any[] = [];
    const lignesFactureFrs: any[] = [];
    const paiementsFrs: any[] = [];
    const paiementFactureFrs: any[] = [];
    const dossiersAvecFF = dossiers.filter(() => Math.random() < 0.5);

    for (const d of dossiersAvecFF) {
      const fournisseur = pick(fournisseursTransport.length ? fournisseursTransport : fournisseurs);
      const dateFacture = addDays(d.dateCreation, rand(2, 12));
      const statutFF: any = pickWeighted([['BROUILLON', 10], ['VALIDEE', 20], ['PARTIELLEMENT_PAYEE', 20], ['PAYEE', 40], ['EN_RETARD', 10]]);
      const ff = {
        id: randomUUID(), societeId: societe.id, numero: nextNumero('FACTURE_FOURNISSEUR', 'FF', annee), fournisseurId: fournisseur.id,
        dossierId: d.id, createurId: comptable.id, dateFacture, dateEcheance: addDays(dateFacture, 30),
        reference: `${fournisseur.code}-${rand(1000, 9999)}`, objet: `Prestations sur dossier ${d.numero}`,
        statut: statutFF, montantHT: 0, montantTVA: 0, montantTTC: 0, montantPaye: 0, resteAPayer: 0,
      };
      const nbLignes = rand(1, 3);
      let mHT = 0, mTVA = 0;
      for (let l = 0; l < nbLignes; l++) {
        const pu = randf(30000, 800000, 0);
        mHT += pu; mTVA += pu * 0.18;
        lignesFactureFrs.push({ id: randomUUID(), factureFournisseurId: ff.id, ordre: l + 1, designation: pick(['Frais de transport', 'Frais de manutention', 'Frais d\'acconage', 'Frêt maritime', 'Frais de magasinage']), quantite: 1, prixUnitaire: pu, montantHT: pu, tauxTVA: 18, montantTVA: pu * 0.18 });
      }
      ff.montantHT = mHT; ff.montantTVA = mTVA; ff.montantTTC = mHT + mTVA;
      if (statutFF === 'PAYEE') { ff.montantPaye = ff.montantTTC; ff.resteAPayer = 0; }
      else if (statutFF === 'PARTIELLEMENT_PAYEE') { ff.montantPaye = Number((ff.montantTTC * randf(0.3, 0.7, 2)).toFixed(0)); ff.resteAPayer = ff.montantTTC - ff.montantPaye; }
      else { ff.resteAPayer = ff.montantTTC; }
      facturesFrs.push(ff);

      if (ff.montantPaye > 0) {
        const surCaisse = Math.random() < 0.3;
        const pf = {
          id: randomUUID(), societeId: societe.id, numero: nextNumero('PAIEMENT_FOURNISSEUR', 'PF', annee), fournisseurId: fournisseur.id,
          datePaiement: addDays(dateFacture, rand(1, 25)), montant: ff.montantPaye,
          modePaiement: pickWeighted<any>([['VIREMENT', 50], ['CHEQUE', 30], ['ESPECES', 20]]),
          reference: `REF-PF-${rand(10000, 99999)}`, statut: 'VALIDE' as const,
          caisseId: surCaisse ? pick([caisseSiege, caisseSPE]).id : null,
          compteBancaireId: !surCaisse ? pick([compteBancaireSGBCI, compteBancaireECO]).id : null,
          createurId: comptable.id,
        };
        paiementsFrs.push(pf);
        paiementFactureFrs.push({ id: randomUUID(), paiementFournisseurId: pf.id, factureFournisseurId: ff.id, montant: ff.montantPaye });
      }
    }
    await chunkedCreateMany(prisma.factureFournisseur, facturesFrs);
    await chunkedCreateMany(prisma.ligneFactureFournisseur, lignesFactureFrs);
    await chunkedCreateMany(prisma.paiementFournisseur, paiementsFrs);
    await chunkedCreateMany(prisma.paiementFactureFournisseur, paiementFactureFrs);
    console.log(`   ✓ ${facturesFrs.length} factures fournisseurs, ${paiementsFrs.length} paiements fournisseurs`);

    // ------------------------------------------------------------------
    // Comptabilité : écritures + mouvements (factures et paiements)
    // ------------------------------------------------------------------
    const ecritures: any[] = [];
    const mouvements: any[] = [];
    const exerciceId = exerciceParAnnee[annee];

    for (const f of factures.filter(f => !['BROUILLON', 'ANNULEE'].includes(f.statut))) {
      const ecId = randomUUID();
      ecritures.push({ id: ecId, exerciceId, journalId: journal('VE').id, numero: nextEcritureNumero('VE', annee), dateEcriture: f.dateFacture, libelle: `Facturation ${f.numero}`, reference: f.numero, factureId: f.id, createurId: comptable.id, validee: true, dateValidation: f.dateFacture });
      mouvements.push({ id: randomUUID(), ecritureId: ecId, compteId: comptes.find(c => c.numero === '411')!.id, libelle: `Client ${f.numero}`, debit: f.montantTTC, credit: 0 });
      mouvements.push({ id: randomUUID(), ecritureId: ecId, compteId: comptes.find(c => c.numero === '706')!.id, libelle: `Prestations ${f.numero}`, debit: 0, credit: f.montantHT });
      if (f.montantTVA > 0) mouvements.push({ id: randomUUID(), ecritureId: ecId, compteId: comptes.find(c => c.numero === '443')!.id, libelle: `TVA ${f.numero}`, debit: 0, credit: f.montantTVA });
    }
    for (const p of paiements) {
      const ecId = randomUUID();
      const journalCode = p.caisseId ? 'CA' : 'BQ';
      ecritures.push({ id: ecId, exerciceId, journalId: journal(journalCode).id, numero: nextEcritureNumero(journalCode, annee), dateEcriture: p.datePaiement, libelle: `Encaissement ${p.numero}`, reference: p.numero, paiementId: p.id, createurId: comptable.id, validee: true, dateValidation: p.datePaiement });
      mouvements.push({ id: randomUUID(), ecritureId: ecId, compteId: comptes.find(c => c.numero === (p.caisseId ? '571' : '512'))!.id, libelle: `Encaissement ${p.numero}`, debit: p.montant, credit: 0 });
      mouvements.push({ id: randomUUID(), ecritureId: ecId, compteId: comptes.find(c => c.numero === '411')!.id, libelle: `Règlement client`, debit: 0, credit: p.montant });
    }
    for (const ff of facturesFrs.filter(f => !['BROUILLON'].includes(f.statut))) {
      const ecId = randomUUID();
      ecritures.push({ id: ecId, exerciceId, journalId: journal('AC').id, numero: nextEcritureNumero('AC', annee), dateEcriture: ff.dateFacture, libelle: `Facture fournisseur ${ff.numero}`, reference: ff.numero, createurId: comptable.id, validee: true, dateValidation: ff.dateFacture });
      mouvements.push({ id: randomUUID(), ecritureId: ecId, compteId: comptes.find(c => c.numero === '61')!.id, libelle: `Charge ${ff.numero}`, debit: ff.montantHT, credit: 0 });
      if (ff.montantTVA > 0) mouvements.push({ id: randomUUID(), ecritureId: ecId, compteId: comptes.find(c => c.numero === '445')!.id, libelle: `TVA récup. ${ff.numero}`, debit: ff.montantTVA, credit: 0 });
      mouvements.push({ id: randomUUID(), ecritureId: ecId, compteId: comptes.find(c => c.numero === '401')!.id, libelle: `Fournisseur ${ff.numero}`, debit: 0, credit: ff.montantTTC });
    }
    for (const pf of paiementsFrs) {
      const ecId = randomUUID();
      const journalCode = pf.caisseId ? 'CA' : 'BQ';
      ecritures.push({ id: ecId, exerciceId, journalId: journal(journalCode).id, numero: nextEcritureNumero(journalCode, annee), dateEcriture: pf.datePaiement, libelle: `Décaissement ${pf.numero}`, reference: pf.numero, createurId: comptable.id, validee: true, dateValidation: pf.datePaiement });
      mouvements.push({ id: randomUUID(), ecritureId: ecId, compteId: comptes.find(c => c.numero === '401')!.id, libelle: `Règlement fournisseur`, debit: pf.montant, credit: 0 });
      mouvements.push({ id: randomUUID(), ecritureId: ecId, compteId: comptes.find(c => c.numero === (pf.caisseId ? '571' : '512'))!.id, libelle: `Décaissement ${pf.numero}`, debit: 0, credit: pf.montant });
    }
    await chunkedCreateMany(prisma.ecritureComptable, ecritures);
    await chunkedCreateMany(prisma.mouvementComptable, mouvements);
    console.log(`   ✓ ${ecritures.length} écritures comptables, ${mouvements.length} mouvements`);

    // ------------------------------------------------------------------
    // Finance : dépenses, dotations, opérations financières, rapprochements
    // ------------------------------------------------------------------
    const depenses: any[] = [];
    const dossiersAvecDepense = dossiers.filter(() => Math.random() < 0.25);
    for (const d of dossiersAvecDepense) {
      const surCaisse = Math.random() < 0.6;
      depenses.push({
        id: randomUUID(), societeId: societe.id, numero: nextNumero('DEPENSE', 'DEP', annee), dossierId: d.id,
        dateDepense: addDays(d.dateCreation, rand(1, 20)), categorie: pick(CATEGORIES_DEPENSE),
        designation: pick(['Frais de carburant véhicule livraison', 'Frais de transport local', 'Frais divers dossier', 'Petites fournitures', 'Frais de restauration mission']),
        montant: randf(10000, 250000, 0), modePaiement: surCaisse ? 'ESPECES' : 'VIREMENT',
        caisseId: surCaisse ? pick([caisseSiege, caisseSPE]).id : null,
        compteBancaireId: !surCaisse ? pick([compteBancaireSGBCI, compteBancaireECO]).id : null,
        statut: 'VALIDE',
      });
    }
    await chunkedCreateMany(prisma.depense, depenses);

    const dotations = Array.from({ length: Math.max(4, Math.round(nb * 0.08)) }, () => ({
      id: randomUUID(), societeId: societe.id, numero: nextNumero('DOTATION', 'DOT', annee),
      dateDotation: dateInYear(annee), montant: randf(50000, 300000, 0), motif: 'Dotation pour frais de mission et dépenses courantes',
      agentId: pick(agentUsers).id, createurId: admin.id, statut: 'VALIDE',
    }));
    await chunkedCreateMany(prisma.dotation, dotations);

    const operations = Array.from({ length: Math.max(20, Math.round(nb * 0.8)) }, () => {
      const sens = pickWeighted<'ENTREE' | 'SORTIE'>([['ENTREE', 45], ['SORTIE', 55]]);
      const surCaisse = Math.random() < 0.4;
      return {
        id: randomUUID(), societeId: societe.id, numero: nextNumero('OPERATION_FINANCIERE', 'OPF', annee),
        type: sens === 'ENTREE' ? pick(['ENCAISSEMENT', 'DOTATION']) : pick(['DECAISSEMENT', 'RETRAIT']),
        sens, compteBancaireId: !surCaisse ? pick([compteBancaireSGBCI, compteBancaireECO]).id : null,
        caisseId: surCaisse ? pick([caisseSiege, caisseSPE]).id : null,
        compteTiersId: Math.random() < 0.15 ? pick(comptesTiers).id : null,
        agentId: Math.random() < 0.3 ? pick(agentUsers).id : null,
        dateOperation: dateInYear(annee), montant: randf(20000, 1500000, 0),
        libelle: sens === 'ENTREE' ? 'Encaissement recettes diverses' : 'Décaissement charges diverses',
        statut: 'VALIDE',
      };
    });
    await chunkedCreateMany(prisma.operationFinanciere, operations);

    const rapprochements = [compteBancaireSGBCI, compteBancaireECO].flatMap(cb =>
      Array.from({ length: 3 }, () => {
        const soldeComptable = randf(2000000, 18000000, 0);
        const ecart = randf(-15000, 15000, 0);
        return {
          id: randomUUID(), societeId: societe.id, compteBancaireId: cb.id,
          dateBancaire: dateInYear(annee), dateComptable: dateInYear(annee),
          soldeReleve: soldeComptable + ecart, soldeComptable, ecart, statut: pick(['EN_COURS', 'VALIDE']),
        };
      })
    );
    await chunkedCreateMany(prisma.rapprochement, rapprochements);
    console.log(`   ✓ ${depenses.length} dépenses, ${dotations.length} dotations, ${operations.length} opérations financières, ${rapprochements.length} rapprochements`);

    // ------------------------------------------------------------------
    // Cautions
    // ------------------------------------------------------------------
    const dossiersMaritimes = dossiers.filter(d => d.type === 'MARITIME' && d.numeroBL);
    const cautions = pickN(dossiersMaritimes, Math.round(dossiersMaritimes.length * 0.4)).map(d => {
      const statut = pickWeighted<any>([['NON_ACTIVE', 10], ['EN_ATTENTE', 25], ['COURRIER_DEPOSE', 25], ['PAYEE', 40]]);
      return {
        societeId: societe.id, dateCaution: addDays(d.dateCreation, rand(1, 10)), dossierId: d.id, numeroBL: d.numeroBL,
        clientId: d.clientId, quantite: rand(1, 3), montant: randf(400000, 2500000, 0), compagnie: d.compagnieMaritime,
        dateDepotCourrier: ['COURRIER_DEPOSE', 'PAYEE'].includes(statut) ? addDays(d.dateCreation, rand(5, 20)) : null,
        datePaiement: statut === 'PAYEE' ? addDays(d.dateCreation, rand(10, 30)) : null,
        statut,
      };
    });
    await chunkedCreateMany(prisma.caution, cautions);
    console.log(`   ✓ ${cautions.length} cautions`);

    // ------------------------------------------------------------------
    // Admissions temporaires
    // ------------------------------------------------------------------
    const nbAT = Math.max(3, Math.round(nb * 0.06));
    const ats: any[] = [];
    const alertes: any[] = [];
    const dossiersImport = dossiers.filter(d => d.nature === 'IMPORT');
    for (let i = 0; i < nbAT; i++) {
      const dateCreationAT = dateInYear(annee);
      const dureeInitiale = pick([180, 365]);
      const dateExpiration = addDays(dateCreationAT, dureeInitiale);
      const statut = estAnneeCourante
        ? pickWeighted<any>([['ACTIVE', 60], ['RENOUVELEE', 15], ['APUREE', 15], ['EN_CONTENTIEUX', 5], ['ANNULEE', 5]])
        : pickWeighted<any>([['APUREE', 55], ['EXPIREE', 20], ['RENOUVELEE', 20], ['ANNULEE', 5]]);
      const at = {
        id: randomUUID(), societeId: societe.id, numero: nextNumero('AT', 'AT', annee),
        clientId: pick(clients).id, declarant: 'GBTRANS SARL', nature: 'Matériel professionnel en admission temporaire',
        dateCreation: dateCreationAT, dateDeclaration: dateCreationAT, dateExpiration, dureeInitiale, alerteJours: 90,
        typeGarantie: pick(['Caution bancaire', 'Consignation', 'Caution mixte']), montantCaution: randf(1000000, 8000000, 0),
        banqueCaution: pick(['SGBCI', 'ECOBANK COTE D\'IVOIRE', 'NSIA BANQUE CI']), referenceCaution: `CAUT-${rand(10000, 99999)}`,
        designation: pick(['Engins de chantier BTP', 'Matériel de forage', 'Equipements scéniques', 'Matériel médical de démonstration']),
        valeur: randf(5000000, 40000000, 0), quantite: rand(1, 5),
        regimeDouanier: 'Admission temporaire', bureauEntree: pick(BUREAUX_DOUANE), declarationEntree: `${rand(10000, 99999)} AT ${annee}`,
        dateApurement: statut === 'APUREE' ? addDays(dateExpiration, -rand(1, 30)) : null,
        montantApure: statut === 'APUREE' ? randf(1000000, 8000000, 0) : null,
        statut,
      };
      ats.push(at);
      alertes.push({ id: randomUUID(), admissionTemporaireId: at.id, type: 'EXPIRATION', dateAlerte: addDays(dateExpiration, -90), message: `L'admission temporaire ${at.numero} expire le ${dateExpiration.toLocaleDateString('fr-FR')}`, envoyee: !estAnneeCourante });
    }
    await chunkedCreateMany(prisma.admissionTemporaire, ats);
    await chunkedCreateMany(prisma.alerteAT, alertes);

    if (ats.length && dossiersImport.length) {
      const dossiersALinker = pickN(dossiersImport, Math.min(ats.length, dossiersImport.length));
      await Promise.all(dossiersALinker.map((d, idx) => prisma.dossier.update({ where: { id: d.id }, data: { admissionTemporaireId: ats[idx % ats.length].id } })));
    }
    console.log(`   ✓ ${ats.length} admissions temporaires, ${alertes.length} alertes AT`);

    // ------------------------------------------------------------------
    // Documents (GED)
    // ------------------------------------------------------------------
    const documents: any[] = [];
    for (const d of dossiers.filter(() => Math.random() < 0.65)) {
      const nbDocs = rand(1, 3);
      for (let k = 0; k < nbDocs; k++) {
        const categorie = pick(MODULES_DOCUMENT);
        documents.push({
          id: randomUUID(), societeId: societe.id, nom: `${categorie}_${d.numero.replace(/\//g, '-')}_${k + 1}.pdf`,
          nomOriginal: `${categorie}_${d.numero.replace(/\//g, '-')}_${k + 1}.pdf`, chemin: `/uploads/demo/${annee}/${d.id}/${categorie.toLowerCase()}-${k + 1}.pdf`,
          taille: rand(50000, 2500000), typeMime: 'application/pdf', extension: 'pdf', categorie: categorie as any,
          dossierId: d.id, clientId: d.clientId, createdAt: addDays(d.dateCreation, rand(0, 15)),
        });
      }
    }
    await chunkedCreateMany(prisma.document, documents);
    console.log(`   ✓ ${documents.length} documents`);

    // ------------------------------------------------------------------
    // Courriers
    // ------------------------------------------------------------------
    const courriers: any[] = [];
    const courriersDossiers: any[] = [];
    const nbCourriers = Math.max(10, Math.round(nb * 0.5));
    for (let i = 0; i < nbCourriers; i++) {
      const type = pickWeighted<'ENTRANT' | 'SORTANT' | 'INTERNE'>([['ENTRANT', 35], ['SORTANT', 45], ['INTERNE', 20]]);
      const module = type === 'ENTRANT' ? 'COURRIER_ENTRANT' : 'COURRIER_SORTANT';
      const prefixe = type === 'ENTRANT' ? 'CE' : 'CS';
      const dateCreationCourrier = dateInYear(annee);
      const d = Math.random() < 0.7 ? pick(dossiers) : null;
      const courrier = {
        id: randomUUID(), numero: nextNumero(module, prefixe, annee), type, dateCreation: dateCreationCourrier,
        dateEnvoi: type !== 'ENTRANT' ? addDays(dateCreationCourrier, rand(0, 2)) : null,
        dateReception: type === 'ENTRANT' ? dateCreationCourrier : null,
        objet: d ? `Correspondance relative au dossier ${d.numero}` : pick(['Note de service', 'Circulaire interne', 'Demande de renseignements']),
        expediteur: type === 'ENTRANT' ? pick(fournisseurs).raisonSociale : 'GBTRANS SARL',
        destinataire: type !== 'ENTRANT' ? (d ? clients.find(c => c.id === d.clientId)?.raisonSociale : pick(clients).raisonSociale) : 'GBTRANS SARL',
        priorite: pickWeighted<any>([['BASSE', 15], ['NORMALE', 55], ['HAUTE', 25], ['URGENTE', 5]]),
        statut: pickWeighted<any>([['BROUILLON', 10], ['ENVOYE', 25], ['RECU', 20], ['TRAITE', 35], ['ARCHIVE', 10]]),
        createurId: pick(createurUsers).id, accuseReception: Math.random() < 0.5,
      };
      courriers.push(courrier);
      if (d) courriersDossiers.push({ id: randomUUID(), courrierId: courrier.id, dossierId: d.id });
    }
    await chunkedCreateMany(prisma.courrier, courriers);
    await chunkedCreateMany(prisma.courrierDossier, courriersDossiers);
    console.log(`   ✓ ${courriers.length} courriers`);

    // ------------------------------------------------------------------
    // Notifications
    // ------------------------------------------------------------------
    const notifications = Array.from({ length: Math.max(15, Math.round(nb * 0.5)) }, () => {
      const type = pick(['INFO', 'ALERTE', 'RAPPEL', 'ECHEANCE', 'PAIEMENT', 'DOSSIER_STATUT', 'FACTURE', 'COURRIER'] as const);
      return {
        id: randomUUID(), utilisateurId: pick(createurUsers).id, type, titre: pick(['Nouveau dossier assigné', 'Facture à relancer', 'Echéance proche', 'Dossier mis à jour', 'Nouveau courrier reçu']),
        message: 'Notification générée automatiquement (donnée de test).', module: pick(['DOSSIERS', 'FACTURATION', 'AT', 'COURRIERS']),
        canal: 'APP' as const, lue: Math.random() < 0.6, createdAt: dateInYear(annee),
      };
    });
    await chunkedCreateMany(prisma.notification, notifications);
    console.log(`   ✓ ${notifications.length} notifications`);

    // ------------------------------------------------------------------
    // Transactions Mobile Money
    // ------------------------------------------------------------------
    const transactionsMM = Array.from({ length: Math.max(8, Math.round(nb * 0.2)) }, () => ({
      id: randomUUID(), operateur: pick(['ORANGE_MONEY', 'MTN_MONEY', 'WAVE', 'MOOV_MONEY'] as const),
      type: pick(['PAIEMENT', 'ENCAISSEMENT'] as const), montant: randf(15000, 500000, 0),
      telephone: `+225 0${pick([5, 7])} ${rand(10, 99)} ${rand(10, 99)} ${rand(10, 99)} ${rand(10, 99)}`,
      reference: `MM-${rand(100000, 999999)}`, statut: pickWeighted<any>([['CONFIRMEE', 80], ['EN_ATTENTE', 10], ['ECHOUEE', 10]]),
      dateTransaction: dateInYear(annee), clientId: pick(clients).id,
    }));
    await chunkedCreateMany(prisma.transactionMobileMoney, transactionsMM);
    console.log(`   ✓ ${transactionsMM.length} transactions mobile money`);
  }

  // --------------------------------------------------------------------
  // 5. Mise à jour des compteurs de numérotation (pour la continuité des futurs numéros réels)
  // --------------------------------------------------------------------
  console.log('\n🔢 Mise à jour des compteurs de numérotation...');
  for (const key of Object.keys(numerotationCompteurs)) {
    const [module, anneeStr] = key.split('-');
    const annee = Number(anneeStr);
    const prefixeMap: Record<string, string> = {
      DOSSIER: 'DOS', FACTURE: 'FAC', PROFORMA: 'PRO', OFFRE: 'OFF', PAIEMENT: 'PAI',
      COURRIER_ENTRANT: 'CE', COURRIER_SORTANT: 'CS', AT: 'AT', DEPENSE: 'DEP', DOTATION: 'DOT',
      OPERATION_FINANCIERE: 'OPF', FACTURE_FOURNISSEUR: 'FF', PAIEMENT_FOURNISSEUR: 'PF',
    };
    await prisma.numerotation.upsert({
      where: { societeId_module_annee: { societeId: societe.id, module, annee } },
      update: { compteur: numerotationCompteurs[key] },
      create: { societeId: societe.id, module, prefixe: prefixeMap[module] || module.slice(0, 3), compteur: numerotationCompteurs[key], longueur: 6, annuel: true, annee, format: '{PREFIX}/{ANNEE}/{COMPTEUR}' },
    });
  }

  console.log('\n✅ Données de test générées avec succès pour 2025 (50 dossiers) et 2026 (100 dossiers) !');
}

main()
  .catch((e) => {
    console.error('❌ Erreur lors de la génération des données de test:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'crypto';
import * as XLSX from 'xlsx';
import * as path from 'path';

const prisma = new PrismaClient();

const ANNEES_CIBLES = [2023, 2024, 2025, 2026];
const DONNEES_DIR = path.join(__dirname, '..', '..', 'DonneesTest');
const TODAY = new Date();

// ============================================================================
// HELPERS
// ============================================================================

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
function addDays(d: Date, days: number): Date {
  return new Date(d.getTime() + days * 86400000);
}
async function chunkedCreateMany<T>(model: any, data: T[], opts: { size?: number; skipDuplicates?: boolean } = {}) {
  const size = opts.size || 300;
  let count = 0;
  for (let i = 0; i < data.length; i += size) {
    const res = await model.createMany({ data: data.slice(i, i + size), skipDuplicates: opts.skipDuplicates });
    count += res.count;
  }
  return count;
}

/** Excel serial date -> JS Date. Returns null for missing/corrupt values. */
function excelDateToJs(serial: any): Date | null {
  if (serial == null || typeof serial !== 'number') return null;
  const utc_days = Math.floor(serial - 25569);
  const utc_value = utc_days * 86400;
  const d = new Date(utc_value * 1000);
  const y = d.getFullYear();
  if (y < 2015 || y > 2027) return null; // garde contre dates corrompues du fichier source
  return d;
}
/** Comme excelDateToJs mais garantit toujours une date valide (repli sur fallbackYear). */
function safeDate(serial: any, fallbackYear: number): Date {
  return excelDateToJs(serial) || new Date(fallbackYear, 0, 15);
}

function normName(s: any): string {
  return (s == null ? '' : String(s)).trim().replace(/\s+/g, ' ');
}
function normKey(s: any): string {
  return normName(s).toUpperCase();
}

/** Normalise une référence de dossier historique ("I-127/26" -> "I-127/2026"). */
function normalizeDossierRef(raw: any): { key: string; annee: number | null; prefixe: string } | null {
  const s = normName(raw);
  if (!s) return null;
  const m = /^([A-Z]+)-?(\d+)\s*\/\s*(\d{2}|\d{4})$/i.exec(s);
  if (!m) return { key: s.toUpperCase(), annee: null, prefixe: s[0]?.toUpperCase() || 'I' };
  const prefixe = m[1].toUpperCase();
  const numero = m[2];
  let annee = parseInt(m[3], 10);
  if (annee < 100) annee += 2000;
  return { key: `${prefixe}-${numero}/${annee}`, annee, prefixe };
}

function natureFromPrefixe(prefixe: string): 'IMPORT' | 'EXPORT' | 'TRANSIT' {
  if (prefixe === 'E') return 'EXPORT';
  if (prefixe === 'I') return 'IMPORT';
  return 'TRANSIT';
}

function truncate(s: any, max: number): string | null {
  const v = normName(s);
  if (!v) return null;
  return v.length > max ? v.slice(0, max) : v;
}

// ============================================================================
// LECTURE DES FICHIERS EXCEL
// ============================================================================

function readSheet(file: string): any[] {
  const wb = XLSX.readFile(path.join(DONNEES_DIR, file));
  const sheet = wb.Sheets[wb.SheetNames[0]];
  return XLSX.utils.sheet_to_json(sheet, { defval: null });
}

// ============================================================================
// DONNÉES DE RÉFÉRENCE POUR LE COMPLÉMENT SYNTHÉTIQUE
// ============================================================================

const RAISONS_SOCIALES_FOURNISSEURS: Record<string, string[]> = {
  TRANSITAIRE: ['TRANSIT EXPRESS CI SARL', 'RAPID TRANSIT SERVICES SA'],
  TRANSPORTEUR: ['TRANSPORTS RAPIDES DU GOLFE', 'CI LOGISTIQUE ROUTIERE SARL', 'TRANS-SAHEL CARGO SARL'],
  COMPAGNIE_MARITIME: ['MAERSK LINE CI', 'CMA CGM COTE D\'IVOIRE', 'MSC COTE D\'IVOIRE SA', 'PIL COTE D\'IVOIRE', 'OOCL', 'GRIMALDI'],
  ACCONIER: ['ACCONAGE SERVICES ABIDJAN SA', 'STE ACCONAGE DU PORT SA'],
  MAGASIN: ['MAGASIN GENERAL DU PORT SA', 'ENTREPOTS SOUS DOUANE CI'],
  BANQUE: ['ECOBANK COTE D\'IVOIRE', 'SGBCI', 'NSIA BANQUE CI', 'BICICI'],
  DOUANE: ['REGIE DES DOUANES DE COTE D\'IVOIRE'],
  ASSURANCE: ['ASSURANCES ATLANTIQUE CI', 'NSIA ASSURANCES', 'SAHAM ASSURANCE CI'],
  MANUTENTION: ['SOTRA MANUTENTION SA', 'SDV MANUTENTION CI'],
  PRESTATAIRE: ['CONSULTING DOUANE PLUS SARL', 'SERVICES PORTUAIRES INTEGRES SA'],
  AUTRE: ['DIVERS PRESTATAIRES CI SARL'],
};
const PRENOMS = ['Aya', 'Kouadio', 'Adjoua', 'Yao', 'Akissi', 'Kouassi', 'Affoué', 'Konan', 'Aminata', 'Sekou'];
const NOMS = ['Kouassi', 'Yao', 'Traoré', 'Diallo', 'Koné', 'Bamba', 'Ouattara', 'N\'Guessan', 'Kouamé', 'Fofana'];
const CATEGORIES_DEPENSE = ['TRANSPORT', 'MANUTENTION', 'DOUANE', 'CARBURANT', 'FRAIS_BUREAU', 'ENTRETIEN', 'DIVERS'];
const MODULES_DOCUMENT = ['BL', 'FACTURE_COMMERCIALE', 'PACKING_LIST', 'CERTIFICAT_ORIGINE', 'DECLARATION_DOUANE', 'BON_LIVRAISON', 'CONNAISSEMENT', 'ASSURANCE', 'AUTORISATION', 'CORRESPONDANCE'];

// ============================================================================
// MAIN
// ============================================================================

async function main() {
  console.log('🌱 Import des données réelles GBTRANS (2023-2026) + complément...');

  const societe = await prisma.societe.findUniqueOrThrow({ where: { code: 'GBTRANS' } });
  const agenceSiege = await prisma.agence.findFirstOrThrow({ where: { societeId: societe.id, code: 'SIEGE' } });

  // Garde-fou : ne pas ré-importer si déjà fait
  const marqueur = await prisma.dossier.findFirst({
    where: {
      societeId: societe.id,
      OR: [
        { numeroPhysique: { startsWith: 'I-' } },
        { numeroPhysique: { startsWith: 'E-' } },
        { numeroPhysique: { startsWith: 'T-' } },
      ],
    },
  });
  if (marqueur) {
    console.log('⏭️  Des dossiers réels (préfixe I-/E-/T-) existent déjà en base. Import déjà effectué, on arrête ici.');
    return;
  }

  const users = await prisma.utilisateur.findMany({ where: { societeId: societe.id } });
  const admin = users.find(u => u.email === 'admin@gbtrans.ci')!;
  const transitaire = users.find(u => u.email === 'transitaire@gbtrans.ci') || admin;
  const comptable = users.find(u => u.email === 'comptable@gbtrans.ci') || admin;
  const commercial = users.find(u => u.email === 'commercial@gbtrans.ci') || admin;
  const agentUsers = [transitaire, admin, commercial];
  const createurUsers = [transitaire, admin, commercial, comptable];

  // Exercice 2023 (manquant dans le seed de base)
  await prisma.exercice.upsert({
    where: { societeId_code: { societeId: societe.id, code: '2023' } },
    update: {},
    create: {
      societeId: societe.id, code: '2023', libelle: 'Exercice 2023',
      dateDebut: new Date('2023-01-01'), dateFin: new Date('2023-12-31'), actif: true,
    },
  });
  const exercices = await prisma.exercice.findMany({ where: { societeId: societe.id, code: { in: ANNEES_CIBLES.map(String) } } });
  const exerciceParAnnee: Record<number, string> = {};
  for (const ex of exercices) exerciceParAnnee[parseInt(ex.code, 10)] = ex.id;

  const comptes = await prisma.compteComptable.findMany({ where: { societeId: societe.id } });
  const compteId = (numero: string) => comptes.find(c => c.numero === numero)!.id;
  const journaux = await prisma.journalComptable.findMany({ where: { societeId: societe.id } });
  const journal = (code: string) => journaux.find(j => j.code === code)!;

  console.log('📦 Infrastructure (comptes bancaires, caisses, fournisseurs)...');
  let compteBancaireSGBCI = await prisma.compteBancaire.findFirst({ where: { societeId: societe.id, code: 'BQ-SGBCI' } });
  let compteBancaireECO = await prisma.compteBancaire.findFirst({ where: { societeId: societe.id, code: 'BQ-ECO' } });
  if (!compteBancaireSGBCI) {
    compteBancaireSGBCI = await prisma.compteBancaire.create({ data: { societeId: societe.id, code: 'BQ-SGBCI', libelle: 'Compte principal SGBCI', banque: 'SGBCI', rib: 'CI93CI0080123456789012345678', devise: 'XOF', solde: 15000000, compteComptable: '512' } });
  }
  if (!compteBancaireECO) {
    compteBancaireECO = await prisma.compteBancaire.create({ data: { societeId: societe.id, code: 'BQ-ECO', libelle: 'Compte secondaire Ecobank', banque: 'ECOBANK COTE D\'IVOIRE', rib: 'CI93CI0090987654321098765432', devise: 'XOF', solde: 6500000, compteComptable: '512' } });
  }
  let caisseSiege = await prisma.caisse.findFirst({ where: { societeId: societe.id, code: 'CA-SIEGE' } });
  if (!caisseSiege) {
    caisseSiege = await prisma.caisse.create({ data: { societeId: societe.id, code: 'CA-SIEGE', libelle: 'Caisse Siège Abidjan', devise: 'XOF', solde: 850000, plafond: 2000000, compteComptable: '571' } });
  }

  let fournisseurs = await prisma.fournisseur.findMany({ where: { societeId: societe.id } });
  if (fournisseurs.length === 0) {
    let fCode = 1;
    const toCreate: any[] = [];
    for (const [type, noms] of Object.entries(RAISONS_SOCIALES_FOURNISSEURS)) {
      for (const raisonSociale of noms) {
        toCreate.push({
          id: randomUUID(), societeId: societe.id, code: `FOU${pad(fCode++, 4)}`, type: type as any, raisonSociale,
          ncc: `${rand(1000000, 9999999)}A`, ville: 'Abidjan',
          telephone: `+225 27 ${rand(20, 25)} ${rand(10, 99)} ${rand(10, 99)} ${rand(10, 99)}`,
          email: `contact@${raisonSociale.toLowerCase().replace(/[^a-z]/g, '').slice(0, 15)}.ci`,
          conditionPaiement: pick([0, 15, 30]), actif: true,
        });
      }
    }
    await prisma.fournisseur.createMany({ data: toCreate });
    fournisseurs = await prisma.fournisseur.findMany({ where: { societeId: societe.id } });
  }
  const fournisseursTransport = fournisseurs.filter(f => ['TRANSPORTEUR', 'COMPAGNIE_MARITIME', 'ACCONIER', 'MANUTENTION', 'MAGASIN'].includes(f.type));

  // ==========================================================================
  // 1. LECTURE DES FICHIERS EXCEL
  // ==========================================================================
  console.log('📄 Lecture des fichiers Excel...');
  const clientListRows = readSheet('Liste Compte Client.xlsx');
  const dossierRows = readSheet('Liste des Dossiers.xlsx');
  const atRows = readSheet('Table AT.xlsx');
  const cautionRows = readSheet('Table Caution.xlsx');
  const factureRows = readSheet('Table Facture.xlsx').filter(r => r['N° Facture'] && r['Action'] !== 'Somme');
  const proformaRows = readSheet('Table Proforma.xlsx').filter(r => r['N° Proforma']);
  console.log(`   Clients:${clientListRows.length} Dossiers:${dossierRows.length} AT:${atRows.length} Cautions:${cautionRows.length} Factures:${factureRows.length} Proformas:${proformaRows.length}`);

  // ==========================================================================
  // 2. CLIENTS (union de tous les noms rencontrés)
  // ==========================================================================
  console.log('👥 Construction du référentiel clients...');
  const soldeParNom = new Map<string, number>();
  for (const r of clientListRows) {
    const k = normKey(r['Nom']);
    if (k) soldeParNom.set(k, Number(r['Solde']) || 0);
  }
  const displayNameParKey = new Map<string, string>();
  const allNameSources = [
    ...clientListRows.map(r => r['Nom']),
    ...dossierRows.map(r => r['Client']),
    ...factureRows.map(r => r['Client']),
    ...proformaRows.map(r => r['Client']),
    ...atRows.map(r => r['Client']),
    ...cautionRows.map(r => r['Client']),
  ];
  for (const raw of allNameSources) {
    const disp = normName(raw);
    const k = normKey(raw);
    if (!k) continue;
    if (!displayNameParKey.has(k)) displayNameParKey.set(k, disp);
  }
  const uniqueKeys = [...displayNameParKey.keys()].sort();

  const existingClients = await prisma.client.findMany({ where: { societeId: societe.id } });
  const clientByKey = new Map<string, { id: string }>();
  for (const c of existingClients) clientByKey.set(normKey(c.raisonSociale), { id: c.id });

  const clientsToCreate: any[] = [];
  let clientCounter = existingClients.length;
  for (const k of uniqueKeys) {
    if (clientByKey.has(k)) continue;
    clientCounter++;
    const id = randomUUID();
    clientByKey.set(k, { id });
    clientsToCreate.push({
      id, societeId: societe.id, code: `CLI${pad(clientCounter, 4)}`,
      type: 'ENTREPRISE', raisonSociale: displayNameParKey.get(k)!.slice(0, 200),
      ville: 'Abidjan', pays: "Côte d'Ivoire",
      telephone: `+225 27 ${rand(20, 25)} ${rand(10, 99)} ${rand(10, 99)} ${rand(10, 99)}`,
      solde: soldeParNom.get(k) || 0, conditionPaiement: pick([0, 15, 30, 45]), actif: true,
    });
  }
  const nClientsCrees = await chunkedCreateMany(prisma.client, clientsToCreate);
  console.log(`   ✓ ${nClientsCrees} nouveaux clients créés (${clientByKey.size} au total)`);
  const clientDivers = clientByKey.get('') || clientByKey.values().next().value;

  function resolveClientId(rawName: any): string {
    const k = normKey(rawName);
    return (k && clientByKey.get(k)?.id) || clientDivers!.id;
  }

  // ==========================================================================
  // 3. DOSSIERS RÉELS (filtrés 2023-2026)
  // ==========================================================================
  console.log('📁 Import des dossiers réels...');
  const dossierByRef = new Map<string, { id: string; clientId: string; annee: number }>();
  const dossiersToCreate: any[] = [];
  const compteurNumero: Record<string, number> = {};
  const nextNumero = (module: string, prefixe: string, annee: number) => {
    const key = `${module}-${annee}`;
    compteurNumero[key] = (compteurNumero[key] || 0) + 1;
    return `${prefixe}/${annee}/${pad(compteurNumero[key], 6)}`;
  };

  const natureMap: Record<string, any> = { IMPORT: 'IMPORT', EXPORT: 'EXPORT', TRANSPORT: 'TRANSIT' };
  const typeMap: Record<string, any> = { MARITIME: 'MARITIME', AERIEN: 'AERIEN', TERRESTE: 'TERRESTRE', TERRESTRE: 'TERRESTRE' };
  const statutMap: Record<string, any> = { '1.Nouveau': 'NOUVEAU', '2.En cours': 'EN_COURS', 'Annulé': 'ANNULE', '4.Archivé': 'ARCHIVE' };

  for (const r of dossierRows) {
    const ref = normalizeDossierRef(r['N°Dossier']);
    if (!ref) continue;
    const dateOuverture = excelDateToJs(r['Date Ouverture']);
    const annee = dateOuverture ? dateOuverture.getFullYear() : ref.annee;
    if (!annee || !ANNEES_CIBLES.includes(annee)) continue;
    if (dossierByRef.has(ref.key)) continue; // doublon dans le fichier source

    const id = randomUUID();
    const clientId = resolveClientId(r['Client']);
    const nature = natureMap[r['Nature du Dossier']] || natureFromPrefixe(ref.prefixe);
    const type = typeMap[r['Mode']] || 'MARITIME';
    const statut = r['Archivé'] === 1 ? 'ARCHIVE' : (statutMap[r['Situation du Dossier']] || 'NOUVEAU');
    const dateCreation = dateOuverture || new Date(annee, 0, 15);

    dossiersToCreate.push({
      id, societeId: societe.id, agenceId: agenceSiege.id,
      createurId: pick(createurUsers).id, agentId: pick(agentUsers).id,
      numero: nextNumero('DOSSIER', 'DOS', annee), numeroPhysique: ref.key, annee,
      nature, type, statut, clientId,
      numeroBL: truncate(r['BL / LTA'], 100), navire: truncate(r['Navire /Vol'], 200),
      designation: truncate(r['Marchandise'] || r['Libellé Dossier'], 65000),
      poidsBrut: r['Poids Brut'] || null, poidsNet: r['Poids Net'] || null,
      nombreColis: r['Nbre Colis'] || null, valeurCAF: r['CAF'] || null,
      numeroDeclaration: truncate(r['N°Declaration'], 100),
      dateDeclaration: excelDateToJs(r['Date Declation']),
      lieuLivraison: truncate(r["Lieu d'entreposage"], 500),
      observations: truncate(r['Observation'], 65000),
      dateCreation,
      dateCloture: ['CLOTURE', 'ARCHIVE'].includes(statut) ? addDays(dateCreation, rand(10, 60)) : null,
      dateAnnulation: statut === 'ANNULE' ? addDays(dateCreation, rand(2, 20)) : null,
    });
    dossierByRef.set(ref.key, { id, clientId, annee });
  }

  /** Crée (si besoin) un dossier "squelette" pour une référence orpheline (Caution/AT). */
  function ensureDossierStub(rawRef: any, rawClient: any, fallbackAnnee: number): { id: string; clientId: string; annee: number } | null {
    const ref = normalizeDossierRef(rawRef);
    if (!ref) return null;
    const existing = dossierByRef.get(ref.key);
    if (existing) return existing;
    const annee = (ref.annee && ANNEES_CIBLES.includes(ref.annee)) ? ref.annee : fallbackAnnee;
    if (!ANNEES_CIBLES.includes(annee)) return null;
    const id = randomUUID();
    const clientId = resolveClientId(rawClient);
    const dateCreation = new Date(annee, 0, 15);
    dossiersToCreate.push({
      id, societeId: societe.id, agenceId: agenceSiege.id,
      createurId: pick(createurUsers).id, agentId: pick(agentUsers).id,
      numero: nextNumero('DOSSIER', 'DOS', annee), numeroPhysique: ref.key, annee,
      nature: natureFromPrefixe(ref.prefixe), type: 'MARITIME', statut: 'CLOTURE', clientId,
      designation: 'Dossier importé (référence historique reconstituée)',
      dateCreation, dateCloture: addDays(dateCreation, 30),
    });
    const entry = { id, clientId, annee };
    dossierByRef.set(ref.key, entry);
    return entry;
  }

  // Pré-scan Cautions/AT/Proformas/Factures pour créer TOUS les dossiers orphelins
  // AVANT l'unique insertion groupée des dossiers (évite les FK vers des dossiers non encore insérés).
  for (const r of cautionRows) {
    const d = excelDateToJs(r['Date caution']);
    const annee = d ? d.getFullYear() : null;
    if (annee && !ANNEES_CIBLES.includes(annee)) continue;
    ensureDossierStub(r['N°Dossier'], r['Client'], annee || 2026);
  }
  for (const r of atRows) {
    const d = excelDateToJs(r['Date Création']);
    const annee = d ? d.getFullYear() : null;
    if (annee && !ANNEES_CIBLES.includes(annee)) continue;
    ensureDossierStub(r['N° Dossier'], r['Client'], annee || 2026);
  }
  for (const r of proformaRows) {
    const d = excelDateToJs(r['Date']);
    const annee = d ? d.getFullYear() : null;
    if (!annee || !ANNEES_CIBLES.includes(annee)) continue;
    ensureDossierStub(r['Dossier'], r['Client'], annee);
  }
  for (const r of factureRows) {
    const d = excelDateToJs(r['Date Facture']);
    const annee = d ? d.getFullYear() : null;
    if (!annee || !ANNEES_CIBLES.includes(annee)) continue;
    if (r['N° Dossier']) ensureDossierStub(r['N° Dossier'], r['Client'], annee);
  }

  const nDossiersCrees = await chunkedCreateMany(prisma.dossier, dossiersToCreate, { skipDuplicates: true });
  console.log(`   ✓ ${nDossiersCrees} dossiers créés (dont squelettes pour références orphelines)`);

  // ==========================================================================
  // 4. PROFORMAS RÉELLES
  // ==========================================================================
  console.log('📝 Import des proformas réelles...');
  const proformasToCreate: any[] = [];
  const lignesProformaToCreate: any[] = [];
  const proformaIdParNumero = new Map<string, string>();
  const numeroProformaVus = new Set<string>();
  for (const r of proformaRows) {
    const d = excelDateToJs(r['Date']);
    const annee = d ? d.getFullYear() : null;
    if (!annee || !ANNEES_CIBLES.includes(annee)) continue;
    const numero = normName(r['N° Proforma']);
    if (!numero || numeroProformaVus.has(numero)) continue;
    numeroProformaVus.add(numero);

    const dossierInfo = ensureDossierStub(r['Dossier'], r['Client'], annee);
    const clientId = dossierInfo?.clientId || resolveClientId(r['Client']);
    const id = randomUUID();
    const dateProforma = d || new Date(annee, 0, 15);
    const montantHT = Number(r['Total HT']) || 0;
    const montantTVA = Number(r['Total TVA']) || 0;
    const montantTTC = Number(r['Total TTC']) || (montantHT + montantTVA);
    const statut = r['Facturé'] === 1 ? 'TRANSFORMEE' : (r['Validé'] === 1 ? 'VALIDEE' : 'BROUILLON');

    proformasToCreate.push({
      id, numero, dossierId: dossierInfo?.id || null, clientId,
      dateProforma, dateValidite: addDays(dateProforma, 30),
      objet: truncate(r['Libelle'], 500), statut,
      valeurCAF: r['Valeur CAF'] || null,
      montantHT, montantTVA, montantTTC,
    });
    lignesProformaToCreate.push({
      id: randomUUID(), proformaId: id, ordre: 1, categorie: 'TRANSIT',
      designation: truncate(r['Libelle'], 500) || 'Prestations de transit', quantite: 1, unite: 'FORFAIT',
      prixUnitaire: montantHT, montantHT, tauxTVA: montantTVA > 0 ? 18 : 0, montantTVA, estTVA: montantTVA > 0,
    });
    proformaIdParNumero.set(numero, id);
  }
  await chunkedCreateMany(prisma.proforma, proformasToCreate);
  await chunkedCreateMany(prisma.ligneProforma, lignesProformaToCreate);
  console.log(`   ✓ ${proformasToCreate.length} proformas, ${lignesProformaToCreate.length} lignes`);

  // ==========================================================================
  // 5. FACTURES RÉELLES + PAIEMENTS
  // ==========================================================================
  console.log('🧾 Import des factures réelles...');
  const facturesToCreate: any[] = [];
  const lignesFactureToCreate: any[] = [];
  const paiementsToCreate: any[] = [];
  const paiementFacturesToCreate: any[] = [];
  const proformaAFactureId: { proformaId: string; factureId: string }[] = [];
  const numeroFactureVus = new Set<string>();
  let paiementCounter = 0;
  const nextPaiementNumero = (annee: number) => { paiementCounter++; return `PAI/${annee}/${pad(paiementCounter, 6)}`; };

  for (const r of factureRows) {
    const d = excelDateToJs(r['Date Facture']);
    const annee = d ? d.getFullYear() : null;
    if (!annee || !ANNEES_CIBLES.includes(annee)) continue;
    const numero = normName(r['N° Facture']);
    if (!numero || numeroFactureVus.has(numero)) continue;
    numeroFactureVus.add(numero);

    const dossierInfo = r['N° Dossier'] ? ensureDossierStub(r['N° Dossier'], r['Client'], annee) : null;
    const clientId = dossierInfo?.clientId || resolveClientId(r['Client']);
    const id = randomUUID();
    const dateFacture = d || new Date(annee, 0, 15);
    const montantHT = Number(r['Total HT']) || 0;
    const montantTVA = Number(r['Total TVA  Client']) || 0;
    const montantTTC = Number(r['Total TTC Client']) || (montantHT + montantTVA);
    const montantPaye = Number(r['Montant Paye']) || 0;
    const resteAPayer = Number(r['Montant restant']) || Math.max(0, montantTTC - montantPaye);
    const valide = r['Valider'] === '1' || r['Valider'] === 1;
    let statut: any;
    if (!valide) statut = 'BROUILLON';
    else if (resteAPayer <= 0 && montantPaye > 0) statut = 'PAYEE';
    else if (montantPaye > 0) statut = 'PARTIELLEMENT_PAYEE';
    else statut = 'VALIDEE';

    facturesToCreate.push({
      id, societeId: societe.id, numero, type: 'FACTURE', dossierId: dossierInfo?.id || null, clientId,
      createurId: comptable.id, dateFacture, dateEcheance: addDays(dateFacture, 30),
      objet: truncate(r['Libelle'], 500), statut,
      montantHT, montantTVA, montantTTC, montantPaye, resteAPayer,
      acompte: Number(r['Acompte']) || 0,
      montantPrestation: r['Montant Prestation'] != null ? Number(r['Montant Prestation']) : null,
      tvaPrestation: r['TVA Prestation'] != null ? Number(r['TVA Prestation']) : null,
    });
    lignesFactureToCreate.push({
      id: randomUUID(), factureId: id, ordre: 1, categorie: 'TRANSIT', compteComptable: '706',
      designation: truncate(r['Libelle'], 500) || 'Prestations de transit et dédouanement',
      estTVA: montantTVA > 0, quantite: 1, unite: 'FORFAIT',
      prixUnitaire: montantHT, montantHT, tauxTVA: montantTVA > 0 ? 18 : 0, montantTVA,
    });

    const numeroProformaRef = normName(r['N° Proforma']);
    if (numeroProformaRef && proformaIdParNumero.has(numeroProformaRef)) {
      proformaAFactureId.push({ proformaId: proformaIdParNumero.get(numeroProformaRef)!, factureId: id });
    }

    if (montantPaye > 0) {
      const surCaisse = Math.random() < 0.25;
      const paiementId = randomUUID();
      paiementsToCreate.push({
        id: paiementId, numero: nextPaiementNumero(annee), clientId,
        datePaiement: addDays(dateFacture, rand(1, 25)), montant: montantPaye,
        modePaiement: pickWeighted<any>([['VIREMENT', 40], ['CHEQUE', 25], ['ESPECES', 15], ['MOBILE_MONEY', 10], ['ORANGE_MONEY', 5], ['WAVE', 5]]),
        reference: `REF-${numero}`, statut: 'VALIDE',
        caisseId: surCaisse ? caisseSiege!.id : null,
        compteBancaireId: !surCaisse ? pick([compteBancaireSGBCI!, compteBancaireECO!]).id : null,
        createurId: comptable.id,
      });
      paiementFacturesToCreate.push({ id: randomUUID(), paiementId, factureId: id, montant: montantPaye });
    }
  }
  await chunkedCreateMany(prisma.facture, facturesToCreate);
  await chunkedCreateMany(prisma.ligneFacture, lignesFactureToCreate);
  await chunkedCreateMany(prisma.paiement, paiementsToCreate);
  await chunkedCreateMany(prisma.paiementFacture, paiementFacturesToCreate);
  for (const link of proformaAFactureId) {
    await prisma.proforma.update({ where: { id: link.proformaId }, data: { factureId: link.factureId } }).catch(() => {});
  }
  console.log(`   ✓ ${facturesToCreate.length} factures, ${paiementsToCreate.length} paiements, ${proformaAFactureId.length} liens proforma→facture`);

  // ==========================================================================
  // 6. ADMISSIONS TEMPORAIRES RÉELLES
  // ==========================================================================
  console.log('🛃 Import des admissions temporaires réelles...');
  const atsToCreate: any[] = [];
  const alertesToCreate: any[] = [];
  const dossierUpdateAT: { dossierId: string; atId: string }[] = [];
  let atCounter = 0;
  for (const r of atRows) {
    const dCreation = excelDateToJs(r['Date Création']);
    const annee = dCreation ? dCreation.getFullYear() : null;
    if (!annee || !ANNEES_CIBLES.includes(annee)) continue;
    const dossierInfo = ensureDossierStub(r['N° Dossier'], r['Client'], annee);
    const clientId = dossierInfo?.clientId || resolveClientId(r['Client']);
    const dateDeclaration = excelDateToJs(r['Date déclaration']) || dCreation;
    const dateExpiration = excelDateToJs(r['Date Échéance']) || addDays(dCreation, 730);
    const dureeInitiale = Math.max(1, Math.round((dateExpiration.getTime() - (dateDeclaration || dCreation).getTime()) / 86400000));
    const statut = dateExpiration < TODAY ? 'EXPIREE' : 'ACTIVE';
    atCounter++;
    const id = randomUUID();
    atsToCreate.push({
      id, societeId: societe.id, numero: `AT/${annee}/${pad(atCounter, 4)}`, clientId,
      declarant: truncate(r['Declarant'], 200), nature: truncate(r['Nature'], 200),
      dateCreation: dCreation, dateDeclaration, dateExpiration, dureeInitiale,
      alerteJours: Number(r['Temps Alerte']) || 90,
      montantCaution: r['Montant Garantie'] || null,
      designation: truncate(r['Designation'], 500) || 'Marchandise en admission temporaire',
      regimeDouanier: 'Admission temporaire', bureauEntree: truncate(r['Bureau'], 200),
      declarationEntree: truncate(r['N° déclaration'], 100), statut,
    });
    alertesToCreate.push({ id: randomUUID(), admissionTemporaireId: id, type: 'EXPIRATION', dateAlerte: addDays(dateExpiration, -90), message: `L'admission temporaire expire le ${dateExpiration.toLocaleDateString('fr-FR')}`, envoyee: statut === 'EXPIREE' });
    if (dossierInfo) dossierUpdateAT.push({ dossierId: dossierInfo.id, atId: id });
  }
  await chunkedCreateMany(prisma.admissionTemporaire, atsToCreate);
  await chunkedCreateMany(prisma.alerteAT, alertesToCreate);
  for (const { dossierId, atId } of dossierUpdateAT) {
    await prisma.dossier.update({ where: { id: dossierId }, data: { admissionTemporaireId: atId } }).catch(() => {});
  }
  console.log(`   ✓ ${atsToCreate.length} admissions temporaires`);

  // ==========================================================================
  // 7. CAUTIONS RÉELLES
  // ==========================================================================
  console.log('🔒 Import des cautions réelles...');
  const cautionsToCreate: any[] = [];
  const statutCautionMap: Record<string, any> = { 'En attente': 'EN_ATTENTE', 'Non activé': 'NON_ACTIVE' };
  for (const r of cautionRows) {
    const d = excelDateToJs(r['Date caution']);
    const annee = d ? d.getFullYear() : null;
    if (!annee || !ANNEES_CIBLES.includes(annee)) continue;
    const dossierInfo = ensureDossierStub(r['N°Dossier'], r['Client'], annee);
    const clientId = dossierInfo?.clientId || (r['Client'] ? resolveClientId(r['Client']) : null);
    const datePaiement = excelDateToJs(r['Date Paiement']);
    cautionsToCreate.push({
      id: randomUUID(), societeId: societe.id, dateCaution: d, dossierId: dossierInfo?.id || null,
      numeroBL: truncate(r['N° BL'], 100), clientId, quantite: Number(r['Qte']) || 1,
      montant: Number(r['Montant Caution']) || 0, compagnie: truncate(r['Compagnie'], 100),
      dateDepotCourrier: excelDateToJs(r['Date dépôt Courrier']), datePaiement,
      statut: datePaiement ? 'PAYEE' : (statutCautionMap[r['État']] || 'EN_ATTENTE'),
      observations: truncate(r['Observation'], 65000),
    });
  }
  await chunkedCreateMany(prisma.caution, cautionsToCreate);
  console.log(`   ✓ ${cautionsToCreate.length} cautions`);

  // ==========================================================================
  // 8. COMPLÉMENT SYNTHÉTIQUE (autres modules), ancré sur les VRAIS dossiers
  // ==========================================================================
  console.log('🧩 Génération du complément synthétique (autres modules)...');
  const dossiersReels = await prisma.dossier.findMany({ where: { societeId: societe.id }, select: { id: true, annee: true, clientId: true, dateCreation: true, numero: true, statut: true } });
  const parAnnee = (annee: number) => dossiersReels.filter(d => d.annee === annee);

  // --- Dépenses ---
  const depensesToCreate: any[] = [];
  let depCounter = 0;
  for (const d of dossiersReels.filter(() => Math.random() < 0.22)) {
    depCounter++;
    const surCaisse = Math.random() < 0.6;
    depensesToCreate.push({
      id: randomUUID(), societeId: societe.id, numero: `DEP/${d.annee}/${pad(depCounter, 6)}`, dossierId: d.id,
      dateDepense: addDays(d.dateCreation, rand(1, 20)), categorie: pick(CATEGORIES_DEPENSE),
      designation: pick(['Frais de carburant véhicule livraison', 'Frais de transport local', 'Frais divers dossier', 'Petites fournitures', 'Frais de restauration mission']),
      montant: randf(10000, 250000, 0), modePaiement: surCaisse ? 'ESPECES' : 'VIREMENT',
      caisseId: surCaisse ? caisseSiege!.id : null, compteBancaireId: !surCaisse ? pick([compteBancaireSGBCI!, compteBancaireECO!]).id : null,
      statut: 'VALIDE',
    });
  }
  await chunkedCreateMany(prisma.depense, depensesToCreate);

  // --- Dotations, Opérations financières, Rapprochements ---
  const dotationsToCreate: any[] = [];
  const operationsToCreate: any[] = [];
  const rapprochementsToCreate: any[] = [];
  let dotCounter = 0, opCounter = 0;
  for (const annee of ANNEES_CIBLES) {
    const nbDossiersAnnee = parAnnee(annee).length || 1;
    for (let i = 0; i < Math.max(4, Math.round(nbDossiersAnnee * 0.1)); i++) {
      dotCounter++;
      dotationsToCreate.push({
        id: randomUUID(), societeId: societe.id, numero: `DOT/${annee}/${pad(dotCounter, 6)}`,
        dateDotation: new Date(annee, rand(0, 11), rand(1, 28)), montant: randf(50000, 300000, 0),
        motif: 'Dotation pour frais de mission et dépenses courantes', agentId: pick(agentUsers).id, createurId: admin.id, statut: 'VALIDE',
      });
    }
    for (let i = 0; i < Math.max(15, Math.round(nbDossiersAnnee * 0.5)); i++) {
      opCounter++;
      const sens = pickWeighted<'ENTREE' | 'SORTIE'>([['ENTREE', 45], ['SORTIE', 55]]);
      const surCaisse = Math.random() < 0.4;
      operationsToCreate.push({
        id: randomUUID(), societeId: societe.id, numero: `OPF/${annee}/${pad(opCounter, 6)}`,
        type: sens === 'ENTREE' ? pick(['ENCAISSEMENT', 'DOTATION']) : pick(['DECAISSEMENT', 'RETRAIT']), sens,
        compteBancaireId: !surCaisse ? pick([compteBancaireSGBCI!, compteBancaireECO!]).id : null,
        caisseId: surCaisse ? caisseSiege!.id : null, agentId: Math.random() < 0.3 ? pick(agentUsers).id : null,
        dateOperation: new Date(annee, rand(0, 11), rand(1, 28)), montant: randf(20000, 1500000, 0),
        libelle: sens === 'ENTREE' ? 'Encaissement recettes diverses' : 'Décaissement charges diverses', statut: 'VALIDE',
      });
    }
    for (const cb of [compteBancaireSGBCI!, compteBancaireECO!]) {
      for (let i = 0; i < 2; i++) {
        const soldeComptable = randf(2000000, 18000000, 0);
        const ecart = randf(-15000, 15000, 0);
        rapprochementsToCreate.push({ id: randomUUID(), societeId: societe.id, compteBancaireId: cb.id, dateBancaire: new Date(annee, rand(0, 11), 28), dateComptable: new Date(annee, rand(0, 11), 28), soldeReleve: soldeComptable + ecart, soldeComptable, ecart, statut: pick(['EN_COURS', 'VALIDE']) });
      }
    }
  }
  await chunkedCreateMany(prisma.dotation, dotationsToCreate);
  await chunkedCreateMany(prisma.operationFinanciere, operationsToCreate);
  await chunkedCreateMany(prisma.rapprochement, rapprochementsToCreate);
  console.log(`   ✓ ${depensesToCreate.length} dépenses, ${dotationsToCreate.length} dotations, ${operationsToCreate.length} opérations financières, ${rapprochementsToCreate.length} rapprochements`);

  // --- Factures fournisseurs + paiements fournisseurs ---
  const facturesFrsToCreate: any[] = [];
  const lignesFactureFrsToCreate: any[] = [];
  const paiementsFrsToCreate: any[] = [];
  const paiementFactureFrsToCreate: any[] = [];
  let ffCounter = 0, pfCounter = 0;
  for (const d of dossiersReels.filter(() => Math.random() < 0.35)) {
    const fournisseur = pick(fournisseursTransport.length ? fournisseursTransport : fournisseurs);
    const dateFacture = addDays(d.dateCreation, rand(2, 12));
    ffCounter++;
    const statutFF: any = pickWeighted([['VALIDEE', 20], ['PARTIELLEMENT_PAYEE', 20], ['PAYEE', 45], ['EN_RETARD', 15]]);
    const id = randomUUID();
    let mHT = 0;
    const nbLignes = rand(1, 2);
    for (let l = 0; l < nbLignes; l++) {
      const pu = randf(30000, 600000, 0);
      mHT += pu;
      lignesFactureFrsToCreate.push({ id: randomUUID(), factureFournisseurId: id, ordre: l + 1, designation: pick(['Frais de transport', 'Frais de manutention', 'Frais d\'acconage', 'Frêt maritime', 'Frais de magasinage']), quantite: 1, prixUnitaire: pu, montantHT: pu, tauxTVA: 18, montantTVA: pu * 0.18 });
    }
    const mTVA = mHT * 0.18;
    const montantTTC = mHT + mTVA;
    let montantPaye = 0, resteAPayer = montantTTC;
    if (statutFF === 'PAYEE') { montantPaye = montantTTC; resteAPayer = 0; }
    else if (statutFF === 'PARTIELLEMENT_PAYEE') { montantPaye = Number((montantTTC * randf(0.3, 0.7, 2)).toFixed(0)); resteAPayer = montantTTC - montantPaye; }
    facturesFrsToCreate.push({ id, societeId: societe.id, numero: `FF/${d.annee}/${pad(ffCounter, 6)}`, fournisseurId: fournisseur.id, dossierId: d.id, createurId: comptable.id, dateFacture, dateEcheance: addDays(dateFacture, 30), reference: `${fournisseur.code}-${rand(1000, 9999)}`, objet: `Prestations sur dossier ${d.numero}`, statut: statutFF, montantHT: mHT, montantTVA: mTVA, montantTTC, montantPaye, resteAPayer });
    if (montantPaye > 0) {
      pfCounter++;
      const surCaisse = Math.random() < 0.3;
      const pfId = randomUUID();
      paiementsFrsToCreate.push({ id: pfId, societeId: societe.id, numero: `PF/${d.annee}/${pad(pfCounter, 6)}`, fournisseurId: fournisseur.id, datePaiement: addDays(dateFacture, rand(1, 25)), montant: montantPaye, modePaiement: pickWeighted<any>([['VIREMENT', 50], ['CHEQUE', 30], ['ESPECES', 20]]), reference: `REF-PF-${rand(10000, 99999)}`, statut: 'VALIDE', caisseId: surCaisse ? caisseSiege!.id : null, compteBancaireId: !surCaisse ? pick([compteBancaireSGBCI!, compteBancaireECO!]).id : null, createurId: comptable.id });
      paiementFactureFrsToCreate.push({ id: randomUUID(), paiementFournisseurId: pfId, factureFournisseurId: id, montant: montantPaye });
    }
  }
  await chunkedCreateMany(prisma.factureFournisseur, facturesFrsToCreate);
  await chunkedCreateMany(prisma.ligneFactureFournisseur, lignesFactureFrsToCreate);
  await chunkedCreateMany(prisma.paiementFournisseur, paiementsFrsToCreate);
  await chunkedCreateMany(prisma.paiementFactureFournisseur, paiementFactureFrsToCreate);
  console.log(`   ✓ ${facturesFrsToCreate.length} factures fournisseurs, ${paiementsFrsToCreate.length} paiements fournisseurs`);

  // --- Écritures comptables (ventes, achats, encaissements, décaissements) ---
  const ecrituresToCreate: any[] = [];
  const mouvementsToCreate: any[] = [];
  let ecCounter = 0;
  const nextEc = (code: string, annee: number) => { ecCounter++; return `${code}-${annee}-${pad(ecCounter, 6)}`; };
  const facturesValidees = await prisma.facture.findMany({ where: { societeId: societe.id, statut: { notIn: ['BROUILLON', 'ANNULEE'] } }, select: { id: true, numero: true, montantHT: true, montantTVA: true, montantTTC: true, dateFacture: true } });
  for (const f of facturesValidees) {
    const annee = f.dateFacture.getFullYear();
    const exerciceId = exerciceParAnnee[annee];
    if (!exerciceId) continue;
    const ecId = randomUUID();
    ecrituresToCreate.push({ id: ecId, exerciceId, journalId: journal('VE').id, numero: nextEc('VE', annee), dateEcriture: f.dateFacture, libelle: `Facturation ${f.numero}`, reference: f.numero, factureId: f.id, createurId: comptable.id, validee: true, dateValidation: f.dateFacture });
    mouvementsToCreate.push({ id: randomUUID(), ecritureId: ecId, compteId: compteId('411'), libelle: `Client ${f.numero}`, debit: f.montantTTC, credit: 0 });
    mouvementsToCreate.push({ id: randomUUID(), ecritureId: ecId, compteId: compteId('706'), libelle: `Prestations ${f.numero}`, debit: 0, credit: f.montantHT });
    if (Number(f.montantTVA) > 0) mouvementsToCreate.push({ id: randomUUID(), ecritureId: ecId, compteId: compteId('443'), libelle: `TVA ${f.numero}`, debit: 0, credit: f.montantTVA });
  }
  const paiementsRealises = await prisma.paiement.findMany({ where: { createurId: comptable.id }, select: { id: true, numero: true, montant: true, datePaiement: true, caisseId: true } });
  for (const p of paiementsRealises) {
    const annee = p.datePaiement.getFullYear();
    const exerciceId = exerciceParAnnee[annee];
    if (!exerciceId) continue;
    const ecId = randomUUID();
    const journalCode = p.caisseId ? 'CA' : 'BQ';
    ecrituresToCreate.push({ id: ecId, exerciceId, journalId: journal(journalCode).id, numero: nextEc(journalCode, annee), dateEcriture: p.datePaiement, libelle: `Encaissement ${p.numero}`, reference: p.numero, paiementId: p.id, createurId: comptable.id, validee: true, dateValidation: p.datePaiement });
    mouvementsToCreate.push({ id: randomUUID(), ecritureId: ecId, compteId: compteId(p.caisseId ? '571' : '512'), libelle: `Encaissement ${p.numero}`, debit: p.montant, credit: 0 });
    mouvementsToCreate.push({ id: randomUUID(), ecritureId: ecId, compteId: compteId('411'), libelle: 'Règlement client', debit: 0, credit: p.montant });
  }
  for (const ff of facturesFrsToCreate) {
    const annee = ff.dateFacture.getFullYear();
    const exerciceId = exerciceParAnnee[annee];
    if (!exerciceId) continue;
    const ecId = randomUUID();
    ecrituresToCreate.push({ id: ecId, exerciceId, journalId: journal('AC').id, numero: nextEc('AC', annee), dateEcriture: ff.dateFacture, libelle: `Facture fournisseur ${ff.numero}`, reference: ff.numero, createurId: comptable.id, validee: true, dateValidation: ff.dateFacture });
    mouvementsToCreate.push({ id: randomUUID(), ecritureId: ecId, compteId: compteId('61'), libelle: `Charge ${ff.numero}`, debit: ff.montantHT, credit: 0 });
    if (ff.montantTVA > 0) mouvementsToCreate.push({ id: randomUUID(), ecritureId: ecId, compteId: compteId('445'), libelle: `TVA récup. ${ff.numero}`, debit: ff.montantTVA, credit: 0 });
    mouvementsToCreate.push({ id: randomUUID(), ecritureId: ecId, compteId: compteId('401'), libelle: `Fournisseur ${ff.numero}`, debit: 0, credit: ff.montantTTC });
  }
  for (const pf of paiementsFrsToCreate) {
    const annee = pf.datePaiement.getFullYear();
    const exerciceId = exerciceParAnnee[annee];
    if (!exerciceId) continue;
    const ecId = randomUUID();
    const journalCode = pf.caisseId ? 'CA' : 'BQ';
    ecrituresToCreate.push({ id: ecId, exerciceId, journalId: journal(journalCode).id, numero: nextEc(journalCode, annee), dateEcriture: pf.datePaiement, libelle: `Décaissement ${pf.numero}`, reference: pf.numero, createurId: comptable.id, validee: true, dateValidation: pf.datePaiement });
    mouvementsToCreate.push({ id: randomUUID(), ecritureId: ecId, compteId: compteId('401'), libelle: 'Règlement fournisseur', debit: pf.montant, credit: 0 });
    mouvementsToCreate.push({ id: randomUUID(), ecritureId: ecId, compteId: compteId(pf.caisseId ? '571' : '512'), libelle: `Décaissement ${pf.numero}`, debit: 0, credit: pf.montant });
  }
  await chunkedCreateMany(prisma.ecritureComptable, ecrituresToCreate);
  await chunkedCreateMany(prisma.mouvementComptable, mouvementsToCreate);
  console.log(`   ✓ ${ecrituresToCreate.length} écritures comptables, ${mouvementsToCreate.length} mouvements`);

  // --- Courriers, Documents, Offres, Notifications, Mobile Money ---
  const courriersToCreate: any[] = [];
  const courriersDossiersToCreate: any[] = [];
  let ceCounter = 0, csCounter = 0;
  for (const d of dossiersReels.filter(() => Math.random() < 0.4)) {
    const type = pickWeighted<'ENTRANT' | 'SORTANT' | 'INTERNE'>([['ENTRANT', 35], ['SORTANT', 45], ['INTERNE', 20]]);
    const id = randomUUID();
    const dateC = addDays(d.dateCreation, rand(0, 15));
    let numero: string;
    if (type === 'ENTRANT') { ceCounter++; numero = `CE/${d.annee}/${pad(ceCounter, 6)}`; } else { csCounter++; numero = `CS/${d.annee}/${pad(csCounter, 6)}`; }
    courriersToCreate.push({
      id, numero, type, dateCreation: dateC,
      dateEnvoi: type !== 'ENTRANT' ? addDays(dateC, rand(0, 2)) : null, dateReception: type === 'ENTRANT' ? dateC : null,
      objet: `Correspondance relative au dossier ${d.numero}`, expediteur: type === 'ENTRANT' ? pick(fournisseurs).raisonSociale : 'GBTRANS SARL',
      destinataire: type !== 'ENTRANT' ? 'Client' : 'GBTRANS SARL',
      priorite: pickWeighted<any>([['BASSE', 15], ['NORMALE', 55], ['HAUTE', 25], ['URGENTE', 5]]),
      statut: pickWeighted<any>([['ENVOYE', 25], ['RECU', 20], ['TRAITE', 45], ['ARCHIVE', 10]]),
      createurId: pick(createurUsers).id, accuseReception: Math.random() < 0.5,
    });
    courriersDossiersToCreate.push({ id: randomUUID(), courrierId: id, dossierId: d.id });
  }
  await chunkedCreateMany(prisma.courrier, courriersToCreate);
  await chunkedCreateMany(prisma.courrierDossier, courriersDossiersToCreate);

  const documentsToCreate: any[] = [];
  for (const d of dossiersReels.filter(() => Math.random() < 0.5)) {
    const nbDocs = rand(1, 2);
    for (let k = 0; k < nbDocs; k++) {
      const categorie = pick(MODULES_DOCUMENT);
      documentsToCreate.push({ id: randomUUID(), societeId: societe.id, nom: `${categorie}_${d.numero.replace(/\//g, '-')}_${k + 1}.pdf`, nomOriginal: `${categorie}_${d.numero.replace(/\//g, '-')}_${k + 1}.pdf`, chemin: `/uploads/reel/${d.annee}/${d.id}/${categorie.toLowerCase()}-${k + 1}.pdf`, taille: rand(50000, 2500000), typeMime: 'application/pdf', extension: 'pdf', categorie: categorie as any, dossierId: d.id, clientId: d.clientId, createdAt: addDays(d.dateCreation, rand(0, 15)) });
    }
  }
  await chunkedCreateMany(prisma.document, documentsToCreate);

  const offresToCreate: any[] = [];
  const lignesOffreToCreate: any[] = [];
  let offCounter = 0;
  for (const d of dossiersReels.filter(() => Math.random() < 0.15)) {
    offCounter++;
    const id = randomUUID();
    const pu = randf(80000, 400000, 0);
    offresToCreate.push({ id, numero: `OFF/${d.annee}/${pad(offCounter, 6)}`, dossierId: d.id, clientId: d.clientId, dateOffre: addDays(d.dateCreation, -rand(0, 5)), dateValidite: addDays(d.dateCreation, 30), objet: 'Offre de services de transit et dédouanement', statut: pickWeighted<any>([['ENVOYEE', 25], ['ACCEPTEE', 40], ['REFUSEE', 15], ['EXPIREE', 20]]), montantHT: pu, montantTVA: pu * 0.18, montantTTC: pu * 1.18 });
    lignesOffreToCreate.push({ id: randomUUID(), offreId: id, ordre: 1, designation: 'Prestations de transit et dédouanement', quantite: 1, unite: 'FORFAIT', prixUnitaire: pu, montantHT: pu, tauxTVA: 18, montantTVA: pu * 0.18 });
  }
  await chunkedCreateMany(prisma.offreCommerciale, offresToCreate);
  await chunkedCreateMany(prisma.ligneOffre, lignesOffreToCreate);

  const notificationsToCreate: any[] = [];
  for (const annee of ANNEES_CIBLES) {
    const n = Math.max(10, Math.round(parAnnee(annee).length * 0.4));
    for (let i = 0; i < n; i++) {
      notificationsToCreate.push({ id: randomUUID(), utilisateurId: pick(createurUsers).id, type: pick(['INFO', 'ALERTE', 'RAPPEL', 'ECHEANCE', 'PAIEMENT', 'DOSSIER_STATUT', 'FACTURE', 'COURRIER'] as const), titre: pick(['Nouveau dossier assigné', 'Facture à relancer', 'Echéance proche', 'Dossier mis à jour', 'Nouveau courrier reçu']), message: 'Notification générée automatiquement.', module: pick(['DOSSIERS', 'FACTURATION', 'AT', 'COURRIERS']), canal: 'APP', lue: Math.random() < 0.6, createdAt: new Date(annee, rand(0, 11), rand(1, 28)) });
    }
  }
  await chunkedCreateMany(prisma.notification, notificationsToCreate);

  const transactionsMM: any[] = [];
  for (const annee of ANNEES_CIBLES) {
    const n = Math.max(5, Math.round(parAnnee(annee).length * 0.15));
    for (let i = 0; i < n; i++) {
      transactionsMM.push({ id: randomUUID(), operateur: pick(['ORANGE_MONEY', 'MTN_MONEY', 'WAVE', 'MOOV_MONEY'] as const), type: pick(['PAIEMENT', 'ENCAISSEMENT'] as const), montant: randf(15000, 500000, 0), telephone: `+225 0${pick([5, 7])} ${rand(10, 99)} ${rand(10, 99)} ${rand(10, 99)} ${rand(10, 99)}`, reference: `MM-${rand(100000, 999999)}`, statut: pickWeighted<any>([['CONFIRMEE', 80], ['EN_ATTENTE', 10], ['ECHOUEE', 10]]), dateTransaction: new Date(annee, rand(0, 11), rand(1, 28)), clientId: (pick(dossiersReels) || { clientId: clientDivers!.id }).clientId });
    }
  }
  await chunkedCreateMany(prisma.transactionMobileMoney, transactionsMM);
  console.log(`   ✓ ${courriersToCreate.length} courriers, ${documentsToCreate.length} documents, ${offresToCreate.length} offres, ${notificationsToCreate.length} notifications, ${transactionsMM.length} transactions mobile money`);

  // ==========================================================================
  // 9. Mise à jour des compteurs de numérotation
  // ==========================================================================
  console.log('🔢 Mise à jour des compteurs de numérotation...');
  const prefixeMap: Record<string, string> = { DOSSIER: 'DOS' };
  for (const key of Object.keys(compteurNumero)) {
    const [module, anneeStr] = key.split('-');
    const annee = Number(anneeStr);
    await prisma.numerotation.upsert({
      where: { societeId_module_annee: { societeId: societe.id, module, annee } },
      update: { compteur: compteurNumero[key] },
      create: { societeId: societe.id, module, prefixe: prefixeMap[module] || module.slice(0, 3), compteur: compteurNumero[key], longueur: 6, annuel: true, annee, format: '{PREFIX}/{ANNEE}/{COMPTEUR}' },
    });
  }

  console.log('\n✅ Import réel + complément terminé pour 2023-2026 !');
}

main()
  .catch((e) => {
    console.error('❌ Erreur lors de l\'import des données réelles:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

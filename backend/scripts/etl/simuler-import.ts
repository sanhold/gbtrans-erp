/**
 * ETL ancien logiciel -> GBTRANS ERP : SIMULATION (aucune écriture en base, aucun accès à Prisma).
 *
 * Lit les exports Excel, applique les règles de nettoyage décrites dans
 * docs/ETL-analyse-migration.md, et produit :
 *   - un résumé en console (lus / importables / rejetés par entité),
 *   - rapport.json : compteurs, contrôles, listes à rattacher manuellement,
 *   - rejets.csv   : une ligne par rejet / correction / alerte (ouvrable dans Excel).
 *
 * Usage (depuis backend/) :
 *   npx tsx scripts/etl/simuler-import.ts [dossier-excel]
 * Variables : ETL_DIR (dossier source), ETL_SORTIE (dossier de sortie, défaut logs/etl-simulation).
 */
import * as XLSX from 'xlsx';
import * as fs from 'fs';
import * as path from 'path';
import { allouerReglements } from './commun';

const DIR = process.argv[2] || process.env.ETL_DIR || 'C:\\Users\\SANOGO\\Desktop\\ETL';
const SORTIE = process.env.ETL_SORTIE || path.join(__dirname, '..', '..', 'logs', 'etl-simulation');

type Row = Record<string, any>;
type Gravite = 'REJET' | 'CORRECTION' | 'ALERTE' | 'MANUEL';
interface Ligne { entite: string; cle: string; gravite: Gravite; regle: string; detail: string }

const lignes: Ligne[] = [];
const stats: Record<string, { lus: number; importables: number }> = {};
const controles: { nom: string; attendu: string | number; obtenu: string | number; ok: boolean }[] = [];
const manuel: Record<string, unknown> = {};

function signaler(entite: string, cle: unknown, gravite: Gravite, regle: string, detail = '') {
  lignes.push({ entite, cle: String(cle ?? ''), gravite, regle, detail });
}
function bilan(entite: string, lus: number, importables: number) { stats[entite] = { lus, importables }; }
function controle(nom: string, attendu: number | string, obtenu: number | string, tolerance = 0) {
  const ok = typeof attendu === 'number' && typeof obtenu === 'number' ? Math.abs(attendu - obtenu) <= tolerance : attendu === obtenu;
  controles.push({ nom, attendu, obtenu, ok });
}

// ---------- utilitaires ----------
const str = (v: any): string | null => {
  if (v === null || v === undefined) return null;
  const s = String(v).replace(/\s+/g, ' ').trim();
  return s === '' ? null : s;
};
const num = (v: any): number => {
  if (typeof v === 'number') return Number.isFinite(v) ? v : 0;
  const s = str(v);
  if (!s) return 0;
  const n = Number(s.replace(/\s/g, '').replace(',', '.'));
  return Number.isFinite(n) ? n : 0;
};
const date = (v: any): Date | null => {
  if (v instanceof Date) return isNaN(v.getTime()) ? null : v;
  const s = str(v);
  if (!s) return null;
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
};
const norm = (s: string | null) => (s ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().replace(/[^A-Z0-9]+/g, ' ').trim();
const fmt = (n: number) => Math.round(n).toLocaleString('fr-FR').replace(/\u202f/g, ' ');
const lire = (fichier: string): Row[] => {
  const wb = XLSX.readFile(path.join(DIR, `${fichier}.xlsx`), { cellDates: true });
  return XLSX.utils.sheet_to_json<Row>(wb.Sheets[wb.SheetNames[0]], { defval: null, raw: true });
};
const estTotal = (v: any) => ['COMPTEUR', 'SOMME', 'MONTANT TOTAL', 'TOTAL'].includes((str(v) ?? '').toUpperCase());

// ---------- normalisations métier ----------
const STATUT_DOSSIER: Record<string, string> = { '1.NOUVEAU': 'NOUVEAU', '2.EN COURS': 'EN_COURS', '3.TERMINER': 'TERMINE', '4.ARCHIVE': 'ARCHIVE' };
const TRANSPORT: Record<string, string> = { MARITIME: 'MARITIME', AERIEN: 'AERIEN', TERRESTE: 'TERRESTRE', TERRESTRE: 'TERRESTRE' };
const MODE_PAIEMENT: Record<string, string> = {
  ESPECE: 'ESPECES', CHEQUE: 'CHEQUE', VIREMENT: 'VIREMENT', TRAITE: 'TRAITE',
};
function modePaiement(v: any): { mode: string; douteux: boolean } {
  const k = norm(str(v));
  if (MODE_PAIEMENT[k]) return { mode: MODE_PAIEMENT[k], douteux: false };
  return { mode: 'ESPECES', douteux: true }; // AUTRES, vide, -1, REPORT, RETOUR : à qualifier
}
function normaliserNumeroDossier(brut: string): { numero: string; annee: number | null; corrige: boolean; standard: boolean } {
  let s = brut.trim().toUpperCase().replace(/\/{2,}/g, '/').replace(/^0-/, 'O-');
  const m = s.match(/^([A-Z])-(\d{1,4})\/(\d{4})(-[A-Z]+)?$/);
  return { numero: s, annee: m ? Number(m[3]) : null, corrige: s !== brut, standard: !!m };
}
const CATEGORIE_CANON = (c: string | null) => norm(c).replace(/DEBOURS (&|ET)? ?/, 'DEBOURS ').replace(/ +/g, ' ') || 'SANS CATEGORIE';

// =====================================================================
function main() {
  console.log(`Source : ${DIR}\nSortie : ${SORTIE}\n`);

  // ---------- Société, comptes bancaires, étapes, fournisseurs ----------
  const societe = lire('Societe');
  manuel.societe = societe[0]?.RaisonSocial ?? null;
  signaler('SOCIETE', societe[0]?.CodeSociété, 'ALERTE', 'societe-cible',
    `Le fichier décrit « ${societe[0]?.RaisonSocial} » : import dans la société ETL de la base de production (décision validée).`);
  bilan('Société', societe.length, societe.length);

  const banquesSrc = lire('Liste Compte Bancaire').filter((r) => !estTotal(r['N°']) && !estTotal(r.Nom));
  const soldesBancaires = new Map<string, { nom: string; solde: number }>();
  banquesSrc.forEach((r) => soldesBancaires.set(String(r['N°']).trim(), { nom: str(r.Nom) ?? '', solde: num(r.Solde) }));
  bilan('Comptes bancaires', banquesSrc.length, banquesSrc.length);

  const etapes = lire('Etape');
  bilan('Étapes de suivi', etapes.length, etapes.length);

  const fournisseurs = lire('Table Fournisseur');
  const codesFour = new Set<string>();
  fournisseurs.forEach((r) => codesFour.add(String(r['N° Fournisseur']).trim()));
  bilan('Fournisseurs', fournisseurs.length, fournisseurs.length);

  // ---------- Catalogue (Element) ----------
  const elements = lire('Element');
  const vusCat = new Set<string>();
  let elOk = 0;
  for (const r of elements) {
    const lib = str(r['Libellé']);
    if (!lib) { signaler('CATALOGUE', r.IDRubrique, 'REJET', 'libelle-vide'); continue; }
    const cat = CATEGORIE_CANON(str(r.Categorie_Rubrique));
    const cle = `${cat}|${norm(lib)}`;
    if (vusCat.has(cle)) { signaler('CATALOGUE', r.IDRubrique, 'REJET', 'doublon-categorie-libelle', `${cat} / ${lib}`); continue; }
    vusCat.add(cle); elOk++;
  }
  bilan('Catalogue prestations', elements.length, elOk);

  // ---------- Dossiers (préparés avant les clients pour compter les rattachements) ----------
  const dossiersSrc = lire('Dossier 2025');
  const dossiersParClientSrc = new Map<string, number>();
  dossiersSrc.forEach((r) => { const c = str(r.NumInterneClient); if (c) dossiersParClientSrc.set(c, (dossiersParClientSrc.get(c) ?? 0) + 1); });

  // ---------- Clients : fusion automatique par NCC ou raison sociale ----------
  const clientsSrc = lire('Table Client');
  const groupes = new Map<string, Row[]>();
  const cleGroupe = (r: Row) => str(r['N° CC']) ? `NCC:${norm(str(r['N° CC']))}` : `RS:${norm(str(r['Raison Sociale']))}`;
  clientsSrc.forEach((r) => {
    const k = cleGroupe(r);
    groupes.set(k, [...(groupes.get(k) ?? []), r]);
  });
  // regroupe aussi par raison sociale seule quand le NCC diffère/absent
  const parRS = new Map<string, Row[]>();
  clientsSrc.forEach((r) => { const k = norm(str(r['Raison Sociale'])); parRS.set(k, [...(parRS.get(k) ?? []), r]); });

  const fusion = new Map<string, string>(); // code -> code survivant
  const traiterGroupe = (rows: Row[], regle: string) => {
    if (rows.length < 2) return;
    const tri = [...rows].sort((a, b) =>
      (dossiersParClientSrc.get(String(b['N° Client'])) ?? 0) - (dossiersParClientSrc.get(String(a['N° Client'])) ?? 0) || Number(a.id) - Number(b.id));
    const survivant = String(fusion.get(String(tri[0]['N° Client'])) ?? tri[0]['N° Client']);
    for (const r of tri.slice(1)) {
      const code = String(r['N° Client']);
      if (fusion.has(code)) continue;
      fusion.set(code, survivant);
      signaler('CLIENT', code, 'CORRECTION', regle, `${str(r['Raison Sociale'])} fusionné vers ${survivant}`);
    }
  };
  for (const [k, rows] of groupes) if (k.startsWith('NCC:')) traiterGroupe(rows, 'fusion-meme-ncc');
  for (const rows of parRS.values()) traiterGroupe(rows, 'fusion-meme-raison-sociale');
  const survivantDe = (code: string) => fusion.get(code) ?? code;

  const clientsOk = clientsSrc.filter((r) => !fusion.has(String(r['N° Client'])));
  const codesClient = new Set(clientsOk.map((r) => String(r['N° Client'])));
  const clientParNom = new Map<string, string>();
  clientsSrc.forEach((r) => clientParNom.set(norm(str(r['Raison Sociale'])), survivantDe(String(r['N° Client']))));
  clientsSrc.forEach((r) => {
    const adr = str(r.Adresse);
    if (adr && adr.includes('@')) signaler('CLIENT', r['N° Client'], 'CORRECTION', 'adresse-contient-email', `${adr} (à déplacer vers le champ email)`);
  });
  bilan('Clients', clientsSrc.length, clientsOk.length);

  // clients cités mais absents
  const clientsInconnus = new Set<string>();
  const NOMS_INCONNUS: Record<string, string> = { CL20220: 'CISSE (CL20220)', CL20221: 'CISSE (CL20221)' }; // tiers « CISSE » du journal
  const nomInconnu = (c: string) => NOMS_INCONNUS[c] ?? `CLIENT INCONNU ${c}`;
  const verifClient = (code: string | null, origine: string, cle: unknown) => {
    if (!code) return;
    const s = survivantDe(code);
    if (!codesClient.has(s)) { clientsInconnus.add(s); signaler(origine, cle, 'CORRECTION', 'client-cree-a-completer', `Client ${s} absent de Table Client : créé sous « ${nomInconnu(s)} »`); }
  };

  // ---------- Dossiers ----------
  const clefsDossier = new Map<string, string>(); // clé (numero|annee) -> numero source
  const dossierParNumero = new Map<string, Row>();
  const dossierParInterne = new Map<string, string>();
  let dosOk = 0;
  for (const r of dossiersSrc) {
    const brut = str(r.NumDossier);
    if (!brut) { signaler('DOSSIER', r.IDDossier, 'REJET', 'numero-vide'); continue; }
    const n = normaliserNumeroDossier(brut);
    const ouverture = date(r.DateOuverture);
    let annee = n.annee;
    if (n.corrige) signaler('DOSSIER', brut, 'CORRECTION', 'numero-normalise', `${brut} -> ${n.numero}`);
    if (!n.standard) {
      annee = ouverture?.getFullYear() ?? date(r['DateCréation'])?.getFullYear() ?? null;
      signaler('DOSSIER', brut, 'ALERTE', 'numero-non-standard', `Année déduite de la date d'ouverture (${annee}) ; numéro conservé « ${n.numero} »`);
    } else if (ouverture && annee !== ouverture.getFullYear()) {
      signaler('DOSSIER', brut, 'ALERTE', 'annee-numero-differente-ouverture', `Numéro ${annee} / ouverture ${ouverture.getFullYear()} : année du numéro retenue`);
    }
    if (!annee) { signaler('DOSSIER', brut, 'REJET', 'annee-introuvable'); continue; }
    const cle = `${n.numero}|${annee}`;
    if (clefsDossier.has(cle)) { signaler('DOSSIER', brut, 'REJET', 'doublon-numero-annee', `identique à ${clefsDossier.get(cle)}`); continue; }
    clefsDossier.set(cle, brut);
    dossierParNumero.set(brut.toUpperCase(), r);
    dossierParNumero.set(n.numero, r);
    const interne = str(r.NumInterneDossier); if (interne) dossierParInterne.set(interne, n.numero);
    const statut = STATUT_DOSSIER[norm(str(r.SituationDossier)).replace(/ (?=\d)/, '')] ?? STATUT_DOSSIER[(str(r.SituationDossier) ?? '').toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')];
    if (!statut) signaler('DOSSIER', brut, 'ALERTE', 'statut-inconnu', String(r.SituationDossier));
    if (!str(r.NatureDossier)) signaler('DOSSIER', brut, 'CORRECTION', 'nature-deduite-du-prefixe', `préfixe ${n.numero.slice(0, 2)}`);
    const tr = str(r.ModeTransport);
    if (!tr || !TRANSPORT[norm(tr)]) signaler('DOSSIER', brut, 'CORRECTION', 'transport-par-defaut', `valeur « ${tr} » remplacée par MARITIME`);
    verifClient(str(r.NumInterneClient), 'DOSSIER', brut);
    dosOk++;
  }
  bilan('Dossiers', dossiersSrc.length, dosOk);
  const trouveDossier = (v: any) => { const s = str(v); return s ? dossierParNumero.get(s.toUpperCase()) ?? dossierParNumero.get(normaliserNumeroDossier(s).numero) : undefined; };

  // contrôle croisé avec la vue « Liste des Dossiers »
  const liste = lire('Liste des Dossiers2025').filter((r) => !estTotal(r['Archivé']) && str(r['N°Dossier']) && typeof r['N°Dossier'] !== 'number');
  const numerosListe = new Set(liste.map((r) => String(r['N°Dossier']).trim().toUpperCase()));
  dossiersSrc.forEach((r) => {
    const n = str(r.NumDossier);
    if (n && !numerosListe.has(n.toUpperCase())) signaler('DOSSIER', n, 'ALERTE', 'absent-de-la-liste-des-dossiers', 'présent dans Dossier 2025 seulement');
  });
  controle('Dossiers : Dossier 2025 = Liste des Dossiers', liste.length, dossiersSrc.length);

  // ---------- Articles (Produit 2026) ----------
  const produits = lire('Produit 2026');
  let artOk = 0;
  for (const r of produits) {
    const interne = str(r.NumInterneDossier);
    if (!interne || !dossierParInterne.has(interne)) { signaler('ARTICLE', r.IDEmballage, 'REJET', 'dossier-introuvable', `NumInterneDossier=${interne}`); continue; }
    if (!str(r.Description)) { signaler('ARTICLE', r.IDEmballage, 'ALERTE', 'description-vide'); }
    artOk++;
  }
  bilan('Articles (marchandises)', produits.length, artOk);

  // ---------- AT ----------
  const atSrc = lire('Table AT2025').filter((r) => !estTotal(r['Id. AT']));
  let atOk = 0; const declarations = new Set<string>();
  for (const r of atSrc) {
    const dossier = trouveDossier(r['N° Dossier']);
    if (!dossier) { signaler('AT', r['Id. AT'], 'REJET', 'dossier-introuvable', String(r['N° Dossier'])); continue; }
    if (typeof r['N° Dossier'] === 'string' && r['N° Dossier'] !== String(r['N° Dossier']).toUpperCase()) signaler('AT', r['Id. AT'], 'CORRECTION', 'casse-dossier', String(r['N° Dossier']));
    const decl = str(r['N° déclaration']);
    if (decl && declarations.has(decl.toUpperCase())) { signaler('AT', r['Id. AT'], 'REJET', 'doublon-declaration', decl); continue; }
    if (decl) declarations.add(decl.toUpperCase()); else signaler('AT', r['Id. AT'], 'ALERTE', 'declaration-vide');
    if (!date(r['Date Échéance'])) { signaler('AT', r['Id. AT'], 'REJET', 'echeance-vide'); continue; }
    atOk++;
  }
  bilan('Admissions temporaires', atSrc.length, atOk);

  // ---------- Proformas ----------
  const proSrc = lire('Table Proforma2025');
  const detPro = lire('DetailProforma');
  const proNums = new Set<string>(); let proOk = 0; let jumelles = 0;
  const facSrcA = lire('Table Facture2025').filter((r) => str(r['N° Facture']));
  const facSrcB = lire('Table FactureN2 2025').filter((r) => str(r['N° Facture']));
  const proVersFactures = new Map<string, string[]>();
  [...facSrcA, ...facSrcB].forEach((r) => { const p = str(r['N° Proforma']); if (p) proVersFactures.set(p, [...(proVersFactures.get(p) ?? []), String(r['N° Facture'])]); });
  for (const r of proSrc) {
    const n = str(r.NumPro);
    if (!n) { signaler('PROFORMA', r.IDProforma, 'REJET', 'numero-vide'); continue; }
    if (proNums.has(n)) { signaler('PROFORMA', n, 'REJET', 'doublon-numero'); continue; }
    proNums.add(n);
    if (!/^PRO\d{4}-\d{1,4}$/.test(n)) signaler('PROFORMA', n, 'ALERTE', 'numero-irregulier', 'numéro d\'origine conservé');
    const nd = str(r.NumDossier);
    if (!nd) signaler('PROFORMA', n, 'ALERTE', 'sans-dossier');
    else if (!trouveDossier(nd)) signaler('PROFORMA', n, 'ALERTE', 'dossier-inconnu', `${nd} : importée sans dossier`);
    if (num(r.EtatSupprimer) === 1) signaler('PROFORMA', n, 'CORRECTION', 'supprimee-importee-annulee');
    const fs_ = proVersFactures.get(n);
    if (fs_ && fs_.length > 1) { jumelles += fs_.length - 1; signaler('PROFORMA', n, 'CORRECTION', 'proforma-jumelle-creee', `${fs_.length - 1} proforma(s) jumelle(s) ${fs_.slice(1).map((_, i) => `${n}-${i + 2}`).join(', ')} liée(s) à ${fs_.slice(1).join(', ')}`); }
    proOk++;
  }
  proOk += jumelles;
  manuel.proformasJumelles = jumelles;
  bilan('Proformas (dont jumelles)', proSrc.length, proOk);
  const orphPro = new Map<string, number>(); let lpOk = 0;
  for (const r of detPro) {
    const n = str(r.NumPro);
    if (!n || !proNums.has(n)) { orphPro.set(n ?? '(vide)', (orphPro.get(n ?? '(vide)') ?? 0) + 1); continue; }
    lpOk++;
  }
  orphPro.forEach((nb, n) => signaler('LIGNE PROFORMA', n, 'REJET', 'detail-orphelin', `${nb} ligne(s), proforma absente de l'export`));
  bilan('Lignes de proforma', detPro.length, lpOk);
  const avecDetail = new Set(detPro.map((r) => str(r.NumPro)));
  manuel.proformasSansDetail = [...proNums].filter((n) => !avecDetail.has(n)).length;

  // ---------- Factures ----------
  const factNums = new Set<string>();
  let facOk = 0, avoirs = 0, totalTTC = 0, totalPaye = 0, totalReste = 0;
  const facturesIndex = new Map<string, Row>();
  const traiterFactures = (rows: Row[], source: string) => {
    for (const r of rows) {
      const n = str(r['N° Facture'])!;
      if (factNums.has(n)) { signaler('FACTURE', n, 'REJET', 'doublon-numero', source); continue; }
      const ttc = num(r['Total TTC Client']);
      const client = clientParNom.get(norm(str(r.Client)));
      if (!client) {
        if (/^\d+$/.test(n) && !str(r.Client)) signaler('FACTURE', n, 'REJET', 'ligne-de-compteur', "ligne de total/compteur de l'export");
        else signaler('FACTURE', n, 'MANUEL', 'client-inconnu', String(r.Client));
        continue;
      }
      const dossierNum = str(r['N° Dossier']);
      if (!dossierNum) signaler('FACTURE', n, 'ALERTE', 'sans-dossier');
      else if (!trouveDossier(dossierNum)) signaler('FACTURE', n, 'ALERTE', 'dossier-inconnu', dossierNum);
      const lib = str(r.Libelle) ?? '';
      const estAvoir = ttc < 0 || /^\s*(AVOIR|NOTE DE DEBIT)/i.test(lib);
      if (estAvoir) {
        avoirs++;
        const o = lib.match(/FACTURE\s+(?:ETL\s+|ELITE\s+)?N°\s*([\w\-\/\.]+)/i);
        signaler('FACTURE', n, 'CORRECTION', 'avoir-reconnu', o ? `facture d'origine probable : ${o[1]}` : 'facture d\'origine non retrouvée dans le libellé');
      }
      if (!str(r['N° Proforma'])) signaler('FACTURE', n, 'ALERTE', 'sans-proforma');
      // Facture redatée à sa réémission (facture normalisée) : la date vaut la date de modification, parfois dans l'exercice suivant la saisie
      { const dF = date(r['Date Facture']), dS = date(r.SaisieLe), dM = date(r.ModifierLe);
        if (dF && dS && dM && dF.getTime() === dM.getTime() && dF.getUTCFullYear() !== dS.getUTCFullYear()) signaler('FACTURE', n, 'ALERTE', 'facture-redatee-exercice-suivant', `saisie le ${dS.toISOString().slice(0, 10)}, date de facture ${dF.toISOString().slice(0, 10)} (réémission, n° normalisé ${str(r['N° Facture Normalisée']) ?? 'aucun'}) : date conservée`); }
      if (num(r['Montant restant']) < -1) signaler('FACTURE', n, 'ALERTE', 'reste-negatif', fmt(num(r['Montant restant'])));
      factNums.add(n); facturesIndex.set(n, r);
      totalTTC += ttc; totalPaye += num(r['Montant Paye']); totalReste += num(r['Montant restant']);
      facOk++;
    }
  };
  traiterFactures(facSrcA, 'Table Facture2025');
  traiterFactures(facSrcB, 'Table FactureN2 2025');
  bilan('Factures', facSrcA.length + facSrcB.length, facOk);
  const detFac = lire('DetailFacture');
  const orphFac = new Map<string, number>(); let lfOk = 0; const factAvecDetail = new Set<string>();
  for (const r of detFac) {
    const n = str(r.NumFact);
    if (!n || !factNums.has(n)) { orphFac.set(n ?? '(vide)', (orphFac.get(n ?? '(vide)') ?? 0) + 1); continue; }
    factAvecDetail.add(n); lfOk++;
  }
  orphFac.forEach((nb, n) => signaler('LIGNE FACTURE', n, 'REJET', 'detail-orphelin', `${nb} ligne(s), facture absente de l'export`));
  bilan('Lignes de facture', detFac.length, lfOk);
  manuel.facturesSansDetail = [...factNums].filter((n) => !factAvecDetail.has(n)).length;
  [...factNums].filter((n) => !factAvecDetail.has(n)).forEach((n) => signaler('FACTURE', n, 'ALERTE', 'sans-detail'));

  // ---------- Dotations ----------
  const dots = lire('Dotation2025');
  const matricules = new Map<string, number>(); const numDot = new Set<string>(); let dotOk = 0;
  for (const r of dots) {
    const n = str(r.NumDotation);
    if (!n || numDot.has(n)) { signaler('DOTATION', n ?? r.idautreDotation, 'REJET', n ? 'doublon-numero' : 'numero-vide'); continue; }
    numDot.add(n);
    const mat = str(r.Matricule) ?? '(vide)'; matricules.set(mat, (matricules.get(mat) ?? 0) + 1);
    if (num(r.MontantRestant) < 0) signaler('DOTATION', n, 'ALERTE', 'restant-negatif', fmt(num(r.MontantRestant)));
    if (Math.abs(num(r.MontantUtilise) + num(r.MontantRestant) - num(r.Montant)) > 1) signaler('DOTATION', n, 'ALERTE', 'utilise-plus-restant-different-montant');
    if (num(r.Valide) !== 1) signaler('DOTATION', n, 'CORRECTION', 'non-validee-importee-annulee', 'statut ANNULE');
    dotOk++;
  }
  bilan('Dotations', dots.length, dotOk);
  manuel.matriculesDotationAuxUtilisateurs = Object.fromEntries(matricules);

  // ---------- Journal Reglement ----------
  const rg = lire('Reglement');
  const classes: Record<string, { n: number; entrees: number; sorties: number }> = {};
  const compter = (c: string, e: number, s: number) => { const x = (classes[c] ??= { n: 0, entrees: 0, sorties: 0 }); x.n++; x.entrees += e; x.sorties += s; };
  const utilisateurs = new Set<string>();
  const payeParFacture = new Map<string, number>();
  // règlements en trop (doublons de saisie) : plafonnés au TTC de chaque facture normale
  const ttcParFacture = new Map<string, number>();
  for (const [n, f] of facturesIndex) { const ttc = num(f['Total TTC Client']); if (ttc > 0 && !/^\s*(AVOIR|NOTE DE DEBIT)/i.test(str(f.Libelle) ?? '')) ttcParFacture.set(n.toUpperCase(), ttc); }
  const allocation = allouerReglements(rg, ttcParFacture);
  const soldeParCompte = new Map<string, number>();
  const soldeTiers = new Map<string, number>();
  let regulSerenity = 0; // paiements à SERENITY SA faits par banque/caisse hors compte fournisseur FF005
  const nonEncaisses = { n: 0 }; let jOk = 0; let dateCorrigee = 0;
  for (const r of rg) {
    const id = r['N° Enr.'];
    if (num(r.supprimer) === 1) { signaler('JOURNAL', id, 'REJET', 'supprime-dans-source', fmt(num(r.Depense) || num(r['MontantReglé']))); continue; }
    const e = num(r['MontantReglé']); const s = num(r.Depense);
    if (e === 0 && s === 0) { compter('ignoree-montant-nul', 0, 0); continue; }
    const u = str(r.SaisiPar); if (u) utilisateurs.add(norm(u).replace(/ /g, '.'));
    // date
    let d = date(r['DateRèglement']); const saisi = date(r.SaisiLe);
    if (!d || d.getFullYear() < 2020 || (saisi && d.getTime() > saisi.getTime() + 31 * 86400000)) {
      if (saisi) { signaler('JOURNAL', id, 'CORRECTION', 'date-aberrante', `${d?.toISOString().slice(0, 10)} -> date de saisie ${saisi.toISOString().slice(0, 10)}`); d = saisi; dateCorrigee++; }
      else { signaler('JOURNAL', id, 'MANUEL', 'date-aberrante-sans-saisie', String(r['DateRèglement'])); continue; }
    }
    const mode = modePaiement(r['ModeRèglement']);
    if (mode.douteux && num(r.Etat_Encaissement) === 1) signaler('JOURNAL', id, 'ALERTE', 'mode-reglement-a-qualifier', String(r['ModeRèglement']));
    if (num(r.Etat_Encaissement) === 0) nonEncaisses.n++;
    let type = str(r.Type_Compte);
    const compte = str(r.NumCompte);
    if (!type && compte && soldesBancaires.has(compte)) {
      type = 'BANQUE'; // type vide mais compte bancaire connu : classé par numéro de compte
      signaler('JOURNAL', id, 'CORRECTION', 'type-compte-deduit-du-numero', `${compte} -> BANQUE (${fmt(e - s)})`);
    }
    const pieceFacture = (str(r.NumCheque) ?? '').toUpperCase();
    let classe: string;
    if (!type && compte && codesFour.has(compte)) { type = 'COMPTE FOURNISSEUR'; signaler('JOURNAL', id, 'CORRECTION', 'type-compte-deduit-du-numero', `${compte} -> COMPTE FOURNISSEUR (${fmt(e - s)})`); }
    else if (!type && compte && codesClient.has(survivantDe(compte))) { type = 'COMPTE CLIENT'; signaler('JOURNAL', id, 'CORRECTION', 'type-compte-deduit-du-numero', `${compte} -> COMPTE CLIENT (${fmt(e - s)})`); }
    const factureAbsente = pieceFacture.startsWith('FACT') && e !== 0 && !factNums.has(pieceFacture);
    if (factureAbsente) signaler('JOURNAL', id, 'CORRECTION', 'paiement-facture-absente-importe-comme-operation', `${pieceFacture} : opération du compte client, sans facture`);
    const al = e > 0 && pieceFacture.startsWith('FACT') && !factureAbsente ? allocation.get(String(id)) : undefined;
    if (al && al.excedent > 1) signaler('JOURNAL', id, 'CORRECTION', 'reglement-excedentaire-importe-a-verifier', `${pieceFacture} : ${fmt(al.excedent)} au-delà du TTC (doublon probable), importé comme opération « à vérifier »${al.alloue > 1 ? `, ${fmt(al.alloue)} imputés à la facture` : ''}`);
    if (al && al.alloue <= 1) {
      classe = 'reglement-excedentaire'; // ligne entièrement en trop : opération du compte d'origine, sans Paiement
    } else if (pieceFacture.startsWith('FACT') && e !== 0 && !factureAbsente) {
      classe = 'paiement-facture';
      payeParFacture.set(pieceFacture, (payeParFacture.get(pieceFacture) ?? 0) + (al ? al.alloue : e));
    } else if (type === 'COMPTE CLIENT') {
      classe = 'mouvement-compte-client';
      if (compte && !codesClient.has(survivantDe(compte))) { clientsInconnus.add(survivantDe(compte)); signaler('JOURNAL', id, 'CORRECTION', 'client-cree-a-completer', `${compte} -> « ${nomInconnu(survivantDe(compte))} »`); }
    } else if (type === 'COMPTE FOURNISSEUR') {
      classe = 'mouvement-compte-fournisseur';
      if (compte && !codesFour.has(compte)) signaler('JOURNAL', id, 'MANUEL', 'compte-fournisseur-inconnu', compte);
    } else if (type === 'BANQUE') {
      classe = 'operation-bancaire';
      if (compte && !soldesBancaires.has(compte)) {
        soldesBancaires.set(compte, { nom: 'Compte fermé (créé inactif)', solde: 0 });
        signaler('JOURNAL', id, 'CORRECTION', 'compte-bancaire-cree-inactif', compte);
      }
    } else if (type === 'CAISSE') {
      classe = s > 0 && str(r.NumFacture) && trouveDossier(r.NumFacture) ? 'depense-dossier' : e > 0 ? 'entree-caisse' : 'sortie-caisse-sans-dossier';
    } else { classe = 'a-verifier-sans-compte'; signaler('JOURNAL', id, 'ALERTE', 'importee-a-verifier-sans-compte', `${fmt(e)} / ${fmt(s)} - ${str(r.Motif)} (statut A_VERIFIER, sans effet sur les soldes)`); }
    compter(classe, e, s);
    const cleCompte = type === 'CAISSE' ? 'CAISSE' : compte ?? '(vide)';
    if (type === 'CAISSE' || type === 'BANQUE') soldeParCompte.set(cleCompte, (soldeParCompte.get(cleCompte) ?? 0) + e - s);
    // comptes tiers : fournisseur = entrées - sorties ; client = sorties - entrées (provision, sens inversé par rapport à l'ancien logiciel)
    if ((type === 'BANQUE' || type === 'CAISSE') && s > 0 && e === 0 && /SEREN/.test(norm(`${str(r.NumTiers) ?? ''} ${str(r.Motif) ?? ''}`))) regulSerenity += s;
    if (compte && type === 'COMPTE FOURNISSEUR') soldeTiers.set(`F|${compte}`, (soldeTiers.get(`F|${compte}`) ?? 0) + e - s);
    if (compte && type === 'COMPTE CLIENT') soldeTiers.set(`C|${survivantDe(compte)}`, (soldeTiers.get(`C|${survivantDe(compte)}`) ?? 0) + s - e);
    jOk++;
  }
  bilan('Journal (règlements)', rg.length, jOk);
  manuel.journalParClasse = classes;
  manuel.journalNonEncaisse = nonEncaisses.n;
  manuel.journalDatesCorrigees = dateCorrigee;
  manuel.utilisateursADedoublonner = [...utilisateurs].sort();

  // ---------- Contrôles de réception ----------
  for (const [num_, b] of soldesBancaires) controle(`Solde ${b.nom} (${num_})`, b.solde, soldeParCompte.get(num_) ?? 0, 1);
  const horsListe = [...soldeParCompte.keys()].filter((k) => k !== 'CAISSE' && !soldesBancaires.has(k));
  manuel.comptesBancairesHorsListe = horsListe.map((k) => ({ compte: k, solde: soldeParCompte.get(k) }));
  manuel.soldeCaisse = soldeParCompte.get('CAISSE') ?? 0;
  if (regulSerenity > 0) {
    soldeTiers.set('F|FF005', (soldeTiers.get('F|FF005') ?? 0) + regulSerenity);
    signaler('COMPTE_FOURNISSEUR', 'FF005', 'CORRECTION', 'regularisation-compte-fournisseur', `entrée de +${fmt(regulSerenity)} ajoutée (paiements SERENITY SA faits par banque/caisse hors compte)`);
  }
  const tiersC = [...soldeTiers].filter(([k]) => k.startsWith('C|')).map(([k, v]) => ({ client: k.slice(2), solde: Math.round(v) }));
  const tiersF = [...soldeTiers].filter(([k]) => k.startsWith('F|')).map(([k, v]) => ({ fournisseur: k.slice(2), solde: Math.round(v) }));
  manuel.soldesComptesTiers = {
    clients: { total: tiersC.reduce((a, x) => a + x.solde, 0), positifs: tiersC.filter((x) => x.solde > 0).length, nuls: tiersC.filter((x) => x.solde === 0).length, negatifs: tiersC.filter((x) => x.solde < 0) },
    fournisseurs: { total: tiersF.reduce((a, x) => a + x.solde, 0), negatifs: tiersF.filter((x) => x.solde < 0) },
  };
  tiersC.filter((x) => x.solde < 0).forEach((x) => signaler('COMPTE_CLIENT', x.client, 'ALERTE', 'solde-compte-client-negatif', `${fmt(x.solde)} : plus consommé que déposé`));
  tiersF.filter((x) => x.solde < 0).forEach((x) => signaler('COMPTE_FOURNISSEUR', x.fournisseur, 'ALERTE', 'solde-compte-fournisseur-negatif', `${fmt(x.solde)} : plus dépensé que déposé`));
  let ecarts = 0, compares = 0;
  for (const [n, p] of payeParFacture) { const f = facturesIndex.get(n); if (!f) continue; compares++; if (Math.abs(num(f['Montant Paye']) - p) > 1) { ecarts++; totalPaye += p - num(f['Montant Paye']); totalReste -= p - num(f['Montant Paye']); signaler('FACTURE', n, 'CORRECTION', 'paye-recalcule-depuis-reglements', `facture ${fmt(num(f['Montant Paye']))} -> règlements ${fmt(p)}`); } }
  manuel.facturesPayeRecalcule = { comparees: compares, recalculees: ecarts };
  manuel.totauxFactures = { nombre: facOk, avoirs, ttc: Math.round(totalTTC), paye: Math.round(totalPaye), reste: Math.round(totalReste) };
  manuel.clientsAcreer = [...clientsInconnus];

  // ---------- État de rapprochement provisions clients / factures ouvertes ----------
  // En 2025 l'ancien logiciel n'a presque plus enregistré de règlement de facture sur compte client : les provisions
  // et les factures ouvertes couvrent donc en grande partie la même créance. Aucun paiement n'est inventé ; ce tableau
  // propose seulement, par client, une compensation (plus anciennes factures d'abord) que la comptabilité valide.
  const nomDeClient = new Map(clientsSrc.map((r) => [survivantDe(String(r['N° Client'])), str(r['Raison Sociale']) ?? '']));
  type FactOuverte = { numero: string; date: Date; dossier: string; ttc: number; reste: number };
  const ouvertesParClient = new Map<string, FactOuverte[]>();
  for (const [n, r] of facturesIndex) {
    const c = clientParNom.get(norm(str(r.Client))); const d = date(r['Date Facture']);
    if (!c || !d) continue;
    const ttc = num(r['Total TTC Client']); const reste = ttc - (payeParFacture.get(n.toUpperCase()) ?? num(r['Montant Paye']));
    if (reste <= 1) continue;
    ouvertesParClient.set(c, [...(ouvertesParClient.get(c) ?? []), { numero: n, date: d, dossier: str(r['N° Dossier']) ?? '', ttc, reste }]);
  }
  const provisions = new Map(tiersC.map((x) => [x.client, x.solde]));
  const lignesClients: string[][] = []; const lignesFactures: string[][] = [];
  const tot = { provision: 0, reste2025: 0, resteAnterieur: 0, comp2025: 0, compTotal: 0 };
  for (const c of new Set([...provisions.keys(), ...ouvertesParClient.keys()])) {
    const prov = Math.max(0, provisions.get(c) ?? 0);
    const ouvertes = (ouvertesParClient.get(c) ?? []).sort((a, b) => a.date.getTime() - b.date.getTime());
    let dispo = prov; let compTotal = 0, comp2025 = 0, reste2025 = 0, resteAnt = 0;
    for (const f of ouvertes) {
      const comp = Math.min(dispo, f.reste); dispo -= comp; compTotal += comp;
      if (f.date.getUTCFullYear() === 2025) { reste2025 += f.reste; comp2025 += comp; } else resteAnt += f.reste;
      lignesFactures.push([c, nomDeClient.get(c) ?? '', f.numero, f.date.toISOString().slice(0, 10), f.dossier, String(Math.round(f.ttc)), String(Math.round(f.reste)), String(Math.round(comp))]);
    }
    const statut = prov === 0 ? 'Sans provision' : ouvertes.length === 0 ? 'Provision sans facture ouverte' : compTotal >= reste2025 + resteAnt - 1 ? 'Factures couvertes par la provision' : 'Provision insuffisante';
    tot.provision += prov; tot.reste2025 += reste2025; tot.resteAnterieur += resteAnt; tot.comp2025 += comp2025; tot.compTotal += compTotal;
    lignesClients.push([c, nomDeClient.get(c) ?? '', ...[prov, reste2025, resteAnt, comp2025, compTotal, prov - compTotal].map((x) => String(Math.round(x))), statut]);
  }
  lignesClients.sort((a, b) => Number(b[2]) - Number(a[2]));
  const ecrireCsv = (nom: string, entete: string[], rows: string[][]) => {
    fs.mkdirSync(SORTIE, { recursive: true });
    fs.writeFileSync(path.join(SORTIE, nom), '﻿' + [entete, ...rows].map((l) => l.map((x) => `"${x.replace(/"/g, '""')}"`).join(';')).join('\n'), 'utf8');
  };
  ecrireCsv('rapprochement-clients.csv', ['client', 'nom', 'provision', 'reste_factures_2025', 'reste_factures_anterieures', 'compensation_proposee_2025', 'compensation_proposee_totale', 'provision_restante', 'situation'], lignesClients);
  ecrireCsv('rapprochement-factures.csv', ['client', 'nom', 'facture', 'date', 'dossier', 'ttc', 'reste', 'compensation_proposee'], lignesFactures);
  manuel.rapprochementProvisions = { provisions: Math.round(tot.provision), reste2025: Math.round(tot.reste2025), resteAnterieur: Math.round(tot.resteAnterieur), compensable2025: Math.round(tot.comp2025), compensableTotal: Math.round(tot.compTotal) };

  // ---------- Sorties ----------
  fs.mkdirSync(SORTIE, { recursive: true });
  const csv = ['entite;cle;gravite;regle;detail', ...lignes.map((l) => [l.entite, l.cle, l.gravite, l.regle, l.detail].map((x) => `"${String(x).replace(/"/g, '""').replace(/\r?\n/g, ' ')}"`).join(';'))].join('\n');
  fs.writeFileSync(path.join(SORTIE, 'rejets.csv'), '\uFEFF' + csv, 'utf8');
  fs.writeFileSync(path.join(SORTIE, 'rapport.json'), JSON.stringify({ source: DIR, genereLe: new Date().toISOString(), stats, controles, manuel }, null, 2), 'utf8');

  // ---------- Console ----------
  console.log('ENTITÉ'.padEnd(26) + 'LUS'.padStart(8) + 'IMPORT.'.padStart(9) + 'ÉCARTÉS'.padStart(9));
  for (const [k, v] of Object.entries(stats)) console.log(k.padEnd(26) + String(v.lus).padStart(8) + String(v.importables).padStart(9) + String(v.lus - v.importables).padStart(9));
  console.log('\nSIGNALEMENTS PAR GRAVITÉ');
  (['REJET', 'MANUEL', 'ALERTE', 'CORRECTION'] as Gravite[]).forEach((g) => console.log(`  ${g.padEnd(11)} ${lignes.filter((l) => l.gravite === g).length}`));
  console.log('\nPAR RÈGLE (top 25)');
  const parRegle = new Map<string, number>();
  lignes.forEach((l) => parRegle.set(`${l.gravite} ${l.entite} ${l.regle}`, (parRegle.get(`${l.gravite} ${l.entite} ${l.regle}`) ?? 0) + 1));
  [...parRegle].sort((a, b) => b[1] - a[1]).slice(0, 25).forEach(([k, n]) => console.log(`  ${String(n).padStart(6)}  ${k}`));
  console.log('\nJOURNAL PAR CLASSE');
  Object.entries(classes).forEach(([k, v]) => console.log(`  ${k.padEnd(32)} ${String(v.n).padStart(6)}  entrées ${fmt(v.entrees).padStart(16)}  sorties ${fmt(v.sorties).padStart(16)}`));
  console.log('\nCONTRÔLES');
  controles.forEach((c) => console.log(`  ${c.ok ? 'OK ' : 'KO '} ${c.nom} : attendu ${typeof c.attendu === 'number' ? fmt(c.attendu) : c.attendu}, obtenu ${typeof c.obtenu === 'number' ? fmt(c.obtenu) : c.obtenu}`));
  console.log(`\nRapports écrits dans ${SORTIE}\n  - rapport.json\n  - rejets.csv (${lignes.length} lignes)\nAUCUNE donnée n'a été écrite en base.`);
}

main();

/**
 * ETL ancien logiciel -> GBTRANS ERP : REPRISE 2026, PARTIE « DOCUMENTS » (delta sur la reprise de 2025).
 *
 * Périmètre de cette passe (ne dépend pas de la banque) : clients, catalogue de prestations, dossiers et dossiers
 * d'offre, factures et leurs lignes, proformas et leurs lignes, offres commerciales, cautions.
 * Hors périmètre, volontairement : journal de règlements, banque, caisse, comptes clients et fournisseurs, soldes,
 * payé des factures reportées de 2025, écritures comptables, employés et utilisateurs.
 *
 * Usage (depuis backend/) :
 *   DATABASE_URL=<base> npx ts-node --transpile-only scripts/etl/importer-2026.ts [--appliquer] [--societe=ETL]
 *                                              [--dir2026="C:\...\ETL 2026"] [--dir2025="C:\...\ETL"]
 *
 * Sans --appliquer : simulation (lecture de la base, aucune écriture). Une base non locale est refusée dans les deux
 * modes sans ETL_AUTORISER_DISTANT=OUI_PRODUCTION. Relançable : un objet déjà présent (numéro, code) est ignoré.
 * Les éléments reportés de 2025 ne sont pas recréés ; seuls le statut des dossiers et des proformas reportés est
 * mis à jour, et une proforma reportée est rattachée à sa nouvelle facture. Rapport : logs/etl-2026/rejets.csv.
 */
import 'dotenv/config';
import { randomUUID } from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';
import {
  Row, str, num, date, norm, cut, ajouterJours, lire, normaliserNumeroDossier, TYPE_TRANSPORT, natureDossier, loginDe, calculerFusionClients,
} from './commun';

const args = process.argv.slice(2);
const APPLIQUER = args.includes('--appliquer');
const opt = (nom: string, defaut: string) => args.find((a) => a.startsWith(`--${nom}=`))?.split('=').slice(1).join('=') ?? defaut;
const CODE_SOCIETE = opt('societe', 'ETL');
const DIR26 = opt('dir2026', 'C:\\Users\\SANOGO\\Desktop\\ETL 2026');
const DIR25 = opt('dir2025', 'C:\\Users\\SANOGO\\Desktop\\ETL');
const SORTIE = path.resolve(__dirname, '..', '..', 'logs', 'etl-2026');

const prisma = new PrismaClient();
const fmt = (n: number) => Math.round(n).toLocaleString('fr-FR').replace(/\u202f/g, ' ');
type Gravite = 'REJET' | 'CORRECTION' | 'ALERTE';
const signalements: { entite: string; cle: string; gravite: Gravite; regle: string; detail: string }[] = [];
const signaler = (entite: string, cle: string, gravite: Gravite, regle: string, detail = '') => { signalements.push({ entite, cle, gravite, regle, detail }); };
const bilan: { entite: string; crees: number; existants: number; ignores: number; maj: number }[] = [];
const noter = (entite: string, crees: number, existants = 0, ignores = 0, maj = 0) => {
  bilan.push({ entite, crees, existants, ignores, maj });
  console.log(`  ${entite.padEnd(34)} à créer ${String(crees).padStart(6)}  déjà présents ${String(existants).padStart(6)}  ignorés ${String(ignores).padStart(5)}  mis à jour ${String(maj).padStart(4)}`);
};
async function inserer(model: string, rows: any[], taille = 1000) {
  if (!APPLIQUER || !rows.length) return;
  const d = (prisma as any)[model];
  for (let i = 0; i < rows.length; i += taille) await d.createMany({ data: rows.slice(i, i + taille), skipDuplicates: true });
}

function garde() {
  const url = process.env.DATABASE_URL || '';
  const m = url.match(/@([^:/]+)(?::\d+)?\/([^?]+)/);
  const hote = m?.[1] ?? '?';
  console.log(`Base cible : ${hote} / ${m?.[2] ?? '?'}  (${APPLIQUER ? 'ÉCRITURE' : 'simulation, aucune écriture'})`);
  const local = ['localhost', '127.0.0.1', '::1'].includes(hote);
  if (!local && process.env.ETL_AUTORISER_DISTANT !== 'OUI_PRODUCTION') {
    console.error(`REFUS : la base ${hote} n'est pas locale. Définir ETL_AUTORISER_DISTANT=OUI_PRODUCTION après sauvegarde et validation sur une copie.`);
    process.exit(1);
  }
}

const statutDossier = (v: any): string => {
  const k = norm(str(v)).replace(/^(\d) /, '$1 ');
  return ({ '1 NOUVEAU': 'NOUVEAU', NOUVEAU: 'NOUVEAU', '2 EN COURS': 'EN_COURS', '3 TERMINER': 'TERMINE', '4 ARCHIVE': 'ARCHIVE', ARCHIVE: 'ARCHIVE', ANNULE: 'ANNULE' } as Record<string, string>)[k] ?? 'EN_COURS';
};
const statutProforma = (r: Row) => (num(r.EtatSupprimer) === 1 ? 'ANNULEE' : num(r.EtatFacture) === 1 ? 'TRANSFORMEE' : num(r['EtatValidé']) === 1 ? 'VALIDEE' : 'BROUILLON');
const ordreLigne = (a: Row, b: Row) => num(a.NumOrdreCat) - num(b.NumOrdreCat) || num(a.NumOrdreDetail) - num(b.NumOrdreDetail) || num(a.NumOrdre) - num(b.NumOrdre);
const sansEspaces = (s: string | null) => norm(s).replace(/ /g, '');

async function main() {
  garde();
  console.log(`Source 2026 : ${DIR26}\nSource 2025 (fusion des clients) : ${DIR25}\nSociété : ${CODE_SOCIETE}\n`);
  const societe = await prisma.societe.findUnique({ where: { code: CODE_SOCIETE } });
  if (!societe) { console.error(`Société « ${CODE_SOCIETE} » introuvable : la reprise de 2025 doit être faite d'abord.`); process.exit(1); }
  const societeId = societe.id;

  // ---------- Sources ----------
  const clients6 = lire(DIR26, 'CLIENT2026').filter((r) => str(r.NumInterneClient));
  const dossiers6 = lire(DIR26, 'DOSSIER 2026');
  const dossiersOffre = lire(DIR26, 'DOSSIER OFFRE');
  const facs6 = lire(DIR26, 'FACTURE2026').filter((r) => str(r.NumFact));
  const detFac6 = lire(DIR26, 'DETAIL FACTURE 2026');
  const pros6 = lire(DIR26, 'PROFORMA2026');
  const detPro6 = lire(DIR26, 'DETAIL PROFORMA 2026');
  const offres6 = lire(DIR26, 'OFFRE2026 VRAI').filter((r) => str(r.NumPro));
  const detOffre6 = lire(DIR26, 'OFFRE2026');
  const cautions6 = lire(DIR26, 'CAUTION2026');
  const rubriques6 = lire(DIR26, 'RUBRIQUE');
  const clients5 = lire(DIR25, 'Table Client');
  const dossiers5 = lire(DIR25, 'Dossier 2025');

  // ---------- Utilisateurs de reprise (réutilise ceux de 2025, en crée au besoin) ----------
  const hashInutilisable = await bcrypt.hash(randomUUID(), 8);
  const existantsU = await prisma.utilisateur.findMany({ select: { id: true, email: true } });
  const parEmail = new Map(existantsU.map((u) => [u.email, u.id]));
  const nouveauxU: any[] = []; const utilisateurs = new Map<string, string>();
  const assurerUtilisateur = (cle: string, nom: string, prenom: string, matricule: string): string => {
    if (utilisateurs.has(cle)) return utilisateurs.get(cle)!;
    const email = `${cle.toLowerCase().replace(/[^a-z0-9]+/g, '-')}@etl-import.local`;
    let id = parEmail.get(email);
    if (!id) { id = randomUUID(); parEmail.set(email, id); nouveauxU.push({ id, societeId, matricule, nom, prenom, email, motDePasse: hashInutilisable, actif: false, doitChangerMdp: true }); }
    utilisateurs.set(cle, id); return id;
  };
  const importUser = assurerUtilisateur('etl-import', 'Reprise', 'ETL', 'ETL-IMPORT');
  const userDeSaisie = (v: any): string => {
    const s = str(v); if (!s) return importUser;
    const l = loginDe(s); const p = l.split('.');
    return assurerUtilisateur(l, p[0].toUpperCase(), p.slice(1).join(' ').toUpperCase() || '-', `ETL-${l}`.toUpperCase().slice(0, 50));
  };
  [...facs6, ...pros6, ...offres6].forEach((r) => userDeSaisie(r.SaisiePar));
  await inserer('utilisateur', nouveauxU);
  noter('Utilisateurs de reprise (nouveaux)', nouveauxU.length, utilisateurs.size - nouveauxU.length);

  // ---------- Clients : nouveaux seulement, fusion cohérente avec 2025 ----------
  const fusion = calculerFusionClients(clients5, dossiers5);
  const codes5 = new Set(clients5.map((r) => String(r['N° Client']).trim()));
  const survivants5 = clients5.filter((r) => !fusion.has(String(r['N° Client']).trim()));
  const parNcc = new Map<string, string>(); const parRs = new Map<string, string>();
  survivants5.forEach((r) => { const c = String(r['N° Client']).trim(); const n = sansEspaces(str(r['N° CC'])); if (n) parNcc.set(n, c); parRs.set(norm(str(r['Raison Sociale'])), c); });
  const nouveauxCodes = clients6.filter((r) => !codes5.has(String(r.NumInterneClient).trim()) && !fusion.has(String(r.NumInterneClient).trim()));
  for (const r of nouveauxCodes) {
    const code = String(r.NumInterneClient).trim(); const n = sansEspaces(str(r.NumCC));
    const cible = (n && parNcc.get(n)) || parRs.get(norm(str(r.RaisonSociale)));
    if (cible) { fusion.set(code, cible); signaler('CLIENT', code, 'CORRECTION', 'fusion-client-2026', `${str(r.RaisonSociale)} fusionné vers ${cible}`); }
    else { if (n) parNcc.set(n, code); parRs.set(norm(str(r.RaisonSociale)), code); }
  }
  const survivant = (c: string) => fusion.get(c) ?? c;
  const clientsExist = new Map((await prisma.client.findMany({ where: { societeId }, select: { id: true, code: true } })).map((c) => [c.code, c.id]));
  const clientId = new Map<string, string>(); const nouveauxC: any[] = [];
  const creerClient = (code: string, data: any) => {
    const ex = clientsExist.get(code); if (ex) { clientId.set(code, ex); return; }
    const id = randomUUID(); clientId.set(code, id); clientsExist.set(code, id);
    nouveauxC.push({ id, societeId, code, type: 'ENTREPRISE', ...data });
  };
  clientsExist.forEach((id, code) => clientId.set(code, id));
  for (const r of clients6) {
    const code = String(r.NumInterneClient).trim(); if (fusion.has(code) || clientsExist.has(code)) continue;
    const adr = str(r.Adresse); const estMail = !!adr && adr.includes('@');
    creerClient(code, { raisonSociale: cut(str(r.RaisonSociale) ?? `CLIENT ${code}`, 200), ncc: cut(str(r.NumCC), 50), adresse: estMail ? null : cut(adr, 500), email: estMail ? cut(adr, 200) : null, telephone: cut(str(r.Telphone), 50), ville: cut(str(r.Localisation), 100) });
  }
  const clientDeCode = (c: string | null): string | null => {
    if (!c) return null; const s = survivant(c.trim());
    if (!clientId.has(s)) { creerClient(s, { raisonSociale: `CLIENT INCONNU ${s}` }); signaler('CLIENT', s, 'ALERTE', 'client-inconnu-cree', `${s} cité sans fiche client`); }
    return clientId.get(s)!;
  };
  const clientParNom = new Map<string, string>();
  [...clients5.map((r) => [String(r['N° Client']).trim(), str(r['Raison Sociale'])] as const), ...clients6.map((r) => [String(r.NumInterneClient).trim(), str(r.RaisonSociale)] as const)]
    .forEach(([c, n]) => { if (n) clientParNom.set(norm(n), survivant(c)); });
  dossiers6.concat(dossiersOffre).forEach((r) => clientDeCode(str(r.NumInterneClient)));
  await inserer('client', nouveauxC);
  noter('Clients', nouveauxC.length, clients6.length - nouveauxC.length - [...fusion.keys()].filter((c) => clients6.some((r) => String(r.NumInterneClient).trim() === c) && !codes5.has(c)).length);

  // ---------- Catalogue des prestations ----------
  const pDb = await prisma.prestationCatalogue.findMany({ where: { societeId }, select: { code: true, categorie: true, designation: true } });
  const pCodes = new Set(pDb.map((p) => p.code)); const pCles = new Set(pDb.map((p) => `${norm(p.categorie)}|${norm(p.designation)}`));
  const nouveauxP: any[] = []; let pIgn = 0;
  for (const r of rubriques6) {
    const lib = str(r['Libellé']); if (!lib) { pIgn++; continue; }
    const cat = str(r.Categorie_Rubrique) ?? 'AUTRES'; const cle = `${norm(cat)}|${norm(lib)}`; const code = `R${r.IDRubrique}`;
    if (pCodes.has(code) || pCles.has(cle)) continue;
    pCodes.add(code); pCles.add(cle); const tva = num(r.EtatTVA) === 1;
    nouveauxP.push({ societeId, code, categorie: cut(cat, 100), designation: cut(lib, 500), montantDefaut: num(r.PrixUnitaire) || null, estTVA: tva, tauxTVA: tva ? 18 : 0, ordre: num(r.NumOrdreCat) });
  }
  await inserer('prestationCatalogue', nouveauxP);
  noter('Catalogue prestations', nouveauxP.length, pDb.length, pIgn);

  // ---------- Dossiers et dossiers d'offre ----------
  const processus = await prisma.processusSuivi.findUnique({ where: { societeId_code: { societeId, code: 'ETL-STANDARD' } } });
  if (!processus) { console.error('Processus ETL-STANDARD introuvable : la reprise de 2025 doit être faite d\'abord.'); process.exit(1); }
  const dDb = await prisma.dossier.findMany({ where: { societeId }, select: { id: true, numero: true, annee: true, clientId: true, statut: true } });
  const dExist = new Map(dDb.map((d) => [`${d.numero}|${d.annee}`, d]));
  const dossierInfo = new Map<string, { id: string; clientId: string; neuf: boolean }>();
  dDb.forEach((d) => dossierInfo.set(`${d.numero}|${d.annee}`, { id: d.id, clientId: d.clientId, neuf: false }));
  const trouveDossier = (v: any) => {
    const s = str(v); if (!s) return undefined; const n = normaliserNumeroDossier(s);
    const annee = n.annee ?? undefined; if (annee) return dossierInfo.get(`${n.numero}|${annee}`);
    return [...dossierInfo.entries()].find(([k]) => k.startsWith(`${n.numero}|`))?.[1];
  };
  const nouveauxD: any[] = []; const majD: { id: string; statut: string }[] = []; const vusD = new Set<string>(); let dIgn = 0, dExistants = 0;
  const traiterDossiers = (rows: Row[], source: string) => {
    for (const r of rows) {
      const brut = str(r.NumDossier); if (!brut) { dIgn++; continue; }
      const n = normaliserNumeroDossier(brut); const ouverture = date(r.DateOuverture);
      const annee = n.standard ? n.annee! : (ouverture?.getFullYear() ?? date(r['DateCréation'])?.getFullYear() ?? null);
      if (!annee) { dIgn++; signaler('DOSSIER', brut, 'REJET', 'annee-introuvable', source); continue; }
      const cle = `${n.numero}|${annee}`; if (vusD.has(cle)) { dIgn++; signaler('DOSSIER', brut, 'REJET', 'doublon-numero', source); continue; } vusD.add(cle);
      const ex = dExist.get(cle); const statut = statutDossier(r.SituationDossier);
      if (ex) { dExistants++; if (ex.statut !== statut) majD.push({ id: ex.id, statut }); continue; }
      const cid = clientDeCode(str(r.NumInterneClient));
      if (!cid) { dIgn++; signaler('DOSSIER', brut, 'REJET', 'client-absent', source); continue; }
      const id = randomUUID(); dossierInfo.set(cle, { id, clientId: cid, neuf: true });
      const devise = str(r.MonnaieFact);
      nouveauxD.push({
        id, societeId, createurId: importUser, numero: cut(n.numero, 50), numeroPhysique: n.standard ? cut(n.numero, 50) : null, annee, nature: natureDossier(str(r.NatureDossier), n.prefixe),
        type: TYPE_TRANSPORT[norm(str(r.ModeTransport))] ?? 'MARITIME', statut, clientId: cid, processusId: processus.id,
        compagnieMaritime: cut(str(r.CompagnieTransport), 200), navire: cut(str(r.Navire), 200), numeroBL: cut(str(r.NumTitreTransPort), 100),
        dateArrivee: date(r.DateArrivee), designation: str(r.Marchandise) ?? str(r.NatureMarch),
        poidsBrut: num(r.PoidsBruts) || null, poidsNet: num(r.PoidsNet) || null, nombreColis: num(r.NbreColis) ? Math.round(num(r.NbreColis)) : null,
        valeurFOB: num(r.MontantFacture) || null, devise: devise ? (norm(devise) === 'EURO' ? 'EUR' : cut(norm(devise), 10)) : 'XOF',
        valeurCAF: num(r.MontantCAF) || null, numeroDeclaration: cut(str(r['NumDéclaration']), 100), dateDeclaration: date(r['DateDéclaration']),
        bureauDouane: cut(str(r.BureauDouane), 200), totalDroits: num(r.MontantDroitTaxes) || null,
        dateLivraison: date(r.DateLivraison), lieuLivraison: cut(str(r.LieuLivraison), 500),
        observations: str(r.Observation), dateCreation: date(r['DateCréation']) ?? ouverture ?? new Date(),
      });
    }
  };
  traiterDossiers(dossiers6, 'DOSSIER 2026'); traiterDossiers(dossiersOffre, 'DOSSIER OFFRE');
  await inserer('dossier', nouveauxD);
  if (APPLIQUER) for (const m of majD) await prisma.dossier.update({ where: { id: m.id }, data: { statut: m.statut as any } });
  noter('Dossiers (dont dossiers d\'offre)', nouveauxD.length, dExistants, dIgn, majD.length);

  // ---------- Factures ----------
  const fDb = await prisma.facture.findMany({ where: { societeId }, select: { id: true, numero: true, montantTTC: true, montantPaye: true } });
  const facExist = new Map(fDb.map((f) => [f.numero, f]));
  const proDossier = new Map(pros6.map((r) => [str(r.NumPro) ?? '', str(r.NumDossier)] as const));
  const factureInfo = new Map<string, { id: string; clientId: string; neuf: boolean }>();
  const nouvF: any[] = []; const vuF = new Set<string>(); let fIgn = 0, payeNouvelles = 0, nbPayeNouvelles = 0;
  const diff = { ttc: 0, paye: 0, hausse: 0 };
  const numerosFichier = new Set(facs6.map((r) => str(r.NumFact)!.toUpperCase()));
  const linesCount = new Map<string, number>(); detFac6.forEach((r) => { const n = str(r.NumFact); if (n) linesCount.set(n, (linesCount.get(n) ?? 0) + 1); });
  for (const r of facs6) {
    const numero = str(r.NumFact)!;
    if (vuF.has(numero)) { fIgn++; continue; } vuF.add(numero);
    const ex = facExist.get(numero);
    if (ex) { // reportée de 2025 : non recréée, écarts seulement signalés
      const ttc = num(r.TotalTTC), paye = num(r['MontantPayé']);
      if (Math.abs(ttc - Number(ex.montantTTC)) > 1) { diff.ttc++; signaler('FACTURE', numero, 'ALERTE', 'ttc-different-de-2025', `${fmt(Number(ex.montantTTC))} -> ${fmt(ttc)}`); }
      if (Math.abs(paye - Number(ex.montantPaye)) > 1) { diff.paye++; if (paye > Number(ex.montantPaye)) diff.hausse += paye - Number(ex.montantPaye); }
      const dossier0 = trouveDossier(r.NumDossier); factureInfo.set(numero, { id: ex.id, clientId: dossier0?.clientId ?? '', neuf: false }); continue;
    }
    const corrompu = numero.match(/^(.*?\d)(\d)\2{3,}$/);
    if (corrompu && (facExist.has(corrompu[1]) || numerosFichier.has(corrompu[1].toUpperCase()))) { fIgn++; signaler('FACTURE', numero, 'REJET', 'numero-corrompu-doublon', `copie de ${corrompu[1]} avec chiffres parasites`); continue; }
    const ttc = num(r.TotalTTC); const lib = str(r.LibelleFact) ?? '';
    if (ttc === 0 && num(r.TotalHT) === 0 && num(r.TotalTVA) === 0 && !(linesCount.get(numero))) { fIgn++; signaler('FACTURE', numero, 'REJET', 'facture-vide', 'TTC 0 et aucune ligne'); continue; }
    const dateF = date(r.DateFacture);
    const dos = trouveDossier(r.NumDossier) ?? trouveDossier(proDossier.get(str(r.NumPro) ?? '') ?? null);
    if (!dateF || !dos) { fIgn++; signaler('FACTURE', numero, 'REJET', !dateF ? 'date-introuvable' : 'client-introuvable', `dossier ${str(r.NumDossier) ?? '(vide)'}`); continue; }
    const avoir = ttc < 0 || /^\s*(AVOIR|NOTE DE DEBIT)/i.test(lib);
    const paye = num(r['MontantPayé']); const reste = ttc - paye;
    const supprimee = num(r.EtatSupprimer) === 1;
    const statut = supprimee ? 'ANNULEE' : avoir ? 'VALIDEE' : Math.abs(reste) <= 1 && ttc !== 0 ? 'PAYEE' : paye > 0 ? 'PARTIELLEMENT_PAYEE' : 'VALIDEE';
    if (paye > 0 && !supprimee) { payeNouvelles += paye; nbPayeNouvelles++; }
    const id = randomUUID(); factureInfo.set(numero, { id, clientId: dos.clientId, neuf: true });
    nouvF.push({
      id, societeId, numero: cut(numero, 50), type: avoir ? 'AVOIR' : 'FACTURE', dossierId: dos.id, clientId: dos.clientId, createurId: userDeSaisie(r.SaisiePar),
      dateFacture: dateF, dateEcheance: ajouterJours(dateF, 30), objet: cut(lib.split('\n')[0].trim() || null, 500), statut,
      numeroNormalise: cut(str(r.NumFactNormalise), 50), montantHT: num(r.TotalHT), montantTVA: num(r.TotalTVA),
      montantTTC: ttc, montantPaye: paye, resteAPayer: reste, acompte: num(r.MontantAcompte), montantPrestation: num(r.MontantPrestation) || null,
      tvaPrestation: num(r.TVAPrestation) || null, observations: lib || null, motifAvoir: avoir ? cut(lib.split('\n')[0].trim(), 500) : null,
      createdAt: date(r.SaisieLe) ?? dateF,
    });
  }
  await inserer('facture', nouvF);
  noter('Factures', nouvF.length, [...factureInfo.values()].filter((f) => !f.neuf).length, fIgn);
  if (nbPayeNouvelles) signaler('FACTURE', '(ensemble)', 'ALERTE', 'paye-repris-de-la-fiche', `${nbPayeNouvelles} nouvelles factures avec un payé de ${fmt(payeNouvelles)} repris de la fiche, à rapprocher du journal de trésorerie 2026 (non fourni)`);
  if (diff.paye) signaler('FACTURE', '(reportées)', 'ALERTE', 'paye-reporte-non-mis-a-jour', `${diff.paye} factures reportées de 2025 ont un payé différent (hausses : ${fmt(diff.hausse)}) : non mis à jour, en attente du journal de trésorerie`);
  console.log(`    reportées de 2025 : écarts de TTC ${diff.ttc}, écarts de payé ${diff.paye} (hausses ${fmt(diff.hausse)}), non appliqués`);

  const lignesParFacture = new Map<string, Row[]>(); let lfOrph = 0;
  detFac6.forEach((r) => { const n = str(r.NumFact); const f = n ? factureInfo.get(n) : undefined; if (!f) { lfOrph++; return; } if (!f.neuf) return; lignesParFacture.set(n!, [...(lignesParFacture.get(n!) ?? []), r]); });
  const nouvLF: any[] = [];
  lignesParFacture.forEach((rows, n) => rows.sort(ordreLigne).forEach((r, i) => {
    const m = num(r.Montant); const tva = num(r.EtatTVA) === 1;
    nouvLF.push({ factureId: factureInfo.get(n)!.id, ordre: i + 1, categorie: cut(str(r.Categorie), 100), codePrestation: cut(str(r.Code), 50), designation: cut(str(r['Libellé']) ?? '-', 500), estTVA: tva, quantite: 1, prixUnitaire: m, montantHT: tva ? 0 : m, tauxTVA: tva ? 18 : 0, montantTVA: tva ? m : 0 });
  }));
  await inserer('ligneFacture', nouvLF, 2000);
  noter('Lignes de facture', nouvLF.length, 0, lfOrph);

  // ---------- Proformas ----------
  const prDb = await prisma.proforma.findMany({ where: { client: { societeId } }, select: { id: true, numero: true, statut: true, factureId: true } });
  const proExist = new Map(prDb.map((p) => [p.numero, p]));
  const nouvellesFacturesDeProforma = new Map<string, string[]>();
  [...facs6].sort((a, b) => (date(a.DateFacture)?.getTime() ?? 0) - (date(b.DateFacture)?.getTime() ?? 0)).forEach((r) => {
    const p = str(r.NumPro); const n = str(r.NumFact); const f = n ? factureInfo.get(n) : undefined;
    if (p && n && f?.neuf) nouvellesFacturesDeProforma.set(p, [...(nouvellesFacturesDeProforma.get(p) ?? []), n]);
  });
  const lignesDeProforma = new Map<string, Row[]>(); detPro6.forEach((r) => { const n = str(r.NumPro); if (n) lignesDeProforma.set(n, [...(lignesDeProforma.get(n) ?? []), r]); });
  const nouvPro: any[] = []; const nouvLP: any[] = []; const vuPro = new Set<string>(); let proIgn = 0, jumelles = 0;
  const majPro: { id: string; data: any }[] = [];
  const lignesProforma = (proformaId: string, n: string) => (lignesDeProforma.get(n) ?? []).sort(ordreLigne).forEach((r, i) => {
    const m = num(r.Montant); const tva = num(r.EtatTVA) === 1;
    nouvLP.push({ proformaId, ordre: i + 1, categorie: cut(str(r.Categorie), 100), codePrestation: cut(str(r.Code), 50), designation: cut(str(r['Libellé']) ?? '-', 500)!, quantite: 1, prixUnitaire: m, montantHT: tva ? 0 : m, tauxTVA: tva ? 18 : 0, montantTVA: tva ? m : 0, estTVA: tva });
  });
  for (const r of pros6) {
    const n = str(r.NumPro); if (!n || vuPro.has(n)) { proIgn++; continue; } vuPro.add(n);
    const facs = nouvellesFacturesDeProforma.get(n) ?? [];
    const ex = proExist.get(n);
    if (ex) { // reportée : statut et rattachement à une facture de 2026
      const st = statutProforma(r); const data: any = {};
      if (ex.statut !== st) data.statut = st;
      if (!ex.factureId && facs[0]) { data.factureId = factureInfo.get(facs[0])!.id; data.statut = 'TRANSFORMEE'; }
      if (Object.keys(data).length) majPro.push({ id: ex.id, data });
      continue;
    }
    const dos = trouveDossier(r.NumDossier); const d = date(r.Date);
    const cid = dos?.clientId ?? (facs[0] ? factureInfo.get(facs[0])?.clientId : undefined);
    if (!cid || !d) { proIgn++; signaler('PROFORMA', n, 'REJET', !cid ? 'client-introuvable' : 'date-introuvable', `dossier ${str(r.NumDossier) ?? '(vide)'}`); continue; }
    const base = {
      clientId: cid, dossierId: dos?.id ?? null, dateProforma: d, dateValidite: ajouterJours(d, 30), titre: cut(str(r.LibellePro), 500), statut: statutProforma(r),
      fobUnitaire: num(r.FOB) || null, fretUnitaire: num(r.FRET) || null, assurance: num(r.ASSURANCE) || null, fraisDivers: num(r.FRAIS_DIVERS) || null,
      valeurCAF: num(r.VALEUR_CAF) || null, montantHT: num(r.TotalHT), montantTVA: num(r.TotalTVA), montantTTC: num(r.TotalTTC), remise: num(r.TotalRemise), createdAt: date(r.SaisieLe) ?? d,
    };
    (facs.length > 1 ? facs : [facs[0] ?? null]).forEach((fn, i) => {
      const numero = i === 0 ? n : `${n}-${i + 1}`; if (proExist.has(numero)) return; if (i > 0) jumelles++;
      const f = fn ? factureInfo.get(fn) : null; const id = randomUUID();
      nouvPro.push({ id, numero: cut(numero, 50), ...base, factureId: f && f.neuf ? f.id : null, statut: f && f.neuf ? 'TRANSFORMEE' : base.statut });
      lignesProforma(id, n);
    });
  }
  const connusPro = new Set(pros6.map((r) => str(r.NumPro))); let lpOrph = 0; detPro6.forEach((r) => { if (!connusPro.has(str(r.NumPro))) lpOrph++; });
  await inserer('proforma', nouvPro); await inserer('ligneProforma', nouvLP, 2000);
  if (APPLIQUER) for (const m of majPro) await prisma.proforma.update({ where: { id: m.id }, data: m.data });
  noter('Proformas (dont jumelles)', nouvPro.length, proExist.size, proIgn, majPro.length);
  noter('Lignes de proforma', nouvLP.length, 0, lpOrph);
  if (jumelles) console.log(`    dont ${jumelles} proforma(s) jumelle(s)`);

  // ---------- Offres commerciales ----------
  const oDb = await prisma.offreCommerciale.findMany({ where: { client: { societeId } }, select: { numero: true } });
  const oExist = new Set(oDb.map((o) => o.numero));
  const lignesDOffre = new Map<string, Row[]>(); detOffre6.forEach((r) => { const n = str(r.NumPro); if (n) lignesDOffre.set(n, [...(lignesDOffre.get(n) ?? []), r]); });
  const nouvO: any[] = []; const nouvLO: any[] = []; let oIgn = 0;
  for (const r of offres6) {
    const n = str(r.NumPro)!; if (oExist.has(n)) continue;
    const dos = trouveDossier(r.NumDossier); const d = date(r.Date);
    if (!dos || !d) { oIgn++; signaler('OFFRE', n, 'REJET', !dos ? 'dossier-introuvable' : 'date-introuvable', str(r.NumDossier) ?? '(vide)'); continue; }
    const id = randomUUID(); const lib = str(r.LibellePro) ?? '';
    nouvO.push({
      id, numero: cut(n, 50), dossierId: dos.id, clientId: dos.clientId, dateOffre: d, dateValidite: ajouterJours(d, 30), objet: cut(lib.split('\n')[0].trim() || 'Offre', 500)!,
      description: lib || null, version: Math.max(1, Math.round(num(r.NbProforma)) || 1), statut: num(r.EtatSupprimer) === 1 ? 'ANNULEE' : 'BROUILLON',
      montantHT: num(r.TotalHT), montantTVA: num(r.TotalTVA), montantTTC: num(r.TotalTTC), remise: num(r.TotalRemise), createdAt: date(r.SaisieLe) ?? d,
    });
    (lignesDOffre.get(n) ?? []).sort(ordreLigne).forEach((l, i) => {
      const m = num(l.Montant); const tva = num(l.EtatTVA) === 1;
      nouvLO.push({ offreId: id, ordre: i + 1, designation: cut(str(l['Libellé']) ?? '-', 500)!, quantite: 1, prixUnitaire: m, montantHT: tva ? 0 : m, tauxTVA: tva ? 18 : 0, montantTVA: tva ? m : 0 });
    });
  }
  await inserer('offreCommerciale', nouvO); await inserer('ligneOffre', nouvLO, 2000);
  noter('Offres commerciales', nouvO.length, oExist.size, oIgn); noter('Lignes d\'offre', nouvLO.length);

  // ---------- Cautions ----------
  const cDb = await prisma.caution.findMany({ where: { societeId, observations: { startsWith: 'Reprise ETL 2026' } }, select: { observations: true } });
  const cMarques = new Set(cDb.map((c) => (c.observations ?? '').match(/n°(\d+)/)?.[1]).filter(Boolean));
  const nouvCa: any[] = []; let caIgn = 0; let caSansDossier = 0;
  for (const r of cautions6) {
    const no = String(Math.round(num(r['N° Enr.']))); if (cMarques.has(no)) continue;
    const montant = num(r.Montant_Caussion); if (!montant) { caIgn++; signaler('CAUTION', no, 'REJET', 'montant-nul', str(r.NumBL) ?? ''); continue; }
    const dos = trouveDossier(r.NumDossier); if (!dos) caSansDossier++;
    const etat = norm(str(r.EtatCaussion));
    const statut = etat.includes('NON ACTIV') ? 'NON_ACTIVE' : date(r.DatePaiement) ? 'PAYEE' : date(r.DateDepotCourrier) ? 'COURRIER_DEPOSE' : 'EN_ATTENTE';
    const obs = `Reprise ETL 2026 n°${no}${str(r.Observation) ? ` : ${str(r.Observation)}` : ''}`;
    nouvCa.push({ societeId, dateCaution: date(r.Date_caution), dossierId: dos?.id ?? null, numeroBL: cut(str(r.NumBL), 100), clientId: dos?.clientId ?? null, quantite: Math.max(1, Math.round(num(r.Nbre)) || 1), montant, compagnie: cut(str(r.Nom_Compagnie), 100), dateDepotCourrier: date(r.DateDepotCourrier), datePaiement: date(r.DatePaiement), statut, observations: obs });
  }
  await inserer('caution', nouvCa);
  noter('Cautions', nouvCa.length, cMarques.size, caIgn);
  if (caSansDossier) signaler('CAUTION', '(ensemble)', 'ALERTE', 'caution-sans-dossier', `${caSansDossier} cautions dont le dossier est introuvable (importées sans dossier)`);

  // ---------- Rapport ----------
  fs.mkdirSync(SORTIE, { recursive: true });
  const csv = ['entite;cle;gravite;regle;detail', ...signalements.map((l) => [l.entite, l.cle, l.gravite, l.regle, l.detail].map((x) => `"${String(x).replace(/"/g, '""').replace(/\r?\n/g, ' ')}"`).join(';'))].join('\n');
  fs.writeFileSync(path.join(SORTIE, 'rejets.csv'), '\uFEFF' + csv, 'utf8');
  fs.writeFileSync(path.join(SORTIE, 'rapport.json'), JSON.stringify({ genereLe: new Date().toISOString(), appliquer: APPLIQUER, bilan, factures: { nouvellesPayeRepris: Math.round(payeNouvelles), reporteesEcartPaye: diff }, signalements: signalements.length }, null, 2), 'utf8');
  console.log('\nSIGNALEMENTS');
  const parRegle = new Map<string, number>(); signalements.forEach((l) => parRegle.set(`${l.gravite} ${l.entite} ${l.regle}`, (parRegle.get(`${l.gravite} ${l.entite} ${l.regle}`) ?? 0) + 1));
  [...parRegle].sort((a, b) => b[1] - a[1]).forEach(([k, n]) => console.log(`  ${String(n).padStart(5)}  ${k}`));
  console.log(`\nRapports : ${SORTIE}\n${APPLIQUER ? 'DONNÉES ÉCRITES EN BASE.' : 'Simulation : aucune donnée écrite. Relancer avec --appliquer.'}`);
}

main().catch((e) => { console.error('ÉCHEC :', e); process.exit(1); }).finally(() => prisma.$disconnect());

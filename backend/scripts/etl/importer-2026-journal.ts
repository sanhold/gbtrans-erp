/**
 * ETL ancien logiciel -> GBTRANS ERP : REPRISE 2026, PARTIE « JOURNAL » (delta sur la reprise de 2025).
 *
 * Importe les lignes du journal REGLEMENT 2026 qui ne sont pas des copies de lignes de la base 2025 :
 * caisse, banque, comptes clients, comptes fournisseurs, dépenses de dossier et paiements de factures.
 * Les soldes de la caisse, des banques et des comptes tiers sont AJUSTÉS du mouvement des lignes créées
 * (la base de 2025 a déjà fixé le solde de fin 2025) : le journal 2026 reçu ne contient encore ni
 * approvisionnement de caisse ni mouvement bancaire, qui seront ajoutés plus tard par un second passage
 * (relançable : une ligne déjà importée, numéro `ETL26-<N° Enr.>`, est ignorée et n'ajuste pas deux fois).
 *
 * Copies de 2025 : une ligne de 2026 est une copie si une ligne de la base 2025 a la même date, le même compte,
 * la même entrée et la même sortie (comparaison en multi-ensemble, une ligne de 2025 ne sert qu'une fois).
 * Les lignes datées d'avant 2026 qui ne sont pas retrouvées dans 2025 sont importées (saisies après l'export de
 * 2025) et listées dans logs/etl-2026/journal-lignes-anterieures.csv.
 *
 * Factures : un règlement de facture crée un Paiement, plafonné au reste dû ; le payé de la facture ne fait
 * que monter (max du payé actuel et du total des paiements, plafonné au TTC). Excédent : opération « à vérifier ».
 *
 * Usage (depuis backend/) :
 *   DATABASE_URL=<base> npx ts-node --transpile-only scripts/etl/importer-2026-journal.ts [--appliquer]
 *        [--societe=ETL] [--dir2026="C:\...\ETL 2026"] [--dir2025="C:\...\ETL"]
 * Sans --appliquer : simulation. Base non locale refusée sans ETL_AUTORISER_DISTANT=OUI_PRODUCTION.
 */
import 'dotenv/config';
import { randomUUID } from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import { PrismaClient } from '@prisma/client';
import {
  Row, str, num, date, norm, cut, lire, normaliserNumeroDossier, modePaiement, loginDe, calculerFusionClients,
  COMPTE_CLIENT_IMPOSE, DOUBLON_DE, exigerHoteAttendu } from './commun';

const args = process.argv.slice(2);
const APPLIQUER = args.includes('--appliquer');
const opt = (nom: string, defaut: string) => args.find((a) => a.startsWith(`--${nom}=`))?.split('=').slice(1).join('=') ?? defaut;
const CODE_SOCIETE = opt('societe', 'ETL');
const DIR26 = opt('dir2026', 'C:\\Users\\SANOGO\\Desktop\\ETL 2026');
const DIR25 = opt('dir2025', 'C:\\Users\\SANOGO\\Desktop\\ETL');
const SORTIE = path.resolve(__dirname, '..', '..', 'logs', 'etl-2026');
const PREFIXE = 'ETL26-';

const prisma = new PrismaClient();
const fmt = (n: number) => Math.round(n).toLocaleString('fr-FR').replace(/\u202f/g, ' ');
const jour = (d: Date) => d.toISOString().slice(0, 10);
const sansEspaces = (s: string | null) => norm(s).replace(/ /g, '');
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
  exigerHoteAttendu(hote);
  if (!['localhost', '127.0.0.1', '::1'].includes(hote) && process.env.ETL_AUTORISER_DISTANT !== 'OUI_PRODUCTION') {
    console.error(`REFUS : la base ${hote} n'est pas locale. Définir ETL_AUTORISER_DISTANT=OUI_PRODUCTION après sauvegarde et validation sur une copie.`);
    process.exit(1);
  }
}
const csv = (nom: string, entete: string[], lignes: (string | number)[][]) => {
  fs.mkdirSync(SORTIE, { recursive: true });
  const esc = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
  fs.writeFileSync(path.join(SORTIE, nom), '\ufeff' + [entete, ...lignes].map((l) => l.map(esc).join(';')).join('\r\n'));
};

async function main() {
  garde();
  console.log(`Source 2026 : ${DIR26}\nSource 2025 : ${DIR25}\nSociété : ${CODE_SOCIETE}\n`);
  const societe = await prisma.societe.findUnique({ where: { code: CODE_SOCIETE } });
  if (!societe) { console.error(`Société « ${CODE_SOCIETE} » introuvable.`); process.exit(1); }
  const societeId = societe.id;

  const rg6 = lire(DIR26, 'REGLEMENT 2026');
  const rg5 = lire(DIR25, 'Reglement');
  const clients5 = lire(DIR25, 'Table Client'); const dossiers5 = lire(DIR25, 'Dossier 2025');
  const clients6 = lire(DIR26, 'CLIENT2026').filter((r) => str(r.NumInterneClient));
  const fourn5 = lire(DIR25, 'Table Fournisseur');

  // ---------- Fusion des clients (même règle que la reprise des documents 2026) ----------
  const fusion = calculerFusionClients(clients5, dossiers5);
  const codes5 = new Set(clients5.map((r) => String(r['N° Client']).trim()));
  const parNcc = new Map<string, string>(); const parRs = new Map<string, string>();
  clients5.filter((r) => !fusion.has(String(r['N° Client']).trim())).forEach((r) => {
    const c = String(r['N° Client']).trim(); const n = sansEspaces(str(r['N° CC'])); if (n) parNcc.set(n, c); parRs.set(norm(str(r['Raison Sociale'])), c);
  });
  for (const r of clients6) {
    const code = String(r.NumInterneClient).trim();
    if (codes5.has(code) || fusion.has(code)) continue;
    const n = sansEspaces(str(r.NumCC)); const cible = (n && parNcc.get(n)) || parRs.get(norm(str(r.RaisonSociale)));
    if (cible) fusion.set(code, cible); else { if (n) parNcc.set(n, code); parRs.set(norm(str(r.RaisonSociale)), code); }
  }
  const survivant = (c: string) => fusion.get(c) ?? c;

  // ---------- Référentiels de la base ----------
  const caisse = await prisma.caisse.findFirst({ where: { societeId, code: 'CAISSE' } });
  if (!caisse) { console.error('Caisse « CAISSE » introuvable : la reprise de 2025 doit être faite d\'abord.'); process.exit(1); }
  const banqueId = new Map((await prisma.compteBancaire.findMany({ where: { societeId }, select: { id: true, code: true, rib: true } })).map((c) => [c.rib ?? c.code, c.id]));
  const clientsDb = new Map((await prisma.client.findMany({ where: { societeId }, select: { id: true, code: true } })).map((c) => [c.code, c.id]));
  const fournCodes = new Set(fourn5.map((r) => String(r['N° Fournisseur']).trim()));
  const libFourn = new Map(fourn5.map((r) => [String(r['N° Fournisseur']).trim(), str(r['Raison Sociale']) ?? '']));
  const tExist = new Map((await prisma.compteTiers.findMany({ where: { societeId }, select: { id: true, code: true } })).map((t) => [t.code, t.id]));
  const usersMail = new Map((await prisma.utilisateur.findMany({ select: { id: true, email: true } })).map((u) => [u.email, u.id]));
  const importUser = usersMail.get('etl-import@etl-import.local');
  if (!importUser) { console.error('Utilisateur de reprise introuvable.'); process.exit(1); }
  const userDeSaisie = (v: any): string => { const s = str(v); return (s && usersMail.get(`${loginDe(s).toLowerCase().replace(/[^a-z0-9]+/g, '-')}@etl-import.local`)) || importUser; };
  const dossiersDb = new Map<string, string>();
  (await prisma.dossier.findMany({ where: { societeId }, select: { id: true, numero: true, numeroPhysique: true } })).forEach((d) => { dossiersDb.set(d.numero.toUpperCase(), d.id); if (d.numeroPhysique) dossiersDb.set(d.numeroPhysique.toUpperCase(), d.id); });
  const trouveDossier = (v: any) => { const s = str(v); return s ? dossiersDb.get(s.toUpperCase()) ?? dossiersDb.get(normaliserNumeroDossier(s).numero.toUpperCase()) : undefined; };

  const opExist = new Set((await prisma.operationFinanciere.findMany({ where: { societeId, numero: { startsWith: PREFIXE } }, select: { numero: true } })).map((o) => o.numero));
  const depExist = new Set((await prisma.depense.findMany({ where: { societeId, numero: { startsWith: PREFIXE } }, select: { numero: true } })).map((o) => o.numero));
  const paiExist = new Set((await prisma.paiement.findMany({ where: { numero: { startsWith: PREFIXE }, client: { societeId } }, select: { numero: true } })).map((o) => o.numero));

  // ---------- Copies de la base 2025 (multi-ensemble) ----------
  const cle = (r: Row) => `${jour(date(r['DateRèglement']) ?? new Date(0))}|${str(r.NumCompte) ?? ''}|${Math.round(num(r['MontantReglé']))}|${Math.round(num(r.Depense))}`;
  const dispo = new Map<string, number>();
  rg5.forEach((r) => { if (num(r.supprimer) === 1) return; const k = cle(r); dispo.set(k, (dispo.get(k) ?? 0) + 1); });

  // ---------- Factures concernées : TTC, payé, total déjà rattaché ----------
  const pieces = [...new Set(rg6.map((r) => (str(r.NumCheque) ?? '').toUpperCase()).filter((p) => p.startsWith('FACT')))];
  const facDb = new Map<string, { id: string; clientId: string; ttc: number; paye: number; lie: number }>();
  for (let i = 0; i < pieces.length; i += 500) {
    const lot = await prisma.facture.findMany({ where: { societeId, numero: { in: pieces.slice(i, i + 500) } }, select: { id: true, numero: true, clientId: true, montantTTC: true, montantPaye: true } });
    const lies = await prisma.paiementFacture.groupBy({ by: ['factureId'], where: { factureId: { in: lot.map((f) => f.id) } }, _sum: { montant: true } });
    const lieDe = new Map(lies.map((l) => [l.factureId, Number(l._sum.montant ?? 0)]));
    lot.forEach((f) => facDb.set(f.numero.toUpperCase(), { id: f.id, clientId: f.clientId, ttc: Number(f.montantTTC), paye: Number(f.montantPaye), lie: lieDe.get(f.id) ?? 0 }));
  }

  // ---------- Journal ----------
  const nouvT: any[] = []; const tiersId = new Map<string, string>();
  const tiers = (code: string, libelle: string, type: string): string => {
    const ex = tExist.get(code) ?? tiersId.get(code); if (ex) { tiersId.set(code, ex); return ex; }
    const id = randomUUID(); tiersId.set(code, id); nouvT.push({ id, societeId, code: cut(code, 20), libelle: cut(libelle, 200), type }); return id;
  };
  const delta = { caisse: 0, banque: new Map<string, number>(), tiers: new Map<string, number>() };
  const nouvOp: any[] = []; const nouvDep: any[] = []; const nouvPai: any[] = []; const nouvPF: any[] = [];
  const touche = new Map<string, { numero: string; avant: number; ajoute: number }>(); // facture -> variation du total rattaché
  const classes: Record<string, number> = {}; const compte = (k: string) => { classes[k] = (classes[k] ?? 0) + 1; };
  const anterieures: (string | number)[][] = []; const ignores: Record<string, number> = {};
  const ign = (k: string) => { ignores[k] = (ignores[k] ?? 0) + 1; };
  let dejaImportes = 0;

  for (const r of rg6) {
    const idSrc = r['N° Enr.']; const numero = `${PREFIXE}${idSrc}`;
    if (num(r.supprimer) === 1) { ign('supprimée'); continue; }
    const e = num(r['MontantReglé']); const s = num(r.Depense);
    if (e === 0 && s === 0) { ign('montant nul (report à nouveau)'); continue; }
    const brute = date(r['DateRèglement']);
    const k = cle(r); const nb = dispo.get(k) ?? 0;
    if (brute && brute.getFullYear() < 2026 && nb > 0) { dispo.set(k, nb - 1); ign('copie de la base 2025'); continue; }
    if (opExist.has(numero) || depExist.has(numero) || paiExist.has(numero)) { dejaImportes++; continue; }
    const saisi = date(r.SaisiLe); let d = brute;
    if (!d || d.getFullYear() < 2020 || (saisi && d.getTime() > saisi.getTime() + 31 * 86400000)) { if (saisi) d = saisi; else { ign('date illisible'); continue; } }
    const anterieure = d.getFullYear() < 2026;

    let type = str(r.Type_Compte); let cpt = str(r.NumCompte);
    if (!type && COMPTE_CLIENT_IMPOSE[String(idSrc)]) { type = 'COMPTE CLIENT'; cpt = COMPTE_CLIENT_IMPOSE[String(idSrc)]; }
    if (!type && cpt && banqueId.has(cpt)) type = 'BANQUE';
    if (!type && cpt && fournCodes.has(cpt)) type = 'COMPTE FOURNISSEUR';
    else if (!type && cpt && clientsDb.has(survivant(cpt))) type = 'COMPTE CLIENT';
    const sansCompte = !type; if (!type) type = 'SANS_COMPTE';
    if (type === 'COMPTE CLIENT' && cpt) cpt = survivant(cpt);
    const mode = modePaiement(r['ModeRèglement']);
    const valide = num(r.Etat_Encaissement) === 1;
    const motif = str(r.Motif); const tt = (str(r.TypeTransaction) ?? 'OPERATION').trim();
    const piece = (str(r.NumCheque) ?? '').toUpperCase();
    const montant = e > 0 ? e : s;
    const doublon = DOUBLON_DE[String(idSrc)];
    const base = { societeId, numero, dateOperation: d, libelle: cut(doublon ? `${motif ?? tt} (doublon de N° ${doublon})` : motif ?? tt, 500)!, reference: cut(str(r.NumCheque), 100), beneficiaire: cut(str(r.NumTiers), 200), statut: sansCompte ? 'A_VERIFIER' : valide ? 'VALIDE' : 'EN_ATTENTE', observations: [str(r.NumFacture) ? `Dossier ${str(r.NumFacture)}` : null, anterieure ? 'Ligne datée d\'avant 2026, absente de la base 2025 (reprise 2026)' : null].filter(Boolean).join(' ; ') || null, createdAt: saisi ?? d };
    const client = type === 'COMPTE CLIENT';
    const sensOp = (e > 0) !== client ? 'ENTREE' : 'SORTIE'; // compte client : sens inversé (acompte = entrée dans l'application)
    const construireOperation = (numOp: string, montantOp: number, extra: Record<string, unknown> = {}) => {
      const op: any = { id: randomUUID(), ...base, ...extra, numero: numOp, montant: montantOp, sens: sensOp, type: client ? (sensOp === 'ENTREE' ? 'ENCAISSEMENT' : 'DECAISSEMENT') : /^RETRAIT/i.test(tt) ? 'RETRAIT' : /^APPRO|^REMISE|^DEPOT|^DEPÔT/i.test(tt) ? 'VIREMENT_INTERNE' : sensOp === 'ENTREE' ? 'ENCAISSEMENT' : 'DECAISSEMENT' };
      let cl: string;
      if (type === 'CAISSE') { cl = sensOp === 'ENTREE' ? 'entree-caisse' : 'sortie-caisse'; op.caisseId = caisse.id; }
      else if (type === 'BANQUE') { cl = 'operation-bancaire'; op.compteBancaireId = cpt ? banqueId.get(cpt) ?? null : null; }
      else if (type === 'COMPTE FOURNISSEUR' && cpt) { cl = 'compte-fournisseur'; op.compteTiersId = tiers(cpt, libFourn.get(cpt) ?? cpt, 'FOURNISSEUR'); }
      else if (client && cpt) { cl = 'compte-client'; op.compteTiersId = tiers(cpt, `Compte client ${cpt}`, 'CLIENT'); }
      else cl = 'autre';
      return { op, cl };
    };
    const ajusterSolde = (m: number) => { // mouvement des lignes créées, au sens de l'application
      if (type === 'CAISSE') delta.caisse += e - s;
      else if (type === 'BANQUE' && cpt) delta.banque.set(cpt, (delta.banque.get(cpt) ?? 0) + e - s);
      else if (type === 'COMPTE FOURNISSEUR' && cpt) delta.tiers.set(cpt, (delta.tiers.get(cpt) ?? 0) + e - s);
      else if (client && cpt) delta.tiers.set(cpt, (delta.tiers.get(cpt) ?? 0) + s - e);
      void m;
    };
    if (anterieure) anterieures.push([idSrc, jour(d), type, cpt ?? '', tt, str(r.NumFacture) ?? '', piece, e, s, motif ?? '']);
    const f = piece.startsWith('FACT') && e > 0 ? facDb.get(piece) : undefined;

    if (f) { // règlement d'une facture présente en base
      const dejaLie = touche.get(f.id)?.ajoute ?? 0;
      const reste = Math.max(0, f.ttc - f.lie - dejaLie); const imputable = Math.min(e, reste); const exces = e - imputable;
      if (imputable > 1) {
        const pid = randomUUID();
        nouvPai.push({ id: pid, numero, clientId: f.clientId, datePaiement: d, montant: imputable, modePaiement: client ? 'COMPENSATION' : mode, reference: cut(piece, 100), banque: null, observations: motif, statut: valide ? 'VALIDE' : 'EN_ATTENTE', caisseId: type === 'CAISSE' ? caisse.id : null, compteBancaireId: type === 'BANQUE' && cpt ? banqueId.get(cpt) ?? null : null, createurId: userDeSaisie(r.SaisiPar), createdAt: saisi ?? d });
        nouvPF.push({ paiementId: pid, factureId: f.id, montant: imputable });
        touche.set(f.id, { numero: piece, avant: f.paye, ajoute: dejaLie + imputable });
        compte('paiement-facture');
      }
      if (exces > 1) {
        const { op } = construireOperation(imputable > 1 ? `${numero}-EXC` : numero, exces, { statut: 'A_VERIFIER', libelle: cut(`${motif ?? tt} (excédent de règlement de ${piece} : doublon probable)`, 500) });
        nouvOp.push(op); compte('reglement-excedentaire');
      }
      ajusterSolde(montant); continue;
    }
    if (type === 'CAISSE' && s > 0 && str(r.NumFacture) && trouveDossier(r.NumFacture)) {
      nouvDep.push({ id: randomUUID(), societeId, numero, dossierId: trouveDossier(r.NumFacture)!, caisseId: caisse.id, dotationId: null, dateDepense: d, categorie: cut(tt, 100), designation: cut(motif ?? tt, 500), montant: s, modePaiement: mode, reference: cut(str(r.NumCheque), 100), statut: 'VALIDE', createdAt: saisi ?? d });
      compte('depense-dossier'); ajusterSolde(montant); continue;
    }
    const { op, cl } = construireOperation(numero, montant);
    nouvOp.push(op); compte(cl); ajusterSolde(montant);
  }

  // ---------- Écriture ----------
  console.log(`Journal 2026 : ${rg6.length} lignes lues`);
  console.log(`  ignorées : ${JSON.stringify(ignores)} ; déjà importées : ${dejaImportes}`);
  console.log(`  à créer : ${nouvOp.length} opérations, ${nouvDep.length} dépenses de dossier, ${nouvPai.length} paiements de facture, ${nouvT.length} comptes tiers`);
  console.log(`  classes : ${JSON.stringify(classes)} ; dont ${anterieures.length} lignes antérieures à 2026`);
  await inserer('compteTiers', nouvT);
  await inserer('operationFinanciere', nouvOp); await inserer('depense', nouvDep);
  await inserer('paiement', nouvPai); await inserer('paiementFacture', nouvPF);

  // Payé des factures : ne fait que monter
  const lignesF: (string | number)[][] = []; let facMaj = 0; let payeAjoute = 0;
  for (const [id, t] of touche) {
    const f = [...facDb.values()].find((x) => x.id === id)!; const total = Math.min(f.ttc, f.lie + t.ajoute);
    const nouveau = Math.max(f.paye, total); const hausse = nouveau - f.paye;
    lignesF.push([t.numero, f.ttc, f.paye, f.lie, t.ajoute, nouveau, hausse]);
    if (hausse > 1) {
      facMaj++; payeAjoute += hausse;
      if (APPLIQUER) await prisma.facture.update({ where: { id }, data: { montantPaye: nouveau, resteAPayer: f.ttc - nouveau, statut: nouveau >= f.ttc - 1 ? 'PAYEE' : 'PARTIELLEMENT_PAYEE' } });
    }
  }
  console.log(`  factures touchées : ${touche.size}, payé en hausse sur ${facMaj} (+${fmt(payeAjoute)})`);

  // Soldes : ajustement par le mouvement des lignes créées
  console.log('  ajustement des soldes :');
  console.log(`    caisse ${delta.caisse >= 0 ? '+' : ''}${fmt(delta.caisse)}`);
  for (const [n, v] of delta.banque) console.log(`    banque ${n} ${v >= 0 ? '+' : ''}${fmt(v)}`);
  const fort = [...delta.tiers].sort((a, b) => Math.abs(b[1]) - Math.abs(a[1])).slice(0, 8);
  console.log(`    comptes tiers touchés : ${delta.tiers.size} ; les plus mouvementés : ${fort.map(([c, v]) => `${c} ${v >= 0 ? '+' : ''}${fmt(v)}`).join(', ')}`);
  if (APPLIQUER) {
    if (delta.caisse) await prisma.caisse.update({ where: { id: caisse.id }, data: { solde: { increment: delta.caisse } } });
    for (const [n, v] of delta.banque) { const id = banqueId.get(n); if (id && v) await prisma.compteBancaire.update({ where: { id }, data: { solde: { increment: v } } }); }
    for (const [c, v] of delta.tiers) { const id = tExist.get(c) ?? tiersId.get(c); if (id && v) await prisma.compteTiers.update({ where: { id }, data: { solde: { increment: v } } }); }
  }
  const soldeCaisse = await prisma.caisse.findUnique({ where: { id: caisse.id }, select: { solde: true } });
  console.log(`  solde de la caisse en base : ${fmt(Number(soldeCaisse?.solde ?? 0))}${APPLIQUER ? '' : ` (avant ajustement ; après : ${fmt(Number(soldeCaisse?.solde ?? 0) + delta.caisse)})`}`);

  csv('journal-lignes-anterieures.csv', ['N° Enr.', 'date', 'type de compte', 'compte', 'transaction', 'dossier', 'pièce', 'entrée', 'sortie', 'motif'], anterieures);
  csv('journal-factures.csv', ['facture', 'TTC', 'payé avant', 'déjà rattaché', 'rattaché par ce passage', 'payé après', 'hausse'], lignesF);
  fs.writeFileSync(path.join(SORTIE, 'journal-rapport.json'), JSON.stringify({ ignores, classes, aCreer: { operations: nouvOp.length, depenses: nouvDep.length, paiements: nouvPai.length, comptesTiers: nouvT.length }, delta: { caisse: delta.caisse, banque: Object.fromEntries(delta.banque), comptesTiers: delta.tiers.size }, factures: { touchees: touche.size, majPaye: facMaj, payeAjoute } }, null, 2));
  console.log(`\nRapports : ${SORTIE}`);
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());

/**
 * ETL ancien logiciel -> GBTRANS ERP : IMPORT RÉEL (écrit en base).
 *
 * Usage (depuis backend/) :
 *   DATABASE_URL=<base> npx tsx scripts/etl/importer.ts --appliquer [--societe=ETL] [--creer-societe] [dossier-excel]
 *
 * Garde-fous :
 *   - sans --appliquer, le script ne fait rien (utiliser simuler-import.ts pour une simulation) ;
 *   - une base qui n'est pas localhost est refusée, sauf si ETL_AUTORISER_DISTANT=OUI_PRODUCTION ;
 *   - --creer-societe n'est accepté que sur une base locale ;
 *   - relançable : chaque objet déjà présent (code, numéro) est ignoré, les lignes filles ne sont créées
 *     que pour les parents créés pendant l'exécution.
 * Règles : voir docs/ETL-analyse-migration.md et les décisions validées (année du numéro, proforma jumelle,
 * orphelins ignorés, payé recalculé depuis les règlements, dotations non validées annulées...).
 */
import 'dotenv/config';
import { randomUUID } from 'crypto';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';
import {
  Row, str, num, date, norm, cut, estTotal, ajouterJours, lire, normaliserNumeroDossier,
  STATUT_DOSSIER, TYPE_TRANSPORT, natureDossier, modePaiement, loginDe, calculerFusionClients,
} from './commun';

const args = process.argv.slice(2);
const APPLIQUER = args.includes('--appliquer');
const CREER_SOCIETE = args.includes('--creer-societe');
const CODE_SOCIETE = (args.find((a) => a.startsWith('--societe=')) ?? '--societe=ETL').split('=')[1];
const DIR = args.find((a) => !a.startsWith('--')) || process.env.ETL_DIR || 'C:\\Users\\SANOGO\\Desktop\\ETL';

const prisma = new PrismaClient();
const bilan: { entite: string; crees: number; existants: number; ignores: number }[] = [];
const avertissements: string[] = [];
const avert = (m: string) => { if (avertissements.length < 500) avertissements.push(m); };
const fmt = (n: number) => Math.round(n).toLocaleString('fr-FR').replace(/\u202f/g, ' ');

function garde() {
  const url = process.env.DATABASE_URL || '';
  const m = url.match(/@([^:/]+)(?::\d+)?\/([^?]+)/);
  const hote = m?.[1] ?? '?'; const base = m?.[2] ?? '?';
  console.log(`Base cible : ${hote} / ${base}`);
  if (!APPLIQUER) {
    console.log('Aucune écriture : relancer avec --appliquer. (Pour une simulation : scripts/etl/simuler-import.ts)');
    process.exit(0);
  }
  const local = ['localhost', '127.0.0.1', '::1'].includes(hote);
  if (!local && process.env.ETL_AUTORISER_DISTANT !== 'OUI_PRODUCTION') {
    console.error(`REFUS : la base ${hote} n'est pas locale. Définir ETL_AUTORISER_DISTANT=OUI_PRODUCTION après sauvegarde et validation sur une copie.`);
    process.exit(1);
  }
  if (!local && CREER_SOCIETE) { console.error('REFUS : --creer-societe est réservé aux bases locales.'); process.exit(1); }
}

async function inserer(model: string, rows: any[], taille = 1000) {
  const d = (prisma as any)[model];
  for (let i = 0; i < rows.length; i += taille) await d.createMany({ data: rows.slice(i, i + taille), skipDuplicates: true });
}
const noter = (entite: string, crees: number, existants = 0, ignores = 0) => {
  bilan.push({ entite, crees, existants, ignores });
  console.log(`  ${entite.padEnd(30)} créés ${String(crees).padStart(6)}  déjà présents ${String(existants).padStart(6)}  ignorés ${String(ignores).padStart(5)}`);
};

async function main() {
  garde();
  console.log(`Source : ${DIR}\nSociété : ${CODE_SOCIETE}\n`);

  // ---------- Société ----------
  let societe = await prisma.societe.findUnique({ where: { code: CODE_SOCIETE } });
  if (!societe) {
    if (!CREER_SOCIETE) { console.error(`Société « ${CODE_SOCIETE} » introuvable. (--creer-societe sur une base locale uniquement.)`); process.exit(1); }
    const s = lire(DIR, 'Societe')[0];
    societe = await prisma.societe.create({
      data: {
        code: CODE_SOCIETE, raisonSociale: str(s.RaisonSocial) ?? 'ETL', email: str(s.Email), telephone: str(s.Telphone),
        mobile: str(s.Celulaire), adresse: str(s.SP), ville: str(s.Ville), mentionLegale: str(s.Description),
        activiteTransit: true, activiteTransport: true,
      },
    });
    console.log(`Société créée (copie locale) : ${societe.raisonSociale}`);
  }
  const societeId = societe.id;

  // ---------- Lecture des sources ----------
  const clientsSrc = lire(DIR, 'Table Client');
  const fournSrc = lire(DIR, 'Table Fournisseur');
  const dossiersSrc = lire(DIR, 'Dossier 2025');
  const produitsSrc = lire(DIR, 'Produit 2026');
  const atSrc = lire(DIR, 'Table AT2025').filter((r) => !estTotal(r['Id. AT']));
  const proSrc = lire(DIR, 'Table Proforma2025');
  const detProSrc = lire(DIR, 'DetailProforma');
  const facSrc = [...lire(DIR, 'Table Facture2025'), ...lire(DIR, 'Table FactureN2 2025')].filter((r) => str(r['N° Facture']));
  const detFacSrc = lire(DIR, 'DetailFacture');
  const dotSrc = lire(DIR, 'Dotation2025');
  const rgSrc = lire(DIR, 'Reglement');
  const elementsSrc = lire(DIR, 'Element');
  const etapesSrc = lire(DIR, 'Etape');
  const banquesSrc = lire(DIR, 'Liste Compte Bancaire').filter((r) => !estTotal(r['N°']) && !estTotal(r.Nom));

  // ---------- Utilisateurs de reprise (inactifs, non connectables) ----------
  const hashInutilisable = await bcrypt.hash(randomUUID(), 8);
  const utilisateurs = new Map<string, string>(); // login ou matricule -> id
  const existantsU = await prisma.utilisateur.findMany({ select: { id: true, email: true, matricule: true } });
  const parEmail = new Map(existantsU.map((u) => [u.email, u.id]));
  const nouveauxU: any[] = []; let uExist = 0;
  const assurerUtilisateur = (cle: string, nom: string, prenom: string, matricule: string): string => {
    if (utilisateurs.has(cle)) return utilisateurs.get(cle)!;
    const email = `${cle.toLowerCase().replace(/[^a-z0-9]+/g, '-')}@etl-import.local`;
    let id = parEmail.get(email);
    if (id) uExist++;
    else {
      id = randomUUID(); parEmail.set(email, id);
      nouveauxU.push({ id, societeId, matricule, nom, prenom, email, motDePasse: hashInutilisable, actif: false, doitChangerMdp: true });
    }
    utilisateurs.set(cle, id); return id;
  };
  const importUser = assurerUtilisateur('etl-import', 'Reprise', 'ETL', 'ETL-IMPORT');
  const userDeSaisie = (v: any): string => {
    const s = str(v); if (!s) return importUser;
    const l = loginDe(s); const p = l.split('.');
    return assurerUtilisateur(l, p[0].toUpperCase(), p.slice(1).join(' ').toUpperCase() || '-', `ETL-${l}`.toUpperCase().slice(0, 50));
  };
  rgSrc.forEach((r) => { userDeSaisie(r.SaisiPar); });
  facSrc.forEach((r) => { userDeSaisie(r.SaisiePar); });
  proSrc.forEach((r) => { userDeSaisie(r.SaisiePar); });
  const agentDeMatricule = (mat: string): string =>
    assurerUtilisateur(`agent-${mat}`, 'Agent', mat, mat.slice(0, 50));
  dotSrc.forEach((r) => { agentDeMatricule(str(r.Matricule) ?? 'INCONNU'); });
  await inserer('utilisateur', nouveauxU);
  noter('Utilisateurs de reprise', nouveauxU.length, uExist);

  // ---------- Clients ----------
  const fusion = calculerFusionClients(clientsSrc, dossiersSrc);
  const survivant = (c: string) => fusion.get(c) ?? c;
  const clientsExist = new Map((await prisma.client.findMany({ where: { societeId }, select: { id: true, code: true } })).map((c) => [c.code, c.id]));
  const clientId = new Map<string, string>(); // code survivant -> id
  const nouveauxC: any[] = []; let cExist = 0;
  const creerClient = (code: string, data: any) => {
    const ex = clientsExist.get(code);
    if (ex) { clientId.set(code, ex); cExist++; return; }
    const id = randomUUID(); clientId.set(code, id); clientsExist.set(code, id);
    nouveauxC.push({ id, societeId, code, type: 'ENTREPRISE', ...data });
  };
  for (const r of clientsSrc) {
    const code = String(r['N° Client']).trim();
    if (fusion.has(code)) continue;
    const adr = str(r.Adresse); const estMail = !!adr && adr.includes('@');
    creerClient(code, {
      raisonSociale: cut(str(r['Raison Sociale']) ?? `CLIENT ${code}`, 200), ncc: cut(str(r['N° CC']), 50),
      adresse: estMail ? null : cut(adr, 500), email: estMail ? cut(adr, 200) : null,
      telephone: cut(str(r.Tel), 50), ville: cut(str(r.Localisation), 100),
    });
  }
  const clientDeCode = (c: string | null): string | null => {
    if (!c) return null; const s = survivant(c);
    if (!clientId.has(s)) { creerClient(s, { raisonSociale: `CLIENT INCONNU ${s}`, observations: undefined }); avert(`Client ${s} créé sous « CLIENT INCONNU » (absent de Table Client)`); }
    return clientId.get(s)!;
  };
  const clientParNom = new Map<string, string>();
  clientsSrc.forEach((r) => clientParNom.set(norm(str(r['Raison Sociale'])), survivant(String(r['N° Client']).trim())));
  dossiersSrc.forEach((r) => clientDeCode(str(r.NumInterneClient))); // crée les clients inconnus cités
  const nouveauxCClean = nouveauxC.map(({ observations, ...x }) => x);
  await inserer('client', nouveauxCClean);
  noter('Clients', nouveauxC.length, cExist, fusion.size);

  // ---------- Fournisseurs + comptes tiers ----------
  const fExist = new Map((await prisma.fournisseur.findMany({ where: { societeId }, select: { id: true, code: true } })).map((f) => [f.code, f.id]));
  const nouveauxF: any[] = []; const fournId = new Map<string, string>();
  for (const r of fournSrc) {
    const code = String(r['N° Fournisseur']).trim();
    if (fExist.has(code)) { fournId.set(code, fExist.get(code)!); continue; }
    const id = randomUUID(); fournId.set(code, id);
    nouveauxF.push({ id, societeId, code, type: 'PRESTATAIRE', raisonSociale: cut(str(r['Raison Sociale']) ?? code, 200), ncc: cut(str(r.NCC), 50), adresse: cut(str(r.Adresse), 500), telephone: cut(str(r['Téléphone']), 50) });
  }
  await inserer('fournisseur', nouveauxF);
  noter('Fournisseurs', nouveauxF.length, fournSrc.length - nouveauxF.length);

  // ---------- Catalogue des prestations ----------
  const pExist = new Set((await prisma.prestationCatalogue.findMany({ where: { societeId }, select: { code: true } })).map((p) => p.code));
  const vus = new Set<string>(); const nouveauxP: any[] = []; let pIgn = 0;
  for (const r of elementsSrc) {
    const lib = str(r['Libellé']); if (!lib) { pIgn++; continue; }
    const cat = str(r.Categorie_Rubrique) ?? 'AUTRES';
    const cle = `${norm(cat)}|${norm(lib)}`; if (vus.has(cle)) { pIgn++; continue; } vus.add(cle);
    const code = `R${r.IDRubrique}`; if (pExist.has(code)) continue;
    const tva = num(r.EtatTVA) === 1;
    nouveauxP.push({ societeId, code, categorie: cut(cat, 100), designation: cut(lib, 500), montantDefaut: num(r.PrixUnitaire) || null, estTVA: tva, tauxTVA: tva ? 18 : 0, ordre: num(r.NumOrdreCat) });
  }
  await inserer('prestationCatalogue', nouveauxP);
  noter('Catalogue prestations', nouveauxP.length, pExist.size, pIgn);

  // ---------- Processus de suivi ----------
  let processus = await prisma.processusSuivi.findUnique({ where: { societeId_code: { societeId, code: 'ETL-STANDARD' } } });
  if (!processus) {
    processus = await prisma.processusSuivi.create({ data: { societeId, code: 'ETL-STANDARD', nom: 'Processus standard (ancien logiciel)' } });
    await inserer('etapeProcessus', etapesSrc.map((r, i) => ({ processusId: processus!.id, ordre: i + 1, code: `E${r.IDEtape_Dossier}`, nom: cut(str(r.DesignationEtat_Dossier) ?? `Étape ${i + 1}`, 200), obligatoire: false })));
    noter('Processus + étapes', 1 + etapesSrc.length);
  } else noter('Processus + étapes', 0, 1);

  // ---------- Comptes bancaires, caisse (soldes calculés en fin d'import) ----------
  const cbExist = new Map((await prisma.compteBancaire.findMany({ where: { societeId }, select: { id: true, code: true, rib: true } })).map((c) => [c.rib ?? c.code, c.id]));
  const banqueId = new Map<string, string>(); // numéro de compte -> id
  const nouvB: any[] = [];
  const nouvelleBanque = (numero: string, nom: string, actif: boolean) => {
    if (cbExist.has(numero)) { banqueId.set(numero, cbExist.get(numero)!); return; }
    const id = randomUUID(); banqueId.set(numero, id); cbExist.set(numero, id);
    nouvB.push({ id, societeId, code: cut(`${nom}`.replace(/\s+/g, '-').toUpperCase(), 20), libelle: cut(nom, 200), banque: cut(nom, 200), rib: cut(numero, 100), actif });
  };
  banquesSrc.forEach((r) => nouvelleBanque(String(r['N°']).trim(), str(r.Nom) ?? 'BANQUE', true));
  const comptesJournal = new Set(rgSrc.filter((r) => str(r.Type_Compte) === 'BANQUE').map((r) => String(r.NumCompte).trim()));
  comptesJournal.forEach((n) => { if (!banqueId.has(n)) nouvelleBanque(n, 'COMPTE FERME ' + n, false); });
  // codes de banque en collision : suffixe
  const codes = new Set<string>(); nouvB.forEach((b) => { while (codes.has(b.code)) b.code = cut(b.code + 'X', 20)!; codes.add(b.code); });
  await inserer('compteBancaire', nouvB);
  let caisse = await prisma.caisse.findFirst({ where: { societeId, code: 'CAISSE' } });
  if (!caisse) caisse = await prisma.caisse.create({ data: { societeId, code: 'CAISSE', libelle: 'Caisse principale' } });
  noter('Comptes bancaires', nouvB.length, banqueId.size - nouvB.length);

  // ---------- Dossiers ----------
  const dExist = new Map((await prisma.dossier.findMany({ where: { societeId }, select: { id: true, numero: true, annee: true, clientId: true } })).map((d) => [`${d.numero}|${d.annee}`, d]));
  const dossierInfo = new Map<string, { id: string; clientId: string; neuf: boolean }>(); // clé numéro (source ou normalisé)
  const dossierParInterne = new Map<string, string>();
  const nouveauxD: any[] = []; const vusD = new Set<string>(); let dIgn = 0;
  for (const r of dossiersSrc) {
    const brut = str(r.NumDossier); if (!brut) { dIgn++; continue; }
    const n = normaliserNumeroDossier(brut);
    const ouverture = date(r.DateOuverture);
    const annee = n.standard ? n.annee! : (ouverture?.getFullYear() ?? date(r['DateCréation'])?.getFullYear() ?? null);
    if (!annee) { dIgn++; avert(`Dossier ${brut} ignoré : année introuvable`); continue; }
    const cle = `${n.numero}|${annee}`;
    if (vusD.has(cle)) { dIgn++; avert(`Dossier ${brut} ignoré : doublon de ${n.numero}`); continue; }
    vusD.add(cle);
    const cid = clientDeCode(str(r.NumInterneClient));
    if (!cid) { dIgn++; avert(`Dossier ${brut} ignoré : client absent`); continue; }
    const ex = dExist.get(cle);
    const id = ex?.id ?? randomUUID();
    const info = { id, clientId: ex?.clientId ?? cid, neuf: !ex };
    dossierInfo.set(brut.toUpperCase(), info); dossierInfo.set(n.numero, info);
    const interne = str(r.NumInterneDossier); if (interne) dossierParInterne.set(interne, id);
    if (ex) continue;
    const statut = STATUT_DOSSIER[norm(str(r.SituationDossier)).replace(/^(\d) /, '$1 ')] ?? 'EN_COURS';
    const transport = TYPE_TRANSPORT[norm(str(r.ModeTransport))] ?? 'MARITIME';
    const devise = str(r.MonnaieFact);
    nouveauxD.push({
      id, societeId, createurId: importUser, numero: cut(n.numero, 50), annee, nature: natureDossier(str(r.NatureDossier), n.prefixe),
      type: transport, statut, clientId: cid, processusId: processus!.id,
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
  await inserer('dossier', nouveauxD);
  noter('Dossiers', nouveauxD.length, dossierInfo.size ? [...new Set([...dossierInfo.values()].filter((v) => !v.neuf).map((v) => v.id))].length : 0, dIgn);
  const trouveDossier = (v: any) => { const s = str(v); return s ? dossierInfo.get(s.toUpperCase()) ?? dossierInfo.get(normaliserNumeroDossier(s).numero) : undefined; };

  // ---------- Articles ----------
  const compteurArticle = new Map<string, number>(); const nouveauxA: any[] = []; let aIgn = 0;
  for (const r of produitsSrc) {
    const did = dossierParInterne.get(str(r.NumInterneDossier) ?? '');
    const info = did ? [...dossierInfo.values()].find((v) => v.id === did) : undefined;
    if (!did || !info?.neuf) { aIgn++; continue; }
    const k = (compteurArticle.get(did) ?? 0) + 1; compteurArticle.set(did, k);
    nouveauxA.push({
      dossierId: did, numero: k, designation: cut(str(r.Description) ?? 'Sans désignation', 500), type: cut(str(r.TypeLigneProduit), 100),
      marque: cut(str(r.Categorie), 200), positionTarifaire: cut(str(r.Position_Tarifaire), 50), quantite: num(r.NbreColis) || 1,
      poids: num(r.Poids) || null, observations: str(r.NumLigneProduit) ? `Châssis / série : ${str(r.NumLigneProduit)}` : null,
      dateLivraison: date(r.DateLivraison), bonLivraison: cut(str(r.NumBonLivraison), 100),
    });
  }
  await inserer('article', nouveauxA);
  noter('Articles', nouveauxA.length, 0, aIgn);

  // ---------- Admissions temporaires ----------
  const atExist = new Set((await prisma.admissionTemporaire.findMany({ where: { societeId }, select: { numero: true } })).map((a) => a.numero));
  const vuAT = new Set<string>(); let atCrees = 0, atIgn = 0;
  for (const r of atSrc) {
    const info = trouveDossier(r['N° Dossier']); const echeance = date(r['Date Échéance']);
    const numero = cut(str(r['N° déclaration']) ?? `AT-${r['Id. AT']}`, 50)!;
    if (!info || !echeance || vuAT.has(numero.toUpperCase()) || atExist.has(numero)) { atIgn++; continue; }
    vuAT.add(numero.toUpperCase());
    const decl = date(r['Date déclaration']) ?? date(r['Date Création']) ?? echeance;
    const cid = clientParNom.get(norm(str(r.Client)));
    const at = await prisma.admissionTemporaire.create({
      data: {
        societeId, numero, clientId: cid ? clientId.get(cid) ?? null : null, declarant: cut(str(r.Declarant), 200), nature: cut(str(r.Nature), 200),
        dateCreation: date(r['Date Création']) ?? decl, dateDeclaration: decl, dateExpiration: echeance,
        dureeInitiale: Math.max(1, Math.round((echeance.getTime() - decl.getTime()) / 86400000)), delaiMois: num(r.Delais) || null,
        alerteJours: num(r['Temps Alerte']) || 90, montantCaution: num(r['Montant Garantie']) || null, designation: cut(str(r.Designation) ?? 'Admission temporaire', 500)!,
        bureauEntree: cut(str(r.Bureau), 200), declarationEntree: cut(str(r['N° déclaration']), 100), statut: 'ACTIVE',
      },
    });
    if (info.neuf) await prisma.dossier.updateMany({ where: { id: info.id, admissionTemporaireId: null }, data: { admissionTemporaireId: at.id } });
    atCrees++;
  }
  noter('Admissions temporaires', atCrees, atExist.size, atIgn);

  // ---------- Factures ----------
  const facExist = new Map((await prisma.facture.findMany({ where: { societeId }, select: { id: true, numero: true } })).map((f) => [f.numero, f.id]));
  // règlements par facture (numéro de facture dans NumCheque) : sert à recalculer le payé
  const payeParFacture = new Map<string, number>();
  rgSrc.forEach((r) => {
    if (num(r.supprimer) === 1) return;
    const p = (str(r.NumCheque) ?? '').toUpperCase(); const e = num(r['MontantReglé']);
    if (p.startsWith('FACT') && e !== 0) payeParFacture.set(p, (payeParFacture.get(p) ?? 0) + e);
  });
  const factureInfo = new Map<string, { id: string; clientId: string; date: Date; neuf: boolean }>();
  const nouvF: any[] = []; const vuF = new Set<string>(); let fIgn = 0, payeRecalcule = 0;
  const factureClientNom = new Map<string, string>();
  for (const r of facSrc) {
    const numero = str(r['N° Facture'])!;
    if (vuF.has(numero)) { fIgn++; continue; } vuF.add(numero);
    const cc = clientParNom.get(norm(str(r.Client))); const cid = cc ? clientId.get(cc) : null;
    const dateF = date(r['Date Facture']);
    if (!cid || !dateF) { fIgn++; avert(`Facture ${numero} ignorée : ${!cid ? 'client' : 'date'} introuvable`); continue; }
    const ex = facExist.get(numero);
    const id = ex ?? randomUUID();
    factureInfo.set(numero, { id, clientId: cid, date: dateF, neuf: !ex });
    if (ex) continue;
    const ttc = num(r['Total TTC Client']); const lib = str(r.Libelle) ?? '';
    const avoir = ttc < 0 || /^\s*(AVOIR|NOTE DE DEBIT)/i.test(lib);
    let paye = num(r['Montant Paye']);
    const reglements = payeParFacture.get(numero.toUpperCase());
    if (reglements !== undefined && Math.abs(reglements - paye) > 1) { paye = reglements; payeRecalcule++; }
    const reste = ttc - paye;
    const statut = avoir ? 'VALIDEE' : Math.abs(reste) <= 1 && ttc !== 0 ? 'PAYEE' : paye > 0 ? 'PARTIELLEMENT_PAYEE' : 'VALIDEE';
    const dos = trouveDossier(r['N° Dossier']);
    nouvF.push({
      id, societeId, numero: cut(numero, 50), type: avoir ? 'AVOIR' : 'FACTURE', dossierId: dos?.id ?? null, clientId: cid, createurId: userDeSaisie(r.SaisiePar),
      dateFacture: dateF, dateEcheance: ajouterJours(dateF, 30), objet: cut(lib.split('\n')[0].trim() || null, 500), statut,
      numeroNormalise: cut(str(r['N° Facture Normalisée']), 50), montantHT: num(r['Total HT']), montantTVA: num(r['Total TVA  Client']),
      montantTTC: ttc, montantPaye: paye, resteAPayer: reste, acompte: num(r.Acompte), montantPrestation: num(r['Montant Prestation']) || null,
      tvaPrestation: num(r['TVA Prestation']) || null, observations: lib || null, motifAvoir: avoir ? cut(lib.split('\n')[0].trim(), 500) : null,
      createdAt: date(r.SaisieLe) ?? dateF,
    });
  }
  await inserer('facture', nouvF);
  noter('Factures', nouvF.length, facExist.size, fIgn);
  console.log(`    dont payé recalculé depuis les règlements : ${payeRecalcule}`);

  // lignes de facture (parents créés pendant ce passage seulement)
  const lignesParFacture = new Map<string, Row[]>();
  let lfOrph = 0;
  detFacSrc.forEach((r) => {
    const n = str(r.NumFact); const f = n ? factureInfo.get(n) : undefined;
    if (!f) { lfOrph++; return; }
    if (!f.neuf) return;
    lignesParFacture.set(n!, [...(lignesParFacture.get(n!) ?? []), r]);
  });
  const ordreLigne = (a: Row, b: Row) => num(a.NumOrdreCat) - num(b.NumOrdreCat) || num(a.NumOrdreDetail) - num(b.NumOrdreDetail) || num(a.NumOrdre) - num(b.NumOrdre);
  const nouvLF: any[] = [];
  lignesParFacture.forEach((rows, n) => {
    rows.sort(ordreLigne).forEach((r, i) => {
      const m = num(r.Montant); const tva = num(r.EtatTVA) === 1;
      nouvLF.push({
        factureId: factureInfo.get(n)!.id, ordre: i + 1, categorie: cut(str(r.Categorie), 100), codePrestation: cut(str(r.Code), 50),
        designation: cut(str(r['Libellé']) ?? '-', 500), estTVA: tva, quantite: 1, prixUnitaire: m, montantHT: tva ? 0 : m,
        tauxTVA: tva ? 18 : 0, montantTVA: tva ? m : 0,
      });
    });
  });
  await inserer('ligneFacture', nouvLF, 2000);
  noter('Lignes de facture', nouvLF.length, 0, lfOrph);

  // ---------- Proformas (avec jumelles) ----------
  const proExist = new Set((await prisma.proforma.findMany({ where: { client: { societeId } }, select: { numero: true } })).map((p) => p.numero));
  const facturesDeProforma = new Map<string, string[]>();
  [...facSrc].sort((a, b) => (date(a['Date Facture'])?.getTime() ?? 0) - (date(b['Date Facture'])?.getTime() ?? 0)).forEach((r) => {
    const p = str(r['N° Proforma']); const n = str(r['N° Facture']);
    if (p && n && factureInfo.has(n)) facturesDeProforma.set(p, [...(facturesDeProforma.get(p) ?? []), n]);
  });
  const lignesDeProforma = new Map<string, Row[]>();
  detProSrc.forEach((r) => { const n = str(r.NumPro); if (n) lignesDeProforma.set(n, [...(lignesDeProforma.get(n) ?? []), r]); });
  const nouvPro: any[] = []; const nouvLP: any[] = []; const vuPro = new Set<string>(); let proIgn = 0, jumelles = 0;
  const lignesProforma = (proformaId: string, n: string) => (lignesDeProforma.get(n) ?? []).sort(ordreLigne).forEach((r, i) => {
    const m = num(r.Montant); const tva = num(r.EtatTVA) === 1;
    nouvLP.push({
      proformaId, ordre: i + 1, categorie: cut(str(r.Categorie), 100), codePrestation: cut(str(r.Code), 50), designation: cut(str(r['Libellé']) ?? '-', 500)!,
      quantite: 1, prixUnitaire: m, montantHT: tva ? 0 : m, tauxTVA: tva ? 18 : 0, montantTVA: tva ? m : 0, estTVA: tva,
    });
  });
  for (const r of proSrc) {
    const n = str(r.NumPro); if (!n || vuPro.has(n)) { proIgn++; continue; } vuPro.add(n);
    const dos = trouveDossier(r.NumDossier);
    const facs = facturesDeProforma.get(n) ?? [];
    const cid = dos?.clientId ?? (facs[0] ? factureInfo.get(facs[0])?.clientId : undefined);
    const d = date(r.Date);
    if (!cid || !d) { proIgn++; avert(`Proforma ${n} ignorée : ${!cid ? 'client' : 'date'} introuvable`); continue; }
    const base = {
      clientId: cid, dossierId: dos?.id ?? null, dateProforma: d, dateValidite: ajouterJours(d, 30), titre: cut(str(r.LibellePro), 500),
      statut: num(r.EtatSupprimer) === 1 ? 'ANNULEE' : num(r.EtatFacture) === 1 ? 'TRANSFORMEE' : num(r['EtatValidé']) === 1 ? 'VALIDEE' : 'BROUILLON',
      fobUnitaire: num(r.FOB) || null, fretUnitaire: num(r.FRET) || null, assurance: num(r.ASSURANCE) || null, fraisDivers: num(r.FRAIS_DIVERS) || null,
      valeurCAF: num(r.VALEUR_CAF) || null, montantHT: num(r.TotalHT), montantTVA: num(r.TotalTVA), montantTTC: num(r.TotalTTC), remise: num(r.TotalRemise),
      createdAt: date(r.SaisieLe) ?? d,
    };
    const versions = facs.length > 1 ? facs : [facs[0] ?? null];
    versions.forEach((fn, i) => {
      const numero = i === 0 ? n : `${n}-${i + 1}`;
      if (proExist.has(numero)) return;
      if (i > 0) jumelles++;
      const f = fn ? factureInfo.get(fn) : null;
      const id = randomUUID();
      nouvPro.push({ id, numero: cut(numero, 50), ...base, factureId: f && f.neuf ? f.id : null });
      lignesProforma(id, n);
    });
  }
  let lpOrph = 0; const connus = new Set(proSrc.map((r) => str(r.NumPro))); detProSrc.forEach((r) => { if (!connus.has(str(r.NumPro))) lpOrph++; });
  await inserer('proforma', nouvPro);
  await inserer('ligneProforma', nouvLP, 2000);
  noter('Proformas (dont jumelles)', nouvPro.length, proExist.size, proIgn);
  console.log(`    dont jumelles : ${jumelles}`);
  noter('Lignes de proforma', nouvLP.length, 0, lpOrph);

  // ---------- Dotations ----------
  const dotExist = new Map((await prisma.dotation.findMany({ where: { societeId }, select: { id: true, numero: true } })).map((d) => [d.numero, d.id]));
  const dotationId = new Map<string, string>(); const nouvDot: any[] = []; const vuDot = new Set<string>();
  for (const r of dotSrc) {
    const n = str(r.NumDotation); if (!n || vuDot.has(n)) continue; vuDot.add(n);
    if (dotExist.has(n)) { dotationId.set(n, dotExist.get(n)!); continue; }
    const id = randomUUID(); dotationId.set(n, id);
    nouvDot.push({ id, societeId, numero: cut(n, 50), dateDotation: date(r.DateDotation) ?? new Date(), montant: num(r.Montant), motif: str(r.Motif), agentId: agentDeMatricule(str(r.Matricule) ?? 'INCONNU'), createurId: importUser, statut: num(r.Valide) === 1 ? 'VALIDE' : 'ANNULE' });
  }
  await inserer('dotation', nouvDot);
  noter('Dotations', nouvDot.length, dotExist.size);

  // ---------- Journal (règlements) ----------
  const opExist = new Set((await prisma.operationFinanciere.findMany({ where: { societeId, numero: { startsWith: 'ETL-' } }, select: { numero: true } })).map((o) => o.numero));
  const depExist = new Set((await prisma.depense.findMany({ where: { societeId, numero: { startsWith: 'ETL-' } }, select: { numero: true } })).map((o) => o.numero));
  const paiExist = new Set((await prisma.paiement.findMany({ where: { numero: { startsWith: 'ETL-' }, client: { societeId } }, select: { numero: true } })).map((o) => o.numero));
  // comptes tiers : un par fournisseur et par client mouvementé
  const tExist = new Map((await prisma.compteTiers.findMany({ where: { societeId }, select: { id: true, code: true } })).map((t) => [t.code, t.id]));
  const tiersId = new Map<string, string>(); const nouvT: any[] = [];
  const tiers = (code: string, libelle: string, type: string): string => {
    if (tiersId.has(code)) return tiersId.get(code)!;
    const ex = tExist.get(code); const id = ex ?? randomUUID(); tiersId.set(code, id);
    if (!ex) nouvT.push({ id, societeId, code: cut(code, 20), libelle: cut(libelle, 200), type });
    return id;
  };
  const soldes = { caisse: 0, banque: new Map<string, number>(), tiers: new Map<string, number>() };
  const nouvOp: any[] = []; const nouvDep: any[] = []; const nouvPai: any[] = []; const nouvPF: any[] = [];
  let jIgn = 0, jDates = 0; const classes: Record<string, number> = {};
  const libellesFourn = new Map(fournSrc.map((r) => [String(r['N° Fournisseur']).trim(), str(r['Raison Sociale']) ?? '']));
  for (const r of rgSrc) {
    const idSrc = r['N° Enr.']; const numero = `ETL-${idSrc}`;
    if (num(r.supprimer) === 1) { jIgn++; continue; }
    const e = num(r['MontantReglé']); const s = num(r.Depense);
    if (e === 0 && s === 0) { jIgn++; continue; }
    let d = date(r['DateRèglement']); const saisi = date(r.SaisiLe);
    if (!d || d.getFullYear() < 2020 || (saisi && d.getTime() > saisi.getTime() + 31 * 86400000)) { if (saisi) { d = saisi; jDates++; } else { jIgn++; continue; } }
    let type = str(r.Type_Compte); const compte = str(r.NumCompte);
    if (!type && compte && banqueId.has(compte)) type = 'BANQUE';
    if (!type) { jIgn++; avert(`Journal ${idSrc} ignoré : type de compte vide (${fmt(e - s)}) ${str(r.Motif) ?? ''}`); continue; }
    const mode = modePaiement(r.ModeRèglement);
    const valide = num(r.Etat_Encaissement) === 1; const statutOp = valide ? 'VALIDE' : 'EN_ATTENTE';
    const motif = str(r.Motif); const tt = (str(r.TypeTransaction) ?? 'OPERATION').trim();
    const piece = (str(r.NumCheque) ?? '').toUpperCase();
    const montant = e > 0 ? e : s;
    // soldes
    if (type === 'CAISSE') soldes.caisse += e - s;
    else if (type === 'BANQUE' && compte) soldes.banque.set(compte, (soldes.banque.get(compte) ?? 0) + e - s);
    else if (compte) soldes.tiers.set(`${type}|${compte}`, (soldes.tiers.get(`${type}|${compte}`) ?? 0) + e - s);
    const base = { societeId, numero, dateOperation: d, libelle: cut(motif ?? tt, 500)!, reference: cut(str(r.NumCheque), 100), beneficiaire: cut(str(r.NumTiers), 200), statut: statutOp, observations: str(r.NumFacture) ? `Dossier ${str(r.NumFacture)}` : null, createdAt: saisi ?? d };
    let classe = 'deja-present';
    if (piece.startsWith('FACT') && e !== 0) {
      classe = 'paiement-facture'; const f = factureInfo.get(piece);
      if (!f) { jIgn++; avert(`Règlement ${idSrc} ignoré : facture ${piece} inconnue`); continue; }
      if (e < 0) { // avoir consommé : trace en opération (sortie), sans Paiement
        if (!opExist.has(numero)) nouvOp.push({ id: randomUUID(), ...base, type: 'ENCAISSEMENT', sens: 'SORTIE', montant: -e, libelle: cut(`Régularisation avoir ${piece}`, 500) });
      } else if (f.neuf && !paiExist.has(numero)) {
        const pid = randomUUID();
        nouvPai.push({ id: pid, numero, clientId: f.clientId, datePaiement: d, montant: e, modePaiement: type === 'COMPTE CLIENT' ? 'COMPENSATION' : mode, reference: cut(piece, 100), banque: null, observations: motif, statut: valide ? 'VALIDE' : 'EN_ATTENTE', caisseId: type === 'CAISSE' ? caisse.id : null, compteBancaireId: type === 'BANQUE' && compte ? banqueId.get(compte) ?? null : null, createurId: userDeSaisie(r.SaisiPar), createdAt: saisi ?? d });
        nouvPF.push({ paiementId: pid, factureId: f.id, montant: e });
      }
    } else if (type === 'CAISSE' && s > 0 && str(r.NumFacture) && trouveDossier(r.NumFacture)) {
      classe = 'depense-dossier';
      if (!depExist.has(numero)) nouvDep.push({ id: randomUUID(), societeId, numero, dossierId: trouveDossier(r.NumFacture)!.id, caisseId: caisse.id, dotationId: str(r.NumDotation) ? dotationId.get(str(r.NumDotation)!) ?? null : null, dateDepense: d, categorie: cut(tt, 100), designation: cut(motif ?? tt, 500), montant: s, modePaiement: mode, reference: cut(str(r.NumCheque), 100), statut: 'VALIDE', createdAt: saisi ?? d });
    } else if (!opExist.has(numero)) {
      const sens = e > 0 ? 'ENTREE' : 'SORTIE';
      const op: any = { id: randomUUID(), ...base, montant, sens, type: /^RETRAIT/i.test(tt) ? 'RETRAIT' : /^APPRO|^REMISE|^DEPOT|^DEPÔT/i.test(tt) && type !== 'COMPTE CLIENT' ? 'VIREMENT_INTERNE' : sens === 'ENTREE' ? 'ENCAISSEMENT' : 'DECAISSEMENT' };
      if (type === 'CAISSE') { classe = sens === 'ENTREE' ? 'entree-caisse' : 'sortie-caisse'; op.caisseId = caisse.id; }
      else if (type === 'BANQUE') { classe = 'operation-bancaire'; op.compteBancaireId = compte ? banqueId.get(compte) ?? null : null; }
      else if (type === 'COMPTE FOURNISSEUR' && compte) { classe = 'compte-fournisseur'; op.compteTiersId = tiers(compte, libellesFourn.get(compte) ?? compte, 'FOURNISSEUR'); }
      else if (type === 'COMPTE CLIENT' && compte) { classe = 'compte-client'; op.compteTiersId = tiers(compte, `Compte client ${compte}`, 'CLIENT'); }
      else { classe = 'autre'; }
      nouvOp.push(op);
      classes[classe] = (classes[classe] ?? 0) + 1; continue;
    }
    classes[classe] = (classes[classe] ?? 0) + 1;
  }
  // libellés des comptes clients
  const nomClient = new Map(clientsSrc.map((r) => [String(r['N° Client']).trim(), str(r['Raison Sociale']) ?? '']));
  nouvT.forEach((t) => { if (t.type === 'CLIENT') t.libelle = cut(`Compte client ${nomClient.get(t.code) ?? t.code}`, 200); });
  await inserer('compteTiers', nouvT);
  await inserer('operationFinanciere', nouvOp, 1000);
  await inserer('depense', nouvDep, 1000);
  await inserer('paiement', nouvPai, 1000);
  await inserer('paiementFacture', nouvPF, 1000);
  noter('Opérations financières', nouvOp.length, opExist.size);
  noter('Dépenses de dossier', nouvDep.length, depExist.size);
  noter('Paiements de facture', nouvPai.length, paiExist.size);
  noter('Comptes tiers', nouvT.length, tExist.size);
  console.log(`    journal ignoré : ${jIgn} ; dates corrigées : ${jDates} ; classes : ${JSON.stringify(classes)}`);

  // ---------- Soldes ----------
  for (const [numero, solde] of soldes.banque) await prisma.compteBancaire.update({ where: { id: banqueId.get(numero)! }, data: { solde } });
  await prisma.caisse.update({ where: { id: caisse.id }, data: { solde: soldes.caisse } });
  for (const [cle, solde] of soldes.tiers) { const [, code] = cle.split('|'); const id = tiersId.get(code); if (id) await prisma.compteTiers.update({ where: { id }, data: { solde } }); }

  // ---------- Contrôles post-import ----------
  console.log('\nCONTRÔLES POST-IMPORT');
  const controles: [string, number, number][] = [];
  for (const r of banquesSrc) controles.push([`Solde ${str(r.Nom)}`, num(r.Solde), soldes.banque.get(String(r['N°']).trim()) ?? 0]);
  const agg = await prisma.facture.aggregate({ where: { societeId }, _sum: { montantTTC: true, montantPaye: true, resteAPayer: true }, _count: true });
  const comptes = {
    clients: await prisma.client.count({ where: { societeId } }), dossiers: await prisma.dossier.count({ where: { societeId } }),
    factures: agg._count, proformas: await prisma.proforma.count({ where: { client: { societeId } } }),
    dotations: await prisma.dotation.count({ where: { societeId } }),
  };
  controles.forEach(([n, a, b]) => console.log(`  ${Math.abs(a - b) <= 1 ? 'OK ' : 'KO '} ${n} : attendu ${fmt(a)}, base ${fmt(b)}`));
  console.log('  En base :', JSON.stringify(comptes));
  const cs = await prisma.caisse.findUnique({ where: { id: caisse.id } });
  console.log(`  Caisse : solde ${fmt(Number(cs?.solde ?? 0))}`);
  console.log(`  Factures : TTC ${fmt(Number(agg._sum.montantTTC ?? 0))} | payé ${fmt(Number(agg._sum.montantPaye ?? 0))} | reste ${fmt(Number(agg._sum.resteAPayer ?? 0))}`);
  if (avertissements.length) { console.log(`\n${avertissements.length} avertissement(s) (500 max) :`); avertissements.slice(0, 40).forEach((a) => console.log('  - ' + a)); }
}

main()
  .catch((e) => { console.error('ÉCHEC :', e); process.exit(1); })
  .finally(() => prisma.$disconnect());

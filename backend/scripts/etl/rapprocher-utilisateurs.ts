/**
 * ETL : rapprochement des utilisateurs de reprise avec les vrais utilisateurs de la société.
 *
 * L'import crée des utilisateurs « de reprise » (inactifs, non connectables, e-mail @etl-import.local) pour conserver
 * l'auteur de chaque facture, paiement, proforma, dotation... Ce script propose, puis applique, leur remplacement par
 * les vrais utilisateurs (même personne, même matricule), en réaffectant tout l'historique.
 *
 * Usage (depuis backend/) :
 *   DATABASE_URL=<base> npx ts-node scripts/etl/rapprocher-utilisateurs.ts [--societe=ETL] [--correspondance=fichier.csv]
 *                                                                          [--accepter-propositions] [--supprimer-orphelins] [--appliquer]
 *
 * Sans --appliquer : simulation, écrit logs/etl-utilisateurs/propositions.csv et ne modifie rien.
 * Correspondance : fichier CSV (séparateur « ; ») `reprise;reel`, où `reprise` est l'e-mail de reprise ou sa partie avant « @ »
 * (ex. naomie-priscilla) et `reel` l'e-mail du vrai utilisateur. Une ligne du fichier est toujours appliquée.
 * Propositions automatiques (matricule identique, ou même nom et prénoms) : appliquées seulement avec --accepter-propositions.
 * Garde-fous : base non locale refusée sans ETL_AUTORISER_DISTANT=OUI_PRODUCTION ; relançable ; le compte technique
 * etl-import n'est jamais touché ; un utilisateur de reprise sans correspondance reste inactif et garde son historique.
 */
import 'dotenv/config';
import * as fs from 'fs';
import * as path from 'path';
import { Prisma, PrismaClient } from '@prisma/client';
import { exigerHoteAttendu } from './commun';

const args = process.argv.slice(2);
const APPLIQUER = args.includes('--appliquer');
const ACCEPTER = args.includes('--accepter-propositions');
const SUPPRIMER = args.includes('--supprimer-orphelins');
const CODE_SOCIETE = (args.find((a) => a.startsWith('--societe=')) ?? '--societe=ETL').split('=')[1];
const FICHIER = args.find((a) => a.startsWith('--correspondance='))?.split('=').slice(1).join('=');
const SORTIE = path.resolve(__dirname, '..', '..', 'logs', 'etl-utilisateurs');
const DOMAINE = '@etl-import.local';

const prisma = new PrismaClient();
const norm = (s: string | null | undefined) => (s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().replace(/[^A-Z0-9]+/g, ' ').trim();
const jetons = (s: string) => norm(s).split(' ').filter(Boolean).sort().join(' ');
const fmt = (n: number) => n.toLocaleString('fr-FR').replace(/ /g, ' ');

function garde() {
  const url = process.env.DATABASE_URL || '';
  const m = url.match(/@([^:/]+)(?::\d+)?\/([^?]+)/);
  const hote = m?.[1] ?? '?';
  console.log(`Base cible : ${hote} / ${m?.[2] ?? '?'}  (${APPLIQUER ? 'ÉCRITURE' : 'simulation'})`);
  const local = ['localhost', '127.0.0.1', '::1'].includes(hote);
  if (APPLIQUER) exigerHoteAttendu(hote);
  if (APPLIQUER && !local && process.env.ETL_AUTORISER_DISTANT !== 'OUI_PRODUCTION') {
    console.error(`REFUS : la base ${hote} n'est pas locale. Définir ETL_AUTORISER_DISTANT=OUI_PRODUCTION après sauvegarde.`);
    process.exit(1);
  }
}

/** Colonnes qui référencent un utilisateur, déduites du schéma (aucune liste à maintenir). */
function references(): { modele: string; champ: string }[] {
  const res: { modele: string; champ: string }[] = [];
  for (const m of Prisma.dmmf.datamodel.models) {
    if (m.name === 'Utilisateur') continue;
    for (const f of m.fields) {
      if (f.kind === 'object' && f.type === 'Utilisateur' && f.relationFromFields && f.relationFromFields.length === 1) res.push({ modele: m.name, champ: f.relationFromFields[0] });
    }
  }
  return res;
}
const accesseur = (modele: string) => (prisma as any)[modele.charAt(0).toLowerCase() + modele.slice(1)];

function lireCorrespondance(): Map<string, string> {
  const res = new Map<string, string>();
  if (!FICHIER) return res;
  fs.readFileSync(FICHIER, 'utf8').replace(/^﻿/, '').split(/\r?\n/).forEach((l, i) => {
    const [a, b] = l.split(';').map((x) => x.trim().replace(/^"|"$/g, ''));
    if (!a || !b || (i === 0 && /^reprise$/i.test(a))) return;
    res.set((a.includes('@') ? a : a + DOMAINE).toLowerCase(), b.toLowerCase());
  });
  return res;
}

async function main() {
  garde();
  const societe = await prisma.societe.findFirst({ where: { code: CODE_SOCIETE } });
  if (!societe) { console.error(`Société « ${CODE_SOCIETE} » introuvable.`); process.exit(1); }
  const tous = await prisma.utilisateur.findMany({ where: { societeId: societe.id }, select: { id: true, email: true, nom: true, prenom: true, matricule: true, actif: true } });
  const technique = `etl-import${DOMAINE}`;
  const reprise = tous.filter((u) => u.email.endsWith(DOMAINE) && u.email !== technique);
  const reels = tous.filter((u) => !u.email.endsWith(DOMAINE));
  console.log(`Société ${societe.code} : ${reprise.length} utilisateurs de reprise, ${reels.length} utilisateurs réels.`);
  const refs = references();
  const correspondance = lireCorrespondance();
  const parEmail = new Map(reels.map((u) => [u.email.toLowerCase(), u]));
  const parMatricule = new Map<string, typeof reels>();
  reels.forEach((u) => { if (u.matricule) parMatricule.set(norm(u.matricule), [...(parMatricule.get(norm(u.matricule)) ?? []), u]); });
  const parNom = new Map<string, typeof reels>();
  reels.forEach((u) => { const k = jetons(`${u.nom} ${u.prenom}`); parNom.set(k, [...(parNom.get(k) ?? []), u]); });

  type Ligne = { rep: (typeof reprise)[number]; nbRef: number; reel: (typeof reels)[number] | null; methode: string; appliquer: boolean; note: string };
  const lignes: Ligne[] = [];
  for (const rep of reprise) {
    let nbRef = 0;
    for (const r of refs) nbRef += await accesseur(r.modele).count({ where: { [r.champ]: rep.id } });
    let reel: Ligne['reel'] = null; let methode = 'aucune'; let appliquer = false; let note = '';
    const fichier = correspondance.get(rep.email.toLowerCase());
    if (fichier) {
      reel = parEmail.get(fichier) ?? null; methode = 'fichier'; appliquer = !!reel;
      if (!reel) note = `utilisateur réel introuvable : ${fichier}`;
    } else {
      const mat = rep.matricule.replace(/^ETL-/, '');
      const parM = parMatricule.get(norm(mat)) ?? [];
      const parN = parNom.get(jetons(`${rep.nom} ${rep.prenom}`)) ?? [];
      if (!rep.email.startsWith('agent-') && parM.length === 1 && norm(mat).length > 2) { reel = parM[0]; methode = 'matricule'; }
      else if (rep.email.startsWith('agent-') && parM.length === 1) { reel = parM[0]; methode = 'matricule'; }
      else if (!rep.email.startsWith('agent-') && parN.length === 1) { reel = parN[0]; methode = 'nom'; }
      else if (parM.length > 1 || parN.length > 1) note = 'plusieurs candidats';
      appliquer = !!reel && ACCEPTER;
    }
    lignes.push({ rep, nbRef, reel, methode, appliquer, note });
  }

  fs.mkdirSync(SORTIE, { recursive: true });
  const csv = ['reprise;nom;prenom;matricule;references;reel_propose;methode;appliquer;note',
    ...lignes.map((l) => [l.rep.email, l.rep.nom, l.rep.prenom, l.rep.matricule, l.nbRef, l.reel?.email ?? '', l.methode, l.appliquer ? 'oui' : 'non', l.note].map((x) => `"${String(x).replace(/"/g, '""')}"`).join(';'))].join('\n');
  fs.writeFileSync(path.join(SORTIE, 'propositions.csv'), '﻿' + csv, 'utf8');
  console.log('\nUTILISATEUR DE REPRISE'.padEnd(46) + 'RÉFÉR.'.padStart(8) + '  PROPOSITION');
  lignes.sort((a, b) => b.nbRef - a.nbRef).forEach((l) => console.log(`  ${l.rep.email.replace(DOMAINE, '').padEnd(42)}${fmt(l.nbRef).padStart(8)}  ${l.reel ? `${l.reel.email} (${l.methode}${l.appliquer ? '' : ', non appliquée'})` : l.note || '-'}`));
  const aTraiter = lignes.filter((l) => l.appliquer && l.reel);
  console.log(`\n${lignes.filter((l) => l.reel).length} proposition(s), ${aTraiter.length} à appliquer. Détail : ${path.join(SORTIE, 'propositions.csv')}`);
  if (!APPLIQUER) { console.log('Simulation : aucune donnée modifiée. Relancer avec --appliquer.'); return; }

  let deplaces = 0; let supprimes = 0; const erreurs: string[] = [];
  for (const l of aTraiter) {
    for (const r of refs) {
      try { const x = await accesseur(r.modele).updateMany({ where: { [r.champ]: l.rep.id }, data: { [r.champ]: l.reel!.id } }); deplaces += x.count; }
      catch (e: any) { erreurs.push(`${l.rep.email} : ${r.modele}.${r.champ} : ${String(e.message).split('\n').pop()}`); }
    }
    if (SUPPRIMER) {
      let reste = 0; for (const r of refs) reste += await accesseur(r.modele).count({ where: { [r.champ]: l.rep.id } });
      if (reste === 0) { try { await prisma.utilisateur.delete({ where: { id: l.rep.id } }); supprimes++; } catch (e: any) { erreurs.push(`${l.rep.email} : suppression impossible`); } }
    }
  }
  console.log(`\nRéaffectations : ${fmt(deplaces)} ligne(s) ; utilisateurs de reprise supprimés : ${supprimes} ; erreurs : ${erreurs.length}`);
  erreurs.slice(0, 20).forEach((e) => console.log('  - ' + e));
}

main().catch((e) => { console.error('ÉCHEC :', e); process.exit(1); }).finally(() => prisma.$disconnect());

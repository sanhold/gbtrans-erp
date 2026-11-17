/**
 * ETL : création des vrais comptes utilisateurs de la société (profils validés par le propriétaire le 17/11/2026).
 *
 * Chaque compte reçoit un e-mail PAR DÉFAUT (<login>@etl.local) et un mot de passe PROVISOIRE ; le compte est marqué
 * « doit changer son mot de passe » : il sera changé à la première connexion, et les e-mails seront remplacés par les
 * vrais plus tard (écran Utilisateurs). Le propriétaire (mousproxy) est déjà le compte ADM-ETL : il n'est pas recréé.
 * Le compte générique « admin » n'est pas recréé.
 *
 * Mot de passe : un mot de passe aléatoire par personne (écrit dans logs/etl-utilisateurs/comptes-crees-<date>.csv, dossier
 * ignoré par git), ou le même pour tous avec --mdp="..." (8 caractères mini, majuscule, minuscule, chiffre, spécial).
 *
 * Profils créés si absents, avec leurs permissions : ADMIN (existant), AGENT (tout sauf gestion des utilisateurs),
 * AGENT_FINANCE_LECTURE, AGENT_SANS_FINANCE, AGENT_DOTATIONS. Les droits restreints sont une approximation à valider
 * dans l'écran Profils : l'ERP n'a pas de droit « dotations seulement ».
 *
 * Usage (depuis backend/) :
 *   DATABASE_URL=<base> npx tsx scripts/etl/creer-utilisateurs.ts [--appliquer] [--societe=ETL] [--mdp="..."]
 * Sans --appliquer : simulation. Base non locale refusée sans ETL_AUTORISER_DISTANT=OUI_PRODUCTION. Relançable
 * (un compte déjà présent, même e-mail ou même matricule, est ignoré). Faire ensuite rapprocher-utilisateurs.ts.
 */
import 'dotenv/config';
import * as fs from 'fs';
import * as path from 'path';
import { randomBytes } from 'crypto';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';

const args = process.argv.slice(2);
const APPLIQUER = args.includes('--appliquer');
const opt = (nom: string) => args.find((a) => a.startsWith(`--${nom}=`))?.split('=').slice(1).join('=');
const CODE_SOCIETE = opt('societe') ?? 'ETL';
const MDP_COMMUN = opt('mdp');
const DOMAINE = '@etl.local';
const SORTIE = path.resolve(__dirname, '..', '..', 'logs', 'etl-utilisateurs');

type Droits = { module: string; action?: string[] }[];
const TOUTES = ['LIRE', 'CREER', 'MODIFIER', 'SUPPRIMER', 'VALIDER', 'ARCHIVER', 'EXPORTER', 'IMPRIMER'];
const BASE_RESTREINTE: Droits = [
  { module: 'DOSSIERS', action: ['LIRE', 'CREER', 'MODIFIER', 'EXPORTER', 'IMPRIMER'] },
  { module: 'OFFRES', action: ['LIRE', 'CREER', 'MODIFIER', 'EXPORTER', 'IMPRIMER'] },
  { module: 'PROFORMAS', action: ['LIRE', 'CREER', 'MODIFIER', 'EXPORTER', 'IMPRIMER'] },
  { module: 'CLIENTS', action: ['LIRE'] }, { module: 'COURRIERS', action: ['LIRE'] }, { module: 'NOTIFICATIONS', action: ['LIRE'] },
];
const PROFILS: Record<string, { nom: string; description: string; droits: Droits | 'tout-sauf-utilisateurs' }> = {
  AGENT: { nom: 'Agent complet', description: 'Tout sauf la gestion des utilisateurs', droits: 'tout-sauf-utilisateurs' },
  AGENT_FINANCE_LECTURE: { nom: 'Agent, finance en lecture', description: 'Dossiers, offres et proformas ; finance sans aucune action', droits: [...BASE_RESTREINTE, { module: 'FINANCE', action: ['LIRE'] }] },
  AGENT_SANS_FINANCE: { nom: 'Agent sans finance', description: 'Dossiers, offres et proformas ; aucun accès finance', droits: BASE_RESTREINTE },
  AGENT_DOTATIONS: { nom: 'Agent, dotations', description: 'Dossiers, offres et proformas ; finance limitée aux dotations (approximation à valider)', droits: [...BASE_RESTREINTE, { module: 'FINANCE', action: ['LIRE', 'CREER'] }] },
};
/** login de l'ancien logiciel, nom, prénom(s), matricule d'employé, profil */
const COMPTES: { login: string; nom: string; prenom: string; matricule: string; profil: string }[] = [
  { login: 'COUL', nom: 'COULIBALY', prenom: 'LASSANA', matricule: '001/DG/TMS', profil: 'ADMIN' },
  { login: 'NAOMIE.PRISCILLA', nom: 'NAOMIE', prenom: 'PRISCILLA', matricule: '023/DG/TMS', profil: 'AGENT' },
  { login: 'DEME.RAMATOU', nom: 'DEME', prenom: 'RAMATOU', matricule: '026/DG/TMS', profil: 'AGENT' },
  { login: 'MINGNI.ARLHANDIE.LOUISE', nom: 'MINGNI', prenom: 'ARLHANDIE LOUISE', matricule: '019/DG/TMS', profil: 'AGENT' },
  { login: 'TRAORE.KARIDJA', nom: 'TRAORE', prenom: 'KARIDJA', matricule: '025/DG/TMS', profil: 'AGENT' },
  { login: 'KONE.ABDOULAYE', nom: 'KONE', prenom: 'ABDOULAYE', matricule: '003/DG/TMS', profil: 'AGENT' },
  { login: 'EDOUKOU', nom: 'EDOUKOU', prenom: 'MANZAN A. SANDRINE', matricule: '018/DG/TMS', profil: 'AGENT_FINANCE_LECTURE' },
  { login: 'TRAORE.ABDOUL', nom: 'TRAORE', prenom: 'ABDUL', matricule: '006/DG/TMS', profil: 'AGENT_SANS_FINANCE' },
  { login: 'GUIRA.MAH.MARIAM', nom: 'GUIRA', prenom: 'MAH MARIAM', matricule: '024/DG/TMS', profil: 'AGENT_DOTATIONS' },
];

const prisma = new PrismaClient();
function garde() {
  const url = process.env.DATABASE_URL || '';
  const m = url.match(/@([^:/]+)(?::\d+)?\/([^?]+)/); const hote = m?.[1] ?? '?';
  console.log(`Base cible : ${hote} / ${m?.[2] ?? '?'}  (${APPLIQUER ? 'ÉCRITURE' : 'simulation, aucune écriture'})`);
  if (!['localhost', '127.0.0.1', '::1'].includes(hote) && process.env.ETL_AUTORISER_DISTANT !== 'OUI_PRODUCTION') {
    console.error(`REFUS : la base ${hote} n'est pas locale. Définir ETL_AUTORISER_DISTANT=OUI_PRODUCTION après sauvegarde.`); process.exit(1);
  }
}
/** Mot de passe provisoire conforme à la politique (majuscule, minuscule, chiffre, spécial, 12 caractères). */
function provisoire(): string {
  const b = randomBytes(12).toString('base64').replace(/[^A-Za-z0-9]/g, '');
  return `${b.slice(0, 8)}aZ7!`.replace(/^(.)/, (c) => c.toUpperCase());
}
const conforme = (p: string) => p.length >= 8 && /[A-Z]/.test(p) && /[a-z]/.test(p) && /[0-9]/.test(p) && /[^A-Za-z0-9]/.test(p);

async function main() {
  garde();
  if (MDP_COMMUN && !conforme(MDP_COMMUN)) { console.error('Mot de passe --mdp refusé : 8 caractères mini avec majuscule, minuscule, chiffre et caractère spécial.'); process.exit(1); }
  const societe = await prisma.societe.findUnique({ where: { code: CODE_SOCIETE } });
  if (!societe) { console.error(`Société « ${CODE_SOCIETE} » introuvable.`); process.exit(1); }
  const societeId = societe.id;
  const permissions = await prisma.permission.findMany();
  if (permissions.length === 0) { console.error('Aucune permission en base : lancer le seed d\'abord.'); process.exit(1); }

  const profilIds = new Map<string, string | null>();
  const admin = await prisma.profil.findFirst({ where: { societeId, estAdmin: true }, orderBy: { createdAt: 'asc' } });
  if (!admin) { console.error('Aucun profil administrateur dans la société.'); process.exit(1); }
  console.log(`  profil administrateur utilisé : ${admin.code}`);
  profilIds.set('ADMIN', admin.id);
  for (const [code, def] of Object.entries(PROFILS)) {
    const ex = await prisma.profil.findFirst({ where: { societeId, code } });
    const voulues = def.droits === 'tout-sauf-utilisateurs'
      ? permissions.filter((p) => p.module !== 'UTILISATEURS')
      : permissions.filter((p) => (def.droits as Droits).some((d) => d.module === p.module && (d.action ?? TOUTES).includes(p.action)));
    console.log(`  profil ${code} : ${ex ? 'existe déjà' : 'à créer'}, ${voulues.length} permission(s)`);
    if (!APPLIQUER) { profilIds.set(code, ex?.id ?? null); continue; }
    const id = ex?.id ?? (await prisma.profil.create({ data: { societeId, code, nom: def.nom, description: def.description } })).id;
    if (!ex) await prisma.profilPermission.createMany({ data: voulues.map((p) => ({ profilId: id, permissionId: p.id })), skipDuplicates: true });
    profilIds.set(code, id);
  }

  const lignes: string[][] = [];
  let crees = 0;
  for (const c of COMPTES) {
    const email = `${c.login.toLowerCase()}${DOMAINE}`;
    const existant = await prisma.utilisateur.findFirst({ where: { OR: [{ email }, { matricule: c.matricule }] }, select: { email: true, societeId: true } });
    if (existant) { console.log(`  ${c.login} : déjà présent (${existant.email}), ignoré`); lignes.push([c.login, existant.email, '', c.profil, 'déjà présent']); continue; }
    const mdp = MDP_COMMUN ?? provisoire();
    crees++;
    console.log(`  ${c.login} : ${email} / profil ${c.profil} / matricule ${c.matricule}${APPLIQUER ? '' : ' (à créer)'}`);
    if (APPLIQUER) {
      await prisma.utilisateur.create({
        data: { societeId, matricule: c.matricule, nom: c.nom, prenom: c.prenom, email, motDePasse: await bcrypt.hash(mdp, 12), actif: true, doitChangerMdp: true, profilId: profilIds.get(c.profil) ?? null },
      });
      lignes.push([c.login, email, mdp, c.profil, 'créé']);
    }
  }
  console.log(`\n${crees} compte(s) ${APPLIQUER ? 'créé(s)' : 'à créer'}.`);
  const nouveaux = lignes.filter((l) => l[4] === 'créé');
  if (APPLIQUER && nouveaux.length) {
    fs.mkdirSync(SORTIE, { recursive: true });
    const f = path.join(SORTIE, `comptes-crees-${new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)}.csv`);
    fs.writeFileSync(f, '﻿' + [['login', 'email', 'mot_de_passe_provisoire', 'profil', 'résultat'], ...nouveaux].map((l) => l.map((v) => `"${v}"`).join(';')).join('\r\n'));
    console.log(`Mots de passe provisoires : ${f} (hors dépôt git). À remettre en main propre puis supprimer ce fichier.`);
  }
  if (!APPLIQUER) console.log('Simulation : aucune donnée modifiée. Relancer avec --appliquer.');
}
main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());

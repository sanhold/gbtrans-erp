/**
 * Crée (ou met à jour) les 5 comptes de test d'UNE société existante, avec le profil correspondant
 * (Administrateur, Transitaire, Comptable, Commercial, Consultation) et un mot de passe commun.
 * Le mot de passe n'est jamais écrit dans le code : il vient de la variable NOUVEAU_MOT_DE_PASSE.
 *
 * Usage (PowerShell), depuis le dossier backend :
 *   $env:DATABASE_URL="<celle de Render>"; $env:SOCIETE_CODE="TEST"; $env:NOUVEAU_MOT_DE_PASSE="..."
 *   npx tsx scripts/creer-comptes-test.ts
 *
 * Sans SOCIETE_CODE, le script liste les sociétés disponibles et s'arrête (rien n'est modifié).
 * Conseil : utilisez une société dédiée aux tests (créée via la page d'inscription), pas votre
 * société réelle : le compte « Administrateur » de test a tous les droits.
 */
import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const COMPTES = [
  { email: 'admin@gbtrans.ci', profil: 'ADMIN', nom: 'Administrateur' },
  { email: 'transitaire@gbtrans.ci', profil: 'TRANSITAIRE', nom: 'Transitaire' },
  { email: 'comptable@gbtrans.ci', profil: 'COMPTABLE', nom: 'Comptable' },
  { email: 'commercial@gbtrans.ci', profil: 'COMMERCIAL', nom: 'Commercial' },
  { email: 'consultation@gbtrans.ci', profil: 'CONSULTATION', nom: 'Consultation' },
];

async function main() {
  const host = (process.env.DATABASE_URL || '').replace(/^[^@]*@/, '').split('/')[0];
  console.log(`Base visée : ${host}`);

  const code = (process.env.SOCIETE_CODE || '').trim();
  if (!code) {
    const societes = await prisma.societe.findMany({ select: { code: true, raisonSociale: true }, orderBy: { createdAt: 'asc' }, take: 50 });
    console.log('SOCIETE_CODE non renseigné. Sociétés disponibles :');
    societes.forEach((s) => console.log(` - ${s.code}  (${s.raisonSociale})`));
    return;
  }

  const motDePasse = process.env.NOUVEAU_MOT_DE_PASSE || '';
  if (!motDePasse) throw new Error('NOUVEAU_MOT_DE_PASSE est obligatoire.');

  const societe = await prisma.societe.findUnique({ where: { code } });
  if (!societe) throw new Error(`Société "${code}" introuvable. Relancez sans SOCIETE_CODE pour lister les codes.`);

  const hash = await bcrypt.hash(motDePasse, 12);
  let ok = 0;
  for (const c of COMPTES) {
    const profil = await prisma.profil.findFirst({ where: { societeId: societe.id, code: c.profil } });
    if (!profil) { console.log(` ! ${c.email} ignoré : profil ${c.profil} absent dans cette société`); continue; }
    const existant = await prisma.utilisateur.findUnique({ where: { email: c.email } });
    if (existant && existant.societeId !== societe.id) {
      console.log(` ! ${c.email} ignoré : ce compte existe déjà dans une AUTRE société (non modifié)`);
      continue;
    }
    await prisma.utilisateur.upsert({
      where: { email: c.email },
      update: { motDePasse: hash, profilId: profil.id, actif: true, verrouille: false, verrouilleJusqua: null, tentativesEchouees: 0 },
      create: {
        societeId: societe.id, matricule: `TEST-${c.profil}-${societe.code}`.slice(0, 50), nom: c.nom, prenom: 'Test',
        email: c.email, motDePasse: hash, profilId: profil.id, actif: true,
      },
    });
    console.log(` ✓ ${c.email}  (${c.profil})`);
    ok++;
  }
  console.log(`${ok}/${COMPTES.length} compte(s) prêt(s) dans la société ${societe.code} (${societe.raisonSociale}).`);
}

main()
  .catch((e) => { console.error(e.message); process.exit(1); })
  .finally(() => prisma.$disconnect());

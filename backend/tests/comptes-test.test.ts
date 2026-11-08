import bcrypt from 'bcryptjs';
import { randomUUID } from 'crypto';
import prisma from '../src/config/database';
import { api, authHeader } from './helpers/http';
import { creerSocieteAvecAdmin, MOT_DE_PASSE_TEST } from './helpers/seed';

const PLATFORM = '/api/v1/platform';
const EMAILS = ['admin', 'transitaire', 'comptable', 'commercial', 'consultation'].map((r) => `${r}@gbtrans.ci`);

const supprimerComptesTest = async () => {
  // L'historique de connexion référence les utilisateurs : à supprimer d'abord.
  await prisma.historiqueConnexion.deleteMany({ where: { utilisateur: { email: { in: EMAILS } } } });
  await prisma.utilisateur.deleteMany({ where: { email: { in: EMAILS } } });
};

describe('Route super-admin : créer les comptes de test d\'une société', () => {
  const suffixe = randomUUID().replace(/-/g, '').slice(0, 8);
  let tokenSuper: string;
  let tokenLecture: string;
  let societe: { societeId: string };

  const creerProfilsManquants = async (societeId: string) => {
    for (const code of ['TRANSITAIRE', 'COMPTABLE', 'COMMERCIAL', 'CONSULTATION']) {
      await prisma.profil.create({ data: { societeId, code, nom: code, estAdmin: false } });
    }
  };

  beforeAll(async () => {
    // Les comptes de test ont des e-mails fixes (uniques sur toute la base) : on repart d'une base propre.
    await supprimerComptesTest();
    societe = await creerSocieteAvecAdmin('Société comptes test');
    await creerProfilsManquants(societe.societeId);

    const hash = await bcrypt.hash(MOT_DE_PASSE_TEST, 10);
    await prisma.platformAdmin.create({ data: { email: `super.ct.${suffixe}@plateforme.test`, motDePasse: hash, nom: 'S', prenom: 'A', superAdmin: true } });
    await prisma.platformAdmin.create({ data: { email: `lecture.ct.${suffixe}@plateforme.test`, motDePasse: hash, nom: 'L', prenom: 'S', superAdmin: false } });
    tokenSuper = (await api().post(`${PLATFORM}/login`).send({ email: `super.ct.${suffixe}@plateforme.test`, motDePasse: MOT_DE_PASSE_TEST })).body.data.token;
    tokenLecture = (await api().post(`${PLATFORM}/login`).send({ email: `lecture.ct.${suffixe}@plateforme.test`, motDePasse: MOT_DE_PASSE_TEST })).body.data.token;
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  const appeler = (token: string | null, id: string, corps: unknown) => {
    const r = api().post(`${PLATFORM}/societes/${id}/comptes-test`);
    return (token ? r.set(authHeader(token)) : r).send(corps as object);
  };

  it('exige une authentification plateforme', async () => {
    expect((await appeler(null, societe.societeId, { motDePasse: 'Mdp-Test-Local-1' })).status).toBe(401);
  });

  it('refuse un compte plateforme en lecture seule', async () => {
    expect((await appeler(tokenLecture, societe.societeId, { motDePasse: 'Mdp-Test-Local-1' })).status).toBe(401);
  });

  it('refuse un mot de passe trop court ou absent', async () => {
    expect((await appeler(tokenSuper, societe.societeId, { motDePasse: 'court' })).status).toBe(400);
    expect((await appeler(tokenSuper, societe.societeId, {})).status).toBe(400);
  });

  it('404 pour une société inconnue', async () => {
    expect((await appeler(tokenSuper, 'inconnue', { motDePasse: 'Mdp-Test-Local-1' })).status).toBe(404);
  });

  it('crée les 5 comptes, qui se connectent avec le mot de passe choisi', async () => {
    const res = await appeler(tokenSuper, societe.societeId, { motDePasse: 'Mdp-Test-Local-1' });
    expect(res.status).toBe(200);
    expect(res.body.data.prets).toHaveLength(5);
    expect(res.body.data.ignores).toHaveLength(0);

    for (const email of EMAILS) {
      const login = await api().post('/api/v1/auth/login').send({ email, motDePasse: 'Mdp-Test-Local-1' });
      expect([email, login.status]).toEqual([email, 200]);
    }
    const mauvais = await api().post('/api/v1/auth/login').send({ email: EMAILS[0], motDePasse: 'autre-mot-de-passe' });
    expect(mauvais.status).toBe(401);
  });

  it('ne stocke jamais le mot de passe en clair et ne le renvoie pas', async () => {
    const res = await appeler(tokenSuper, societe.societeId, { motDePasse: 'Mdp-Test-Local-1' });
    expect(JSON.stringify(res.body)).not.toContain('Mdp-Test-Local-1');
    const u = await prisma.utilisateur.findUnique({ where: { email: EMAILS[0] } });
    expect(u?.motDePasse).not.toBe('Mdp-Test-Local-1');
    expect(await bcrypt.compare('Mdp-Test-Local-1', u!.motDePasse)).toBe(true);
  });

  it('met à jour un compte existant et supprime son verrouillage', async () => {
    await prisma.utilisateur.update({
      where: { email: EMAILS[1] },
      data: { verrouille: true, verrouilleJusqua: new Date(Date.now() + 30 * 60000), tentativesEchouees: 10 },
    });
    const res = await appeler(tokenSuper, societe.societeId, { motDePasse: 'NouveauMotDePasse1' });
    expect(res.status).toBe(200);
    const u = await prisma.utilisateur.findUnique({ where: { email: EMAILS[1] } });
    expect(u?.verrouilleJusqua).toBeNull();
    expect(u?.tentativesEchouees).toBe(0);
    const login = await api().post('/api/v1/auth/login').send({ email: EMAILS[1], motDePasse: 'NouveauMotDePasse1' });
    expect(login.status).toBe(200);
  });

  it('ne modifie jamais un compte du même e-mail appartenant à une autre société', async () => {
    const autre = await creerSocieteAvecAdmin('Autre société');
    await creerProfilsManquants(autre.societeId);
    const res = await appeler(tokenSuper, autre.societeId, { motDePasse: 'Intrus-123456' });
    expect(res.status).toBe(200);
    expect(res.body.data.prets).toHaveLength(0);
    expect(res.body.data.ignores).toHaveLength(5);
    const u = await prisma.utilisateur.findUnique({ where: { email: EMAILS[0] } });
    expect(u?.societeId).toBe(societe.societeId);
    expect(await bcrypt.compare('Intrus-123456', u!.motDePasse)).toBe(false);
  });

  it('signale les profils manquants sans échouer', async () => {
    const sansProfils = await creerSocieteAvecAdmin('Société sans profils');
    await supprimerComptesTest();
    const res = await appeler(tokenSuper, sansProfils.societeId, { motDePasse: 'Mdp-Test-Local-1' });
    expect(res.status).toBe(200);
    expect(res.body.data.prets.map((c: any) => c.profil)).toEqual(['ADMIN']);
    expect(res.body.data.ignores).toHaveLength(4);
  });
});

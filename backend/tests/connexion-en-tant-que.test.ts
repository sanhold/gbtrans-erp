import bcrypt from 'bcryptjs';
import { randomUUID } from 'crypto';
import prisma from '../src/config/database';
import { api, authHeader } from './helpers/http';
import { creerSocieteAvecAdmin, MOT_DE_PASSE_TEST } from './helpers/seed';

const PLATFORM = '/api/v1/platform';

describe('Super-admin : se connecter en tant que (sans mot de passe)', () => {
  const suffixe = randomUUID().replace(/-/g, '').slice(0, 8);
  let tokenSuper: string;
  let tokenLecture: string;
  let societeA: { societeId: string; utilisateurId: string; email: string };
  let societeB: { societeId: string; utilisateurId: string; email: string };

  const connexionEnTantQue = (token: string | null, societeId: string, userId: string) => {
    const r = api().post(`${PLATFORM}/societes/${societeId}/utilisateurs/${userId}/connexion`);
    return token ? r.set(authHeader(token)) : r;
  };

  beforeAll(async () => {
    societeA = await creerSocieteAvecAdmin('Société A en tant que');
    societeB = await creerSocieteAvecAdmin('Société B en tant que');

    const hash = await bcrypt.hash(MOT_DE_PASSE_TEST, 10);
    await prisma.platformAdmin.create({ data: { email: `super.cet.${suffixe}@plateforme.test`, motDePasse: hash, nom: 'S', prenom: 'A', superAdmin: true } });
    await prisma.platformAdmin.create({ data: { email: `lecture.cet.${suffixe}@plateforme.test`, motDePasse: hash, nom: 'L', prenom: 'S', superAdmin: false } });
    tokenSuper = (await api().post(`${PLATFORM}/login`).send({ email: `super.cet.${suffixe}@plateforme.test`, motDePasse: MOT_DE_PASSE_TEST })).body.data.token;
    tokenLecture = (await api().post(`${PLATFORM}/login`).send({ email: `lecture.cet.${suffixe}@plateforme.test`, motDePasse: MOT_DE_PASSE_TEST })).body.data.token;
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('exige une authentification plateforme', async () => {
    expect((await connexionEnTantQue(null, societeA.societeId, societeA.utilisateurId)).status).toBe(401);
  });

  it('refuse un compte plateforme en lecture seule', async () => {
    expect((await connexionEnTantQue(tokenLecture, societeA.societeId, societeA.utilisateurId)).status).toBe(401);
  });

  it('refuse le jeton d\'un utilisateur de société', async () => {
    const login = await api().post('/api/v1/auth/login').send({ email: societeA.email, motDePasse: MOT_DE_PASSE_TEST });
    expect((await connexionEnTantQue(login.body.data.token, societeA.societeId, societeA.utilisateurId)).status).toBe(401);
  });

  it('ouvre une session valide, utilisable sur l\'application, sans mot de passe', async () => {
    const res = await connexionEnTantQue(tokenSuper, societeA.societeId, societeA.utilisateurId);
    expect(res.status).toBe(200);
    expect(res.body.data.token).toBeTruthy();
    expect(res.body.data.utilisateur.email).toBe(societeA.email);
    expect(res.body.data.utilisateur.societe.id).toBe(societeA.societeId);

    const profil = await api().get('/api/v1/auth/profile').set(authHeader(res.body.data.token));
    expect(profil.status).toBe(200);
    expect(profil.body.data.email).toBe(societeA.email);
  });

  it('deux connexions successives du même utilisateur donnent deux sessions distinctes (même seconde)', async () => {
    const [a, b] = await Promise.all([
      api().post('/api/v1/auth/login').send({ email: societeA.email, motDePasse: MOT_DE_PASSE_TEST }),
      api().post('/api/v1/auth/login').send({ email: societeA.email, motDePasse: MOT_DE_PASSE_TEST }),
    ]);
    expect([a.status, b.status]).toEqual([200, 200]);
    expect(a.body.data.token).not.toBe(b.body.data.token);
  });

  it('fonctionne aussi pour un compte verrouillé (cas du compte bloqué)', async () => {
    await prisma.utilisateur.update({
      where: { id: societeA.utilisateurId },
      data: { verrouille: true, verrouilleJusqua: new Date(Date.now() + 30 * 60000), tentativesEchouees: 10 },
    });
    const res = await connexionEnTantQue(tokenSuper, societeA.societeId, societeA.utilisateurId);
    expect(res.status).toBe(200);
  });

  it('refuse un utilisateur d\'une autre société (404) : pas de passage d\'une société à l\'autre', async () => {
    const res = await connexionEnTantQue(tokenSuper, societeA.societeId, societeB.utilisateurId);
    expect(res.status).toBe(404);
  });

  it('refuse un utilisateur inconnu (404)', async () => {
    expect((await connexionEnTantQue(tokenSuper, societeA.societeId, 'inconnu')).status).toBe(404);
  });

  it('refuse un compte désactivé (400)', async () => {
    await prisma.utilisateur.update({ where: { id: societeB.utilisateurId }, data: { actif: false } });
    const res = await connexionEnTantQue(tokenSuper, societeB.societeId, societeB.utilisateurId);
    expect(res.status).toBe(400);
  });

  it('trace l\'action dans le journal d\'audit de la plateforme', async () => {
    const trace = await prisma.platformAuditLog.findFirst({
      where: { action: 'CONNEXION_EN_TANT_QUE', cibleId: societeA.utilisateurId },
      orderBy: { createdAt: 'desc' },
    });
    expect(trace).not.toBeNull();
    expect(trace?.adminEmail).toBe(`super.cet.${suffixe}@plateforme.test`);
  });

  it('marque la session dans l\'historique de connexion comme venant du super-admin', async () => {
    const h = await prisma.historiqueConnexion.findFirst({
      where: { utilisateurId: societeA.utilisateurId, userAgent: { startsWith: '[super-admin' } },
    });
    expect(h).not.toBeNull();
  });
});

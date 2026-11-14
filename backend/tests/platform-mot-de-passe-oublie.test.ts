import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import prisma from '../src/config/database';
import { api } from './helpers/http';

jest.mock('../src/utils/email', () => ({
  emailPlateformeConfigure: jest.fn(() => true),
  envoyerEmail: jest.fn(async () => undefined),
}));
import { envoyerEmail, emailPlateformeConfigure } from '../src/utils/email';

const PLATFORM = '/api/v1/platform';
const ANCIEN = 'AncienMdp#2026';
const NOUVEAU = 'NouveauMdp#2026';

describe('Administration plateforme — mot de passe oublié', () => {
  let email: string;
  let adminId: string;

  const envoyes = () => (envoyerEmail as jest.Mock).mock.calls.map(c => c[0]);
  const demander = (mail: string) => api().post(`${PLATFORM}/mot-de-passe-oublie`).send({ email: mail });
  const jetonDuDernierEmail = () => {
    const texte: string = envoyes().at(-1).texte;
    const m = texte.match(/token=([0-9a-f]{64})/);
    return m ? m[1] : '';
  };

  beforeAll(async () => {
    process.env.FRONTEND_URL = 'https://app.exemple.test';
    email = `admin.reset.${crypto.randomUUID().slice(0, 8)}@test.gbtrans.local`;
    const a = await prisma.platformAdmin.create({
      data: { email, motDePasse: await bcrypt.hash(ANCIEN, 10), nom: 'Reset', prenom: 'Admin' },
    });
    adminId = a.id;
  });

  beforeEach(() => { (envoyerEmail as jest.Mock).mockClear(); (emailPlateformeConfigure as jest.Mock).mockReturnValue(true); });

  it("répond clairement 503 si l'envoi d'e-mails n'est pas configuré sur le serveur", async () => {
    (emailPlateformeConfigure as jest.Mock).mockReturnValue(false);
    const r = await demander(email);
    expect(r.status).toBe(503);
    expect(envoyes()).toHaveLength(0);
  });

  it('adresse inconnue : même réponse, aucun e-mail (pas d\'énumération des comptes)', async () => {
    const connue = await demander(email);
    (envoyerEmail as jest.Mock).mockClear();
    const inconnue = await demander('personne@test.gbtrans.local');
    expect(inconnue.status).toBe(200);
    expect(inconnue.body.message).toBe(connue.body.message);
    expect(envoyes()).toHaveLength(0);
  });

  it('adresse connue : e-mail avec lien (adresse du serveur, pas de la requête) ; seule l\'empreinte du jeton est stockée', async () => {
    const r = await api().post(`${PLATFORM}/mot-de-passe-oublie`).set('Origin', 'https://pirate.example').set('Host', 'pirate.example').send({ email });
    expect(r.status).toBe(200);
    expect(envoyes()).toHaveLength(1);
    expect(envoyes()[0].destinataire).toBe(email);
    expect(envoyes()[0].texte).toContain('https://app.exemple.test/admin/reinitialiser?token=');
    expect(envoyes()[0].texte).not.toContain('pirate.example');

    const jeton = jetonDuDernierEmail();
    const admin = await prisma.platformAdmin.findUniqueOrThrow({ where: { id: adminId } });
    expect(admin.tokenResetHash).toBe(crypto.createHash('sha256').update(jeton).digest('hex'));
    expect(admin.tokenResetHash).not.toBe(jeton);
    const duree = admin.tokenResetExpire!.getTime() - Date.now();
    expect(duree).toBeGreaterThan(55 * 60 * 1000);
    expect(duree).toBeLessThanOrEqual(60 * 60 * 1000);
  });

  it('compte désactivé : aucun e-mail', async () => {
    const mail = `inactif.${crypto.randomUUID().slice(0, 8)}@test.gbtrans.local`;
    await prisma.platformAdmin.create({ data: { email: mail, motDePasse: 'x', nom: 'In', prenom: 'Actif', actif: false } });
    expect((await demander(mail)).status).toBe(200);
    expect(envoyes()).toHaveLength(0);
  });

  it('refuse un jeton invalide et un mot de passe trop faible (le jeton reste utilisable)', async () => {
    await demander(email);
    const jeton = jetonDuDernierEmail();
    const faux = await api().post(`${PLATFORM}/reinitialiser-mot-de-passe`).send({ token: 'a'.repeat(64), nouveauMotDePasse: NOUVEAU });
    expect(faux.status).toBe(400);
    const court = await api().post(`${PLATFORM}/reinitialiser-mot-de-passe`).send({ token: jeton, nouveauMotDePasse: 'abc' });
    expect(court.status).toBe(400);
    expect((await prisma.platformAdmin.findUniqueOrThrow({ where: { id: adminId } })).tokenResetHash).not.toBeNull();
  });

  it('refuse un jeton expiré', async () => {
    await demander(email);
    const jeton = jetonDuDernierEmail();
    await prisma.platformAdmin.update({ where: { id: adminId }, data: { tokenResetExpire: new Date(Date.now() - 1000) } });
    const r = await api().post(`${PLATFORM}/reinitialiser-mot-de-passe`).send({ token: jeton, nouveauMotDePasse: NOUVEAU });
    expect(r.status).toBe(400);
  });

  it('réinitialise le mot de passe, à usage unique, avec trace dans le journal', async () => {
    await demander(email);
    const jeton = jetonDuDernierEmail();
    const ok = await api().post(`${PLATFORM}/reinitialiser-mot-de-passe`).send({ token: jeton, nouveauMotDePasse: NOUVEAU });
    expect(ok.status).toBe(200);

    expect((await api().post(`${PLATFORM}/login`).send({ email, motDePasse: NOUVEAU })).status).toBe(200);
    expect((await api().post(`${PLATFORM}/login`).send({ email, motDePasse: ANCIEN })).status).toBe(401);

    const admin = await prisma.platformAdmin.findUniqueOrThrow({ where: { id: adminId } });
    expect(admin.tokenResetHash).toBeNull();
    expect(admin.tokenResetExpire).toBeNull();

    const reutilise = await api().post(`${PLATFORM}/reinitialiser-mot-de-passe`).send({ token: jeton, nouveauMotDePasse: 'Autre#Mdp2026' });
    expect(reutilise.status).toBe(400);

    expect(await prisma.platformAuditLog.count({ where: { platformAdminId: adminId, action: 'MOT_DE_PASSE_REINITIALISE' } })).toBe(1);
  });
});

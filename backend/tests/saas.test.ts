import bcrypt from 'bcryptjs';
import { randomUUID } from 'crypto';
import prisma from '../src/config/database';
import { api, authHeader, connecter } from './helpers/http';
import { creerContexteSociete, ContexteSociete } from './helpers/monde';
import { creerProfilSansPermission, creerUtilisateurAvecProfil, MOT_DE_PASSE_TEST } from './helpers/seed';

const SAAS = '/api/v1/saas';
const PLATFORM = '/api/v1/platform';

describe('SaaS — inscription, abonnement, webhook de paiement, espace plateforme', () => {
  let plan: { id: string; code: string };
  const suffixe = randomUUID().replace(/-/g, '').slice(0, 8);

  beforeAll(async () => {
    plan = await prisma.plan.create({
      data: { code: `TEST${suffixe}`.toUpperCase(), nom: 'Plan test', prixMensuel: 25000, essaiJours: 14 },
    });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  const inscription = (overrides: Record<string, unknown> = {}) => ({
    raisonSociale: 'Transit Test SARL',
    email: `contact.${randomUUID().slice(0, 8)}@exemple-test.ci`,
    motDePasse: 'Motdepasse1',
    nom: 'Kouassi',
    prenom: 'Awa',
    sousDomaine: `sd${randomUUID().replace(/-/g, '').slice(0, 10)}`,
    planCode: plan.code,
    ...overrides,
  });

  describe('Inscription publique', () => {
    it('crée la société, un essai gratuit et un administrateur qui peut se connecter', async () => {
      const body = inscription();
      const res = await api().post(`${SAAS}/inscription`).send(body);
      expect(res.status).toBe(201);
      expect(res.body.data.societe.sousDomaine).toBe(body.sousDomaine);
      expect(new Date(res.body.data.essaiJusquau).getTime()).toBeGreaterThan(Date.now());

      const abo = await prisma.abonnement.findFirst({ where: { societe: { sousDomaine: body.sousDomaine as string } } });
      expect(abo?.statut).toBe('ESSAI');

      // Le compte créé doit pouvoir se connecter avec le mot de passe choisi
      const login = await api().post('/api/v1/auth/login').send({ email: body.email, motDePasse: body.motDePasse });
      expect(login.status).toBe(200);
      expect(login.body.data.token).toBeTruthy();
    });

    it('ne stocke jamais le mot de passe en clair', async () => {
      const body = inscription();
      await api().post(`${SAAS}/inscription`).send(body);
      const u = await prisma.utilisateur.findUnique({ where: { email: body.email as string } });
      expect(u?.motDePasse).not.toBe(body.motDePasse);
      expect(await bcrypt.compare(body.motDePasse as string, u!.motDePasse)).toBe(true);
    });

    it('refuse un mot de passe faible (trop court, sans chiffre ou sans lettre)', async () => {
      for (const motDePasse of ['court1', 'sanschiffreici', '1234567890']) {
        const res = await api().post(`${SAAS}/inscription`).send(inscription({ motDePasse }));
        expect(res.status).toBe(400);
      }
    });

    it('refuse un email invalide et des champs manquants', async () => {
      expect((await api().post(`${SAAS}/inscription`).send(inscription({ email: 'pas-un-email' }))).status).toBe(400);
      expect((await api().post(`${SAAS}/inscription`).send({ email: 'a@b.ci' })).status).toBe(400);
    });

    it('refuse un sous-domaine réservé ou invalide', async () => {
      expect((await api().post(`${SAAS}/inscription`).send(inscription({ sousDomaine: 'admin' }))).status).toBe(400);
      expect((await api().post(`${SAAS}/inscription`).send(inscription({ sousDomaine: 'ab' }))).status).toBe(400); // trop court
      expect((await api().post(`${SAAS}/inscription`).send(inscription({ sousDomaine: '!!!' }))).status).toBe(400); // vide après normalisation
    });

    it('normalise le sous-domaine saisi (minuscules, espaces et accents remplacés)', async () => {
      const unique = randomUUID().replace(/-/g, '').slice(0, 6);
      const res = await api().post(`${SAAS}/inscription`).send(inscription({ sousDomaine: `Société ${unique}` }));
      expect(res.status).toBe(201);
      expect(res.body.data.societe.sousDomaine).toBe(`societe-${unique}`);
    });

    it('refuse un sous-domaine ou un email déjà utilisé', async () => {
      const body = inscription();
      expect((await api().post(`${SAAS}/inscription`).send(body)).status).toBe(201);
      expect((await api().post(`${SAAS}/inscription`).send(inscription({ sousDomaine: body.sousDomaine }))).status).toBe(400);
      expect((await api().post(`${SAAS}/inscription`).send(inscription({ email: body.email }))).status).toBe(400);
    });

    it('refuse une formule inconnue', async () => {
      const res = await api().post(`${SAAS}/inscription`).send(inscription({ planCode: 'INCONNU' }));
      expect(res.status).toBe(400);
    });

    it('exige au moins une activité (Transit ou Transport)', async () => {
      const res = await api().post(`${SAAS}/inscription`)
        .send(inscription({ activiteTransit: false, activiteTransport: false }));
      expect(res.status).toBe(400);
    });
  });

  describe('Paiement d\'abonnement (authentifié)', () => {
    let A: ContexteSociete;
    let tokenSansPermission: string;

    beforeAll(async () => {
      A = await creerContexteSociete('Société Abonnement');
      const profil = await creerProfilSansPermission(A.societeId, 'Sans paramètres');
      const { email } = await creerUtilisateurAvecProfil(A.societeId, profil.id, 'SansParametres');
      tokenSansPermission = await connecter(email);
    });

    it('exige une authentification', async () => {
      expect((await api().post(`${SAAS}/abonnement/paiement`).send({})).status).toBe(401);
      expect((await api().get(`${SAAS}/abonnement`)).status).toBe(401);
    });

    it('exige le droit PARAMETRES:MODIFIER', async () => {
      const res = await api().post(`${SAAS}/abonnement/paiement`).set(authHeader(tokenSansPermission))
        .send({ correspondant: 'ORANGE_CIV', telephone: '0700000000' });
      expect(res.status).toBe(403);
    });

    it('exige opérateur et téléphone', async () => {
      const res = await api().post(`${SAAS}/abonnement/paiement`).set(authHeader(A.token)).send({});
      expect(res.status).toBe(400);
    });

    it('refuse proprement quand aucun fournisseur de paiement n\'est configuré', async () => {
      const res = await api().post(`${SAAS}/abonnement/paiement`).set(authHeader(A.token))
        .send({ correspondant: 'ORANGE_CIV', telephone: '0700000000' });
      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/moyen de paiement/i);
    });
  });

  describe('Webhook de paiement (non authentifié : ne doit jamais activer sur un faux succès)', () => {
    let societeId: string;
    let abonnementId: string;
    let paiementId: string;
    const depositId = `dep-${randomUUID()}`;

    beforeAll(async () => {
      const ctx = await creerContexteSociete('Société Webhook');
      societeId = ctx.societeId;
      const abo = await prisma.abonnement.create({
        data: { societeId, planId: plan.id, statut: 'ESSAI', periodicite: 'MENSUEL', dateDebut: new Date() },
      });
      abonnementId = abo.id;
      const p = await prisma.paiementAbonnement.create({
        data: {
          abonnementId, societeId, montant: 25000, devise: 'XOF', statut: 'EN_ATTENTE',
          fournisseur: 'PAWAPAY', referenceExterne: depositId,
        },
      });
      paiementId = p.id;
    });

    it('400 si le payload ne contient aucun identifiant de transaction', async () => {
      const res = await api().post(`${SAAS}/paiements/PAWAPAY/webhook`).send({ status: 'COMPLETED' });
      expect(res.status).toBe(400);
    });

    it('404 si la transaction est inconnue', async () => {
      const res = await api().post(`${SAAS}/paiements/PAWAPAY/webhook`).send({ depositId: 'inconnu', status: 'COMPLETED' });
      expect(res.status).toBe(404);
    });

    it('un faux « succès » ne suffit pas : sans vérification auprès du fournisseur, rien n\'est activé', async () => {
      const res = await api().post(`${SAAS}/paiements/PAWAPAY/webhook`)
        .send({ depositId, status: 'COMPLETED', amount: '25000' });
      expect(res.status).not.toBe(200);

      const paiement = await prisma.paiementAbonnement.findUnique({ where: { id: paiementId } });
      expect(paiement?.statut).toBe('EN_ATTENTE');
      const abo = await prisma.abonnement.findUnique({ where: { id: abonnementId } });
      expect(abo?.statut).toBe('ESSAI');
    });

    it('un paiement déjà traité est ignoré (idempotence) sans modification', async () => {
      await prisma.paiementAbonnement.update({ where: { id: paiementId }, data: { statut: 'ECHEC' } });
      const res = await api().post(`${SAAS}/paiements/PAWAPAY/webhook`).send({ depositId, status: 'COMPLETED' });
      expect(res.status).toBe(200);
      const paiement = await prisma.paiementAbonnement.findUnique({ where: { id: paiementId } });
      expect(paiement?.statut).toBe('ECHEC');
      const abo = await prisma.abonnement.findUnique({ where: { id: abonnementId } });
      expect(abo?.statut).toBe('ESSAI');
    });
  });

  describe('Espace plateforme (super-admin)', () => {
    let tokenSuper: string;
    let tokenLecture: string;
    let societe: ContexteSociete;

    beforeAll(async () => {
      societe = await creerContexteSociete('Société Cible');
      const hash = await bcrypt.hash(MOT_DE_PASSE_TEST, 10);
      await prisma.platformAdmin.create({
        data: { email: `super.${suffixe}@plateforme.test`, motDePasse: hash, nom: 'Super', prenom: 'Admin', superAdmin: true },
      });
      await prisma.platformAdmin.create({
        data: { email: `lecture.${suffixe}@plateforme.test`, motDePasse: hash, nom: 'Lecture', prenom: 'Seule', superAdmin: false },
      });
      const s = await api().post(`${PLATFORM}/login`).send({ email: `super.${suffixe}@plateforme.test`, motDePasse: MOT_DE_PASSE_TEST });
      const l = await api().post(`${PLATFORM}/login`).send({ email: `lecture.${suffixe}@plateforme.test`, motDePasse: MOT_DE_PASSE_TEST });
      expect(s.status).toBe(200);
      expect(l.status).toBe(200);
      tokenSuper = s.body.data.token;
      tokenLecture = l.body.data.token;
    });

    it('refuse une connexion avec de mauvais identifiants', async () => {
      const res = await api().post(`${PLATFORM}/login`).send({ email: `super.${suffixe}@plateforme.test`, motDePasse: 'mauvais' });
      expect(res.status).toBe(401);
      const inconnu = await api().post(`${PLATFORM}/login`).send({ email: 'nobody@plateforme.test', motDePasse: 'x' });
      expect(inconnu.status).toBe(401);
    });

    it('refuse l\'accès sans token', async () => {
      expect((await api().get(`${PLATFORM}/societes`)).status).toBe(401);
    });

    it('refuse le token d\'un utilisateur de société sur les routes plateforme', async () => {
      const res = await api().get(`${PLATFORM}/societes`).set(authHeader(societe.token));
      expect(res.status).toBe(401);
    });

    it('un compte lecture seule peut consulter mais pas modifier', async () => {
      expect((await api().get(`${PLATFORM}/societes`).set(authHeader(tokenLecture))).status).toBe(200);

      const modif = await api().post(`${PLATFORM}/societes/${societe.societeId}/prolonger-essai`)
        .set(authHeader(tokenLecture)).send({ jours: 30 });
      expect(modif.status).toBe(401);
    });

    it('le super-admin voit la société créée dans la liste', async () => {
      const res = await api().get(`${PLATFORM}/societes`).set(authHeader(tokenSuper));
      expect(res.status).toBe(200);
      expect(JSON.stringify(res.body.data)).toContain(societe.societeId);
    });

    it('la liste des sociétés n\'expose jamais d\'identifiants SMTP ni de mot de passe', async () => {
      const res = await api().get(`${PLATFORM}/societes`).set(authHeader(tokenSuper));
      const texte = JSON.stringify(res.body.data);
      expect(texte).not.toMatch(/smtpPass|smtpUser|motDePasse/);
    });

    it('un administrateur désactivé ne peut plus utiliser son token', async () => {
      const email = `inactif.${suffixe}@plateforme.test`;
      const hash = await bcrypt.hash(MOT_DE_PASSE_TEST, 10);
      const admin = await prisma.platformAdmin.create({ data: { email, motDePasse: hash, nom: 'In', prenom: 'Actif' } });
      const login = await api().post(`${PLATFORM}/login`).send({ email, motDePasse: MOT_DE_PASSE_TEST });
      const token = login.body.data.token;
      expect((await api().get(`${PLATFORM}/societes`).set(authHeader(token))).status).toBe(200);

      await prisma.platformAdmin.update({ where: { id: admin.id }, data: { actif: false } });
      expect((await api().get(`${PLATFORM}/societes`).set(authHeader(token))).status).toBe(401);
    });
  });
});

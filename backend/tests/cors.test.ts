import request from 'supertest';
import app from '../src/app';

const preflight = (origine: string) =>
  request(app)
    .options('/api/v1/auth/login')
    .set('Origin', origine)
    .set('Access-Control-Request-Method', 'POST')
    .set('Access-Control-Request-Headers', 'content-type');

describe('CORS', () => {
  it('autorise une prévisualisation Vercel de l\'équipe (environnement de test)', async () => {
    const res = await preflight('https://gbtrans-git-test-sanhold-projects.vercel.app');
    expect(res.headers['access-control-allow-origin']).toBe('https://gbtrans-git-test-sanhold-projects.vercel.app');
  });

  it('autorise l\'origine locale de développement listée dans la configuration', async () => {
    const res = await preflight('http://localhost:3000');
    expect(res.headers['access-control-allow-origin']).toBe('http://localhost:3000');
  });

  it('refuse un site tiers', async () => {
    const res = await preflight('https://site-malveillant.example.com');
    expect(res.headers['access-control-allow-origin']).toBeUndefined();
  });

  it('refuse un faux domaine qui imite le motif des prévisualisations', async () => {
    for (const faux of [
      'https://gbtrans-git-test-sanhold-projects.vercel.app.evil.com',
      'http://gbtrans-git-test-sanhold-projects.vercel.app',
      'https://evil-gbtrans-git-test-sanhold-projects.vercel.app',
    ]) {
      const res = await preflight(faux);
      expect(res.headers['access-control-allow-origin']).toBeUndefined();
    }
  });
});

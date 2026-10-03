/**
 * Detection du sous-domaine (tenant) a partir de l'URL du navigateur.
 * Ex: https://client1.gbtrans.app -> "client1"
 *
 * Ne fonctionne que lorsque l'application est servie depuis un vrai domaine avec des
 * sous-domaines configures (ex: gbtrans.app). Sur gbtrans.vercel.app ou en local, il n'y a
 * pas de sous-domaine de tenant : la fonction renvoie null et l'application se comporte
 * comme aujourd'hui (une seule societe, resolue par l'utilisateur connecte).
 */

const HOTES_SANS_TENANT = ['localhost', 'vercel.app'];

export function getTenantSlug(): string | null {
  if (typeof window === 'undefined') return null;
  const host = window.location.hostname;
  if (HOTES_SANS_TENANT.some(h => host === h || host.endsWith(`.${h}`))) {
    // gbtrans.vercel.app et les URLs de preview (xxx-sanhold-projects.vercel.app) : pas de tenant.
    // Exception : un sous-domaine custom sous vercel.app n'est pas supporte ici, seul un
    // domaine propre (ex: gbtrans.app) porte de vrais sous-domaines de tenant.
    return null;
  }
  const parts = host.split('.');
  if (parts.length <= 2) return null; // domaine apex (gbtrans.app), pas un sous-domaine
  const slug = parts[0];
  if (slug === 'www' || slug === 'app' || slug === 'api') return null;
  return slug;
}

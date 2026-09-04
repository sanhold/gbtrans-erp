// Mappe les sections de l'application aux modules de permission backend
// (MODULE:LIRE minimum pour accéder à la page). Source unique utilisée
// par la Sidebar (masquage du menu) et AppLayout (garde de route).
export const ROUTE_MODULES: { href: string; module: string }[] = [
  { href: '/dossiers', module: 'DOSSIERS' },
  { href: '/at', module: 'AT' },
  { href: '/cautions', module: 'CAUTIONS' },
  { href: '/courriers', module: 'COURRIERS' },
  { href: '/archives', module: 'ARCHIVES' },
  { href: '/offres', module: 'OFFRES' },
  { href: '/proformas', module: 'PROFORMAS' },
  { href: '/facturation-fournisseurs', module: 'FOURNISSEURS' },
  { href: '/facturation', module: 'FACTURATION' },
  { href: '/finance/etat-facturation-dossier', module: 'FACTURATION' },
  { href: '/finance', module: 'FINANCE' },
  { href: '/transactions', module: 'FINANCE' },
  { href: '/comptabilite', module: 'COMPTABILITE' },
  { href: '/statistiques', module: 'STATISTIQUES' },
  { href: '/clients', module: 'CLIENTS' },
  { href: '/prospects', module: 'CLIENTS' },
  { href: '/fournisseurs', module: 'FOURNISSEURS' },
  { href: '/parametres', module: 'PARAMETRES' },
  // Trié du plus spécifique au plus générique pour le préfix-matching.
].sort((a, b) => b.href.length - a.href.length);

/** Module de permission requis pour un chemin donné, ou null si la page est libre (ex: /dashboard). */
export function getRequiredModule(pathname: string): string | null {
  const match = ROUTE_MODULES.find((r) => pathname === r.href || pathname.startsWith(r.href + '/'));
  return match?.module ?? null;
}

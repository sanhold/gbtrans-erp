import { getRequiredModule } from '@/lib/permissions';

type Utilisateur = { societe?: { activiteTransit?: boolean; activiteTransport?: boolean } } | null | undefined;

/** Une section est accessible si le profil a LIRE sur son module et si l'activité de la société l'autorise. */
export function peutAcceder(href: string, user: Utilisateur, hasPermission: (p: string) => boolean, activite?: 'TRANSIT' | 'TRANSPORT'): boolean {
  if (activite === 'TRANSIT' && user?.societe?.activiteTransit === false) return false;
  if (activite === 'TRANSPORT' && user?.societe?.activiteTransport !== true) return false;
  const moduleRequis = getRequiredModule(href);
  return !moduleRequis || hasPermission(`${moduleRequis}:LIRE`);
}

export function peutCreer(module: string, hasPermission: (p: string) => boolean): boolean {
  return hasPermission(`${module}:CREER`);
}

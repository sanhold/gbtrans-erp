import { create } from 'zustand';
import { authApi } from '@/lib/api';
import { invalidateCache } from '@/lib/cache';

const PROFILE_TTL = 5 * 60_000;
let profileFetchedAt = 0;
let profileInFlight: Promise<void> | null = null;

interface User {
  id: string;
  matricule: string;
  nom: string;
  prenom: string;
  email: string;
  doubleAuth?: boolean;
  societe: { id: string; raisonSociale: string; code: string; activiteTransit?: boolean; activiteTransport?: boolean };
  profil: {
    id: string;
    nom: string;
    estAdmin: boolean;
    permissions: string[];
  } | null;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, motDePasse: string) => Promise<any>;
  logout: () => Promise<void>;
  loadProfile: (force?: boolean) => Promise<void>;
  hasPermission: (permission: string) => boolean;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: false,

  login: async (email: string, motDePasse: string) => {
    set({ isLoading: true });

    try {
      const response = await authApi.login(email, motDePasse);
      const { data } = response.data;

      if (data.requiresTwoFactor) {
        set({ isLoading: false });
        return data;
      }

      invalidateCache();
      profileFetchedAt = Date.now();
      localStorage.setItem('gbtrans_token', data.token);
      localStorage.setItem('gbtrans_user', JSON.stringify(data.utilisateur));

      set({
        token: data.token,
        user: data.utilisateur,
        isAuthenticated: true,
        isLoading: false,
      });

      return data;
    } catch (error: any) {
      set({ isLoading: false });
      throw new Error(
        error.response?.data?.message || 'Identifiants incorrects'
      );
    }
  },

  logout: async () => {
    try {
      await authApi.logout();
    } catch {
      // OK
    }
    localStorage.removeItem('gbtrans_token');
    localStorage.removeItem('gbtrans_user');
    // Les clés du cache client ne contiennent pas la société : on le vide pour qu'un
    // autre utilisateur ne voie jamais les données du précédent.
    invalidateCache();
    profileFetchedAt = 0;
    profileInFlight = null;
    set({ user: null, token: null, isAuthenticated: false });
  },

  loadProfile: async (force = false) => {
    if (typeof window === 'undefined') return;

    const savedToken = localStorage.getItem('gbtrans_token');
    if (!savedToken) {
      set({ user: null, token: null, isAuthenticated: false });
      return;
    }

    // Affichage immédiat depuis le stockage local (pas d'attente réseau)
    let hasLocalUser = !!get().user;
    if (!hasLocalUser) {
      const savedUser = localStorage.getItem('gbtrans_user');
      if (savedUser) {
        try {
          set({ user: JSON.parse(savedUser), token: savedToken, isAuthenticated: true });
          hasLocalUser = true;
        } catch {
          // invalide
        }
      }
    }
    if (!get().isAuthenticated) set({ token: savedToken, isAuthenticated: true });

    const fresh = Date.now() - profileFetchedAt < PROFILE_TTL;
    if (hasLocalUser && !force && fresh) return;

    if (!profileInFlight || force) {
      profileInFlight = authApi
        .profile()
        .then((response) => {
          const user = response.data.data;
          profileFetchedAt = Date.now();
          localStorage.setItem('gbtrans_user', JSON.stringify(user));
          set({ user, isAuthenticated: true });
        })
        .catch((error: any) => {
          if (error?.response?.status === 401 || !hasLocalUser) {
            set({ user: null, token: null, isAuthenticated: false });
            localStorage.removeItem('gbtrans_token');
            localStorage.removeItem('gbtrans_user');
          }
        })
        .finally(() => { profileInFlight = null; });
    }
    // Avec un profil local, on rafraîchit en arrière-plan sans bloquer le rendu
    if (hasLocalUser && !force) return;
    await profileInFlight;
  },

  hasPermission: (permission: string) => {
    const { user } = get();
    if (!user) return false;
    if (user.profil?.estAdmin) return true;
    return user.profil?.permissions?.includes(permission) || false;
  },
}));

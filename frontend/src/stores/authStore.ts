import { create } from 'zustand';
import { authApi } from '@/lib/api';

interface User {
  id: string;
  matricule: string;
  nom: string;
  prenom: string;
  email: string;
  societe: { id: string; raisonSociale: string; code: string };
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
  loadProfile: () => Promise<void>;
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
    set({ user: null, token: null, isAuthenticated: false });
  },

  loadProfile: async () => {
    if (typeof window === 'undefined') return;

    const savedToken = localStorage.getItem('gbtrans_token');
    if (!savedToken) {
      set({ user: null, token: null, isAuthenticated: false });
      return;
    }

    set({ token: savedToken, isAuthenticated: true });

    try {
      const response = await authApi.profile();
      const user = response.data.data;
      localStorage.setItem('gbtrans_user', JSON.stringify(user));
      set({ user, isAuthenticated: true });
    } catch {
      const savedUser = localStorage.getItem('gbtrans_user');
      if (savedUser) {
        try {
          set({ user: JSON.parse(savedUser), isAuthenticated: true });
          return;
        } catch {
          // invalide
        }
      }
      set({ user: null, isAuthenticated: false });
      localStorage.removeItem('gbtrans_token');
      localStorage.removeItem('gbtrans_user');
    }
  },

  hasPermission: (permission: string) => {
    const { user } = get();
    if (!user) return false;
    if (user.profil?.estAdmin) return true;
    return user.profil?.permissions?.includes(permission) || false;
  },
}));

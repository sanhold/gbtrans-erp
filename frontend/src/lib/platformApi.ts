import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';
const TOKEN_KEY = 'gbtrans_platform_token';

const platformClient = axios.create({
  baseURL: `${API_BASE_URL}/platform`,
  headers: { 'Content-Type': 'application/json' },
  timeout: 30000,
});

platformClient.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem(TOKEN_KEY);
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

platformClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && typeof window !== 'undefined') {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem('gbtrans_platform_admin');
      if (!window.location.pathname.startsWith('/admin/login')) window.location.href = '/admin/login';
    }
    return Promise.reject(error);
  }
);

export const platformAuth = {
  login: (email: string, motDePasse: string) => platformClient.post('/login', { email, motDePasse }),
  setSession: (token: string, admin: any) => {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem('gbtrans_platform_admin', JSON.stringify(admin));
  },
  getAdmin: () => {
    if (typeof window === 'undefined') return null;
    const raw = localStorage.getItem('gbtrans_platform_admin');
    return raw ? JSON.parse(raw) : null;
  },
  isAuthenticated: () => typeof window !== 'undefined' && !!localStorage.getItem(TOKEN_KEY),
  logout: () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem('gbtrans_platform_admin');
  },
};

export const platformApi = {
  societes: () => platformClient.get('/societes'),
  societe: (id: string) => platformClient.get(`/societes/${id}`),
  majAbonnement: (societeId: string, data: { statut?: string; dateFin?: string }) => platformClient.patch(`/societes/${societeId}/abonnement`, data),
  prolongerEssai: (societeId: string, jours: number) => platformClient.post(`/societes/${societeId}/prolonger-essai`, { jours }),
  relancerSociete: (societeId: string) => platformClient.post(`/societes/${societeId}/relancer`),
  auditLog: (params?: { page?: number; limit?: number }) => platformClient.get('/audit-log', { params }),
  plans: () => platformClient.get('/plans'),
  majPlan: (id: string, data: any) => platformClient.put(`/plans/${id}`, data),
  paiements: (params?: { page?: number; limit?: number; statut?: string; societeId?: string }) => platformClient.get('/paiements', { params }),
  tresorerie: () => platformClient.get('/tresorerie'),
  admins: () => platformClient.get('/admins'),
  creerAdmin: (data: { email: string; motDePasse: string; nom: string; prenom: string; superAdmin?: boolean }) => platformClient.post('/admins', data),
  toggleAdminStatut: (id: string) => platformClient.patch(`/admins/${id}/statut`),
  pawapayStatus: () => platformClient.get('/pawapay-status'),
  contenuVitrine: () => platformClient.get('/contenu-vitrine'),
  majContenuVitrine: (data: any) => platformClient.put('/contenu-vitrine', data),
};

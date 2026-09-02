import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

export const getFileUrl = (chemin: string) => `${API_BASE_URL.replace(/\/api\/v1\/?$/, '')}/uploads/${chemin}`;

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 30000,
});

api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('gbtrans_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      const isLoginRequest = error.config?.url?.includes('/auth/login');
      const isProfileRequest = error.config?.url?.includes('/auth/profile');
      if (typeof window !== 'undefined' && !isLoginRequest && !isProfileRequest) {
        localStorage.removeItem('gbtrans_token');
        localStorage.removeItem('gbtrans_user');
        window.location.href = '/auth/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;

// Auth API
export const authApi = {
  login: (email: string, motDePasse: string) =>
    api.post('/auth/login', { email, motDePasse }),
  verify2FA: (email: string, code: string, token: string) =>
    api.post('/auth/verify-2fa', { email, code, token }),
  logout: () => api.post('/auth/logout'),
  profile: () => api.get('/auth/profile'),
  changePassword: (ancienMotDePasse: string, nouveauMotDePasse: string) =>
    api.post('/auth/change-password', { ancienMotDePasse, nouveauMotDePasse }),
  setup2FA: () => api.post('/auth/setup-2fa'),
};

// Dashboard API
export const dashboardApi = {
  stats: (annee?: number) =>
    api.get('/dashboard/stats', { params: annee ? { annee } : {} }),
  caMensuel: (annee?: number) =>
    api.get('/dashboard/ca-mensuel', { params: { annee } }),
  topClients: (limit?: number, annee?: number) =>
    api.get('/dashboard/top-clients', { params: { limit, annee } }),
  alertes: () => api.get('/dashboard/alertes'),
};

// Dossiers API
export const dossiersApi = {
  list: (params?: Record<string, any>) =>
    api.get('/dossiers', { params }),
  get: (id: string) => api.get(`/dossiers/${id}`),
  create: (data: any) => api.post('/dossiers', data),
  update: (id: string, data: any) => api.put(`/dossiers/${id}`, data),
  changeStatut: (id: string, statut: string, commentaire?: string) =>
    api.patch(`/dossiers/${id}/statut`, { statut, commentaire }),
  archiver: (id: string) => api.patch(`/dossiers/${id}/archiver`),
  delete: (id: string) => api.delete(`/dossiers/${id}`),
  stats: (annee?: number) =>
    api.get('/dossiers/statistiques', { params: { annee } }),
  suggestionNumeroPhysique: (nature: string, annee?: number) =>
    api.get('/dossiers/numero-physique-suggestion', { params: { nature, annee } }),
  bilan: (params?: Record<string, any>) =>
    api.get('/dossiers/bilan', { params }),
};

// AT (Admissions Temporaires) API
export const atApi = {
  list: (params?: Record<string, any>) => api.get('/at', { params }),
  get: (id: string) => api.get(`/at/${id}`),
  create: (data: any) => api.post('/at', data),
  update: (id: string, data: any) => api.put(`/at/${id}`, data),
  apurer: (id: string, data?: any) => api.patch(`/at/${id}/apurer`, data),
  prolonger: (id: string, data: any) => api.patch(`/at/${id}/prolonger`, data),
  prolongations: (id: string) => api.get(`/at/${id}/prolongations`),
  annuler: (id: string) => api.patch(`/at/${id}/annuler`),
};

// Cautions (dépôts conteneurs compagnies maritimes) API
export const cautionsApi = {
  list: (params?: Record<string, any>) => api.get('/cautions', { params }),
  stats: () => api.get('/cautions/stats'),
  create: (data: any) => api.post('/cautions', data),
  update: (id: string, data: any) => api.put(`/cautions/${id}`, data),
  activer: (id: string) => api.patch(`/cautions/${id}/activer`),
  desactiver: (id: string) => api.patch(`/cautions/${id}/desactiver`),
  marquerCourrier: (id: string, dateDepotCourrier?: string) => api.patch(`/cautions/${id}/courrier`, { dateDepotCourrier }),
  annulerCourrier: (id: string) => api.patch(`/cautions/${id}/annuler-courrier`),
  payer: (id: string, datePaiement?: string) => api.patch(`/cautions/${id}/payer`, { datePaiement }),
  delete: (id: string) => api.delete(`/cautions/${id}`),
};

// Courriers (entrants / sortants) API
export const courriersApi = {
  list: (params?: Record<string, any>) => api.get('/courriers', { params }),
  get: (id: string) => api.get(`/courriers/${id}`),
  create: (data: any) => api.post('/courriers', data),
  update: (id: string, data: any) => api.put(`/courriers/${id}`, data),
  changerStatut: (id: string, statut: string) => api.patch(`/courriers/${id}/statut`, { statut }),
  delete: (id: string) => api.delete(`/courriers/${id}`),
};

// Modèles de courrier (paramétrage) API
export const modelesCourrierApi = {
  list: (params?: Record<string, any>) => api.get('/modeles-courrier', { params }),
  get: (id: string) => api.get(`/modeles-courrier/${id}`),
  create: (data: any) => api.post('/modeles-courrier', data),
  update: (id: string, data: any) => api.put(`/modeles-courrier/${id}`, data),
  delete: (id: string) => api.delete(`/modeles-courrier/${id}`),
};

// Documents / Archives Numériques API
export const documentsApi = {
  list: (params?: Record<string, any>) => api.get('/documents', { params }),
  comptageCategories: () => api.get('/documents/comptage-categories'),
  upload: (formData: FormData) => api.post('/documents', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
};

// Clients API
export const clientsApi = {
  list: (params?: Record<string, any>) =>
    api.get('/clients', { params }),
  get: (id: string) => api.get(`/clients/${id}`),
  create: (data: any) => api.post('/clients', data),
  update: (id: string, data: any) => api.put(`/clients/${id}`, data),
  bloquer: (id: string, motif: string) =>
    api.patch(`/clients/${id}/bloquer`, { motif }),
  debloquer: (id: string) => api.patch(`/clients/${id}/debloquer`),
};

// Factures API
export const facturesApi = {
  list: (params?: Record<string, any>) =>
    api.get('/factures', { params }),
  get: (id: string) => api.get(`/factures/${id}`),
  create: (data: any) => api.post('/factures', data),
  valider: (id: string) => api.patch(`/factures/${id}/valider`),
  annuler: (id: string) => api.patch(`/factures/${id}/annuler`),
  creerAvoir: (id: string, motif: string) =>
    api.post(`/factures/${id}/avoir`, { motif }),
  payer: (id: string, data: any) =>
    api.post(`/factures/${id}/paiement`, data),
  stats: (annee?: number) =>
    api.get('/factures/statistiques', { params: { annee } }),
};

// Finance API
export const financeApi = {
  caisses: {
    list: () => api.get('/finance/caisses'),
    create: (data: any) => api.post('/finance/caisses', data),
    update: (id: string, data: any) => api.put(`/finance/caisses/${id}`, data),
    desactiver: (id: string) => api.patch(`/finance/caisses/${id}/desactiver`),
    activer: (id: string) => api.patch(`/finance/caisses/${id}/activer`),
  },
  comptesBancaires: {
    list: () => api.get('/finance/comptes-bancaires'),
    create: (data: any) => api.post('/finance/comptes-bancaires', data),
    update: (id: string, data: any) => api.put(`/finance/comptes-bancaires/${id}`, data),
    desactiver: (id: string) => api.patch(`/finance/comptes-bancaires/${id}/desactiver`),
    activer: (id: string) => api.patch(`/finance/comptes-bancaires/${id}/activer`),
  },
  operations: {
    list: (params?: Record<string, any>) => api.get('/finance/operations', { params }),
    create: (data: any) => api.post('/finance/operations', data),
    agents: () => api.get('/finance/operations/agents'),
  },
  depenses: {
    list: (params?: Record<string, any>) => api.get('/finance/depenses', { params }),
    create: (data: any) => api.post('/finance/depenses', data),
    update: (id: string, data: any) => api.put(`/finance/depenses/${id}`, data),
  },
  paiements: {
    list: (params?: Record<string, any>) => api.get('/finance/paiements', { params }),
  },
  rapprochements: {
    list: (params?: Record<string, any>) => api.get('/finance/rapprochements', { params }),
    create: (data: any) => api.post('/finance/rapprochements', data),
    updateStatut: (id: string, statut: string) => api.patch(`/finance/rapprochements/${id}/statut`, { statut }),
  },
  comptesTiers: {
    list: (params?: Record<string, any>) => api.get('/finance/comptes-tiers', { params }),
    create: (data: any) => api.post('/finance/comptes-tiers', data),
    update: (id: string, data: any) => api.put(`/finance/comptes-tiers/${id}`, data),
    desactiver: (id: string) => api.patch(`/finance/comptes-tiers/${id}/desactiver`),
    activer: (id: string) => api.patch(`/finance/comptes-tiers/${id}/activer`),
  },
  comptesClients: {
    list: () => api.get('/finance/comptes-clients'),
    get: (clientId: string) => api.get(`/finance/comptes-clients/${clientId}`),
  },
  comptesFournisseurs: {
    list: () => api.get('/finance/comptes-fournisseurs'),
    get: (fournisseurId: string) => api.get(`/finance/comptes-fournisseurs/${fournisseurId}`),
  },
  facturesFournisseurs: {
    list: (params?: Record<string, any>) => api.get('/finance/factures-fournisseurs', { params }),
    get: (id: string) => api.get(`/finance/factures-fournisseurs/${id}`),
    create: (data: any) => api.post('/finance/factures-fournisseurs', data),
    valider: (id: string) => api.patch(`/finance/factures-fournisseurs/${id}/valider`),
    payer: (id: string, data: any) => api.post(`/finance/factures-fournisseurs/${id}/paiement`, data),
    ajouterLigne: (id: string, data: any) => api.post(`/finance/factures-fournisseurs/${id}/lignes`, data),
    modifierLigne: (id: string, ligneId: string, data: any) => api.put(`/finance/factures-fournisseurs/${id}/lignes/${ligneId}`, data),
    supprimerLigne: (id: string, ligneId: string) => api.delete(`/finance/factures-fournisseurs/${id}/lignes/${ligneId}`),
  },
  dotations: {
    list: (params?: Record<string, any>) => api.get('/finance/dotations', { params }),
    get: (id: string) => api.get(`/finance/dotations/${id}`),
    create: (data: any) => api.post('/finance/dotations', data),
    update: (id: string, data: any) => api.put(`/finance/dotations/${id}`, data),
    annuler: (id: string) => api.patch(`/finance/dotations/${id}/annuler`),
  },
};

// Catalogue des Prestations API
export const catalogueApi = {
  list: () => api.get('/proformas/catalogue'),
  create: (data: any) => api.post('/proformas/catalogue', data),
  update: (id: string, data: any) => api.put(`/proformas/catalogue/${id}`, data),
  delete: (id: string) => api.delete(`/proformas/catalogue/${id}`),
};

// Offres Commerciales API
export const offresApi = {
  list: (params?: Record<string, any>) => api.get('/offres', { params }),
  get: (id: string) => api.get(`/offres/${id}`),
  create: (data: any) => api.post('/offres', data),
  update: (id: string, data: any) => api.put(`/offres/${id}`, data),
  changerStatut: (id: string, statut: string) => api.patch(`/offres/${id}/statut`, { statut }),
  transformerProforma: (id: string) => api.post(`/offres/${id}/transformer-proforma`),
  delete: (id: string) => api.delete(`/offres/${id}`),
};

// Comptabilité API
export const comptabiliteApi = {
  exercices: () => api.get('/comptabilite/exercices'),
  journaux: () => api.get('/comptabilite/journaux'),
  ecritures: (params?: Record<string, any>) => api.get('/comptabilite/ecritures', { params }),
  grandLivre: (params?: Record<string, any>) => api.get('/comptabilite/grand-livre', { params }),
  balance: (params?: Record<string, any>) => api.get('/comptabilite/balance', { params }),
  bilan: (params?: Record<string, any>) => api.get('/comptabilite/bilan', { params }),
};

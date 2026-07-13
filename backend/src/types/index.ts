import { Request } from 'express';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    societeId: string;
    agenceId?: string;
    email: string;
    matricule: string;
    nom: string;
    prenom: string;
    profilId?: string;
    estAdmin: boolean;
    permissions: string[];
  };
}

export interface PaginationParams {
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  search?: string;
}

export interface FilterDossier {
  societeId?: string;
  agenceId?: string;
  clientId?: string;
  nature?: string;
  type?: string;
  statut?: string;
  annee?: number;
  dateDebut?: Date;
  dateFin?: Date;
  search?: string;
}

export interface DashboardStats {
  totalDossiers: number;
  dossiersParAnnee: Record<string, number>;
  dossiersImport: number;
  dossiersExport: number;
  dossiersTransit: number;
  totalClients: number;
  totalFournisseurs: number;
  montantFacture: number;
  montantEncaisse: number;
  montantImpaye: number;
  totalProformas: number;
  totalFactures: number;
  atActives: number;
  atExpirees: number;
  totalCautions: number;
  totalCourriers: number;
  documentsArchives: number;
  recettes: number;
  depenses: number;
  benefice: number;
  dossiersEnCours: number;
  facturesImpayeesCount: number;
  montantFactureMois: number;
}

export interface ChampDef {
  cle: string;
  label: string;
  obligatoire: boolean;
  secret: boolean;
  placeholder?: string;
}

export interface DepotParams {
  montant: number;
  devise: string;
  correspondant?: string;
  telephone: string;
  description: string;
}

export interface ResultatDepot {
  referenceExterne: string;
  payloadBrut: any;
}

export interface ResultatStatut {
  statut: 'EN_ATTENTE' | 'REUSSI' | 'ECHEC';
  payloadBrut: any;
}

export interface CorrespondantDef {
  code: string;
  label: string;
}

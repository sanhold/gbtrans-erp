'use client';

import { cachedGet, peekCache, invalidateCache, TTL } from './cache';
import { useCallback, useEffect, useState } from 'react';
import { financeApi } from '@/lib/api';

export const fmt = (n: any) => n != null ? new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(Number(n)) : '0';

export const MODE_PAIEMENT_LABELS: Record<string, string> = {
  ESPECES: 'Espèces', CHEQUE: 'Chèque', VIREMENT: 'Virement', TRAITE: 'Traite',
  MOBILE_MONEY: 'Mobile Money', ORANGE_MONEY: 'Orange Money', MTN_MONEY: 'MTN Money',
  WAVE: 'Wave', MOOV_MONEY: 'Moov Money', CARTE_BANCAIRE: 'Carte bancaire', COMPENSATION: 'Compensation',
};

export const TYPE_OPERATION_LABELS: Record<string, string> = {
  ENCAISSEMENT: 'Encaissement', DECAISSEMENT: 'Décaissement', VIREMENT_INTERNE: 'Virement interne',
  DOTATION: 'Dotation', RETRAIT: 'Retrait',
};

export const CATEGORIES_DEPENSE = ['DOUANE & COMPAGNIE', 'FRAIS PORTUAIRES', 'AUTRES FRAIS', 'TRANSPORT', 'Autre'];

export const CREANCE_STATUTS_OUVERTS = ['VALIDEE', 'ENVOYEE', 'PARTIELLEMENT_PAYEE', 'EN_RETARD'];
export const CREANCE_STATUT_BADGE: Record<string, string> = {
  VALIDEE: 'badge-info', ENVOYEE: 'badge-info', PARTIELLEMENT_PAYEE: 'badge-warning', EN_RETARD: 'badge-danger',
};

export { STATUTS_DOSSIER } from './dossierStatut';

export function mergedComptes(caisses: any[], comptes: any[], tiers: any[] = []) {
  return [
    ...caisses.filter(c => c.actif).map(c => ({ value: `CAISSE:${c.id}`, label: `Caisse — ${c.libelle}` })),
    ...comptes.filter(c => c.actif).map(c => ({ value: `BANQUE:${c.id}`, label: `Banque — ${c.libelle} (${c.banque})` })),
    ...tiers.filter(c => c.actif).map(c => ({ value: `TIERS:${c.id}`, label: `${c.type} — ${c.libelle}` })),
  ];
}

export function parseCompteValue(value: string): { type: 'CAISSE' | 'BANQUE' | 'TIERS'; id: string } | null {
  if (!value) return null;
  const [type, id] = value.split(':');
  return { type: type as 'CAISSE' | 'BANQUE' | 'TIERS', id };
}

const COMPTES_KEY = 'ref:comptesFinanciers';
type ComptesData = { caisses: any[]; comptes: any[]; tiers: any[] };

export function useComptesFinanciers() {
  // Stale-while-revalidate : les soldes en cache s'affichent immédiatement
  const initial = peekCache<ComptesData>(COMPTES_KEY);
  const [caisses, setCaisses] = useState<any[]>(initial?.caisses ?? []);
  const [comptes, setComptes] = useState<any[]>(initial?.comptes ?? []);
  const [tiers, setTiers] = useState<any[]>(initial?.tiers ?? []);
  const [loading, setLoading] = useState(!initial);

  const reload = useCallback(async (force = true) => {
    if (force) invalidateCache(COMPTES_KEY);
    try {
      const d = await cachedGet<ComptesData>(COMPTES_KEY, async () => {
        const [cRes, bRes, tRes] = await Promise.all([financeApi.caisses.list(), financeApi.comptesBancaires.list(), financeApi.comptesTiers.list()]);
        return { caisses: cRes.data.data || [], comptes: bRes.data.data || [], tiers: tRes.data.data || [] };
      }, TTL.court);
      setCaisses(d.caisses); setComptes(d.comptes); setTiers(d.tiers);
    } catch { setCaisses([]); setComptes([]); setTiers([]); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { reload(false); }, [reload]);

  return { caisses, comptes, tiers, loading, reload: () => reload(true) };
}

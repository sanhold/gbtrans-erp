'use client';

import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { parametresApi } from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';

export const emptySocieteForm = {
  raisonSociale: '', formeJuridique: '', ncc: '', rccm: '', regime: '', adresse: '', ville: '', pays: '',
  telephone: '', mobile: '', email: '', siteWeb: '', devise: 'XOF', tauxTVA: '18', timbreFiscal: '0',
  slogan: '', mentionLegale: '',
  smtpHost: '', smtpPort: '', smtpUser: '', smtpPass: '', smtpSecure: true,
};
export type SocieteForm = typeof emptySocieteForm;

const fileToDataUrl = (file: File): Promise<string> => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(reader.result as string);
  reader.onerror = reject;
  reader.readAsDataURL(file);
});

/** État et actions de la fiche société (partagés par les sections Entreprise et Email). */
export function useSociete() {
  const [societe, setSociete] = useState<any>(null);
  const [societeForm, setSocieteForm] = useState<SocieteForm>(emptySocieteForm);
  const [loadingSociete, setLoadingSociete] = useState(true);
  const [savingSociete, setSavingSociete] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingSignature, setUploadingSignature] = useState(false);
  const [togglingActivite, setTogglingActivite] = useState(false);

  const loadSociete = useCallback(() => {
    setLoadingSociete(true);
    parametresApi.societe.get().then(r => {
      const s = r.data.data;
      setSociete(s);
      setSocieteForm({
        raisonSociale: s.raisonSociale || '', formeJuridique: s.formeJuridique || '', ncc: s.ncc || '',
        rccm: s.rccm || '', regime: s.regime || '', adresse: s.adresse || '', ville: s.ville || '', pays: s.pays || '',
        telephone: s.telephone || '', mobile: s.mobile || '', email: s.email || '', siteWeb: s.siteWeb || '',
        devise: s.devise || 'XOF', tauxTVA: String(s.tauxTVA ?? 18), timbreFiscal: String(s.timbreFiscal ?? 0),
        slogan: s.slogan || '', mentionLegale: s.mentionLegale || '',
        smtpHost: s.smtpHost || '', smtpPort: s.smtpPort ? String(s.smtpPort) : '', smtpUser: s.smtpUser || '',
        smtpPass: '', smtpSecure: s.smtpSecure !== false,
      });
    }).catch(() => toast.error('Erreur de chargement des informations société'))
      .finally(() => setLoadingSociete(false));
  }, []);

  useEffect(() => { loadSociete(); }, [loadSociete]);

  const toggleActivite = async (champ: 'activiteTransit' | 'activiteTransport', valeur: boolean) => {
    setTogglingActivite(true);
    try {
      await parametresApi.societe.update({ [champ]: valeur });
      toast.success(valeur ? 'Activité ajoutée' : 'Activité désactivée');
      loadSociete();
      useAuthStore.getState().loadProfile(true); // rafraichit le menu lateral sans recharger la page
    } catch (e: any) { toast.error(e.response?.data?.message || 'Erreur'); }
    finally { setTogglingActivite(false); }
  };

  const handleSaveSociete = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingSociete(true);
    try {
      const payload: any = { ...societeForm };
      if (!payload.smtpPass) delete payload.smtpPass;
      await parametresApi.societe.update(payload);
      toast.success('Informations société enregistrées');
      loadSociete();
    } catch (e: any) { toast.error(e.response?.data?.message || 'Erreur'); }
    finally { setSavingSociete(false); }
  };

  const envoyerImage = async (
    file: File | null, setBusy: (b: boolean) => void, call: (data: string | null) => Promise<any>, okMsg: string,
  ) => {
    if (!file) return;
    if (file.size > 2_000_000) { toast.error('Image trop volumineuse (2 Mo max)'); return; }
    setBusy(true);
    try {
      const dataUrl = await fileToDataUrl(file);
      const res = await call(dataUrl);
      setSociete(res.data.data);
      toast.success(okMsg);
    } catch (e: any) { toast.error(e.response?.data?.message || 'Erreur'); }
    finally { setBusy(false); }
  };

  const retirerImage = async (setBusy: (b: boolean) => void, call: (data: null) => Promise<any>, okMsg: string) => {
    setBusy(true);
    try { const res = await call(null); setSociete(res.data.data); toast.success(okMsg); }
    catch (e: any) { toast.error(e.response?.data?.message || 'Erreur'); }
    finally { setBusy(false); }
  };

  return {
    societe, societeForm, setSocieteForm, loadingSociete, savingSociete, uploadingLogo, uploadingSignature, togglingActivite,
    toggleActivite, handleSaveSociete,
    handleLogoChange: (f: File | null) => envoyerImage(f, setUploadingLogo, (d) => parametresApi.societe.setLogo(d), 'Logo mis à jour'),
    handleRemoveLogo: () => retirerImage(setUploadingLogo, (d) => parametresApi.societe.setLogo(d), 'Logo supprimé'),
    handleSignatureChange: (f: File | null) => envoyerImage(f, setUploadingSignature, (d) => parametresApi.societe.setSignature(d), 'Signature mise à jour'),
    handleRemoveSignature: () => retirerImage(setUploadingSignature, (d) => parametresApi.societe.setSignature(d), 'Signature supprimée'),
  };
}
export type SocieteState = ReturnType<typeof useSociete>;

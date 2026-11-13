'use client';

import { montantEnLettres } from './montantEnLettres';
import api from './api';
import { useAuthStore } from '@/stores/authStore';

export interface SocieteBranding {
  logo?: string | null;
  signature?: string | null;
  cachet?: string | null;
  raisonSociale?: string | null;
  slogan?: string | null;
  adresse?: string | null;
  ville?: string | null;
  pays?: string | null;
  telephone?: string | null;
  mobile?: string | null;
  email?: string | null;
  rccm?: string | null;
  ncc?: string | null;
  mentionLegale?: string | null;
}
let societeBrandingCache: SocieteBranding | null = null;
let societeBrandingUserId: string | null = null;

/** À appeler après modification de la signature / du cachet de l'utilisateur ou de la société. */
export function resetSocieteBranding() {
  societeBrandingCache = null;
}

/** Identité de la société + signature et cachet de l'utilisateur connecté (repli : signature de la société). */
export async function getSocieteBranding(): Promise<SocieteBranding> {
  const userId = useAuthStore.getState().user?.id || null;
  if (societeBrandingCache && societeBrandingUserId === userId) return societeBrandingCache;
  const [soc, moi] = await Promise.allSettled([api.get('/parametres/societe'), api.get('/utilisateurs/moi/signature')]);
  const s = soc.status === 'fulfilled' ? soc.value.data.data : null;
  const m = moi.status === 'fulfilled' ? moi.value.data.data : null;
  societeBrandingCache = s ? {
    logo: s.logo, signature: m?.signature || s.signature, cachet: m?.cachet || null,
    raisonSociale: s.raisonSociale, slogan: s.slogan,
    adresse: s.adresse, ville: s.ville, pays: s.pays,
    telephone: s.telephone, mobile: s.mobile, email: s.email,
    rccm: s.rccm, ncc: s.ncc, mentionLegale: s.mentionLegale,
  } : { signature: m?.signature || null, cachet: m?.cachet || null };
  societeBrandingUserId = userId;
  return societeBrandingCache;
}

export function brandIdentity(branding?: SocieteBranding) {
  const nom = branding?.raisonSociale || 'GBTRANS SARL';
  const slogan = branding?.slogan || 'Transit · Douane · Logistique';
  const adresseComplete = branding?.adresse || "Cocody Angré 7ème Tranche, Abidjan — Côte d'Ivoire";
  const telephone = branding?.telephone || branding?.mobile || '+225 27 20 00 00 00';
  const email = branding?.email || 'contact@gbtrans.ci';
  const rccm = branding?.rccm || 'CI-ABJ-2018-B-12345';
  const ncc = branding?.ncc || '1812345 Z';
  return { nom, slogan, adresseComplete, telephone, email, rccm, ncc };
}

const fmt = (n: any) => n != null ? new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(Number(n)) : '0';

const BRAND = {
  primary: '#12314f',
  primaryDark: '#0c2035',
  accent: '#e8821e',
  ink: '#16232e',
  slate: '#56626f',
  line: '#dbe2e8',
  bgSoft: '#f4f7fa',
  greyBg: '#eaeef2',
};

interface LigneDoc {
  categorie?: string;
  designation: string;
  quantite?: number;
  prixUnitaire?: number;
  montant: number;
  estTVA?: boolean;
  /** Taux de TVA appliqué à la ligne (0 ou absent : pas de TVA sur la ligne). */
  tauxTVA?: number;
}

interface DocData {
  type: 'PROFORMA' | 'FACTURE';
  /** Mise en page d'une facture : 'PROFORMA' = format proforma, sinon version actuelle. */
  modele?: string;
  numero: string;
  date: string;
  /** Date d'échéance (facture), déjà formatée. */
  dateEcheance?: string;
  /** Délai de règlement en jours entre l'émission et l'échéance. */
  delaiJours?: number;
  /** Statut de la facture (BROUILLON, VALIDEE, PAYEE...). */
  statut?: string;
  client: string;
  clientAdresse?: string;
  clientTelephone?: string;
  clientEmail?: string;
  clientNcc?: string;
  clientPays?: string;
  dossierNumero?: string;
  titre?: string;
  afficherSignature?: boolean;
  fobUnitaire?: number;
  fretUnitaire?: number;
  assurance?: number;
  fraisDivers?: number;
  nombreUnites?: number;
  valeurCAF?: number;
  montantHT: number;
  montantTVA: number;
  montantTTC: number;
  montantPrestation?: number;
  tvaPrestation?: number;
  acompte?: number;
  resteAPayer?: number;
  lignes: LigneDoc[];
}


const STATUTS_FACTURE: Record<string, [string, string, string, string]> = {
  BROUILLON: ['Brouillon', '#5b6b7a', '#eef1f4', '#d9e0e7'],
  VALIDEE: ['Validée', '#1c7c54', '#e6f5ee', '#bfe3d0'],
  ENVOYEE: ['Envoyée', '#1c7c54', '#e6f5ee', '#bfe3d0'],
  PARTIELLEMENT_PAYEE: ['Partiellement payée', '#b4600f', '#fff7ef', '#f3d3b0'],
  PAYEE: ['Payée', '#1c7c54', '#e6f5ee', '#bfe3d0'],
  EN_RETARD: ['En retard', '#b3261e', '#fdecea', '#f5c2bd'],
  ANNULEE: ['Annulée', '#5b6b7a', '#eef1f4', '#d9e0e7'],
  CONTENTIEUX: ['Contentieux', '#b3261e', '#fdecea', '#f5c2bd'],
};

const fmtQte = (n: any) => new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 3 }).format(Number(n ?? 1));

function buildContentHtml(data: DocData, branding?: SocieteBranding): string {
  const C = { navy: BRAND.primary, accent: BRAND.accent, ink: BRAND.ink, soft: '#5b6b7a', line: '#d9e0e7', tint: BRAND.bgSoft };
  const brand = brandIdentity(branding);
  const legalDisclaimer = branding?.mentionLegale || 'Facture définitive. Toute réclamation doit être formulée sous 8 jours.';
  const statut = data.statut ? STATUTS_FACTURE[data.statut] : undefined;

  // Groupes par catégorie, dans l'ordre d'apparition ; les lignes sans catégorie ne sont jamais perdues.
  const ordre: string[] = [];
  for (const l of data.lignes) { const c = l.categorie || ''; if (!ordre.includes(c)) ordre.push(c); }
  let n = 0;
  let corps = '';
  for (const cat of ordre) {
    const groupe = data.lignes.filter(l => (l.categorie || '') === cat);
    if (cat) corps += `<tr><td colspan="6" style="background:${C.tint};color:${C.navy};font-weight:800;font-size:9.5px;letter-spacing:.1em;text-transform:uppercase;padding:6px 8px;border-bottom:1px solid ${C.line};">${cat}</td></tr>`;
    for (const l of groupe) {
      n++;
      corps += `<tr>
        <td style="width:26px;padding:7px 8px;color:${C.soft};border-bottom:1px solid ${C.line};vertical-align:top;">${n}</td>
        <td style="padding:7px 8px;border-bottom:1px solid ${C.line};vertical-align:top;">${l.designation}${l.estTVA ? `<span style="display:inline-block;white-space:nowrap;margin-left:6px;font-size:7.5px;color:${C.soft};border:1px solid ${C.line};border-radius:8px;padding:1px 6px;">TVA</span>` : ''}</td>
        <td style="width:46px;padding:7px 8px;text-align:center;border-bottom:1px solid ${C.line};vertical-align:top;">${fmtQte(l.quantite)}</td>
        <td style="width:92px;padding:7px 8px;text-align:right;border-bottom:1px solid ${C.line};vertical-align:top;">${fmt(l.prixUnitaire ?? l.montant)}</td>
        <td style="width:46px;padding:7px 8px;text-align:center;color:${C.soft};border-bottom:1px solid ${C.line};vertical-align:top;">${l.tauxTVA && l.tauxTVA > 0 ? `${fmtQte(l.tauxTVA)} %` : '—'}</td>
        <td style="width:100px;padding:7px 8px;text-align:right;font-weight:700;border-bottom:1px solid ${C.line};vertical-align:top;">${fmt(l.montant)}</td>
      </tr>`;
    }
    if (cat) {
      const sousTotal = groupe.reduce((t, l) => t + l.montant, 0);
      corps += `<tr><td colspan="5" style="text-align:right;color:${C.soft};font-size:10px;font-weight:700;padding:6px 8px;border-bottom:1.5px solid ${C.navy};">Sous-total ${cat.toLowerCase()}</td>
        <td style="text-align:right;color:${C.navy};font-size:10.5px;font-weight:800;padding:6px 8px;border-bottom:1.5px solid ${C.navy};">${fmt(sousTotal)}</td></tr>`;
    }
  }

  const refs: [string, string][] = [
    ["Date d'émission", data.date],
    ...(data.dateEcheance ? [['Échéance', data.dateEcheance] as [string, string]] : []),
    ...(data.dossierNumero ? [['Réf. dossier', data.dossierNumero] as [string, string]] : []),
    ...(data.delaiJours != null ? [['Conditions', data.delaiJours > 0 ? `${data.delaiJours} jours net` : 'À réception'] as [string, string]] : []),
  ];

  const lbl = (t: string) => `<div style="font-size:8.5px;letter-spacing:.14em;text-transform:uppercase;font-weight:700;color:${C.accent};padding-bottom:5px;border-bottom:2px solid ${C.navy};margin-bottom:8px;">${t}</div>`;
  const ligneTotal = (t: string, v: string) => `<div style="display:flex;justify-content:space-between;padding:6px 12px;border-bottom:1px solid ${C.line};font-size:11px;"><span>${t}</span><span style="font-weight:700;">${v}</span></div>`;
  const infosClient = [data.clientAdresse, data.clientPays, data.clientTelephone, data.clientEmail].filter(Boolean) as string[];

  return `
<div style="height:7px;border-radius:4px;margin-bottom:16px;background:linear-gradient(90deg,${C.navy} 0 78%,${C.accent} 78% 100%);"></div>

<div style="display:flex;justify-content:space-between;align-items:flex-start;gap:18px;">
  <div style="display:flex;gap:13px;align-items:center;">
    ${branding?.logo
      ? `<img src="${branding.logo}" style="width:52px;height:52px;border-radius:12px;object-fit:contain;flex-shrink:0;background:#fff;border:1px solid ${C.line};" />`
      : `<div style="width:52px;height:52px;border-radius:12px;background:${C.navy};color:#fff;font-weight:800;font-size:18px;display:flex;align-items:center;justify-content:center;flex-shrink:0;">GB</div>`}
    <div>
      <div style="font-weight:800;font-size:20px;color:${C.navy};letter-spacing:.01em;">${brand.nom}</div>
      <div style="color:${C.accent};font-weight:700;font-size:9.5px;letter-spacing:.14em;text-transform:uppercase;margin-top:2px;">${brand.slogan}</div>
      <div style="color:${C.soft};font-size:10px;margin-top:5px;line-height:1.5;">${brand.adresseComplete}<br/>${brand.telephone} · ${brand.email}</div>
    </div>
  </div>
  <div style="text-align:right;flex-shrink:0;">
    <div style="font-size:28px;font-weight:800;letter-spacing:.06em;color:${C.navy};line-height:1;">FACTURE</div>
    <div style="margin-top:6px;font-size:13px;font-weight:700;color:${C.accent};letter-spacing:.04em;">N° ${data.numero}</div>
    ${statut ? `<div style="display:inline-block;margin-top:8px;font-size:9px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:${statut[1]};background:${statut[2]};border:1px solid ${statut[3]};border-radius:20px;padding:3px 10px;">● ${statut[0]}</div>` : ''}
  </div>
</div>

<div style="display:flex;margin-top:20px;border:1px solid ${C.line};border-radius:8px;overflow:hidden;">
  ${refs.map(([l, v], i) => `<div style="flex:1;padding:9px 14px;background:${C.tint};${i < refs.length - 1 ? `border-right:1px solid ${C.line};` : ''}"><div style="font-size:8.5px;text-transform:uppercase;letter-spacing:.1em;color:${C.soft};font-weight:600;">${l}</div><div style="margin-top:2px;font-size:12px;font-weight:700;color:${C.navy};">${v}</div></div>`).join('')}
</div>

<div style="display:flex;gap:20px;margin-top:18px;">
  <div style="flex:1;">
    ${lbl('Émetteur')}
    <div style="font-weight:800;font-size:13px;color:${C.navy};">${brand.nom}</div>
    <div style="color:#33434f;margin-top:2px;">${brand.adresseComplete}</div>
    <div style="color:#33434f;">${brand.telephone} · ${brand.email}</div>
    <div style="color:${C.soft};font-size:9.5px;margin-top:4px;">RCCM ${brand.rccm} · NCC ${brand.ncc}</div>
  </div>
  <div style="flex:1;">
    ${lbl('Facturé à')}
    <div style="font-weight:800;font-size:13px;color:${C.navy};">${data.client}</div>
    ${infosClient.map(t => `<div style="color:#33434f;margin-top:2px;">${t}</div>`).join('')}
    ${data.clientNcc ? `<div style="color:${C.soft};font-size:9.5px;margin-top:4px;">N° contribuable : ${data.clientNcc}</div>` : ''}
  </div>
</div>

${data.titre ? `<div style="margin-top:16px;padding:10px 14px;background:${C.tint};border-left:4px solid ${C.navy};border-radius:0 6px 6px 0;"><div style="font-size:8.5px;text-transform:uppercase;letter-spacing:.12em;color:${C.soft};font-weight:600;">Objet</div><div style="font-size:12.5px;font-weight:800;color:${C.navy};margin-top:1px;text-transform:uppercase;">${data.titre}</div></div>` : ''}

<table style="width:100%;border-collapse:collapse;margin-top:16px;font-size:10.5px;">
  <thead><tr>
    <th style="background:${C.navy};color:#fff;font-size:8.5px;letter-spacing:.1em;text-transform:uppercase;padding:8px;text-align:left;">N°</th>
    <th style="background:${C.navy};color:#fff;font-size:8.5px;letter-spacing:.1em;text-transform:uppercase;padding:8px;text-align:left;">Désignation</th>
    <th style="background:${C.navy};color:#fff;font-size:8.5px;letter-spacing:.1em;text-transform:uppercase;padding:8px;text-align:center;">Qté</th>
    <th style="background:${C.navy};color:#fff;font-size:8.5px;letter-spacing:.1em;text-transform:uppercase;padding:8px;text-align:right;">Prix unitaire</th>
    <th style="background:${C.navy};color:#fff;font-size:8.5px;letter-spacing:.1em;text-transform:uppercase;padding:8px;text-align:center;">TVA</th>
    <th style="background:${C.navy};color:#fff;font-size:8.5px;letter-spacing:.1em;text-transform:uppercase;padding:8px;text-align:right;">Montant HT</th>
  </tr></thead>
  <tbody>${corps}</tbody>
</table>

${(data.fobUnitaire || data.fretUnitaire || data.valeurCAF) ? `<div style="display:flex;justify-content:flex-end;margin-top:10px;">
  <table style="font-size:9.5px;color:${C.soft};border:1px solid ${C.line};border-radius:6px;background:${C.tint};">
    ${data.fobUnitaire ? `<tr><td style="padding:1.5px 8px;">Fob unitaire</td><td style="padding:1.5px 8px;font-weight:700;">${fmt(data.fobUnitaire)}</td></tr>` : ''}
    ${data.fretUnitaire ? `<tr><td style="padding:1.5px 8px;">Fret unitaire</td><td style="padding:1.5px 8px;font-weight:700;">${fmt(data.fretUnitaire)}</td></tr>` : ''}
    ${data.assurance ? `<tr><td style="padding:1.5px 8px;">Assurance</td><td style="padding:1.5px 8px;font-weight:700;">${fmt(data.assurance)}</td></tr>` : ''}
    ${data.valeurCAF ? `<tr><td style="padding:1.5px 8px;font-weight:700;">Valeur CAF</td><td style="padding:1.5px 8px;font-weight:800;color:${C.accent};">${fmt(data.valeurCAF)}</td></tr>` : ''}
  </table>
</div>` : ''}

<div style="display:flex;gap:22px;margin-top:18px;align-items:flex-start;">
  <div style="flex:1;">
    <div style="border:1px solid ${C.line};border-radius:8px;padding:10px 14px;">
      <div style="font-size:8.5px;text-transform:uppercase;letter-spacing:.1em;color:${C.soft};font-weight:600;">Arrêtée la présente facture à la somme de</div>
      <div style="margin-top:3px;font-size:11.5px;font-weight:700;color:${C.navy};font-style:italic;line-height:1.5;">${montantEnLettres(data.montantTTC)}</div>
    </div>
    <div style="margin-top:12px;font-size:10px;color:#33434f;line-height:1.6;">
      <div style="font-size:8.5px;letter-spacing:.14em;text-transform:uppercase;font-weight:700;color:${C.accent};margin-bottom:3px;">Modalités de règlement</div>
      ${data.delaiJours != null && data.delaiJours > 0 ? `Règlement à ${data.delaiJours} jours par virement, chèque ou espèces.` : 'Règlement à réception par virement, chèque ou espèces.'}<br/>
      Indiquer le n° de facture en référence du paiement.
    </div>
  </div>
  <div style="width:262px;flex-shrink:0;">
    ${data.montantPrestation ? ligneTotal('Montant prestation', fmt(data.montantPrestation)) : ''}
    ${data.tvaPrestation ? ligneTotal('TVA / prestation', fmt(data.tvaPrestation)) : ''}
    ${ligneTotal('Total HT', fmt(data.montantHT))}
    ${ligneTotal('TVA 18 %', fmt(data.montantTVA))}
    <div style="background:${C.navy};color:#fff;border-radius:6px;margin-top:6px;padding:10px 12px;display:flex;justify-content:space-between;font-weight:800;font-size:13px;"><span>TOTAL TTC</span><span>${fmt(data.montantTTC)} XOF</span></div>
    ${data.acompte ? `<div style="margin-top:6px;">${ligneTotal('Acompte reçu', fmt(data.acompte))}</div>` : ''}
    ${data.resteAPayer ? `<div style="margin-top:6px;border:1.5px solid ${C.accent};border-radius:6px;padding:8px 12px;display:flex;justify-content:space-between;font-weight:800;font-size:12px;color:#b4600f;background:#fff7ef;"><span>Reste à payer</span><span>${fmt(data.resteAPayer)} XOF</span></div>` : ''}
  </div>
</div>

${data.afficherSignature ? `<div style="display:flex;justify-content:flex-end;margin-top:24px;">
  <div style="text-align:center;width:220px;">
    <div style="color:${C.soft};font-size:9.5px;margin-bottom:${branding?.signature ? '4px' : '36px'};">Le Directeur — cachet &amp; signature</div>
    ${branding?.signature ? `<img src="${branding.signature}" style="height:34px;object-fit:contain;margin:0 auto;display:block;" />` : ''}
    ${branding?.cachet ? `<img src="${branding.cachet}" style="height:34px;object-fit:contain;margin:2px auto 0;display:block;" />` : ''}
    <div style="border-top:1px solid ${C.ink};padding-top:4px;font-weight:700;color:${C.navy};">${brand.nom}</div>
  </div>
</div>` : ''}

<div style="margin-top:22px;padding-top:10px;border-top:2px solid ${C.navy};display:flex;justify-content:space-between;gap:20px;font-size:8.5px;color:${C.soft};line-height:1.6;">
  <div><b style="color:${C.navy};">${brand.nom}</b> — ${brand.slogan}<br/>RCCM ${brand.rccm} · NCC ${brand.ncc}</div>
  <div style="text-align:right;">${legalDisclaimer}</div>
</div>`;
}

/** Données d'une facture (réponse de l'API, avec ses lignes) pour le PDF et l'impression. */
export function buildFactureDocData(f: any): DocData {
  const emission = new Date(f.dateFacture);
  const echeance = f.dateEcheance ? new Date(f.dateEcheance) : null;
  const d = f.dossier;
  return {
    type: 'FACTURE',
    modele: f.modele,
    numero: f.numero,
    statut: f.statut,
    date: emission.toLocaleDateString('fr-FR'),
    dateEcheance: echeance ? echeance.toLocaleDateString('fr-FR') : undefined,
    delaiJours: echeance ? Math.max(0, Math.round((echeance.getTime() - emission.getTime()) / 86400000)) : undefined,
    client: f.client?.raisonSociale || '',
    clientAdresse: f.client?.adresse || undefined,
    clientTelephone: f.client?.telephone || f.client?.mobile || undefined,
    clientEmail: f.client?.email || undefined,
    clientNcc: f.client?.ncc || undefined,
    clientPays: f.client?.pays || undefined,
    dossierNumero: d?.numeroPhysique || d?.numero,
    titre: f.titre || f.objet || undefined,
    afficherSignature: !!f.afficherSignature,
    montantHT: Number(f.montantHT),
    montantTVA: Number(f.montantTVA),
    montantTTC: Number(f.montantTTC),
    montantPrestation: f.montantPrestation ? Number(f.montantPrestation) : undefined,
    tvaPrestation: f.tvaPrestation ? Number(f.tvaPrestation) : undefined,
    acompte: Number(f.acompte) || undefined,
    resteAPayer: Number(f.resteAPayer) || undefined,
    lignes: (f.lignes || []).map((l: any) => ({
      categorie: l.categorie || '',
      designation: l.designation,
      quantite: Number(l.quantite || 1),
      prixUnitaire: Number(l.prixUnitaire || 0),
      // Montant HT de la ligne tel que calculé par le serveur (quantité × prix), cohérent avec les totaux.
      montant: Number(l.montantHT ?? Number(l.prixUnitaire || 0) * Number(l.quantite || 1)),
      estTVA: !!l.estTVA,
      tauxTVA: l.tauxTVA != null ? Number(l.tauxTVA) : undefined,
    })),
  };
}

const PAPER = {
  ink: '#16232e',
  inkSoft: '#56626f',
  gold: '#e8821e',
  goldSoft: '#fdf1e3',
  paper: '#FFFFFF',
  line: '#dbe2e8',
  danger: '#B3492F',
  dim: '#93a1ab',
};

export function buildProformaHtml(data: DocData, _qrDataUrl?: string, branding?: SocieteBranding): string {
  const categories = [...new Set(data.lignes.map(l => l.categorie))].filter(Boolean) as string[];
  const totalHT = data.montantHT;
  const totalTVA = data.montantTVA;
  const brand = brandIdentity(branding);
  const grey = '#eef1f4';

  let n = 0;
  let bodyHtml = '';
  for (const cat of categories) {
    const catLignes = data.lignes.filter(l => l.categorie === cat);
    const sousTotal = catLignes.reduce((s, l) => s + l.montant, 0);
    let rows = '';
    for (const l of catLignes) {
      n++;
      rows += `<tr>
        <td style="width:24px;text-align:center;color:${PAPER.dim};font-size:9.5px;padding:3px 5px;border-bottom:1px solid ${PAPER.line};">${n}</td>
        <td style="padding:3px 5px;font-size:10.5px;color:${PAPER.ink};border-bottom:1px solid ${PAPER.line};">${l.designation}${l.estTVA ? `<span style="display:inline-block;white-space:nowrap;vertical-align:middle;font-size:7.5px;color:${PAPER.inkSoft};border:1px solid ${PAPER.dim};border-radius:8px;padding:1px 6px;margin-left:6px;">TVA</span>` : ''}</td>
        <td style="width:105px;text-align:right;font-family:'Courier New',monospace;font-weight:700;font-size:10.5px;padding:3px 5px;border-bottom:1px solid ${PAPER.line};">${fmt(l.montant)}</td>
      </tr>`;
    }
    bodyHtml += `
      <tr><td colspan="3" style="color:${PAPER.ink};padding:5px 6px;font-size:10px;letter-spacing:.03em;font-weight:700;border-top:1px solid ${PAPER.line};border-bottom:1px solid ${PAPER.line};">${cat}</td></tr>
      ${rows}
      <tr><td colspan="2" style="text-align:right;font-weight:700;color:${PAPER.ink};border-top:1px solid ${PAPER.line};border-bottom:1px solid ${PAPER.line};padding:4px 6px;font-size:9.5px;">Sous-total ${cat}</td>
      <td style="text-align:right;font-weight:700;font-family:'Courier New',monospace;color:${PAPER.ink};border-top:1px solid ${PAPER.line};border-bottom:1px solid ${PAPER.line};padding:4px 6px;font-size:10.5px;">${fmt(sousTotal)}</td></tr>`;
  }

  const sectionsHtml = `<table style="width:100%;border-collapse:collapse;border:1px solid ${PAPER.line};font-family:'Segoe UI',Arial,sans-serif;">
    <thead><tr>
      <th style="text-align:center;width:24px;font-size:8px;text-transform:uppercase;letter-spacing:.05em;color:${PAPER.inkSoft};border-bottom:1px solid ${PAPER.line};padding:3px 5px;">N°</th>
      <th style="text-align:left;font-size:8px;text-transform:uppercase;letter-spacing:.05em;color:${PAPER.inkSoft};border-bottom:1px solid ${PAPER.line};padding:3px 5px;">Désignation</th>
      <th style="text-align:right;width:105px;font-size:8px;text-transform:uppercase;letter-spacing:.05em;color:${PAPER.inkSoft};border-bottom:1px solid ${PAPER.line};padding:3px 5px;">Montant</th>
    </tr></thead>
    <tbody>${bodyHtml}</tbody>
  </table>`;

  const clientRows = [
    ['Nom', data.client],
    ['Adresse', data.clientAdresse],
    ['Téléphone', data.clientTelephone],
    ['Email', data.clientEmail],
    ['N° Contribuable', data.clientNcc],
    ['Pays', data.clientPays || undefined],
  ].filter(([, v]) => v);

  return `
<div style="display:flex;justify-content:space-between;align-items:flex-start;border-bottom:2px solid ${PAPER.ink};padding-bottom:8px;margin-bottom:10px;">
  <div style="display:flex;gap:10px;align-items:flex-start;">
    ${branding?.logo ? `<img src="${branding.logo}" style="width:44px;height:44px;object-fit:contain;flex-shrink:0;" />` : ''}
    <div>
      <div style="font-size:18px;font-weight:700;color:${PAPER.ink};letter-spacing:.01em;">${brand.nom}</div>
      <div style="font-size:10.5px;color:${PAPER.inkSoft};margin-top:1px;">${brand.slogan}</div>
      <div style="font-size:9.5px;color:#5C6580;margin-top:4px;line-height:1.4;">
        ${brand.adresseComplete}<br/>
        ${brand.telephone} · ${brand.email}
      </div>
    </div>
  </div>
  <div style="text-align:right;">
    <div style="font-size:17px;font-weight:700;letter-spacing:.05em;color:${PAPER.ink};">${data.type === 'FACTURE' ? 'FACTURE' : 'FACTURE PROFORMA'}</div>
    <div style="font-size:11px;color:${PAPER.gold};font-weight:700;margin-top:2px;">N° ${data.numero}</div>
    ${data.dossierNumero ? `<div style="font-size:11px;color:${PAPER.inkSoft};margin-top:1px;">Dossier : <strong>${data.dossierNumero}</strong></div>` : ''}
    <div style="font-size:11px;color:${PAPER.inkSoft};margin-top:1px;">Date : ${data.date}</div>
  </div>
</div>

<div style="display:flex;gap:10px;margin-bottom:10px;align-items:stretch;">
  ${(data.fobUnitaire || data.fretUnitaire || data.assurance || data.valeurCAF) ? `<div style="flex:1.2;border:1px solid ${PAPER.line};padding:6px 9px;">
    <table style="width:100%;font-size:10px;color:${PAPER.inkSoft};font-family:'Segoe UI',Arial,sans-serif;border-collapse:collapse;">
      <tr>
        <td style="padding:2px 4px;width:25%;">FOB (Unitaire)</td><td style="padding:2px 4px;width:25%;text-align:right;font-weight:700;font-family:'Courier New',monospace;color:${PAPER.ink};">${fmt(data.fobUnitaire || 0)}</td>
        <td style="padding:2px 4px;width:25%;">Frais divers</td><td style="padding:2px 4px;width:25%;text-align:right;font-weight:700;font-family:'Courier New',monospace;color:${PAPER.ink};">${fmt(data.fraisDivers || 0)}</td>
      </tr>
      <tr>
        <td style="padding:2px 4px;">FRET (Unitaire)</td><td style="padding:2px 4px;text-align:right;font-weight:700;font-family:'Courier New',monospace;color:${PAPER.ink};">${fmt(data.fretUnitaire || 0)}</td>
        <td style="padding:2px 4px;">Nbre unités</td><td style="padding:2px 4px;text-align:right;font-weight:700;font-family:'Courier New',monospace;color:${PAPER.ink};">${data.nombreUnites || 1}</td>
      </tr>
      <tr>
        <td style="padding:2px 4px;">Assurance</td><td style="padding:2px 4px;text-align:right;font-weight:700;font-family:'Courier New',monospace;color:${PAPER.ink};">${fmt(data.assurance || 0)}</td>
        <td style="padding:2px 4px;font-weight:700;">Valeur CAF</td><td style="padding:2px 4px;text-align:right;font-weight:800;font-family:'Courier New',monospace;color:${PAPER.gold};">${fmt(data.valeurCAF || 0)}</td>
      </tr>
    </table>
  </div>` : ''}
  <div style="flex:1;border:1px solid ${PAPER.line};padding:6px 9px;">
    <div style="font-size:8.5px;text-transform:uppercase;letter-spacing:.08em;color:${PAPER.gold};font-weight:700;margin-bottom:3px;">Adressée à</div>
    ${clientRows.map(([label, value]) => `<div style="font-size:11px;padding:0.5px 0;${label === 'Nom' ? 'font-weight:700;' : ''}">${value}</div>`).join('')}
    ${data.type === 'FACTURE' ? '' : `<div style="font-size:9px;color:#8b93ad;margin-top:4px;">Offre valable 30 jours à compter de la date d'émission.</div>`}
  </div>
</div>

${data.titre ? `<div style="background:${grey};padding:5px 9px;margin-bottom:10px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.02em;border-left:3px solid ${PAPER.ink};color:${PAPER.ink};">${data.titre}</div>` : ''}

${sectionsHtml}

<div style="display:flex;gap:12px;margin-top:8px;margin-bottom:10px;align-items:stretch;">
  <div style="flex:1;border:1px solid ${PAPER.line};padding:6px 9px;">
    <div style="font-size:8.5px;text-transform:uppercase;letter-spacing:.08em;color:${PAPER.gold};font-weight:700;margin-bottom:3px;">Arrêtée à la présente facture à la somme de :</div>
    <div style="font-style:italic;font-weight:700;color:${PAPER.ink};font-size:10.5px;line-height:1.4;">${montantEnLettres(data.montantTTC)}</div>
  </div>
  <table style="width:220px;border:1px solid ${PAPER.line};border-collapse:collapse;font-size:10.5px;font-family:'Segoe UI',Arial,sans-serif;">
    <tr><td style="padding:5px 9px;color:${PAPER.inkSoft};border-bottom:1px solid ${PAPER.line};">TOTAL HT</td><td style="padding:5px 9px;text-align:right;font-weight:700;font-family:'Courier New',monospace;border-bottom:1px solid ${PAPER.line};">${fmt(totalHT)}</td></tr>
    <tr><td style="padding:5px 9px;color:${PAPER.inkSoft};border-bottom:1px solid ${PAPER.line};">TOTAL TVA</td><td style="padding:5px 9px;text-align:right;font-weight:700;font-family:'Courier New',monospace;border-bottom:1px solid ${PAPER.line};">${fmt(totalTVA)}</td></tr>
    <tr><td style="padding:6px 9px;color:${PAPER.ink};font-weight:800;font-size:12px;">TOTAL TTC</td><td style="padding:6px 9px;text-align:right;font-weight:800;font-size:12px;font-family:'Courier New',monospace;color:${PAPER.ink};">${fmt(data.montantTTC)}</td></tr>
  </table>
</div>

${data.afficherSignature ? `<div style="display:flex;justify-content:flex-end;margin-bottom:10px;">
  <div style="text-align:center;width:160px;">
    ${branding?.signature || branding?.cachet ? `${branding?.signature ? `<img src="${branding.signature}" style="max-width:140px;max-height:70px;object-fit:contain;" />` : ''}${branding?.cachet ? `<img src="${branding.cachet}" style="max-width:100px;max-height:70px;object-fit:contain;margin-left:6px;" />` : ''}` : '<div style="height:70px;"></div>'}
    <div style="border-top:1px solid ${PAPER.line};padding-top:4px;font-size:9px;color:${PAPER.inkSoft};font-weight:700;text-transform:uppercase;letter-spacing:.04em;">Le Responsable</div>
  </div>
</div>` : ''}

<div style="position:absolute;left:0;right:0;bottom:0;text-align:center;font-size:7.5px;color:${PAPER.dim};border-top:1px solid ${PAPER.line};padding-top:6px;line-height:1.5;">
  ${branding?.mentionLegale || (data.type === 'FACTURE' ? `Facture définitive. Toute réclamation doit être formulée sous 8 jours. Règlement à l'ordre de ${brand.nom}.` : `Facture proforma — non valable pour dédouanement. Établie sous réserve d'acceptation. Règlement par virement bancaire à l'ordre de ${brand.nom}.`)}<br/>
  ${brand.nom} — ${brand.adresseComplete} — RCCM ${brand.rccm} — CC ${brand.ncc} — ${brand.email}
</div>`;
}

function buildElement(data: DocData, branding?: SocieteBranding): HTMLDivElement {
  const div = document.createElement('div');
  if (data.type === 'PROFORMA' || data.modele === 'PROFORMA') {
    div.style.cssText = `width:210mm;min-height:293mm;box-sizing:border-box;position:relative;padding:10mm 12mm;font-family:'Segoe UI',Arial,sans-serif;font-size:11px;color:${PAPER.ink};background:${PAPER.paper};`;
    div.innerHTML = buildProformaHtml(data, undefined, branding);
    return div;
  }
  div.style.cssText = `width:210mm;padding:10mm 12mm;font-family:'Segoe UI',Arial,sans-serif;font-size:11px;color:${BRAND.ink};background:white;`;
  div.innerHTML = buildContentHtml(data, branding);
  return div;
}

export async function downloadPDF(data: DocData) {
  const html2pdf = (await import('html2pdf.js')).default;

  const branding = await getSocieteBranding();
  const element = buildElement(data, branding);
  document.body.appendChild(element);

  const filename = `${data.type === 'PROFORMA' ? 'Proforma' : 'Facture'}_${data.numero.replace(/\//g, '-')}.pdf`;

  await html2pdf()
    .set({
      margin: 0,
      filename,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true, logging: false },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
    })
    .from(element)
    .save();

  document.body.removeChild(element);
}

export async function printDocument(data: DocData) {
  const branding = await getSocieteBranding();
  const isProforma = data.type === 'PROFORMA' || data.modele === 'PROFORMA';
  const contentHtml = isProforma ? buildProformaHtml(data, undefined, branding) : buildContentHtml(data, branding);
  const label = data.type === 'PROFORMA' ? 'Proforma' : 'Facture';

  const html = `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><title>${label} ${data.numero}</title>
<style>
  @page { size: A4; margin: 8mm 10mm; }
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family:'Segoe UI',Arial,sans-serif; font-size:11px; color:${isProforma ? PAPER.ink : BRAND.ink}; background:${isProforma ? PAPER.paper : '#fff'}; ${isProforma ? 'position:relative;min-height:100vh;' : ''} }
  @media print { body { -webkit-print-color-adjust:exact !important; print-color-adjust:exact !important; ${isProforma ? 'min-height:278mm;' : ''} } }
</style></head>
<body>${contentHtml}</body></html>`;

  const win = window.open('', '_blank');
  if (!win) return false;
  win.document.write(html);
  win.document.close();
  setTimeout(() => win.print(), 500);
  return true;
}

export { type DocData };

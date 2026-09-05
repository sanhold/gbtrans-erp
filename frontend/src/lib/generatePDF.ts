'use client';

import { montantEnLettres } from './montantEnLettres';
import api from './api';
import QRCode from 'qrcode';

interface SocieteBranding {
  logo?: string | null;
  signature?: string | null;
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

async function getSocieteBranding(): Promise<SocieteBranding> {
  if (societeBrandingCache) return societeBrandingCache;
  try {
    const res = await api.get('/parametres/societe');
    const s = res.data.data;
    societeBrandingCache = {
      logo: s.logo, signature: s.signature,
      raisonSociale: s.raisonSociale, slogan: s.slogan,
      adresse: s.adresse, ville: s.ville, pays: s.pays,
      telephone: s.telephone, mobile: s.mobile, email: s.email,
      rccm: s.rccm, ncc: s.ncc, mentionLegale: s.mentionLegale,
    };
  } catch {
    societeBrandingCache = {};
  }
  return societeBrandingCache;
}

function brandIdentity(branding?: SocieteBranding) {
  const nom = branding?.raisonSociale || 'GBTRANS SARL';
  const slogan = branding?.slogan || 'Transit · Douane · Logistique';
  const adresseComplete = branding?.adresse || "Cocody Angré 7ème Tranche, Abidjan — Côte d'Ivoire";
  const telephone = branding?.telephone || branding?.mobile || '+225 27 20 00 00 00';
  const email = branding?.email || 'contact@gbtrans.ci';
  const rccm = branding?.rccm || 'CI-ABJ-2018-B-12345';
  const ncc = branding?.ncc || '1812345 Z';
  return { nom, slogan, adresseComplete, telephone, email, rccm, ncc };
}

const fmt = (n: any) => n != null ? new Intl.NumberFormat('fr-FR').format(Number(n)) : '0';

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

const CAT_ICONS: Record<string, string> = {
  'DOUANE & COMPAGNIE': '<path d="M9 2h6l1 3h3v2H5V5h3l1-3z"/><path d="M5 9h14l-1 11H6L5 9z"/>',
  'DOUANE': '<path d="M9 2h6l1 3h3v2H5V5h3l1-3z"/><path d="M5 9h14l-1 11H6L5 9z"/>',
  'DEBOURS DOUANE': '<path d="M9 2h6l1 3h3v2H5V5h3l1-3z"/><path d="M5 9h14l-1 11H6L5 9z"/>',
  'DEBOURS DOUANE & COMPAGNIE': '<path d="M9 2h6l1 3h3v2H5V5h3l1-3z"/><path d="M5 9h14l-1 11H6L5 9z"/>',
  'DOUANE ELIBU-NOE-E': '<path d="M9 2h6l1 3h3v2H5V5h3l1-3z"/><path d="M5 9h14l-1 11H6L5 9z"/>',
  'COMPAGNIE MARITIME': '<path d="M2 21c1.5 1 3.5 1 5 0s3.5-1 5 0 3.5 1 5 0 3.5-1 5 0"/><path d="M4 18l1-9h14l1 9"/><path d="M12 9V4h4l2 3"/>',
  'FRAIS PORTUAIRES': '<circle cx="12" cy="6" r="2"/><path d="M12 8v9m-7 0a7 7 0 0014 0M5 13h2m10 0h2"/>',
  'GUICHET UNIQUE': '<rect x="3" y="7" width="18" height="13" rx="1"/><path d="M8 7V5a2 2 0 012-2h4a2 2 0 012 2v2"/>',
  'GUICHET UNIQUE/IMMATRICULATION': '<rect x="3" y="7" width="18" height="13" rx="1"/><path d="M8 7V5a2 2 0 012-2h4a2 2 0 012 2v2"/>',
  'EXPORT ET FRET': '<rect x="2" y="7" width="12" height="9"/><path d="M14 10h4l3 3v3h-7z"/><circle cx="6" cy="18" r="1.5"/><circle cx="17" cy="18" r="1.5"/>',
  'TRANSPORT': '<rect x="2" y="7" width="12" height="9"/><path d="M14 10h4l3 3v3h-7z"/><circle cx="6" cy="18" r="1.5"/><circle cx="17" cy="18" r="1.5"/>',
  'PENALITES PORTUAIRES': '<circle cx="12" cy="12" r="9"/><path d="M12 8v5"/><circle cx="12" cy="16" r="0.5"/>',
  'AUTRES FRAIS': '<path d="M20 12l-8 8-9-9V4h7l9 9z"/><circle cx="7.5" cy="7.5" r="1.2"/>',
  'DIVERS': '<circle cx="12" cy="12" r="9"/>',
};

const CAT_COLORS: Record<string, string> = {
  'DOUANE': '#059669', 'DOUANE & COMPAGNIE': '#059669',
  'DEBOURS DOUANE': '#0d9488', 'DEBOURS DOUANE & COMPAGNIE': '#0d9488',
  'DOUANE ELIBU-NOE-E': '#65a30d',
  'COMPAGNIE MARITIME': '#2563eb',
  'FRAIS PORTUAIRES': '#0891b2',
  'GUICHET UNIQUE': '#4f46e5', 'GUICHET UNIQUE/IMMATRICULATION': '#4f46e5',
  'EXPORT ET FRET': '#7c3aed',
  'TRANSPORT': '#9333ea',
  'PENALITES PORTUAIRES': '#dc2626',
  'AUTRES FRAIS': '#d97706',
  'DIVERS': '#6b7280',
};

interface LigneDoc {
  categorie?: string;
  designation: string;
  quantite?: number;
  prixUnitaire?: number;
  montant: number;
  estTVA?: boolean;
}

interface DocData {
  type: 'PROFORMA' | 'FACTURE';
  numero: string;
  date: string;
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

function buildQrText(data: DocData): string {
  const label = data.type === 'PROFORMA' ? 'FACTURE PROFORMA' : 'FACTURE';
  return [
    'GBTRANS SARL — NCC: CI-2024-0000000',
    `${label}: ${data.numero}`,
    `Date: ${data.date}`,
    `Client: ${data.client}`,
    `Montant TTC: ${fmt(data.montantTTC)} XOF`,
  ].join('\n');
}

export async function generateDocQrDataUrl(data: DocData): Promise<string> {
  return QRCode.toDataURL(buildQrText(data), { margin: 0, width: 200, color: { dark: '#16232e', light: '#00000000' } });
}

function catIcon(path: string, color: string = BRAND.primary): string {
  return `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-right:5px;">${path}</svg>`;
}

const CI_FLAG = `<span style="display:inline-block;width:18px;height:11px;vertical-align:middle;margin-left:5px;box-shadow:0 0 0 1px ${BRAND.line};"><span style="display:inline-block;width:33.33%;height:11px;background:#f77f00;"></span><span style="display:inline-block;width:33.33%;height:11px;background:#fff;"></span><span style="display:inline-block;width:33.33%;height:11px;background:#009e60;"></span></span>`;

function buildContentHtml(data: DocData, qrDataUrl?: string, branding?: SocieteBranding): string {
  const categories = [...new Set(data.lignes.map(l => l.categorie))].filter(Boolean) as string[];
  let tableRows = '';
  let n = 0;

  for (const cat of categories) {
    const catLignes = data.lignes.filter(l => l.categorie === cat);
    const sousTotal = catLignes.reduce((s, l) => s + l.montant, 0);
    const catColor = CAT_COLORS[cat] || BRAND.primary;
    tableRows += `<tr><td colspan="5" style="background:${BRAND.greyBg};color:${catColor};font-weight:700;font-size:10px;letter-spacing:.03em;padding:5px 8px;border-top:2px solid ${catColor};border-bottom:1px solid ${BRAND.line};">${catIcon(CAT_ICONS[cat] || '<circle cx="12" cy="12" r="8"/>', catColor)}${cat}</td></tr>`;
    for (const l of catLignes) {
      n++;
      tableRows += `<tr>
        <td style="padding:4px 6px;font-size:9.5px;color:${BRAND.slate};text-align:center;border-bottom:1px solid ${BRAND.line};">${n}</td>
        <td style="padding:4px 8px;font-size:10.5px;color:${BRAND.ink};border-bottom:1px solid ${BRAND.line};">${l.designation}</td>
        <td style="padding:4px 6px;font-size:10.5px;text-align:center;border-bottom:1px solid ${BRAND.line};color:${BRAND.slate};">${l.quantite ?? 1}</td>
        <td style="padding:4px 8px;font-size:10.5px;text-align:right;border-bottom:1px solid ${BRAND.line};font-family:'Courier New',monospace;color:${BRAND.slate};">${fmt(l.prixUnitaire ?? l.montant)}</td>
        <td style="padding:4px 8px;font-size:10.5px;text-align:right;border-bottom:1px solid ${BRAND.line};font-family:'Courier New',monospace;font-weight:600;color:${BRAND.ink};">${fmt(l.montant)}</td>
      </tr>`;
    }
    tableRows += `<tr><td colspan="4" style="background:${BRAND.bgSoft};text-align:right;font-size:9.5px;font-weight:800;color:${catColor};padding:5px 8px;border-bottom:2px solid ${catColor};">SOUS-TOTAL ${cat}</td>
      <td style="background:${BRAND.bgSoft};text-align:right;font-weight:800;font-size:10.5px;font-family:'Courier New',monospace;color:${catColor};padding:5px 8px;border-bottom:2px solid ${catColor};">${fmt(sousTotal)}</td></tr>`;
  }

  const titleLabel = data.type === 'PROFORMA' ? 'FACTURE PROFORMA' : 'FACTURE';
  const numLabel = 'N° Facture';

  const detailsRows = [
    [numLabel, data.numero, true],
    ['Date', data.date, false],
    ['Réf. Dossier', data.dossierNumero, false],
  ].filter(([, v]) => v);

  const clientRows = [
    ['Nom', data.client],
    ['Adresse', data.clientAdresse],
    ['Téléphone', data.clientTelephone],
    ['Email', data.clientEmail],
    ['N° Contribuable', data.clientNcc],
    ['Pays', data.clientPays ? `${data.clientPays}${data.clientPays.toLowerCase().includes('ivoire') ? CI_FLAG : ''}` : undefined],
  ].filter(([, v]) => v);

  const brand = brandIdentity(branding);
  const legalDisclaimer = branding?.mentionLegale || (data.type === 'PROFORMA'
    ? `Facture proforma — non valable pour dédouanement. Établie sous réserve d'acceptation. Règlement par virement bancaire à l'ordre de ${brand.nom}.`
    : 'Facture définitive. Toute réclamation doit être formulée sous 8 jours.');

  return `
<div style="display:flex;justify-content:space-between;align-items:flex-start;gap:16px;">
  <div style="display:flex;gap:12px;align-items:flex-start;">
    ${branding?.logo
      ? `<img src="${branding.logo}" style="width:44px;height:44px;border-radius:11px;object-fit:contain;flex-shrink:0;background:#fff;border:1px solid ${BRAND.line};" />`
      : `<div style="width:44px;height:44px;border-radius:11px;background:linear-gradient(135deg,${BRAND.primary},${BRAND.primaryDark});display:flex;align-items:center;justify-content:center;font-weight:800;font-size:14px;color:#fff;flex-shrink:0;">GB</div>`}
    <div>
      <div style="font-weight:800;font-size:18px;letter-spacing:.2px;color:${BRAND.ink};">${brand.nom}</div>
      <div style="color:${BRAND.primary};font-weight:600;font-size:10px;margin:2px 0 6px;">${brand.slogan}</div>
      <div style="font-size:9px;color:${BRAND.ink};line-height:1.7;">
        <div>📍&nbsp;${brand.adresseComplete}</div>
        <div>☎&nbsp;${brand.telephone}</div>
        <div>✉&nbsp;${brand.email}</div>
      </div>
    </div>
  </div>
  <div style="min-width:220px;">
    <div style="background:${BRAND.greyBg};color:${BRAND.ink};text-align:center;font-weight:800;letter-spacing:1px;font-size:14px;padding:8px;border-radius:5px;border:1px solid ${BRAND.line};">${titleLabel}</div>
    ${qrDataUrl ? `<div style="display:flex;justify-content:flex-end;margin-top:8px;">
      <div style="text-align:center;">
        <img src="${qrDataUrl}" width="60" height="60" style="border:1px solid ${BRAND.line};border-radius:5px;padding:2px;background:#fff;" />
        <div style="font-size:6.5px;color:${BRAND.slate};margin-top:2px;">Vérifier le document</div>
      </div>
    </div>` : ''}
  </div>
</div>

<div style="display:flex;gap:10px;margin-top:11px;">
  <div style="flex:1;border:1px solid ${BRAND.line};border-radius:6px;overflow:hidden;">
    <div style="background:${BRAND.bgSoft};color:${BRAND.ink};font-weight:800;letter-spacing:.4px;padding:6px 10px;font-size:10px;border-bottom:1px solid ${BRAND.line};">${data.type === 'PROFORMA' ? 'DÉTAILS DE LA PROFORMA' : 'DÉTAILS DE LA FACTURE'}</div>
    <table style="width:100%;font-size:9.5px;">
      ${detailsRows.map(([label, value, hl]) => `<tr><td style="padding:3.5px 10px;color:${BRAND.slate};width:40%;">${label}</td><td style="padding:3.5px 10px;font-weight:600;color:${hl ? BRAND.primary : BRAND.ink};${hl ? `font-family:'Courier New',monospace;font-weight:700;` : ''}">${value}</td></tr>`).join('')}
    </table>
  </div>
  <div style="flex:1;border:1px solid ${BRAND.line};border-radius:6px;overflow:hidden;">
    <div style="background:${BRAND.bgSoft};color:${BRAND.ink};font-weight:800;letter-spacing:.4px;padding:6px 10px;font-size:10px;border-bottom:1px solid ${BRAND.line};">CLIENT</div>
    <table style="width:100%;font-size:9.5px;">
      ${clientRows.map(([label, value]) => `<tr><td style="padding:3.5px 10px;color:${BRAND.slate};width:34%;">${label}</td><td style="padding:3.5px 10px;font-weight:600;color:${BRAND.ink};">${value}</td></tr>`).join('')}
    </table>
  </div>
</div>

${data.titre ? `<div style="background:${BRAND.bgSoft};padding:8px 12px;margin-top:11px;font-size:10.5px;font-weight:700;text-transform:uppercase;letter-spacing:.02em;border-left:3px solid ${BRAND.primary};border-radius:0 6px 6px 0;color:${BRAND.ink};">${data.titre}</div>` : ''}

<table style="width:100%;border-collapse:collapse;margin-top:12px;font-size:9.5px;">
  <thead><tr>
    <th style="background:${BRAND.greyBg};color:${BRAND.ink};padding:7px 6px;font-size:9px;text-align:center;width:28px;">N°</th>
    <th style="background:${BRAND.greyBg};color:${BRAND.ink};padding:7px 8px;font-size:9px;text-align:left;letter-spacing:.3px;">DÉSIGNATION</th>
    <th style="background:${BRAND.greyBg};color:${BRAND.ink};padding:7px 6px;font-size:9px;text-align:center;width:50px;">QTÉ</th>
    <th style="background:${BRAND.greyBg};color:${BRAND.ink};padding:7px 8px;font-size:9px;text-align:right;width:110px;">PU (XOF)</th>
    <th style="background:${BRAND.greyBg};color:${BRAND.ink};padding:7px 8px;font-size:9px;text-align:right;width:120px;">MONTANT HT</th>
  </tr></thead>
  <tbody>${tableRows}</tbody>
</table>

${(data.fobUnitaire || data.fretUnitaire || data.valeurCAF) ? `<div style="display:flex;justify-content:flex-end;margin-top:10px;">
  <table style="font-size:9.5px;color:${BRAND.slate};border:1px solid ${BRAND.line};border-radius:6px;background:${BRAND.bgSoft};">
    ${data.fobUnitaire ? `<tr><td style="padding:1.5px 8px;">Fob unitaire</td><td style="padding:1.5px 8px;font-weight:700;font-family:'Courier New',monospace;">${fmt(data.fobUnitaire)}</td></tr>` : ''}
    ${data.fretUnitaire ? `<tr><td style="padding:1.5px 8px;">Fret unitaire</td><td style="padding:1.5px 8px;font-weight:700;font-family:'Courier New',monospace;">${fmt(data.fretUnitaire)}</td></tr>` : ''}
    ${data.assurance ? `<tr><td style="padding:1.5px 8px;">Assurance</td><td style="padding:1.5px 8px;font-weight:700;font-family:'Courier New',monospace;">${fmt(data.assurance)}</td></tr>` : ''}
    ${data.valeurCAF ? `<tr><td style="padding:1.5px 8px;font-weight:700;">Valeur CAF</td><td style="padding:1.5px 8px;font-weight:800;font-family:'Courier New',monospace;color:${BRAND.accent};">${fmt(data.valeurCAF)}</td></tr>` : ''}
  </table>
</div>` : ''}

<div style="display:flex;gap:12px;margin-top:14px;align-items:flex-start;">
  <div style="flex:1;border:1px solid ${BRAND.line};border-radius:6px;background:${BRAND.bgSoft};padding:10px 12px;">
    <div style="color:${BRAND.ink};font-weight:800;font-size:9.5px;letter-spacing:.4px;margin-bottom:4px;">MONTANT ARRÊTÉ À LA SOMME DE :</div>
    <div style="font-style:italic;font-weight:700;color:${BRAND.ink};font-size:10.5px;line-height:1.5;">${montantEnLettres(data.montantTTC)}</div>
    ${(data.acompte || data.resteAPayer) ? `<div style="display:flex;gap:16px;margin-top:8px;padding-top:8px;border-top:1px solid ${BRAND.line};">
      <div><span style="color:${BRAND.slate};">Acompte : </span><span style="font-weight:800;font-family:'Courier New',monospace;">${fmt(data.acompte)}</span></div>
      <div><span style="color:${BRAND.slate};">Reste à payer : </span><span style="font-weight:800;font-family:'Courier New',monospace;color:#c00;">${fmt(data.resteAPayer)}</span></div>
    </div>` : ''}
  </div>
  <table style="width:250px;border:1px solid ${BRAND.line};border-radius:6px;overflow:hidden;font-size:10px;">
    ${data.montantPrestation ? `<tr><td style="padding:6px 11px;color:${BRAND.slate};border-bottom:1px solid ${BRAND.line};">Montant Prestation</td><td style="padding:6px 11px;text-align:right;font-weight:700;font-family:'Courier New',monospace;border-bottom:1px solid ${BRAND.line};">${fmt(data.montantPrestation)}</td></tr>` : ''}
    ${data.tvaPrestation ? `<tr><td style="padding:6px 11px;color:${BRAND.slate};border-bottom:1px solid ${BRAND.line};">TVA/Prestation</td><td style="padding:6px 11px;text-align:right;font-weight:700;font-family:'Courier New',monospace;border-bottom:1px solid ${BRAND.line};">${fmt(data.tvaPrestation)}</td></tr>` : ''}
    <tr><td style="padding:6px 11px;color:${BRAND.slate};border-bottom:1px solid ${BRAND.line};">TOTAL HT</td><td style="padding:6px 11px;text-align:right;font-weight:700;font-family:'Courier New',monospace;border-bottom:1px solid ${BRAND.line};">${fmt(data.montantHT)}</td></tr>
    <tr><td style="padding:6px 11px;color:${BRAND.slate};border-bottom:1px solid ${BRAND.line};">TVA (18%)</td><td style="padding:6px 11px;text-align:right;font-weight:700;font-family:'Courier New',monospace;border-bottom:1px solid ${BRAND.line};">${fmt(data.montantTVA)}</td></tr>
    <tr><td colspan="2" style="padding:0;"><div style="background:linear-gradient(135deg,${BRAND.primary},${BRAND.primaryDark});color:#fff;display:flex;justify-content:space-between;padding:7px 11px;font-weight:800;font-size:12px;">
      <span>NET À PAYER TTC</span><span style="font-family:'Courier New',monospace;">${fmt(data.montantTTC)}</span>
    </div></td></tr>
  </table>
</div>

<div style="display:flex;justify-content:flex-end;margin-top:26px;">
  <div style="text-align:center;width:220px;">
    <div style="color:${BRAND.slate};font-size:9.5px;margin-bottom:${branding?.signature ? '4px' : '38px'};">Le Directeur / Cachet &amp; Signature</div>
    ${branding?.signature ? `<img src="${branding.signature}" style="height:34px;object-fit:contain;margin:0 auto;display:block;" />` : ''}
    <div style="border-top:1px solid ${BRAND.ink};padding-top:4px;font-weight:700;color:${BRAND.ink};">${brand.nom}</div>
  </div>
</div>

<div style="text-align:center;font-size:8px;color:${BRAND.slate};border-top:1px solid ${BRAND.line};padding-top:8px;margin-top:16px;line-height:1.6;">
  ${legalDisclaimer}<br/>
  ${brand.nom} — ${brand.adresseComplete} — RCCM ${brand.rccm} — CC ${brand.ncc} — ${brand.email}
</div>`;
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

function buildProformaHtml(data: DocData, _qrDataUrl?: string, branding?: SocieteBranding): string {
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
    ['Pays', data.clientPays ? `${data.clientPays}${data.clientPays.toLowerCase().includes('ivoire') ? CI_FLAG : ''}` : undefined],
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
    <div style="font-size:17px;font-weight:700;letter-spacing:.05em;color:${PAPER.ink};">FACTURE PROFORMA</div>
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
    <div style="font-size:9px;color:#8b93ad;margin-top:4px;">Offre valable 30 jours à compter de la date d'émission.</div>
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
    ${branding?.signature ? `<img src="${branding.signature}" style="max-width:140px;max-height:70px;object-fit:contain;" />` : '<div style="height:70px;"></div>'}
    <div style="border-top:1px solid ${PAPER.line};padding-top:4px;font-size:9px;color:${PAPER.inkSoft};font-weight:700;text-transform:uppercase;letter-spacing:.04em;">Le Responsable</div>
  </div>
</div>` : ''}

<div style="position:absolute;left:0;right:0;bottom:0;text-align:center;font-size:7.5px;color:${PAPER.dim};border-top:1px solid ${PAPER.line};padding-top:6px;line-height:1.5;">
  ${branding?.mentionLegale || `Facture proforma — non valable pour dédouanement. Établie sous réserve d'acceptation. Règlement par virement bancaire à l'ordre de ${brand.nom}.`}<br/>
  ${brand.nom} — ${brand.adresseComplete} — RCCM ${brand.rccm} — CC ${brand.ncc} — ${brand.email}
</div>`;
}

function buildElement(data: DocData, qrDataUrl?: string, branding?: SocieteBranding): HTMLDivElement {
  const div = document.createElement('div');
  if (data.type === 'PROFORMA') {
    div.style.cssText = `width:210mm;min-height:293mm;box-sizing:border-box;position:relative;padding:10mm 12mm;font-family:'Segoe UI',Arial,sans-serif;font-size:11px;color:${PAPER.ink};background:${PAPER.paper};`;
    div.innerHTML = buildProformaHtml(data, qrDataUrl, branding);
    return div;
  }
  div.style.cssText = `width:210mm;padding:10mm 12mm;font-family:'Segoe UI',Arial,sans-serif;font-size:11px;color:${BRAND.ink};background:white;`;
  div.innerHTML = buildContentHtml(data, qrDataUrl, branding);
  return div;
}

export async function downloadPDF(data: DocData) {
  const html2pdf = (await import('html2pdf.js')).default;

  const [qrDataUrl, branding] = await Promise.all([
    generateDocQrDataUrl(data).catch(() => undefined),
    getSocieteBranding(),
  ]);
  const element = buildElement(data, qrDataUrl, branding);
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
  const [qrDataUrl, branding] = await Promise.all([
    generateDocQrDataUrl(data).catch(() => undefined),
    getSocieteBranding(),
  ]);
  const isProforma = data.type === 'PROFORMA';
  const contentHtml = isProforma ? buildProformaHtml(data, qrDataUrl, branding) : buildContentHtml(data, qrDataUrl, branding);
  const label = isProforma ? 'Proforma' : 'Facture';

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

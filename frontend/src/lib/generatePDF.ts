'use client';

import { montantEnLettres } from './montantEnLettres';
import QRCode from 'qrcode';

const fmt = (n: any) => n != null ? new Intl.NumberFormat('fr-FR').format(Number(n)) : '0';

const BRAND = {
  primary: '#5d1590',
  primaryDark: '#3b0a63',
  accent: '#00b884',
  ink: '#221730',
  slate: '#5f5670',
  line: '#e3ddee',
  bgSoft: '#f8f5fc',
  greyBg: '#eeeaf4',
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
  fobUnitaire?: number;
  fretUnitaire?: number;
  assurance?: number;
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
  return QRCode.toDataURL(buildQrText(data), { margin: 0, width: 200, color: { dark: '#221730', light: '#00000000' } });
}

function catIcon(path: string, color: string = BRAND.primary): string {
  return `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-right:5px;">${path}</svg>`;
}

const CI_FLAG = `<span style="display:inline-block;width:18px;height:11px;vertical-align:middle;margin-left:5px;box-shadow:0 0 0 1px ${BRAND.line};"><span style="display:inline-block;width:33.33%;height:11px;background:#f77f00;"></span><span style="display:inline-block;width:33.33%;height:11px;background:#fff;"></span><span style="display:inline-block;width:33.33%;height:11px;background:#009e60;"></span></span>`;

function buildContentHtml(data: DocData, qrDataUrl?: string): string {
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
        <td style="padding:4px 8px;font-size:10.5px;text-align:right;border-bottom:1px solid ${BRAND.line};font-family:'Courier New',monospace;font-weight:600;color:${BRAND.ink};">${l.montant > 0 ? fmt(l.montant) : ''}</td>
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

  const legalDisclaimer = data.type === 'PROFORMA'
    ? "Facture proforma — non valable pour dédouanement. Établie sous réserve d'acceptation. Règlement par virement bancaire à l'ordre de GBTRANS SARL."
    : 'Facture définitive. Toute réclamation doit être formulée sous 8 jours.';

  const horsNote = data.type === 'PROFORMA'
    ? `<div style="margin-top:10px;font-size:8.5px;color:${BRAND.slate};border:1px solid ${BRAND.line};border-radius:6px;padding:7px 10px;background:${BRAND.bgSoft};">
        <span style="font-weight:800;color:${BRAND.ink};">HORS :</span> Frais de dépotage, d'expertises éventuels, scanner, frais de magasinage, de dépôt douane, de surestarie, BSC, tout autre frais non défini mais induit par les opérations de dédouanement.
      </div>`
    : '';

  return `
<div style="display:flex;justify-content:space-between;align-items:flex-start;gap:16px;">
  <div style="display:flex;gap:12px;align-items:flex-start;">
    <div style="width:44px;height:44px;border-radius:11px;background:linear-gradient(135deg,${BRAND.primary},${BRAND.primaryDark});display:flex;align-items:center;justify-content:center;font-weight:800;font-size:14px;color:#fff;flex-shrink:0;">GB</div>
    <div>
      <div style="font-weight:800;font-size:18px;letter-spacing:.2px;color:${BRAND.ink};">GBTRANS SARL</div>
      <div style="color:${BRAND.primary};font-weight:600;font-size:10px;margin:2px 0 6px;">Transit • Douane • Logistique</div>
      <div style="font-size:9px;color:${BRAND.ink};line-height:1.7;">
        <div>📍&nbsp;Cocody Angré 7ème Tranche, Abidjan — Côte d'Ivoire</div>
        <div>☎&nbsp;+225 27 20 00 00 00</div>
        <div>✉&nbsp;contact@gbtrans.ci</div>
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

${horsNote}

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
    <div style="color:${BRAND.slate};font-size:9.5px;margin-bottom:38px;">Le Directeur / Cachet &amp; Signature</div>
    <div style="border-top:1px solid ${BRAND.ink};padding-top:4px;font-weight:700;color:${BRAND.ink};">GBTRANS SARL</div>
  </div>
</div>

<div style="text-align:center;font-size:8px;color:${BRAND.slate};border-top:1px solid ${BRAND.line};padding-top:8px;margin-top:16px;line-height:1.6;">
  ${legalDisclaimer}<br/>
  GBTRANS SARL — Cocody Angré 7ème Tranche, Abidjan, Côte d'Ivoire — RCCM CI-ABJ-2018-B-12345 — CC 1812345 Z — contact@gbtrans.ci
</div>`;
}

const PAPER = {
  ink: '#16213E',
  inkSoft: '#2E3B5C',
  gold: '#AE7C1F',
  goldSoft: '#EADFC4',
  paper: '#FBF9F4',
  line: '#DAD2BE',
  danger: '#B3492F',
  dim: '#8B93AD',
};

function buildProformaHtml(data: DocData, qrDataUrl?: string): string {
  const categories = [...new Set(data.lignes.map(l => l.categorie))].filter(Boolean) as string[];
  const totalHT = data.lignes.filter(l => !l.estTVA).reduce((s, l) => s + l.montant, 0) || data.montantHT;
  const totalTVA = data.lignes.filter(l => l.estTVA).reduce((s, l) => s + l.montant, 0) || data.montantTVA;

  let sectionsHtml = '';
  let n = 0;
  for (const cat of categories) {
    const catLignes = data.lignes.filter(l => l.categorie === cat);
    const sousTotal = catLignes.reduce((s, l) => s + l.montant, 0);
    const catColor = CAT_COLORS[cat] || PAPER.gold;
    let rows = '';
    for (const l of catLignes) {
      n++;
      rows += `<tr>
        <td style="width:26px;text-align:center;color:${PAPER.dim};font-size:10px;padding:5px 6px;border-bottom:1px solid ${PAPER.line};">${n}</td>
        <td style="padding:5px 6px;font-size:11px;color:${PAPER.ink};border-bottom:1px solid ${PAPER.line};">${l.designation}${l.estTVA ? `<span style="font-size:8px;color:${catColor};border:1px solid ${catColor};border-radius:8px;padding:0px 5px;margin-left:6px;">TVA</span>` : ''}</td>
        <td style="width:110px;text-align:right;font-family:'Courier New',monospace;font-weight:700;font-size:11px;padding:5px 6px;border-bottom:1px solid ${PAPER.line};">${l.montant > 0 ? fmt(l.montant) : ''}</td>
      </tr>`;
    }
    sectionsHtml += `
      <div style="margin-bottom:14px;">
        <div style="background:${catColor};color:#fff;padding:6px 10px;font-size:10.5px;letter-spacing:.03em;font-weight:700;">${cat}</div>
        <table style="width:100%;border-collapse:collapse;font-family:Georgia,serif;">
          <thead><tr>
            <th style="text-align:center;width:26px;font-size:8.5px;text-transform:uppercase;letter-spacing:.05em;color:${PAPER.inkSoft};border-bottom:1px solid ${PAPER.line};padding:4px 6px;">N°</th>
            <th style="text-align:left;font-size:8.5px;text-transform:uppercase;letter-spacing:.05em;color:${PAPER.inkSoft};border-bottom:1px solid ${PAPER.line};padding:4px 6px;">Désignation</th>
            <th style="text-align:right;width:110px;font-size:8.5px;text-transform:uppercase;letter-spacing:.05em;color:${PAPER.inkSoft};border-bottom:1px solid ${PAPER.line};padding:4px 6px;">Montant</th>
          </tr></thead>
          <tbody>${rows}
            <tr><td colspan="2" style="text-align:right;font-weight:700;color:${PAPER.ink};background:${PAPER.goldSoft}55;border-bottom:2px solid ${catColor};padding:5px 6px;font-size:10px;">Sous-total ${cat}</td>
            <td style="text-align:right;font-weight:700;font-family:'Courier New',monospace;color:${PAPER.ink};background:${PAPER.goldSoft}55;border-bottom:2px solid ${catColor};padding:5px 6px;font-size:11px;">${fmt(sousTotal)}</td></tr>
          </tbody>
        </table>
      </div>`;
  }

  const clientLines = [data.client, data.clientAdresse, (data.clientTelephone || data.clientEmail)].filter(Boolean);

  return `
<div style="display:flex;justify-content:space-between;align-items:flex-start;border-bottom:2px solid ${PAPER.ink};padding-bottom:12px;margin-bottom:18px;">
  <div>
    <div style="font-size:20px;font-weight:700;color:${PAPER.ink};letter-spacing:.01em;">GBTRANS SARL</div>
    <div style="font-size:11px;color:${PAPER.inkSoft};margin-top:2px;">Transit · Douane · Logistique</div>
    <div style="font-size:10px;color:#5C6580;margin-top:6px;line-height:1.5;">
      Cocody Angré 7ème Tranche, Abidjan — Côte d'Ivoire<br/>
      +225 27 20 00 00 00 · contact@gbtrans.ci
    </div>
  </div>
  <div style="text-align:right;">
    <div style="font-size:19px;font-weight:700;letter-spacing:.05em;color:${PAPER.ink};">FACTURE PROFORMA</div>
    <div style="font-size:11.5px;color:${PAPER.gold};font-weight:700;margin-top:3px;">N° ${data.numero}</div>
    <div style="font-size:11.5px;color:${PAPER.inkSoft};margin-top:2px;">Date : ${data.date}</div>
    ${qrDataUrl ? `<img src="${qrDataUrl}" width="52" height="52" style="margin-top:6px;border:1px solid ${PAPER.line};padding:2px;background:#fff;" />` : ''}
  </div>
</div>

<div style="display:flex;gap:14px;margin-bottom:18px;">
  <div style="flex:1;border:1px solid ${PAPER.line};padding:9px 11px;">
    <div style="font-size:9px;text-transform:uppercase;letter-spacing:.08em;color:${PAPER.gold};font-weight:700;margin-bottom:6px;">Adressée à</div>
    ${clientLines.map((l, i) => `<div style="font-size:12px;padding:1px 0;${i === 0 ? 'font-weight:700;' : ''}">${l}</div>`).join('')}
  </div>
  <div style="flex:1;border:1px solid ${PAPER.line};padding:9px 11px;">
    <div style="font-size:9px;text-transform:uppercase;letter-spacing:.08em;color:${PAPER.gold};font-weight:700;margin-bottom:6px;">Détails</div>
    ${data.dossierNumero ? `<div style="font-size:12px;padding:1px 0;">Dossier : <strong>${data.dossierNumero}</strong></div>` : ''}
    <div style="font-size:10.5px;color:#8b93ad;margin-top:4px;">Offre valable 30 jours à compter de la date d'émission.</div>
  </div>
</div>

${data.titre ? `<div style="background:${PAPER.goldSoft};padding:8px 11px;margin-bottom:16px;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.02em;border-left:3px solid ${PAPER.gold};color:${PAPER.ink};">${data.titre}</div>` : ''}

${(data.fobUnitaire || data.fretUnitaire || data.valeurCAF) ? `<div style="display:flex;justify-content:flex-end;margin-bottom:12px;">
  <table style="font-size:10px;color:${PAPER.inkSoft};border:1px solid ${PAPER.line};font-family:Georgia,serif;">
    ${data.fobUnitaire ? `<tr><td style="padding:2px 9px;">Fob unitaire</td><td style="padding:2px 9px;font-weight:700;font-family:'Courier New',monospace;">${fmt(data.fobUnitaire)}</td></tr>` : ''}
    ${data.fretUnitaire ? `<tr><td style="padding:2px 9px;">Fret unitaire</td><td style="padding:2px 9px;font-weight:700;font-family:'Courier New',monospace;">${fmt(data.fretUnitaire)}</td></tr>` : ''}
    ${data.assurance ? `<tr><td style="padding:2px 9px;">Assurance</td><td style="padding:2px 9px;font-weight:700;font-family:'Courier New',monospace;">${fmt(data.assurance)}</td></tr>` : ''}
    ${data.valeurCAF ? `<tr><td style="padding:2px 9px;font-weight:700;">Valeur CAF</td><td style="padding:2px 9px;font-weight:800;font-family:'Courier New',monospace;color:${PAPER.gold};">${fmt(data.valeurCAF)}</td></tr>` : ''}
  </table>
</div>` : ''}

${sectionsHtml}

<div style="margin-left:auto;width:260px;margin-top:10px;margin-bottom:16px;font-family:Georgia,serif;">
  <div style="display:flex;justify-content:space-between;padding:5px 0;font-size:12px;border-bottom:1px solid ${PAPER.line};"><span>Total HT</span><span style="font-family:'Courier New',monospace;">${fmt(totalHT)}</span></div>
  <div style="display:flex;justify-content:space-between;padding:5px 0;font-size:12px;border-bottom:1px solid ${PAPER.line};"><span>Total TVA</span><span style="font-family:'Courier New',monospace;">${fmt(totalTVA)}</span></div>
  <div style="display:flex;justify-content:space-between;border-top:2px solid ${PAPER.ink};margin-top:4px;padding-top:8px;font-size:15px;font-weight:700;color:${PAPER.ink};"><span>Total Général</span><span style="font-family:'Courier New',monospace;">${fmt(data.montantTTC)}</span></div>
</div>

<div style="font-size:9.5px;color:${PAPER.inkSoft};border:1px solid ${PAPER.line};padding:8px 10px;background:${PAPER.gold}0d;line-height:1.5;margin-bottom:16px;">
  <strong style="color:${PAPER.ink};">HORS :</strong> Frais de dépotage, d'expertises éventuels, scanner, frais de magasinage, de dépôt douane, de surestarie, BSC, tout autre frais non défini mais induit par les opérations de dédouanement.
</div>

<div style="border:1px solid ${PAPER.line};padding:9px 11px;margin-bottom:20px;">
  <div style="font-size:9px;text-transform:uppercase;letter-spacing:.08em;color:${PAPER.gold};font-weight:700;margin-bottom:4px;">Montant arrêté à la somme de</div>
  <div style="font-style:italic;font-weight:700;color:${PAPER.ink};font-size:11px;line-height:1.5;">${montantEnLettres(data.montantTTC)}</div>
</div>

<div style="text-align:right;font-size:11.5px;color:${PAPER.inkSoft};">
  Fait à Abidjan<br/>
  <div style="margin-top:32px;border-top:1px solid ${PAPER.inkSoft};display:inline-block;padding-top:4px;width:180px;">GBTRANS SARL</div>
</div>

<div style="text-align:center;font-size:8px;color:${PAPER.dim};border-top:1px solid ${PAPER.line};padding-top:8px;margin-top:20px;line-height:1.6;">
  Facture proforma — non valable pour dédouanement. Établie sous réserve d'acceptation. Règlement par virement bancaire à l'ordre de GBTRANS SARL.<br/>
  GBTRANS SARL — Cocody Angré 7ème Tranche, Abidjan, Côte d'Ivoire — RCCM CI-ABJ-2018-B-12345 — CC 1812345 Z — contact@gbtrans.ci
</div>`;
}

function buildElement(data: DocData, qrDataUrl?: string): HTMLDivElement {
  const div = document.createElement('div');
  if (data.type === 'PROFORMA') {
    div.style.cssText = `width:210mm;padding:14mm 13mm;font-family:Georgia,'Iowan Old Style','Palatino Linotype',serif;font-size:11px;color:${PAPER.ink};background:${PAPER.paper};`;
    div.innerHTML = buildProformaHtml(data, qrDataUrl);
    return div;
  }
  div.style.cssText = `width:210mm;padding:10mm 12mm;font-family:'Segoe UI',Arial,sans-serif;font-size:11px;color:${BRAND.ink};background:white;`;
  div.innerHTML = buildContentHtml(data, qrDataUrl);
  return div;
}

export async function downloadPDF(data: DocData) {
  const html2pdf = (await import('html2pdf.js')).default;

  const qrDataUrl = await generateDocQrDataUrl(data).catch(() => undefined);
  const element = buildElement(data, qrDataUrl);
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
  const qrDataUrl = await generateDocQrDataUrl(data).catch(() => undefined);
  const isProforma = data.type === 'PROFORMA';
  const contentHtml = isProforma ? buildProformaHtml(data, qrDataUrl) : buildContentHtml(data, qrDataUrl);
  const label = isProforma ? 'Proforma' : 'Facture';

  const html = `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><title>${label} ${data.numero}</title>
<style>
  @page { size: A4; margin: 8mm 10mm; }
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family:${isProforma ? "Georgia,'Iowan Old Style','Palatino Linotype',serif" : "'Segoe UI',Arial,sans-serif"}; font-size:11px; color:${isProforma ? PAPER.ink : BRAND.ink}; background:${isProforma ? PAPER.paper : '#fff'}; }
  @media print { body { -webkit-print-color-adjust:exact !important; print-color-adjust:exact !important; } }
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

'use client';

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

const fmtDate = (d: any) => d ? new Date(d).toLocaleDateString('fr-FR') : '-';

function headerHtml(titleLabel: string): string {
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
  </div>
</div>`;
}

function infoTableHtml(title: string, rows: [string, string | undefined][]): string {
  const filtered = rows.filter(([, v]) => v);
  return `
<div style="flex:1;border:1px solid ${BRAND.line};border-radius:6px;overflow:hidden;">
  <div style="background:${BRAND.bgSoft};color:${BRAND.ink};font-weight:800;letter-spacing:.4px;padding:6px 10px;font-size:10px;border-bottom:1px solid ${BRAND.line};">${title}</div>
  <table style="width:100%;font-size:9.5px;">
    ${filtered.map(([label, value]) => `<tr><td style="padding:3.5px 10px;color:${BRAND.slate};width:40%;">${label}</td><td style="padding:3.5px 10px;font-weight:600;color:${BRAND.ink};">${value}</td></tr>`).join('')}
  </table>
</div>`;
}

function footerHtml(legalText: string): string {
  return `
<div style="display:flex;justify-content:flex-end;margin-top:32px;">
  <div style="text-align:center;width:220px;">
    <div style="color:${BRAND.slate};font-size:9.5px;margin-bottom:38px;">Le Directeur / Cachet &amp; Signature</div>
    <div style="border-top:1px solid ${BRAND.ink};padding-top:4px;font-weight:700;color:${BRAND.ink};">GBTRANS SARL</div>
  </div>
</div>
<div style="text-align:center;font-size:8px;color:${BRAND.slate};border-top:1px solid ${BRAND.line};padding-top:8px;margin-top:16px;line-height:1.6;">
  ${legalText}<br/>
  GBTRANS SARL — Cocody Angré 7ème Tranche, Abidjan, Côte d'Ivoire — RCCM CI-ABJ-2018-B-12345 — CC 1812345 Z — contact@gbtrans.ci
</div>`;
}

export interface ATInfo {
  numero: string;
  designation: string;
  nature?: string | null;
  dossierNumero?: string | null;
  clientNom?: string | null;
}

export interface ProlongationData {
  dateProlongation: string;
  ancienneDateExpiration: string;
  nouvelleDateExpiration: string;
  ancienNumeroDeclaration?: string | null;
  nouveauNumeroDeclaration: string;
}

export interface ApurementData {
  dateApurement: string;
  referenceApurement?: string | null;
}

function buildProlongationHtml(at: ATInfo, data: ProlongationData): string {
  return `
${headerHtml('CERTIFICAT DE PROLONGATION')}
<div style="display:flex;gap:10px;margin-top:14px;">
  ${infoTableHtml('ADMISSION TEMPORAIRE', [
    ['N° AT', at.numero], ['Dossier', at.dossierNumero || undefined], ['Client', at.clientNom || undefined],
    ['Désignation', at.designation], ['Nature', at.nature || undefined],
  ])}
  ${infoTableHtml('PROLONGATION', [
    ['Date', fmtDate(data.dateProlongation)],
    ['Ancienne échéance', fmtDate(data.ancienneDateExpiration)],
    ['Nouvelle échéance', fmtDate(data.nouvelleDateExpiration)],
    ['Ancien N° déclaration', data.ancienNumeroDeclaration || '-'],
    ['Nouveau N° déclaration', data.nouveauNumeroDeclaration],
  ])}
</div>
<div style="background:${BRAND.bgSoft};padding:10px 14px;margin-top:14px;font-size:10.5px;border-left:3px solid ${BRAND.primary};border-radius:0 6px 6px 0;color:${BRAND.ink};">
  Il est certifié que l'admission temporaire <b>${at.numero}</b> a fait l'objet d'une prolongation, portant sa nouvelle date d'échéance au <b>${fmtDate(data.nouvelleDateExpiration)}</b>, sous la référence de déclaration <b>${data.nouveauNumeroDeclaration}</b>.
</div>
${footerHtml('Certificat de prolongation établi à titre de justificatif interne.')}`;
}

function buildApurementHtml(at: ATInfo, data: ApurementData): string {
  return `
${headerHtml('CERTIFICAT D’APUREMENT')}
<div style="display:flex;gap:10px;margin-top:14px;">
  ${infoTableHtml('ADMISSION TEMPORAIRE', [
    ['N° AT', at.numero], ['Dossier', at.dossierNumero || undefined], ['Client', at.clientNom || undefined],
    ['Désignation', at.designation], ['Nature', at.nature || undefined],
  ])}
  ${infoTableHtml('APUREMENT', [
    ['Date d\'apurement', fmtDate(data.dateApurement)],
    ['Référence apurement', data.referenceApurement || '-'],
  ])}
</div>
<div style="background:${BRAND.bgSoft};padding:10px 14px;margin-top:14px;font-size:10.5px;border-left:3px solid ${BRAND.accent};border-radius:0 6px 6px 0;color:${BRAND.ink};">
  Il est certifié que l'admission temporaire <b>${at.numero}</b> a été apurée en date du <b>${fmtDate(data.dateApurement)}</b>${data.referenceApurement ? `, sous la référence <b>${data.referenceApurement}</b>` : ''}. Le régime de l'admission temporaire est définitivement clôturé.
</div>
${footerHtml('Certificat d’apurement établi à titre de justificatif interne.')}`;
}

function buildElement(html: string): HTMLDivElement {
  const div = document.createElement('div');
  div.style.cssText = `width:210mm;padding:14mm 14mm;font-family:'Segoe UI',Arial,sans-serif;font-size:11px;color:${BRAND.ink};background:white;`;
  div.innerHTML = html;
  return div;
}

export async function generateATCertBlob(
  type: 'PROLONGATION' | 'APUREMENT',
  at: ATInfo,
  data: ProlongationData | ApurementData
): Promise<{ blob: Blob; filename: string }> {
  const html2pdf = (await import('html2pdf.js')).default;
  const html = type === 'PROLONGATION'
    ? buildProlongationHtml(at, data as ProlongationData)
    : buildApurementHtml(at, data as ApurementData);
  const element = buildElement(html);
  document.body.appendChild(element);

  const label = type === 'PROLONGATION' ? 'Prolongation' : 'Apurement';
  const filename = `Certificat_${label}_AT_${at.numero.replace(/\//g, '-')}.pdf`;

  const blob: Blob = await html2pdf()
    .set({
      margin: 0,
      filename,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true, logging: false },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
    })
    .from(element)
    .outputPdf('blob');

  document.body.removeChild(element);
  return { blob, filename };
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

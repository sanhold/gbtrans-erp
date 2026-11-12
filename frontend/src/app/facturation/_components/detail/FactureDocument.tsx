'use client';

import { useEffect, useState } from 'react';
import { montantEnLettres } from '@/lib/montantEnLettres';
import { buildProformaHtml, type DocData } from '@/lib/generatePDF';
import { CI_FLAG, fmt, grouperLignes } from './factureHelpers';
import { LignesTable } from './FactureLignes';

interface Props {
  facture: any;
  branding: any;
  qrDataUrl: string;
  docData: DocData | null;
}

/** Échelle d'affichage d'une feuille A4 (794px) sur petit écran ; 1 sur bureau. */
function useA4Scale() {
  const [scale, setScale] = useState(1);
  useEffect(() => {
    const calc = () => setScale(window.innerWidth < 768 ? Math.min(1, (window.innerWidth - 48) / 794) : 1);
    calc();
    window.addEventListener('resize', calc);
    return () => window.removeEventListener('resize', calc);
  }, []);
  return scale;
}

/** Onglet « Documents » : aperçu à l'écran de la facture (rendu identique à l'ancienne fiche ; PDF/impression inchangés). */
export default function FactureDocument({ facture, branding, qrDataUrl, docData }: Props) {
  const scale = useA4Scale();
  const d = facture.dossier;
  const groupes = grouperLignes(facture.lignes || []);

  const detailsRows = [
    ['N° Facture', facture.numero, true],
    ['Date', new Date(facture.dateFacture).toLocaleDateString('fr-FR'), false],
    ['Réf. Dossier', d?.numeroPhysique || d?.numero, false],
  ].filter(([, v]) => v);

  const clientInfoRows = [
    ['Nom', facture.client?.raisonSociale, true],
    ['Adresse', facture.client?.adresse, false],
    ['Téléphone', facture.client?.telephone || facture.client?.mobile, false],
    ['Email', facture.client?.email, false],
    ['N° Contribuable', facture.client?.ncc, false],
    ['Pays', facture.client?.pays, false],
  ].filter(([, v]) => v);

  const isPaysCI = (facture.client?.pays || '').toLowerCase().includes('ivoire');

  if (facture.modele === 'PROFORMA') {
    const zoomed = scale < 1;
    return (
      <div className="bg-white rounded-sm border border-gray-300 overflow-x-auto p-4 max-md:p-2">
        {docData ? (
          <div
            style={{
              position: 'relative', width: '210mm', maxWidth: zoomed ? 'none' : '100%', minHeight: '293mm', boxSizing: 'border-box',
              padding: '10mm 12mm', margin: '0 auto', background: '#fff', color: '#16232e', fontFamily: "'Segoe UI',Arial,sans-serif", fontSize: 11,
              ...(zoomed ? { zoom: scale } : {}),
            }}
            dangerouslySetInnerHTML={{ __html: buildProformaHtml(docData, qrDataUrl, branding || undefined) }}
          />
        ) : null}
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-surface-800 rounded-2xl border border-surface-100 dark:border-surface-700 shadow-card overflow-hidden">
      <div className="p-4 md:p-6 space-y-4">
        {/* Header */}
        <div className="flex justify-between items-start gap-4 flex-wrap">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-[11px] bg-gradient-to-br from-primary-600 to-primary-800 flex items-center justify-center flex-shrink-0"><span className="font-extrabold text-white text-sm">GB</span></div>
            <div>
              <p className="font-display font-extrabold text-lg tracking-tight text-gray-900 dark:text-white">GBTRANS SARL</p>
              <p className="text-[10px] text-primary-600 dark:text-primary-400 font-semibold mt-0.5">Transit • Douane • Logistique</p>
              <div className="text-[9px] text-gray-500 dark:text-gray-400 mt-1.5 leading-relaxed space-y-0.5">
                <p>Cocody Angré 7ème Tranche, Abidjan — Côte d&apos;Ivoire</p>
                <p>+225 27 20 00 00 00 &nbsp;·&nbsp; contact@gbtrans.ci</p>
              </div>
            </div>
          </div>
          <div className="min-w-[220px] max-md:min-w-0 max-md:w-full text-right">
            <span className="inline-block w-full text-center font-display text-sm font-extrabold text-gray-900 dark:text-white bg-surface-100 dark:bg-surface-700 border border-surface-200 dark:border-surface-600 rounded-md px-4 py-2 tracking-wide">FACTURE</span>
            {qrDataUrl && (
              <div className="flex justify-end mt-2">
                <div className="text-center">
                  <img src={qrDataUrl} alt="QR code de vérification" className="w-16 h-16 border border-surface-200 dark:border-surface-600 rounded-md p-0.5 bg-white" />
                  <p className="text-[7.5px] text-gray-500 dark:text-gray-400 mt-1">Vérifier le document</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* DÉTAILS / CLIENT */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
          <div className="border border-surface-100 dark:border-surface-700 rounded-md overflow-hidden">
            <div className="bg-surface-50 dark:bg-surface-700 text-gray-900 dark:text-white text-[11px] font-extrabold px-3 py-1.5 tracking-wide border-b border-surface-100 dark:border-surface-700">DÉTAILS DE LA FACTURE</div>
            <table className="w-full text-[11px]">
              <tbody>
                {detailsRows.map(([label, value, hl]) => (
                  <tr key={label as string}><td className="px-3 py-1 text-gray-500 dark:text-gray-400 w-2/5">{label}</td><td className={`px-3 py-1 font-semibold ${hl ? 'font-mono font-bold text-primary-700 dark:text-primary-400' : 'text-gray-900 dark:text-white'}`}>{value}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="border border-surface-100 dark:border-surface-700 rounded-md overflow-hidden">
            <div className="bg-surface-50 dark:bg-surface-700 text-gray-900 dark:text-white text-[11px] font-extrabold px-3 py-1.5 tracking-wide border-b border-surface-100 dark:border-surface-700">CLIENT</div>
            <table className="w-full text-[11px]">
              <tbody>
                {clientInfoRows.map(([label, value]) => (
                  <tr key={label as string}>
                    <td className="px-3 py-1 text-gray-500 dark:text-gray-400 w-[34%]">{label}</td>
                    <td className="px-3 py-1 font-semibold text-gray-900 dark:text-white">
                      {value}{label === 'Pays' && isPaysCI ? CI_FLAG : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {facture.titre && <div className="bg-surface-50 dark:bg-surface-700 border-l-[3px] border-primary-700 rounded-r-lg px-4 py-2.5 font-bold text-sm uppercase tracking-wide text-gray-900 dark:text-white">{facture.titre}</div>}

        <LignesTable groupes={groupes} editable={false} />

        {/* Montant en lettres + Totaux */}
        <div className="flex justify-between items-start gap-4 flex-wrap">
          <div className="flex-1 min-w-[240px] max-md:min-w-0 max-md:basis-full border border-surface-100 dark:border-surface-700 bg-surface-50 dark:bg-surface-700/40 rounded-md p-3">
            <p className="text-[10px] font-extrabold text-gray-900 dark:text-white tracking-wide">MONTANT ARRÊTÉ À LA SOMME DE :</p>
            <p className="text-sm font-bold italic mt-1 text-gray-900 dark:text-white">{montantEnLettres(Number(facture.montantTTC))}</p>
          </div>
          <table className="text-sm border border-surface-100 dark:border-surface-700 rounded-md overflow-hidden min-w-[240px] max-md:min-w-0 max-md:w-full">
            <tbody>
              <tr><td className="px-3 py-1.5 text-gray-500 dark:text-gray-400">TOTAL HT</td><td className="px-3 py-1.5 text-right font-mono font-bold text-gray-900 dark:text-white">{fmt(facture.montantHT)}</td></tr>
              {facture.montantPrestation ? <tr><td className="px-3 py-1.5 text-gray-500 dark:text-gray-400">Montant Prestation</td><td className="px-3 py-1.5 text-right font-mono font-bold text-gray-900 dark:text-white">{fmt(facture.montantPrestation)}</td></tr> : null}
              {facture.tvaPrestation ? <tr><td className="px-3 py-1.5 text-gray-500 dark:text-gray-400">TVA/Prestation</td><td className="px-3 py-1.5 text-right font-mono font-bold text-gray-900 dark:text-white">{fmt(facture.tvaPrestation)}</td></tr> : null}
              <tr><td className="px-3 py-1.5 text-gray-500 dark:text-gray-400">TVA (18%)</td><td className="px-3 py-1.5 text-right font-mono font-bold text-gray-900 dark:text-white">{fmt(facture.montantTVA)}</td></tr>
              <tr>
                <td colSpan={2} className="p-0">
                  <div className="bg-gradient-to-br from-primary-600 to-primary-800 text-white flex justify-between px-3 py-2 font-extrabold text-[13px]">
                    <span>NET À PAYER TTC</span><span className="font-mono">{fmt(facture.montantTTC)}</span>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Acompte / Reste à payer */}
        <div className="flex gap-4">
          <div><p className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Acompte</p><div className="px-3 py-1.5 border border-surface-100 dark:border-surface-700 rounded-lg font-mono text-sm">{fmt(facture.acompte)}</div></div>
          <div><p className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Reste à payer</p><div className="px-3 py-1.5 border border-surface-100 dark:border-surface-700 rounded-lg font-mono text-sm font-bold text-red-600">{fmt(facture.resteAPayer)}</div></div>
        </div>

        {/* Signature */}
        {facture.afficherSignature && (
          <div className="flex justify-end pt-4">
            <div className="text-center w-56">
              <p className={`text-[10px] text-gray-500 dark:text-gray-400 ${branding?.signature ? 'mb-1' : 'mb-9'}`}>Le Directeur / Cachet &amp; Signature</p>
              {branding?.signature && <img src={branding.signature} alt="Signature" className="h-9 object-contain mx-auto" />}
              {branding?.cachet && <img src={branding.cachet} alt="Cachet" className="h-9 object-contain mx-auto mt-0.5" />}
              <div className="border-t border-gray-900 dark:border-white pt-1 font-bold text-gray-900 dark:text-white">{branding?.raisonSociale || 'GBTRANS SARL'}</div>
            </div>
          </div>
        )}
      </div>

      {/* Footer légal */}
      <div className="border-t border-surface-100 dark:border-surface-700 px-6 py-4 text-center text-[9px] text-gray-500 dark:text-gray-400 leading-relaxed">
        <p>Facture définitive. Toute réclamation doit être formulée sous 8 jours.</p>
        <p className="mt-1">GBTRANS SARL — Cocody Angré 7ème Tranche, Abidjan, Côte d&apos;Ivoire — RCCM CI-ABJ-2018-B-12345 — CC 1812345 Z — contact@gbtrans.ci</p>
      </div>
    </div>
  );
}

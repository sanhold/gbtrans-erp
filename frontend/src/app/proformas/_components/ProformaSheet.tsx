'use client';

import { montantEnLettres } from '@/lib/montantEnLettres';
import { fmt, fmtSaisie, nettoyerNombre, type LigneProforma, type ProformaFormState } from './proformaUtils';
import { IconClose, IconDown, IconUp } from './icons';

export interface GroupeLignes { categorie: string; couleur: string; lignes: LigneProforma[]; sousTotal: number }

export interface ProformaTotaux { totalHT: number; totalTVA: number; totalGeneral: number; montantPrestation: number; valeurCAF: number }

export interface LignesActions {
  updateLigne: (index: number, field: string, value: any) => void;
  moveLigne: (index: number, dir: -1 | 1) => void;
  moveGroupe: (cat: string, dir: -1 | 1) => void;
  removeLigne: (index: number) => void;
}

interface Props {
  form: ProformaFormState;
  lignes: LigneProforma[];
  groupes: GroupeLignes[];
  client: any | null;
  dossier: any | null;
  /** Contenu du « N° » (texte d'attente à la création, numéro réel en modification). */
  numeroNode: React.ReactNode;
  dateLabel: string;
  totaux: ProformaTotaux;
  branding: any;
  actions: LignesActions;
  /** Barre « modèle / groupe » (édition uniquement). */
  toolbar?: React.ReactNode;
  /** Aperçu en lecture seule (mobile) : pas d'inputs ni de boutons de déplacement. */
  readOnly?: boolean;
}

/** Feuille A4 « .pf-sheet » : rendu papier de la proforma (identique sur bureau et dans l'aperçu mobile). */
export default function ProformaSheet({ form, lignes, groupes, client, dossier, numeroNode, dateLabel, totaux, branding, actions, toolbar, readOnly = false }: Props) {
  const { totalHT, totalTVA, totalGeneral, montantPrestation, valeurCAF } = totaux;
  const nbCols = readOnly ? 4 : 5;
  let globalIndex = 0;

  return (
    <div className="pf-sheet">
      <div className="pf-doc-head">
        <div className="pf-company">
          <div className="pf-company-name">GBTRANS SARL</div>
          <div className="pf-company-sub">Transit · Douane · Logistique</div>
          <div className="pf-company-addr">
            Cocody Angré 7ème Tranche, Abidjan — Côte d&apos;Ivoire<br />
            +225 27 20 00 00 00 · contact@gbtrans.ci
          </div>
        </div>
        <div className="pf-doc-title">
          <div className="pf-doc-label">PROFORMA</div>
          <div className="pf-doc-num">N° {numeroNode}</div>
          {dossier && <div className="pf-doc-num">Dossier : <strong>{dossier.numeroPhysique || dossier.numero}</strong></div>}
          <div className="pf-doc-num">Date : {dateLabel}</div>
        </div>
      </div>

      <div className="pf-meta-grid">
        {(form.fobUnitaire || form.fretUnitaire || form.assurance || valeurCAF) ? (
          <div className="pf-fob-block">
            <table className="pf-fob-table">
              <tbody>
                <tr>
                  <td>FOB (Unitaire)</td><td className="pf-num">{fmt(parseFloat(form.fobUnitaire) || 0)}</td>
                  <td>Frais divers</td><td className="pf-num">{fmt(parseFloat(form.fraisDivers) || 0)}</td>
                </tr>
                <tr>
                  <td>FRET (Unitaire)</td><td className="pf-num">{fmt(parseFloat(form.fretUnitaire) || 0)}</td>
                  <td>Nbre unités</td><td className="pf-num">{form.nombreUnites || 1}</td>
                </tr>
                <tr>
                  <td>Assurance</td><td className="pf-num">{fmt(parseFloat(form.assurance) || 0)}</td>
                  <td className="pf-fob-strong">Valeur CAF</td><td className="pf-num pf-fob-strong">{fmt(valeurCAF)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        ) : null}
        <div className="pf-meta-block">
          <div className="pf-meta-k">Adressée à</div>
          {client ? (
            <>
              <div className="pf-meta-v pf-meta-strong">{client.raisonSociale}</div>
              {client.adresse && <div className="pf-meta-v">{client.adresse}</div>}
              {(client.telephone || client.mobile) && <div className="pf-meta-v">{client.telephone || client.mobile}</div>}
              {client.email && <div className="pf-meta-v">{client.email}</div>}
              {client.ncc && <div className="pf-meta-v">{client.ncc}</div>}
              {client.pays && (
                <div className="pf-meta-v">
                  {client.pays}
                  {client.pays.toLowerCase().includes('ivoire') && (
                    <span className="pf-ci-flag"><span /><span /><span /></span>
                  )}
                </div>
              )}
            </>
          ) : <div className="pf-meta-v pf-meta-placeholder">Sélectionnez un client…</div>}
          <div className="pf-meta-v pf-meta-dim">Offre valable 30 jours à compter de la date d&apos;émission.</div>
        </div>
      </div>

      {form.titre && <div className="pf-titre">{form.titre}</div>}

      {lignes.length === 0 && (
        <div className="pf-empty-hint">Ajoutez des prestations depuis le catalogue pour composer la proforma.</div>
      )}

      {!readOnly && toolbar}

      {lignes.length > 0 && (
        <table className="pf-items">
          <thead>
            <tr>
              <th className="pf-numcol">N°</th>
              <th>Désignation</th>
              <th className="pf-num pf-montantcol">Montant</th>
              <th className="pf-tvacol">TVA</th>
              {!readOnly && <th className="pf-rmcol pf-no-export"></th>}
            </tr>
          </thead>
          {groupes.map(group => (
            <tbody key={group.categorie}>
              <tr>
                <td colSpan={nbCols} className="pf-section-title-row">
                  <span>{group.categorie}</span>
                  {!readOnly && (
                    <span className="pf-no-export pf-move">
                      <button type="button" title="Monter le groupe" aria-label="Monter le groupe" onClick={() => actions.moveGroupe(group.categorie, -1)}><IconUp className="w-3 h-3" /></button>
                      <button type="button" title="Descendre le groupe" aria-label="Descendre le groupe" onClick={() => actions.moveGroupe(group.categorie, 1)}><IconDown className="w-3 h-3" /></button>
                    </span>
                  )}
                </td>
              </tr>
              {group.lignes.map(ligne => {
                globalIndex++;
                const idx = lignes.indexOf(ligne);
                return (
                  <tr key={idx}>
                    <td className="pf-numcol">{globalIndex}</td>
                    {readOnly ? (
                      <>
                        <td>{ligne.designation}</td>
                        <td className="pf-num">{fmt(ligne.montant || 0)}</td>
                      </>
                    ) : (
                      <>
                        <td><input value={ligne.designation} onChange={e => actions.updateLigne(idx, 'designation', e.target.value)} aria-label="Désignation" /></td>
                        <td className="pf-num"><input className="pf-num-input" type="text" inputMode="decimal" aria-label="Montant" value={fmtSaisie(ligne.montant || '')} onChange={e => actions.updateLigne(idx, 'montant', parseFloat(nettoyerNombre(e.target.value)) || 0)} /></td>
                      </>
                    )}
                    <td className="pf-tvacol"><input type="checkbox" checked={ligne.estTVA} disabled readOnly className="pf-tva-checkbox" title="Défini depuis le catalogue" aria-label="Ligne de TVA" /></td>
                    {!readOnly && (
                      <td className="pf-rmcol pf-no-export">
                        <span className="pf-move">
                          <button type="button" title="Monter" aria-label="Monter la ligne" onClick={() => actions.moveLigne(idx, -1)}><IconUp className="w-3 h-3" /></button>
                          <button type="button" title="Descendre" aria-label="Descendre la ligne" onClick={() => actions.moveLigne(idx, 1)}><IconDown className="w-3 h-3" /></button>
                          <button type="button" title="Supprimer" aria-label="Supprimer la ligne" onClick={() => actions.removeLigne(idx)}><IconClose className="w-3 h-3" /></button>
                        </span>
                      </td>
                    )}
                  </tr>
                );
              })}
              <tr className="pf-subtotal-row">
                <td colSpan={2}>Sous-total {group.categorie}</td>
                <td className="pf-num">{fmt(group.sousTotal)}</td>
                <td className="pf-no-export"></td>
                {!readOnly && <td className="pf-no-export"></td>}
              </tr>
            </tbody>
          ))}
          <tfoot>
            <tr className="pf-foot-row">
              <td colSpan={2}>Montant prestation</td>
              <td className="pf-num">{fmt(montantPrestation)}</td>
              <td className="pf-no-export"></td>
              {!readOnly && <td className="pf-no-export"></td>}
            </tr>
            <tr className="pf-foot-row">
              <td colSpan={2}>TVA / prestation</td>
              <td className="pf-num">{fmt(totalTVA)}</td>
              <td className="pf-no-export"></td>
              {!readOnly && <td className="pf-no-export"></td>}
            </tr>
          </tfoot>
        </table>
      )}

      {lignes.length > 0 && (
        <div className="pf-bottom-row">
          <div className="pf-lettres-block">
            <div className="pf-meta-k">Arrêtée à la présente facture à la somme de :</div>
            <div className="pf-lettres-text">{montantEnLettres(totalGeneral)}</div>
          </div>
          <table className="pf-totals-table">
            <tbody>
              <tr><td>TOTAL HT</td><td className="pf-num">{fmt(totalHT)}</td></tr>
              <tr><td>TOTAL TVA</td><td className="pf-num">{fmt(totalTVA)}</td></tr>
              <tr className="pf-grand"><td>TOTAL TTC</td><td className="pf-num">{fmt(totalGeneral)}</td></tr>
            </tbody>
          </table>
        </div>
      )}

      {form.afficherSignature && (
        <div className="pf-signature-row">
          <div className="pf-signature-box">
            {branding?.signature || branding?.cachet ? <div className="pf-signature-imgs">{branding?.signature && <img src={branding.signature} alt="Signature" className="pf-signature-img" />}{branding?.cachet && <img src={branding.cachet} alt="Cachet" className="pf-signature-img pf-cachet-img" />}</div> : <div className="pf-signature-placeholder" />}
            <div className="pf-signature-label">Le Responsable</div>
          </div>
        </div>
      )}

      {form.observations && (
        <div className="pf-footer-grid">
          <div>
            <div className="pf-meta-k">Observations</div>
            <p className="pf-obs-text">{form.observations}</p>
          </div>
        </div>
      )}
    </div>
  );
}

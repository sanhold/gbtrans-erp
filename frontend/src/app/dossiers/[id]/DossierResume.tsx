'use client';

import { EditableField, type FieldContext as FieldCtx } from './dossierShared';

/** Onglet « Résumé » : client, marchandise, transport, douane et valeur, observations. */
export default function DossierResume({ ctx, onObservations }: { ctx: FieldCtx; onObservations: (v: string) => void }) {
  const { dossier, editing, editForm } = ctx;
  const F = (label: string, field: string, type?: string) => <EditableField label={label} field={field} type={type} ctx={ctx} />;
  const client = dossier.client;
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
      <section className="card" aria-labelledby="sec-client">
        <h3 id="sec-client" className="font-semibold mb-4">Client</h3>
        <div className="mb-3">{F('N° physique', 'numeroPhysique')}</div>
        <dl className="space-y-3 text-sm">
          {[
            ['Raison sociale', client?.raisonSociale], ['Code', client?.code], ['NCC', client?.ncc || '-'],
            ['Téléphone', client?.telephone || '-'], ['Email', client?.email || '-'],
          ].map(([k, v]) => (
            <div key={k} className="flex justify-between gap-3"><dt className="text-gray-600 dark:text-gray-400">{k}</dt><dd className="font-medium text-right break-all">{v}</dd></div>
          ))}
        </dl>
      </section>

      <section className="card" aria-labelledby="sec-march">
        <h3 id="sec-march" className="font-semibold mb-4">Marchandise</h3>
        <div className="grid grid-cols-1 gap-3">
          {F('Désignation', 'designation')}
          <div className="grid grid-cols-2 gap-3">
            {F('Poids brut (kg)', 'poidsBrut', 'number')}
            {F('Poids net (kg)', 'poidsNet', 'number')}
            {F('Volume (m³)', 'volume', 'number')}
            {F('Nombre de colis', 'nombreColis', 'number')}
            {F('Emballage', 'emballage')}
          </div>
        </div>
      </section>

      <section className="card lg:col-span-2" aria-labelledby="sec-transport">
        <h3 id="sec-transport" className="font-semibold mb-4">Transport</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {F('Compagnie maritime', 'compagnieMaritime')}
          {F('Navire', 'navire')}
          {F('Voyage', 'voyage')}
          {F('N° BL / Connaissement', 'numeroBL')}
          {F("Port d'origine", 'portOrigine')}
          {F('Port de destination', 'portDestination')}
        </div>
      </section>

      <section className="card lg:col-span-2" aria-labelledby="sec-douane">
        <h3 id="sec-douane" className="font-semibold mb-4">Douane et valeur</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {F('Valeur FOB', 'valeurFOB', 'number')}
          {F('Fret', 'fret', 'number')}
          {F('Assurance', 'assurance', 'number')}
          {F('Valeur CAF', 'valeurCAF', 'number')}
          {F('Incoterm', 'incoterm')}
          {F('Devise', 'devise')}
          {F('N° déclaration', 'numeroDeclaration')}
          {F('Régime douanier', 'regimeDouanier')}
          {F('Bureau de douane', 'bureauDouane')}
          {F('Droits de douane', 'droitDouane', 'number')}
          {F('TVA', 'tva', 'number')}
          {F('Total droits et taxes', 'totalDroits', 'number')}
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-4 pt-4 border-t border-gray-200 dark:border-surface-700">
          {F('Lieu de livraison', 'lieuLivraison')}
          {F('N° bon de livraison', 'bonLivraison')}
        </div>
      </section>

      <section className="card lg:col-span-2" aria-labelledby="sec-obs">
        <h3 id="sec-obs" className="font-semibold mb-4">Observations</h3>
        {editing ? (
          <textarea aria-label="Observations" value={editForm.observations || ''} onChange={e => onObservations(e.target.value)} className="input-field text-sm" rows={3} />
        ) : (
          <p className="text-sm text-gray-700 dark:text-gray-300">{dossier.observations || 'Aucune observation'}</p>
        )}
      </section>
    </div>
  );
}

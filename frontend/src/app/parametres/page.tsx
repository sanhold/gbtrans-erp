'use client';

import { useState } from 'react';
import Link from 'next/link';
import AppLayout from '@/components/layout/AppLayout';

const tabs = [
  { id: 'entreprise', label: 'Entreprise' },
  { id: 'utilisateurs', label: 'Utilisateurs' },
  { id: 'profils', label: 'Profils & Permissions' },
  { id: 'numerotation', label: 'Numérotation' },
  { id: 'email', label: 'Email / SMTP' },
  { id: 'sms', label: 'SMS' },
  { id: 'sauvegarde', label: 'Sauvegarde' },
];

const linkTabs = [
  { href: '/parametres/catalogue-prestations', label: 'Catalogue des prestations' },
  { href: '/parametres/modeles-courrier', label: 'Modèles de courrier' },
  { href: '/parametres/processus', label: 'Processus de suivi' },
];

export default function ParametresPage() {
  const [activeTab, setActiveTab] = useState('entreprise');

  return (
    <AppLayout>
      <div className="space-y-6">
        <div><h1 className="text-2xl font-bold text-gray-900 dark:text-white">Paramètres</h1><p className="text-sm text-gray-500">Configuration générale de l&apos;application</p></div>

        <div className="flex gap-6">
          <div className="w-56 space-y-1">
            {tabs.map(tab => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className={`w-full text-left px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${activeTab === tab.id ? 'bg-primary-50 text-primary-600 dark:bg-primary-900/30 dark:text-primary-400' : 'text-gray-600 hover:bg-gray-50 dark:text-gray-400 dark:hover:bg-surface-700'}`}>
                {tab.label}
              </button>
            ))}
            <div className="pt-2 mt-2 border-t border-gray-200 dark:border-surface-700 space-y-1">
              {linkTabs.map(tab => (
                <Link key={tab.href} href={tab.href}
                  className="flex items-center justify-between w-full text-left px-4 py-2.5 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 dark:text-gray-400 dark:hover:bg-surface-700 transition-all">
                  {tab.label}
                  <svg className="w-3.5 h-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                </Link>
              ))}
            </div>
          </div>

          <div className="flex-1 card">
            {activeTab === 'entreprise' && (
              <div className="space-y-6">
                <h3 className="text-lg font-semibold">Informations Société</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div><label className="label">Raison Sociale</label><input type="text" defaultValue="GBTRANS SARL" className="input-field" /></div>
                  <div><label className="label">Forme Juridique</label><input type="text" defaultValue="SARL" className="input-field" /></div>
                  <div><label className="label">NCC</label><input type="text" className="input-field" /></div>
                  <div><label className="label">RCCM</label><input type="text" className="input-field" /></div>
                  <div><label className="label">Taux TVA (%)</label><input type="number" defaultValue="18" className="input-field" /></div>
                  <div><label className="label">Devise</label><select className="input-field"><option>XOF</option><option>EUR</option><option>USD</option></select></div>
                  <div className="col-span-2"><label className="label">Adresse</label><input type="text" defaultValue="Abidjan, Côte d'Ivoire" className="input-field" /></div>
                  <div><label className="label">Téléphone</label><input type="text" className="input-field" /></div>
                  <div><label className="label">Email</label><input type="email" defaultValue="contact@gbtrans.ci" className="input-field" /></div>
                </div>
                <div className="flex justify-end"><button className="btn-primary">Enregistrer</button></div>
              </div>
            )}
            {activeTab === 'utilisateurs' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between"><h3 className="text-lg font-semibold">Utilisateurs</h3><button className="btn-primary text-sm">Nouvel Utilisateur</button></div>
                <div className="table-container !shadow-none !border-0">
                  <table className="w-full">
                    <thead><tr><th className="table-header">Matricule</th><th className="table-header">Nom</th><th className="table-header">Email</th><th className="table-header">Profil</th><th className="table-header">Statut</th></tr></thead>
                    <tbody>
                      <tr className="table-row"><td className="table-cell font-medium" data-label="Matricule">ADM001</td><td className="table-cell" data-label="Nom">ADMINISTRATEUR Système</td><td className="table-cell" data-label="Email">admin@gbtrans.ci</td><td className="table-cell" data-label="Profil"><span className="badge badge-info">Administrateur</span></td><td className="table-cell" data-label="Statut"><span className="badge badge-success">Actif</span></td></tr>
                    </tbody>
                  </table>
                </div>
              </div>
            )}
            {activeTab === 'profils' && <div><h3 className="text-lg font-semibold mb-4">Profils & Permissions</h3><div className="space-y-2">{['Administrateur', 'Transitaire', 'Comptable', 'Commercial', 'Consultation'].map(p => (<div key={p} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-surface-700 rounded-lg"><span className="font-medium text-sm">{p}</span><button className="text-xs text-primary-500 hover:underline">Gérer les permissions</button></div>))}</div></div>}
            {activeTab === 'numerotation' && <div><h3 className="text-lg font-semibold mb-4">Numérotation automatique</h3><div className="space-y-2">{['Dossier (DOS)', 'Facture (FAC)', 'Proforma (PRO)', 'Avoir (AVR)', 'Paiement (PAI)', 'Courrier Entrant (CE)', 'Courrier Sortant (CS)', 'AT', 'Caution (CAU)'].map(n => (<div key={n} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-surface-700 rounded-lg"><span className="text-sm font-medium">{n}</span><span className="text-xs text-gray-500">FORMAT/{'{ANNEE}'}/{'{COMPTEUR}'}</span></div>))}</div></div>}
            {activeTab === 'email' && <div><h3 className="text-lg font-semibold mb-4">Configuration SMTP</h3><div className="grid grid-cols-1 sm:grid-cols-2 gap-4"><div><label className="label">Serveur SMTP</label><input type="text" defaultValue="smtp.gmail.com" className="input-field" /></div><div><label className="label">Port</label><input type="number" defaultValue="587" className="input-field" /></div><div><label className="label">Utilisateur</label><input type="text" className="input-field" /></div><div><label className="label">Mot de passe</label><input type="password" className="input-field" /></div></div><div className="flex justify-end mt-4"><button className="btn-primary">Enregistrer</button></div></div>}
            {activeTab === 'sms' && <div><h3 className="text-lg font-semibold mb-4">Configuration SMS</h3><p className="text-gray-500 text-sm">Configurez l&apos;API Orange pour l&apos;envoi de SMS automatiques.</p><div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4"><div><label className="label">Clé API Orange</label><input type="text" className="input-field" /></div><div><label className="label">Secret API</label><input type="password" className="input-field" /></div></div></div>}
            {activeTab === 'sauvegarde' && <div><h3 className="text-lg font-semibold mb-4">Sauvegarde & Restauration</h3><div className="space-y-4"><button className="btn-primary">Sauvegarder maintenant</button><p className="text-sm text-gray-500">Dernière sauvegarde : Aucune</p></div></div>}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

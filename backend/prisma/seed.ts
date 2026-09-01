import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Initialisation de la base de données GBTRANS ERP...');

  // Société principale
  const societe = await prisma.societe.upsert({
    where: { code: 'GBTRANS' },
    update: {},
    create: {
      code: 'GBTRANS',
      raisonSociale: 'GBTRANS SARL',
      formeJuridique: 'SARL',
      adresse: 'Abidjan, Côte d\'Ivoire',
      ville: 'Abidjan',
      pays: 'Côte d\'Ivoire',
      telephone: '+225 07 00 00 00 00',
      email: 'contact@gbtrans.ci',
      devise: 'XOF',
      tauxTVA: 18,
    },
  });

  // Agences
  const agenceSiege = await prisma.agence.upsert({
    where: { societeId_code: { societeId: societe.id, code: 'SIEGE' } },
    update: {},
    create: {
      societeId: societe.id,
      code: 'SIEGE',
      nom: 'Siège Social - Abidjan',
      ville: 'Abidjan',
      adresse: 'Zone portuaire, Abidjan',
    },
  });

  await prisma.agence.upsert({
    where: { societeId_code: { societeId: societe.id, code: 'SPE' } },
    update: {},
    create: {
      societeId: societe.id,
      code: 'SPE',
      nom: 'Agence Port d\'Abidjan - San Pedro',
      ville: 'San Pedro',
    },
  });

  // Profils
  const profilAdmin = await prisma.profil.upsert({
    where: { code: 'ADMIN' },
    update: {},
    create: {
      code: 'ADMIN',
      nom: 'Administrateur',
      description: 'Accès complet à toutes les fonctionnalités',
      estAdmin: true,
    },
  });

  const profilTransitaire = await prisma.profil.upsert({
    where: { code: 'TRANSITAIRE' },
    update: {},
    create: {
      code: 'TRANSITAIRE',
      nom: 'Transitaire',
      description: 'Gestion des dossiers de transit',
    },
  });

  const profilComptable = await prisma.profil.upsert({
    where: { code: 'COMPTABLE' },
    update: {},
    create: {
      code: 'COMPTABLE',
      nom: 'Comptable',
      description: 'Gestion comptable et financière',
    },
  });

  const profilCommercial = await prisma.profil.upsert({
    where: { code: 'COMMERCIAL' },
    update: {},
    create: {
      code: 'COMMERCIAL',
      nom: 'Commercial',
      description: 'Gestion commerciale et clients',
    },
  });

  const profilConsultation = await prisma.profil.upsert({
    where: { code: 'CONSULTATION' },
    update: {},
    create: {
      code: 'CONSULTATION',
      nom: 'Consultation',
      description: 'Accès en lecture seule',
    },
  });

  // Permissions
  const modules = [
    'DOSSIERS', 'CLIENTS', 'FOURNISSEURS', 'FACTURATION',
    'COMPTABILITE', 'FINANCE', 'AT', 'CAUTIONS', 'COURRIERS',
    'ARCHIVES', 'NOTIFICATIONS', 'STATISTIQUES', 'PARAMETRES',
    'UTILISATEURS', 'PROFORMAS', 'OFFRES',
  ];

  const actions = ['LIRE', 'CREER', 'MODIFIER', 'SUPPRIMER', 'VALIDER', 'ARCHIVER', 'EXPORTER', 'IMPRIMER'];

  for (const module of modules) {
    for (const action of actions) {
      await prisma.permission.upsert({
        where: { module_action: { module, action } },
        update: {},
        create: {
          module,
          action,
          libelle: `${action} ${module}`,
        },
      });
    }
  }

  // Permissions spécifiques
  const permissionsSpecifiques = [
    { module: 'FACTURATION', action: 'PAYER', libelle: 'Enregistrer un paiement' },
    { module: 'FACTURATION', action: 'ANNULER', libelle: 'Annuler une facture' },
    { module: 'CLIENTS', action: 'BLOQUER', libelle: 'Bloquer un client' },
    { module: 'DOSSIERS', action: 'CHANGER_STATUT', libelle: 'Changer le statut d\'un dossier' },
    { module: 'COMPTABILITE', action: 'CLOTURER', libelle: 'Clôturer un exercice' },
  ];

  for (const perm of permissionsSpecifiques) {
    await prisma.permission.upsert({
      where: { module_action: { module: perm.module, action: perm.action } },
      update: {},
      create: perm,
    });
  }

  // Permissions transitaire
  const permissionsTransitaire = await prisma.permission.findMany({
    where: {
      module: { in: ['DOSSIERS', 'CLIENTS', 'PROFORMAS', 'COURRIERS'] },
      action: { in: ['LIRE', 'CREER', 'MODIFIER'] },
    },
  });

  for (const perm of permissionsTransitaire) {
    await prisma.profilPermission.upsert({
      where: {
        profilId_permissionId: {
          profilId: profilTransitaire.id,
          permissionId: perm.id,
        },
      },
      update: {},
      create: {
        profilId: profilTransitaire.id,
        permissionId: perm.id,
      },
    });
  }

  // Permissions comptable (Finance + Factures Fournisseurs + lecture des Dossiers pour le Bilan + Comptabilité)
  const permissionsComptable = await prisma.permission.findMany({
    where: {
      OR: [
        { module: 'FINANCE', action: { in: ['LIRE', 'CREER', 'MODIFIER', 'VALIDER'] } },
        { module: 'FOURNISSEURS', action: { in: ['LIRE', 'CREER', 'MODIFIER', 'VALIDER'] } },
        { module: 'DOSSIERS', action: 'LIRE' },
        { module: 'COMPTABILITE', action: { in: ['LIRE', 'CREER', 'MODIFIER', 'SUPPRIMER', 'VALIDER', 'ARCHIVER', 'EXPORTER', 'IMPRIMER'] } },
      ],
    },
  });

  for (const perm of permissionsComptable) {
    await prisma.profilPermission.upsert({
      where: {
        profilId_permissionId: {
          profilId: profilComptable.id,
          permissionId: perm.id,
        },
      },
      update: {},
      create: {
        profilId: profilComptable.id,
        permissionId: perm.id,
      },
    });
  }

  // Permissions commercial (Clients + Proformas + Offres + lecture Dossiers/Facturation)
  const permissionsCommercial = await prisma.permission.findMany({
    where: {
      OR: [
        { module: 'CLIENTS', action: { in: ['LIRE', 'CREER', 'MODIFIER'] } },
        { module: 'PROFORMAS', action: { in: ['LIRE', 'CREER', 'MODIFIER'] } },
        { module: 'OFFRES', action: { in: ['LIRE', 'CREER', 'MODIFIER'] } },
        { module: 'DOSSIERS', action: 'LIRE' },
        { module: 'FACTURATION', action: 'LIRE' },
      ],
    },
  });

  for (const perm of permissionsCommercial) {
    await prisma.profilPermission.upsert({
      where: {
        profilId_permissionId: {
          profilId: profilCommercial.id,
          permissionId: perm.id,
        },
      },
      update: {},
      create: {
        profilId: profilCommercial.id,
        permissionId: perm.id,
      },
    });
  }

  // Permissions consultation (lecture seule sur tous les modules)
  const permissionsConsultation = await prisma.permission.findMany({
    where: { action: 'LIRE' },
  });

  for (const perm of permissionsConsultation) {
    await prisma.profilPermission.upsert({
      where: {
        profilId_permissionId: {
          profilId: profilConsultation.id,
          permissionId: perm.id,
        },
      },
      update: {},
      create: {
        profilId: profilConsultation.id,
        permissionId: perm.id,
      },
    });
  }

  // Utilisateurs de test (un par profil, mot de passe commun pour faciliter les tests)
  const hashedPassword = await bcrypt.hash('Admin@2024!', 12);
  await prisma.utilisateur.upsert({
    where: { email: 'admin@gbtrans.ci' },
    update: {},
    create: {
      societeId: societe.id,
      agenceId: agenceSiege.id,
      matricule: 'ADM001',
      nom: 'ADMINISTRATEUR',
      prenom: 'Système',
      email: 'admin@gbtrans.ci',
      motDePasse: hashedPassword,
      profilId: profilAdmin.id,
    },
  });

  const utilisateursTest = [
    { matricule: 'TRA001', nom: 'KOUASSI', prenom: 'Aya', email: 'transitaire@gbtrans.ci', profilId: profilTransitaire.id },
    { matricule: 'CPT001', nom: 'YAO', prenom: 'Bini', email: 'comptable@gbtrans.ci', profilId: profilComptable.id },
    { matricule: 'COM001', nom: 'TRAORE', prenom: 'Fatim', email: 'commercial@gbtrans.ci', profilId: profilCommercial.id },
    { matricule: 'CON001', nom: 'DIALLO', prenom: 'Mamadou', email: 'consultation@gbtrans.ci', profilId: profilConsultation.id },
  ];

  for (const u of utilisateursTest) {
    await prisma.utilisateur.upsert({
      where: { email: u.email },
      update: {},
      create: {
        societeId: societe.id,
        agenceId: agenceSiege.id,
        matricule: u.matricule,
        nom: u.nom,
        prenom: u.prenom,
        email: u.email,
        motDePasse: hashedPassword,
        profilId: u.profilId,
      },
    });
  }

  // Exercice comptable
  await prisma.exercice.upsert({
    where: { societeId_code: { societeId: societe.id, code: '2024' } },
    update: {},
    create: {
      societeId: societe.id,
      code: '2024',
      libelle: 'Exercice 2024',
      dateDebut: new Date('2024-01-01'),
      dateFin: new Date('2024-12-31'),
      actif: true,
    },
  });

  await prisma.exercice.upsert({
    where: { societeId_code: { societeId: societe.id, code: '2025' } },
    update: {},
    create: {
      societeId: societe.id,
      code: '2025',
      libelle: 'Exercice 2025',
      dateDebut: new Date('2025-01-01'),
      dateFin: new Date('2025-12-31'),
      actif: true,
    },
  });

  await prisma.exercice.upsert({
    where: { societeId_code: { societeId: societe.id, code: '2026' } },
    update: {},
    create: {
      societeId: societe.id,
      code: '2026',
      libelle: 'Exercice 2026',
      dateDebut: new Date('2026-01-01'),
      dateFin: new Date('2026-12-31'),
      actif: true,
    },
  });

  // Plan Comptable OHADA (classes principales)
  const planComptable = [
    { numero: '1', libelle: 'COMPTES DE RESSOURCES DURABLES', classe: 1, type: 'BILAN' as const, nature: 'PASSIF' as const, sens: 'CREDITEUR' as const },
    { numero: '10', libelle: 'Capital', classe: 1, type: 'BILAN' as const, nature: 'PASSIF' as const, sens: 'CREDITEUR' as const },
    { numero: '101', libelle: 'Capital social', classe: 1, type: 'BILAN' as const, nature: 'PASSIF' as const, sens: 'CREDITEUR' as const },
    { numero: '12', libelle: 'Report à nouveau', classe: 1, type: 'BILAN' as const, nature: 'PASSIF' as const, sens: 'CREDITEUR' as const },
    { numero: '13', libelle: 'Résultat net de l\'exercice', classe: 1, type: 'BILAN' as const, nature: 'PASSIF' as const, sens: 'CREDITEUR' as const },
    { numero: '16', libelle: 'Emprunts et dettes assimilées', classe: 1, type: 'BILAN' as const, nature: 'PASSIF' as const, sens: 'CREDITEUR' as const },
    { numero: '2', libelle: 'COMPTES D\'ACTIF IMMOBILISÉ', classe: 2, type: 'BILAN' as const, nature: 'ACTIF' as const, sens: 'DEBITEUR' as const },
    { numero: '21', libelle: 'Immobilisations incorporelles', classe: 2, type: 'BILAN' as const, nature: 'ACTIF' as const, sens: 'DEBITEUR' as const },
    { numero: '24', libelle: 'Matériel', classe: 2, type: 'BILAN' as const, nature: 'ACTIF' as const, sens: 'DEBITEUR' as const },
    { numero: '28', libelle: 'Amortissements', classe: 2, type: 'BILAN' as const, nature: 'ACTIF' as const, sens: 'CREDITEUR' as const },
    { numero: '3', libelle: 'COMPTES DE STOCKS', classe: 3, type: 'BILAN' as const, nature: 'ACTIF' as const, sens: 'DEBITEUR' as const },
    { numero: '4', libelle: 'COMPTES DE TIERS', classe: 4, type: 'BILAN' as const, nature: 'ACTIF' as const, sens: 'DEBITEUR' as const },
    { numero: '401', libelle: 'Fournisseurs, dettes en compte', classe: 4, type: 'BILAN' as const, nature: 'PASSIF' as const, sens: 'CREDITEUR' as const },
    { numero: '411', libelle: 'Clients', classe: 4, type: 'BILAN' as const, nature: 'ACTIF' as const, sens: 'DEBITEUR' as const },
    { numero: '421', libelle: 'Personnel, rémunérations dues', classe: 4, type: 'BILAN' as const, nature: 'PASSIF' as const, sens: 'CREDITEUR' as const },
    { numero: '443', libelle: 'TVA facturée', classe: 4, type: 'BILAN' as const, nature: 'PASSIF' as const, sens: 'CREDITEUR' as const },
    { numero: '445', libelle: 'TVA récupérable', classe: 4, type: 'BILAN' as const, nature: 'ACTIF' as const, sens: 'DEBITEUR' as const },
    { numero: '5', libelle: 'COMPTES DE TRÉSORERIE', classe: 5, type: 'BILAN' as const, nature: 'ACTIF' as const, sens: 'DEBITEUR' as const },
    { numero: '512', libelle: 'Banques', classe: 5, type: 'BILAN' as const, nature: 'ACTIF' as const, sens: 'DEBITEUR' as const },
    { numero: '571', libelle: 'Caisse', classe: 5, type: 'BILAN' as const, nature: 'ACTIF' as const, sens: 'DEBITEUR' as const },
    { numero: '6', libelle: 'COMPTES DE CHARGES DES ACTIVITÉS ORDINAIRES', classe: 6, type: 'GESTION' as const, nature: 'CHARGE' as const, sens: 'DEBITEUR' as const },
    { numero: '601', libelle: 'Achats de marchandises', classe: 6, type: 'GESTION' as const, nature: 'CHARGE' as const, sens: 'DEBITEUR' as const },
    { numero: '61', libelle: 'Transports', classe: 6, type: 'GESTION' as const, nature: 'CHARGE' as const, sens: 'DEBITEUR' as const },
    { numero: '62', libelle: 'Services extérieurs', classe: 6, type: 'GESTION' as const, nature: 'CHARGE' as const, sens: 'DEBITEUR' as const },
    { numero: '63', libelle: 'Autres services extérieurs', classe: 6, type: 'GESTION' as const, nature: 'CHARGE' as const, sens: 'DEBITEUR' as const },
    { numero: '64', libelle: 'Impôts et taxes', classe: 6, type: 'GESTION' as const, nature: 'CHARGE' as const, sens: 'DEBITEUR' as const },
    { numero: '66', libelle: 'Charges de personnel', classe: 6, type: 'GESTION' as const, nature: 'CHARGE' as const, sens: 'DEBITEUR' as const },
    { numero: '67', libelle: 'Frais financiers', classe: 6, type: 'GESTION' as const, nature: 'CHARGE' as const, sens: 'DEBITEUR' as const },
    { numero: '68', libelle: 'Dotations aux amortissements', classe: 6, type: 'GESTION' as const, nature: 'CHARGE' as const, sens: 'DEBITEUR' as const },
    { numero: '7', libelle: 'COMPTES DE PRODUITS DES ACTIVITÉS ORDINAIRES', classe: 7, type: 'GESTION' as const, nature: 'PRODUIT' as const, sens: 'CREDITEUR' as const },
    { numero: '701', libelle: 'Ventes de marchandises', classe: 7, type: 'GESTION' as const, nature: 'PRODUIT' as const, sens: 'CREDITEUR' as const },
    { numero: '706', libelle: 'Services vendus - Prestations transit', classe: 7, type: 'GESTION' as const, nature: 'PRODUIT' as const, sens: 'CREDITEUR' as const },
    { numero: '707', libelle: 'Produits accessoires', classe: 7, type: 'GESTION' as const, nature: 'PRODUIT' as const, sens: 'CREDITEUR' as const },
    { numero: '77', libelle: 'Revenus financiers', classe: 7, type: 'GESTION' as const, nature: 'PRODUIT' as const, sens: 'CREDITEUR' as const },
  ];

  for (const compte of planComptable) {
    await prisma.compteComptable.upsert({
      where: {
        societeId_numero: { societeId: societe.id, numero: compte.numero },
      },
      update: {},
      create: {
        societeId: societe.id,
        ...compte,
        niveau: compte.numero.length,
      },
    });
  }

  // Journaux comptables
  const journaux = [
    { code: 'AC', libelle: 'Journal des achats', type: 'ACHAT' as const },
    { code: 'VE', libelle: 'Journal des ventes', type: 'VENTE' as const },
    { code: 'BQ', libelle: 'Journal de banque', type: 'BANQUE' as const },
    { code: 'CA', libelle: 'Journal de caisse', type: 'CAISSE' as const },
    { code: 'OD', libelle: 'Journal des opérations diverses', type: 'OD' as const },
  ];

  for (const journal of journaux) {
    await prisma.journalComptable.upsert({
      where: { societeId_code: { societeId: societe.id, code: journal.code } },
      update: {},
      create: { societeId: societe.id, ...journal },
    });
  }

  // Numérotations
  const numerotations = [
    { module: 'DOSSIER', prefixe: 'DOS' },
    { module: 'FACTURE', prefixe: 'FAC' },
    { module: 'PROFORMA', prefixe: 'PRO' },
    { module: 'AVOIR', prefixe: 'AVR' },
    { module: 'OFFRE', prefixe: 'OFF' },
    { module: 'PAIEMENT', prefixe: 'PAI' },
    { module: 'COURRIER_ENTRANT', prefixe: 'CE' },
    { module: 'COURRIER_SORTANT', prefixe: 'CS' },
    { module: 'AT', prefixe: 'AT' },
    { module: 'CAUTION', prefixe: 'CAU' },
    { module: 'DEPENSE', prefixe: 'DEP' },
  ];

  const annee = new Date().getFullYear();
  for (const num of numerotations) {
    await prisma.numerotation.upsert({
      where: {
        societeId_module_annee: {
          societeId: societe.id,
          module: num.module,
          annee: annee,
        },
      },
      update: {},
      create: {
        societeId: societe.id,
        module: num.module,
        prefixe: num.prefixe,
        compteur: 0,
        longueur: 6,
        annuel: true,
        annee: annee,
        format: '{PREFIX}/{ANNEE}/{COMPTEUR}',
      },
    });
  }

  console.log('✅ Base de données initialisée avec succès!');
  console.log('📧 Comptes de test (mot de passe: Admin@2024!):');
  console.log('   - admin@gbtrans.ci (Administrateur)');
  console.log('   - transitaire@gbtrans.ci (Transitaire)');
  console.log('   - comptable@gbtrans.ci (Comptable)');
  console.log('   - commercial@gbtrans.ci (Commercial)');
  console.log('   - consultation@gbtrans.ci (Consultation)');
}

main()
  .catch((e) => {
    console.error('❌ Erreur lors de l\'initialisation:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

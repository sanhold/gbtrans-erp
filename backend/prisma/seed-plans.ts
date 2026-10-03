/**
 * Formules d'abonnement par defaut. A ajuster librement depuis la base (table `plans`)
 * ou via l'espace super-admin une fois construit.
 * Lancer avec : npx ts-node prisma/seed-plans.ts
 */
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const plans = [
  {
    code: 'STARTER',
    nom: 'Starter',
    description: "Pour un petit bureau de transit qui demarre : dossiers, facturation et suivi de base.",
    prixMensuel: 25000,
    prixAnnuel: 250000,
    devise: 'XOF',
    maxUtilisateurs: 3,
    maxDossiersParMois: 50,
    essaiJours: 14,
    misEnAvant: false,
    ordre: 1,
    fonctionnalites: [
      'Dossiers, offres, proforma et facturation',
      'Jusqu’à 3 utilisateurs',
      '50 dossiers par mois',
      'Gestion AT et cautions',
      'Support par email',
    ],
  },
  {
    code: 'PRO',
    nom: 'Pro',
    description: "Pour un bureau de transit etabli : comptabilite complete, RH et multi-agences.",
    prixMensuel: 60000,
    prixAnnuel: 600000,
    devise: 'XOF',
    maxUtilisateurs: 10,
    maxDossiersParMois: 300,
    essaiJours: 14,
    misEnAvant: true,
    ordre: 2,
    fonctionnalites: [
      'Tout Starter',
      'Jusqu’à 10 utilisateurs',
      '300 dossiers par mois',
      'Comptabilite SYSCOHADA complete (Auto + Manuelle)',
      'RH et paie',
      'Multi-agences',
      'Support prioritaire',
    ],
  },
  {
    code: 'BUSINESS',
    nom: 'Business',
    description: "Pour un groupe multi-societes sans limite d’utilisateurs ni de dossiers.",
    prixMensuel: 120000,
    prixAnnuel: 1200000,
    devise: 'XOF',
    maxUtilisateurs: null,
    maxDossiersParMois: null,
    essaiJours: 14,
    misEnAvant: false,
    ordre: 3,
    fonctionnalites: [
      'Tout Pro',
      'Utilisateurs illimites',
      'Dossiers illimites',
      'Multi-societes',
      'Accompagnement a la mise en place',
      'Support dedie',
    ],
  },
];

async function main() {
  for (const plan of plans) {
    await prisma.plan.upsert({
      where: { code: plan.code },
      update: plan,
      create: plan,
    });
  }
  console.log(`${plans.length} formule(s) a jour.`);
}

main().catch(e => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());

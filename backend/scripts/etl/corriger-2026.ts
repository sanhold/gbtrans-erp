/**
 * ETL -> GBTRANS ERP : CORRECTIONS DE LA REPRISE 2026 décidées par le propriétaire.
 *
 *  1. Cinq factures de 2025 dont le TTC a changé en 2026 (FACT2025-2224, -2230, -2231, -2197, -2198) : la version 2026
 *     remplace celle de 2025 (totaux, TVA de prestation et lignes) ; le payé en base est conservé, le reste à payer
 *     et le statut sont recalculés. Un payé supérieur au nouveau TTC est signalé, pas corrigé.
 *  2. Compagnies maritimes des dossiers : les variantes mal orthographiées évidentes sont ramenées à leur forme
 *     correcte (liste fermée ci-dessous). Les autres valeurs restent intactes.
 *
 * Usage (depuis backend/) : DATABASE_URL=<base> npx tsx scripts/etl/corriger-2026.ts [--appliquer] [--societe=ETL]
 * Sans --appliquer : simulation. Base non locale refusée sans ETL_AUTORISER_DISTANT=OUI_PRODUCTION. Relançable.
 * Rapport : logs/etl-2026/corrections-factures.csv et corrections-compagnies.csv.
 */
import 'dotenv/config';
import * as fs from 'fs';
import * as path from 'path';
import { PrismaClient } from '@prisma/client';
import { str, num, cut, lire } from './commun';

const args = process.argv.slice(2);
const APPLIQUER = args.includes('--appliquer');
const opt = (nom: string, defaut: string) => args.find((a) => a.startsWith(`--${nom}=`))?.split('=').slice(1).join('=') ?? defaut;
const CODE_SOCIETE = opt('societe', 'ETL');
const DIR26 = opt('dir2026', 'C:\\Users\\SANOGO\\Desktop\\ETL 2026');
const SORTIE = path.resolve(__dirname, '..', '..', 'logs', 'etl-2026');
const FACTURES = ['FACT2025-2224', 'FACT2025-2230', 'FACT2025-2231', 'FACT2025-2197', 'FACT2025-2198'];
const COMPAGNIES: Record<string, string> = {
  GRIAMLDI: 'GRIMALDI', GRIMADI: 'GRIMALDI', GRILMALDI: 'GRIMALDI', ARKHAS: 'ARKAS', 'ARKAS LINE': 'ARKAS', MAESK: 'MAERSK',
  'OMA CI': 'OMA', 'CMA-CGM': 'CMA CGM', ONE: 'ONE', 'HAPAG-LLOYD': 'HAPAG LLOYD', 'DIAMOND SHIPING': 'DIAMOND SHIPPING',
};

const prisma = new PrismaClient();
const fmt = (n: number) => Math.round(n).toLocaleString('fr-FR').replace(/\u202f/g, ' ');
function garde() {
  const url = process.env.DATABASE_URL || '';
  const m = url.match(/@([^:/]+)(?::\d+)?\/([^?]+)/); const hote = m?.[1] ?? '?';
  console.log(`Base cible : ${hote} / ${m?.[2] ?? '?'}  (${APPLIQUER ? 'ÉCRITURE' : 'simulation, aucune écriture'})`);
  if (!['localhost', '127.0.0.1', '::1'].includes(hote) && process.env.ETL_AUTORISER_DISTANT !== 'OUI_PRODUCTION') {
    console.error(`REFUS : la base ${hote} n'est pas locale. Définir ETL_AUTORISER_DISTANT=OUI_PRODUCTION après sauvegarde.`); process.exit(1);
  }
}
const csv = (nom: string, entete: string[], lignes: (string | number)[][]) => {
  fs.mkdirSync(SORTIE, { recursive: true });
  const esc = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
  fs.writeFileSync(path.join(SORTIE, nom), '\ufeff' + [entete, ...lignes].map((l) => l.map(esc).join(';')).join('\r\n'));
};

async function main() {
  garde();
  const societe = await prisma.societe.findUnique({ where: { code: CODE_SOCIETE } });
  if (!societe) { console.error(`Société « ${CODE_SOCIETE} » introuvable.`); process.exit(1); }
  const societeId = societe.id;

  // ---------- 1. Factures dont le TTC a changé ----------
  const facs6 = lire(DIR26, 'FACTURE2026'); const det6 = lire(DIR26, 'DETAIL FACTURE 2026');
  const lignesF: (string | number)[][] = []; let nbMaj = 0;
  for (const numero of FACTURES) {
    const src = facs6.find((r) => str(r.NumFact) === numero);
    const fac = await prisma.facture.findFirst({ where: { societeId, numero }, include: { lignes: { select: { id: true } } } });
    if (!src || !fac) { console.log(`  ${numero} : introuvable (${src ? 'en base' : 'dans le fichier 2026'}), ignorée`); continue; }
    const ttc = num(src.TotalTTC); const ancien = Number(fac.montantTTC); const paye = Number(fac.montantPaye);
    const lignes = det6.filter((r) => str(r.NumFact) === numero)
      .sort((a, b) => num(a.NumOrdreCat) - num(b.NumOrdreCat) || num(a.NumOrdreDetail) - num(b.NumOrdreDetail) || num(a.NumOrdre) - num(b.NumOrdre));
    const dejaFait = Math.abs(ancien - ttc) <= 1 && fac.lignes.length === lignes.length;
    const reste = ttc - paye; const surpaye = paye > ttc + 1;
    const statut = fac.statut === 'ANNULEE' ? 'ANNULEE' : Math.abs(reste) <= 1 && ttc !== 0 ? 'PAYEE' : paye > 0 ? 'PARTIELLEMENT_PAYEE' : 'VALIDEE';
    lignesF.push([numero, ancien, ttc, ttc - ancien, fac.lignes.length, lignes.length, paye, reste, statut, dejaFait ? 'déjà appliquée' : surpaye ? 'PAYÉ SUPÉRIEUR AU NOUVEAU TTC : à vérifier' : 'appliquée']);
    console.log(`  ${numero} : TTC ${fmt(ancien)} -> ${fmt(ttc)} (${ttc - ancien >= 0 ? '+' : ''}${fmt(ttc - ancien)}), lignes ${fac.lignes.length} -> ${lignes.length}, payé ${fmt(paye)}${surpaye ? '  ** payé supérieur au nouveau TTC **' : ''}${dejaFait ? '  (déjà appliquée)' : ''}`);
    if (dejaFait) continue;
    nbMaj++;
    if (!APPLIQUER) continue;
    await prisma.$transaction([
      prisma.ligneFacture.deleteMany({ where: { factureId: fac.id } }),
      prisma.ligneFacture.createMany({ data: lignes.map((r, i) => { const m = num(r.Montant); const tva = num(r.EtatTVA) === 1; return { factureId: fac.id, ordre: i + 1, categorie: cut(str(r.Categorie), 100), codePrestation: cut(str(r.Code), 50), designation: cut(str(r['Libellé']) ?? '-', 500)!, estTVA: tva, quantite: 1, prixUnitaire: m, montantHT: tva ? 0 : m, tauxTVA: tva ? 18 : 0, montantTVA: tva ? m : 0 }; }) }),
      prisma.facture.update({ where: { id: fac.id }, data: { montantHT: num(src.TotalHT), montantTVA: num(src.TotalTVA), montantTTC: ttc, resteAPayer: reste, statut: statut as any, montantPrestation: num(src.MontantPrestation) || null, tvaPrestation: num(src.TVAPrestation) || null } }),
    ]);
  }
  csv('corrections-factures.csv', ['facture', 'TTC avant', 'TTC après', 'écart', 'lignes avant', 'lignes après', 'payé en base', 'reste après', 'statut', 'résultat'], lignesF);
  console.log(`  factures corrigées : ${nbMaj}`);

  // ---------- 2. Compagnies maritimes ----------
  const dossiers = await prisma.dossier.findMany({ where: { societeId, compagnieMaritime: { not: null } }, select: { id: true, numero: true, compagnieMaritime: true } });
  const lignesC: (string | number)[][] = []; const parVariante = new Map<string, number>();
  const aChanger = new Map<string, string[]>(); // nouvelle valeur -> ids
  for (const d of dossiers) {
    const brute = d.compagnieMaritime!.trim(); const cible = COMPAGNIES[brute.toUpperCase()];
    if (!cible || cible === brute) continue;
    lignesC.push([d.numero, brute, cible]); parVariante.set(`${brute} -> ${cible}`, (parVariante.get(`${brute} -> ${cible}`) ?? 0) + 1);
    aChanger.set(cible, [...(aChanger.get(cible) ?? []), d.id]);
  }
  if (APPLIQUER) for (const [cible, ids] of aChanger) for (let i = 0; i < ids.length; i += 1000) await prisma.dossier.updateMany({ where: { id: { in: ids.slice(i, i + 1000) } }, data: { compagnieMaritime: cible } });
  csv('corrections-compagnies.csv', ['dossier', 'avant', 'après'], lignesC);
  console.log(`  compagnies : ${lignesC.length} dossiers ${APPLIQUER ? 'corrigés' : 'à corriger'}`);
  [...parVariante].sort((a, b) => b[1] - a[1]).forEach(([k, n]) => console.log(`    ${k} : ${n}`));
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());

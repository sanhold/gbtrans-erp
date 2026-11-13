/**
 * ROUTE TEMPORAIRE — transfert des données de l'ancienne base vers la nouvelle.
 * À SUPPRIMER après usage (voir commit de retrait). Protégée par MIGRATION_SECRET (en-tête x-migration-secret).
 *   GET  /api/migrer            -> inspection en lecture seule (schémas + comptages)
 *   POST /api/migrer?executer=oui -> remplace les données de la nouvelle base (une seule transaction)
 * Variables : ANCIENNE_URL, NOUVELLE_URL (session pooler, port 5432), MIGRATION_SECRET.
 */
import type { IncomingMessage, ServerResponse } from 'http';
import crypto from 'crypto';
import { PrismaClient } from '@prisma/client';

const LOT = 500;

function secretOk(req: IncomingMessage): boolean {
  const attendu = process.env.MIGRATION_SECRET || '';
  const fourni = String(req.headers['x-migration-secret'] || '');
  if (attendu.length < 16 || fourni.length !== attendu.length) return false;
  return crypto.timingSafeEqual(Buffer.from(fourni), Buffer.from(attendu));
}

const q = (s: string) => `"${s.replace(/"/g, '""')}"`;

async function tables(db: PrismaClient): Promise<string[]> {
  const r = await db.$queryRawUnsafe<{ t: string }[]>(
    `select tablename as t from pg_tables where schemaname='public' and tablename<>'_prisma_migrations' order by 1`);
  return r.map((x) => x.t);
}

async function colonnes(db: PrismaClient): Promise<string[]> {
  const r = await db.$queryRawUnsafe<{ c: string }[]>(
    `select table_name||'.'||column_name||' '||data_type as c from information_schema.columns
     where table_schema='public' and table_name<>'_prisma_migrations' order by 1`);
  return r.map((x) => x.c);
}

async function compter(db: PrismaClient, t: string): Promise<number> {
  const r = await db.$queryRawUnsafe<{ n: bigint }[]>(`select count(*)::bigint as n from public.${q(t)}`);
  return Number(r[0].n);
}

function repondre(res: ServerResponse, code: number, corps: unknown) {
  res.statusCode = code;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(corps));
}

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  if (!secretOk(req)) return repondre(res, 401, { erreur: 'Non autorisé' });
  const urlAnc = process.env.ANCIENNE_URL, urlNouv = process.env.NOUVELLE_URL;
  if (!urlAnc || !urlNouv) return repondre(res, 500, { erreur: 'ANCIENNE_URL / NOUVELLE_URL manquantes' });

  const ancien = new PrismaClient({ datasourceUrl: urlAnc });
  const nouveau = new PrismaClient({ datasourceUrl: urlNouv });
  try {
    const [ca, cn] = [await colonnes(ancien), await colonnes(nouveau)];
    const sa = new Set(ca), sn = new Set(cn);
    const diff = [...ca.filter((x) => !sn.has(x)).map((x) => `ancienne seulement: ${x}`),
                  ...cn.filter((x) => !sa.has(x)).map((x) => `nouvelle seulement: ${x}`)];
    const tabs = await tables(ancien);
    const executer = req.method === 'POST' && (req.url || '').includes('executer=oui');

    if (!executer) {
      const comptages = [];
      for (const t of tabs) comptages.push({ table: t, ancienne: await compter(ancien, t), nouvelle: await compter(nouveau, t) });
      return repondre(res, 200, { schemasIdentiques: diff.length === 0, diff: diff.slice(0, 40), comptages });
    }

    if (diff.length) return repondre(res, 409, { erreur: 'Schémas différents, rien modifié', diff: diff.slice(0, 40) });
    const debut = Date.now();
    const bilan: { table: string; ancienne: number; nouvelle: number }[] = [];

    await nouveau.$transaction(async (tx) => {
      await tx.$executeRawUnsafe(`SET LOCAL session_replication_role = replica`);
      await tx.$executeRawUnsafe(`TRUNCATE ${tabs.map((t) => `public.${q(t)}`).join(', ')} RESTART IDENTITY CASCADE`);
      for (const t of tabs) {
        const total = await compter(ancien, t);
        for (let off = 0; off < total; off += LOT) {
          const r = await ancien.$queryRawUnsafe<{ j: unknown }[]>(
            `select coalesce(jsonb_agg(to_jsonb(x)), '[]'::jsonb) as j
             from (select * from public.${q(t)} order by ctid limit ${LOT} offset ${off}) x`);
          await tx.$executeRawUnsafe(
            `insert into public.${q(t)} select * from jsonb_populate_recordset(null::public.${q(t)}, $1::jsonb)`,
            JSON.stringify(r[0].j));
        }
        const apres = Number((await tx.$queryRawUnsafe<{ n: bigint }[]>(`select count(*)::bigint as n from public.${q(t)}`))[0].n);
        bilan.push({ table: t, ancienne: total, nouvelle: apres });
        if (apres !== total) throw new Error(`Écart sur ${t}: ${total} -> ${apres}`);
      }
      // Séquence du numéro de caution (seule colonne autoincrement)
      await tx.$executeRawUnsafe(
        `select setval(pg_get_serial_sequence('public.cautions','numero'), coalesce((select max(numero) from public.cautions),0)+1, false)`);
    }, { timeout: 55_000, maxWait: 10_000 });

    return repondre(res, 200, { ok: true, dureeMs: Date.now() - debut, bilan });
  } catch (e: any) {
    return repondre(res, 500, { erreur: e.message });
  } finally {
    await ancien.$disconnect(); await nouveau.$disconnect();
  }
}

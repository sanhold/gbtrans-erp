# GBTRANS ERP

Solution ERP complète pour la gestion d'un bureau de transit, douane et logistique en Côte d'Ivoire (conforme OHADA / DGI / Douanes CI / UEMOA).

## Stack technique

| Composant        | Technologie              |
|------------------|---------------------------|
| Frontend Web     | Next.js 14 (App Router) + React + TypeScript + Tailwind CSS |
| Backend API      | Express + TypeScript      |
| ORM              | Prisma 5                  |
| Base de données  | PostgreSQL 16             |
| Auth             | JWT + bcrypt + TOTP (2FA) |
| Mobile           | React Native (`mobile/`, en développement) |

## Structure du projet

```
GBTRANS ERP/
├── backend/          API Express + Prisma (port 4001 en dev)
│   ├── prisma/        schema.prisma, migrations/, scripts de seed
│   └── src/            modules métier (routes/controller/service par domaine)
├── frontend/         App Next.js (port 3000 en dev)
│   └── src/app/        pages (App Router), components/, lib/, stores/
├── docker/           docker-compose.yml (Postgres, Redis, build prod)
├── docs/             Architecture, guides, schémas UML
└── mobile/           App React Native (embryonnaire)
```

## Démarrage rapide (développement local)

### Prérequis
- Node.js 18+
- PostgreSQL 16 (local ou via `docker/docker-compose.yml`)

### 1. Installer les dépendances

```bash
cd backend && npm install
cd ../frontend && npm install
```

> ⚠️ Il n'y a pas de `node_modules`/`package-lock.json` à la racine et `package.json` (racine) n'y déclare pas de champ `"workspaces"`. Les scripts `npm run dev` etc. à la racine ne fonctionnent donc pas tels quels — installez et lancez chaque app **séparément** depuis son propre dossier (voir plus bas).

### 2. Configurer les variables d'environnement

```bash
cp backend/.env.example backend/.env
```

Valeurs vérifiées fonctionnelles en local (voir [Variables d'environnement](#variables-denvironnement)) :

```env
DATABASE_URL="postgresql://postgres:VOTRE_MDP@localhost:5432/gbtrans_erp?schema=public"
PORT=4001
CORS_ORIGIN=http://localhost:3000
```

Le frontend appelle l'API sur `http://localhost:4001/api/v1` (voir `frontend/.env.local` et `frontend/next.config.js`). **Le port backend doit être 4001**, pas 3001 — `docs/guides/INSTALLATION.md` est daté sur ce point.

### 3. Base de données

```bash
createdb gbtrans_erp   # ou via docker/docker-compose.yml

cd backend
npx prisma migrate deploy   # applique les migrations existantes (voir note ci-dessous)
npx prisma generate
npx tsx prisma/seed.ts          # données de base (société, profils, admin)
npx tsx prisma/seed-demo.ts     # données de démonstration (clients, dossiers, factures...)
```

### 4. Lancer les serveurs (deux terminaux séparés)

```bash
# Terminal 1
cd backend && npm run dev      # http://localhost:4001

# Terminal 2
cd frontend && npm run dev     # http://localhost:3000
```

### 5. Connexion

- Email : `admin@gbtrans.ci`
- Mot de passe : `Admin@2024!` (**développement local uniquement** ; en production, définir `SEED_PASSWORD` avant le seed et changer ce mot de passe)

## Scripts utiles

**Backend** (`cd backend`) :

| Commande | Effet |
|---|---|
| `npm run dev` | Démarre l'API en watch mode (tsx) |
| `npm run build` / `npm run start` | Build puis run en production |
| `npm run db:migrate` | `prisma migrate dev` (⚠️ interactif, voir note ci-dessous) |
| `npm run db:seed` | Rejoue `prisma/seed.ts` |
| `npm run db:studio` | Ouvre Prisma Studio |
| `npx tsx prisma/seed-demo.ts` | Réinjecte un jeu de données de démo complet (clients, dossiers, factures, paiements, AT, cautions, courriers, dépenses) |

Scripts ponctuels déjà utilisés pendant le développement (à adapter avant réemploi, ils sont **destructifs** sur les dossiers) :

| Script | Effet |
|---|---|
| `prisma/reset-dossiers-50.ts` | Supprime **tous** les dossiers/factures/proformas liés et recrée exactement 50 dossiers 2026 numérotés proprement |
| `prisma/add-articles-existing-dossiers.ts` | Ajoute 1 à 4 articles réalistes aux dossiers qui n'en ont pas encore (non destructif, sûr à relancer) |

**Frontend** (`cd frontend`) : `npm run dev`, `npm run build`, `npm run lint`.

## Variables d'environnement

Voir `backend/.env.example` pour la liste complète (SMTP, Mobile Money, chiffrement...). Les indispensables en dev :

| Variable | Rôle |
|---|---|
| `DATABASE_URL` | Connexion PostgreSQL |
| `PORT` | Port de l'API — **4001** en local (le frontend est câblé dessus) |
| `JWT_SECRET` / `JWT_EXPIRES_IN` | Signature des tokens de session |
| `CORS_ORIGIN` | Doit correspondre au port réel du frontend (`http://localhost:3000` en dev) |

Côté frontend : `frontend/.env.local` → `NEXT_PUBLIC_API_URL=http://localhost:4001/api/v1`.

## Base de données / Prisma — points d'attention

- **`prisma migrate dev` refuse de s'exécuter dans un terminal non interactif** (CI, agents). Alternative fiable :
  ```bash
  npx prisma migrate diff --from-url "$DATABASE_URL" --to-schema-datamodel prisma/schema.prisma --script > prisma/migrations/<horodatage>_<nom>/migration.sql
  npx prisma migrate deploy
  ```
- Sur Windows, **arrêtez le serveur backend avant `npx prisma generate`** : le moteur Prisma (`query_engine-windows.dll.node`) reste verrouillé tant que `tsx watch` tourne, et la régénération échoue avec `EPERM`.
- `prisma/migrations/` est versionné dans le dépôt (ne pas l'ignorer).

## Conventions métier notables

- **N° Dossier** : généré automatiquement, format `DOS/{année}/{compteur sur 6 chiffres}`.
- **N° Physique** (référence papier attribuée par l'utilisateur) : format `LETTRE-NN/ANNÉE` selon la nature du dossier — `I` Import, `E` Export, `T` Transit, `R` Réexport, `C` Cabotage, `TB` Transbordement. Pré-rempli automatiquement (compteur par nature) mais modifiable ; unique par société.

## Frontend — design system

- Palette violette + accent teal définie dans `frontend/tailwind.config.js` (`primary`, `accent`, `amber`, `surface`).
- Layout commun : `components/layout/Sidebar.tsx`, `Header.tsx`, `AppLayout.tsx`.
- Mode sombre : classe `dark` togglée sur `<html>` (pas de persistance en `localStorage` actuellement).

## Déploiement : test puis production

| Environnement | Branche | Adresse |
|---|---|---|
| **Test** | `test` | https://gbtrans-git-test-sanhold-projects.vercel.app (déployée par Vercel à chaque commit sur `test`) |
| **Production** | `master` | https://gbtrans.vercel.app (frontend, Vercel) + service `gbtrans-erp-backend` (Render) |

Règle de travail :

1. Les changements sont d'abord fusionnés dans **`test`** (PR vers `test`) et vérifiés sur l'adresse de test.
2. On ne fusionne `test` dans **`master`** qu'**après validation explicite** : la fusion dans `master` déclenche le déploiement en production (Vercel et Render).
3. La CI (build + tests) tourne sur les PR et sur les pushs vers `master` et `test`.

⚠️ **Limite** : le backend (Render) et la base de données n'existent qu'une fois. Le frontend de test appelle donc le **backend de production** (voir `ORIGINE_PREVISUALISATION` dans `backend/src/app.ts`) : seuls les changements de frontend se testent avant la production, un changement de backend ou de base part directement en production à la fusion dans `master`, et les données créées pendant un test sont de vraies données. Pour tester le backend à part, il faudrait un second service Render et une base de test séparée.

## Documentation complémentaire

- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — architecture 3 couches, liste des modules
- [`docs/guides/INSTALLATION.md`](docs/guides/INSTALLATION.md) — guide d'installation (ports à corriger, voir plus haut)
- [`docs/uml/diagrammes.md`](docs/uml/diagrammes.md) — diagrammes UML

## Limitations connues

- Quelques erreurs TypeScript préexistantes non bloquantes (`req.params: string | string[]` sur plusieurs routes Express) — n'empêchent pas l'exécution, à corriger un jour en durcissant le typage des routes.
- `npm run dev` / `build` à la racine ne sont pas fonctionnels tant que le monorepo npm workspaces n'est pas configuré (voir section Démarrage rapide).

## Déploiement du backend sur Vercel (alternative à Render)

Le backend peut tourner comme fonction serverless Vercel (`backend/api/index.ts`, `backend/vercel.json`). Render reste pris en charge (`src/server.ts`) : rien n'est cassé.

1. Créer un **second projet Vercel** sur ce dépôt, *Root Directory* = `backend`. Plan Hobby possible pour tester (cron quotidien max, usage non commercial) ; **Pro** requis pour un usage commercial.
2. Région des fonctions : `dub1` (Dublin), proche de la base Supabase `eu-west-1` (déjà fixée dans `vercel.json`).
3. Variables d'environnement :

| Variable | Valeur |
|---|---|
| `DATABASE_URL` | Pooler transactionnel Supabase : `postgresql://postgres.<ref>:<mdp>@aws-X-eu-west-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1` |
| `JWT_SECRET`, `ENCRYPTION_KEY`, `CORS_ORIGIN`, … | comme sur Render |
| `CRON_SECRET` | secret aléatoire ; Vercel Cron l'envoie en `Authorization: Bearer` (sauvegardes planifiées une fois par jour à 02 h UTC ; le plan Hobby n'autorise pas plus) |
| `SUPABASE_URL`, `SUPABASE_SERVICE_KEY` | stockage des documents (bucket privé `documents`, nom modifiable par `SUPABASE_STORAGE_BUCKET`) — **obligatoire**, le disque Vercel est éphémère |
| `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` | limitation des tentatives de connexion partagée entre instances (recommandé ; sinon mémoire par instance) |

4. Les migrations Prisma ne s'exécutent pas au build Vercel (le pooler ne le permet pas) : les appliquer avec `prisma migrate deploy` via la connexion directe/session.
5. Pointer `NEXT_PUBLIC_API_URL` du frontend vers l'URL du nouveau projet backend (`…/api/v1`).

Sur Vercel, les journaux vont à la console, et les caches mémoire (session, tableaux de bord) sont désactivés car non partageables entre instances.

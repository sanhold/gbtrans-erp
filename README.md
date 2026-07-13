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
- Mot de passe : `Admin@2024!`

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
- `prisma/migrations/` est exclu du dépôt par `.gitignore` — à vérifier/adapter selon vos besoins d'équipe (généralement les migrations devraient être versionnées).

## Conventions métier notables

- **N° Dossier** : généré automatiquement, format `DOS/{année}/{compteur sur 6 chiffres}`.
- **N° Physique** (référence papier attribuée par l'utilisateur) : format `LETTRE-NN/ANNÉE` selon la nature du dossier — `I` Import, `E` Export, `T` Transit, `R` Réexport, `C` Cabotage, `TB` Transbordement. Pré-rempli automatiquement (compteur par nature) mais modifiable ; unique par société.

## Frontend — design system

- Palette violette + accent teal définie dans `frontend/tailwind.config.js` (`primary`, `accent`, `amber`, `surface`).
- Layout commun : `components/layout/Sidebar.tsx`, `Header.tsx`, `AppLayout.tsx`.
- Mode sombre : classe `dark` togglée sur `<html>` (pas de persistance en `localStorage` actuellement).

## Documentation complémentaire

- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — architecture 3 couches, liste des modules
- [`docs/guides/INSTALLATION.md`](docs/guides/INSTALLATION.md) — guide d'installation (ports à corriger, voir plus haut)
- [`docs/uml/diagrammes.md`](docs/uml/diagrammes.md) — diagrammes UML

## Limitations connues

- Quelques erreurs TypeScript préexistantes non bloquantes (`req.params: string | string[]` sur plusieurs routes Express) — n'empêchent pas l'exécution, à corriger un jour en durcissant le typage des routes.
- `npm run dev` / `build` à la racine ne sont pas fonctionnels tant que le monorepo npm workspaces n'est pas configuré (voir section Démarrage rapide).

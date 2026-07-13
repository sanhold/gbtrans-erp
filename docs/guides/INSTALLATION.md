# GBTRANS ERP - Guide d'Installation

## Prérequis

- Node.js 18+ (LTS recommandé)
- PostgreSQL 16+
- Redis 7+ (optionnel, recommandé pour la production)
- Git
- Docker & Docker Compose (optionnel)

## Installation Rapide (Développement)

### 1. Cloner le projet
```bash
git clone <repo-url>
cd "GBTRANS ERP"
```

### 2. Installer les dépendances
```bash
npm install
```

### 3. Configurer l'environnement
```bash
cp backend/.env.example backend/.env
# Éditer backend/.env avec vos paramètres
```

Variables essentielles :
```env
DATABASE_URL=postgresql://gbtrans:password@localhost:5432/gbtrans_erp
JWT_SECRET=votre-secret-jwt-ultra-securise-64-caracteres
PORT=3001
```

### 4. Créer la base de données
```bash
# Avec PostgreSQL installé :
createdb gbtrans_erp

# Ou via Docker :
docker run -d --name gbtrans_pg \
  -e POSTGRES_DB=gbtrans_erp \
  -e POSTGRES_USER=gbtrans \
  -e POSTGRES_PASSWORD=password \
  -p 5432:5432 \
  postgres:16-alpine
```

### 5. Initialiser la base de données
```bash
cd backend
npx prisma generate
npx prisma migrate dev --name init
npx tsx prisma/seed.ts
```

### 6. Lancer le projet
```bash
# Depuis la racine
npm run dev
```

- Backend API : http://localhost:3001
- Frontend Web : http://localhost:3000

### 7. Connexion initiale
- Email : `admin@gbtrans.ci`
- Mot de passe : `Admin@2024!`

## Installation avec Docker

```bash
cd docker
docker-compose up -d
```

## Installation Production

### 1. Build
```bash
npm run build
```

### 2. Variables d'environnement
```env
NODE_ENV=production
DATABASE_URL=postgresql://...
JWT_SECRET=<secret-généré-openssl>
CORS_ORIGIN=https://votre-domaine.ci
```

### 3. Migration production
```bash
cd backend
npx prisma migrate deploy
npx tsx prisma/seed.ts
```

### 4. Démarrer
```bash
npm run start
```

## Sauvegarde

### Automatique
```bash
# Ajouter au crontab
0 2 * * * pg_dump gbtrans_erp | gzip > /backups/gbtrans_$(date +%Y%m%d).sql.gz
```

### Manuelle
```bash
pg_dump -h localhost -U gbtrans gbtrans_erp > backup.sql
```

### Restauration
```bash
psql -h localhost -U gbtrans gbtrans_erp < backup.sql
```

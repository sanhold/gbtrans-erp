# GBTRANS ERP - Architecture Technique

## Vue d'ensemble

GBTRANS ERP est une solution ERP complète pour la gestion de bureaux de transit en Côte d'Ivoire, conforme aux réglementations OHADA, DGI CI, Douanes CI, CEDEAO et UEMOA.

## Architecture 3 Couches

```
┌──────────────────────────────────────────────────┐
│                COUCHE PRÉSENTATION                │
│  ┌──────────┐  ┌──────────┐  ┌──────────────┐   │
│  │ Next.js  │  │  React   │  │ React Native │   │
│  │  (Web)   │  │ (Portal) │  │  (Android)   │   │
│  └──────────┘  └──────────┘  └──────────────┘   │
├────────────────────────────────────────────────── ┤
│                  COUCHE MÉTIER                    │
│  ┌──────────┐  ┌──────────┐  ┌──────────────┐   │
│  │ Express  │  │ Services │  │  Middleware   │   │
│  │  (API)   │  │ (Métier) │  │ (Auth/Audit) │   │
│  └──────────┘  └──────────┘  └──────────────┘   │
├──────────────────────────────────────────────────┤
│              COUCHE ACCÈS DONNÉES                 │
│  ┌──────────┐  ┌──────────┐  ┌──────────────┐   │
│  │  Prisma  │  │PostgreSQL│  │    Redis      │   │
│  │  (ORM)   │  │  (SGBD)  │  │   (Cache)    │   │
│  └──────────┘  └──────────┘  └──────────────┘   │
└──────────────────────────────────────────────────┘
```

## Stack Technologique

| Composant        | Technologie              | Version  |
|------------------|--------------------------|----------|
| Frontend Web     | Next.js + React + TS     | 14.x     |
| UI Framework     | Tailwind CSS             | 3.x      |
| Backend API      | Express + TypeScript     | 4.x      |
| ORM              | Prisma                   | 5.x      |
| Base de données  | PostgreSQL               | 16.x     |
| Cache            | Redis                    | 7.x      |
| Auth             | JWT + bcrypt + TOTP      | -        |
| Mobile           | React Native             | 0.73+    |
| Conteneurisation | Docker + Compose         | -        |
| Documentation    | Swagger/OpenAPI          | 3.0      |

## Modules

### Modules Principaux
1. **Authentification & Sécurité** - JWT, 2FA, RBAC, audit
2. **Dashboard** - KPIs, graphiques, alertes temps réel
3. **Dossiers** - Gestion complète du cycle de transit
4. **Clients** - CRM avec historique complet
5. **Fournisseurs** - Gestion prestataires et partenaires

### Modules Commerciaux
6. **Offres Commerciales** - Création, versioning, transformation
7. **Proformas** - Calculs automatiques, validation
8. **Facturation** - Factures, avoirs, paiements, QR Code

### Modules Finance
9. **Comptabilité** - SYSCOHADA Révisé, journaux, écritures
10. **Finance** - Caisse, banque, rapprochement

### Modules Métier Transit
11. **Admissions Temporaires** - Suivi, alertes, apurement
12. **Cautions** - Gestion complète avec alertes
13. **Courriers** - Entrants, sortants, classement

### Modules Support
14. **Archives/GED** - Documents, OCR, versioning
15. **Notifications** - Multi-canal (App, Email, SMS, WhatsApp)
16. **Statistiques** - Rapports, exports, BI
17. **Paramètres** - Configuration complète

## Base de Données

### Tables principales (40+ tables)
- societes, agences
- utilisateurs, profils, permissions, sessions
- dossiers, conteneurs, historique_dossiers
- clients, contacts_clients
- fournisseurs, contacts_fournisseurs
- offres_commerciales, lignes_offres
- proformas, lignes_proformas
- factures, lignes_factures, factures_fournisseurs
- paiements, paiements_factures
- exercices, comptes_comptables, journaux_comptables
- ecritures_comptables, mouvements_comptables
- comptes_bancaires, caisses, operations_financieres
- admissions_temporaires, alertes_at
- cautions, alertes_cautions
- courriers, pieces_jointes_courriers
- documents
- notifications
- numerotations, parametres
- transactions_mobile_money
- journal_audit, historique_connexions

### Optimisations Performance
- Index composites sur toutes les clés de recherche
- Partitionnement prévu pour tables > 1M lignes
- Requêtes optimisées avec Prisma
- Connection pooling via PgBouncer
- Cache Redis pour données fréquentes

## Sécurité

- Authentification JWT avec expiration
- Double authentification TOTP
- Contrôle d'accès RBAC (Rôle Based Access Control)
- Protection rate limiting
- Helmet (headers sécurité)
- CORS configuré
- Journal d'audit complet
- Verrouillage compte après 5 tentatives
- Expiration mot de passe (90 jours)
- Protection SQL injection (Prisma ORM)
- Chiffrement des données sensibles

## API REST

- Préfixe: `/api/v1`
- Format: JSON
- Auth: Bearer Token (JWT)
- Pagination: offset/limit
- Documentation: Swagger/OpenAPI
- Codes de réponse standards HTTP

## Déploiement

### Local / Réseau
- Installation Windows native
- Docker Compose

### Cloud
- AWS / Azure / OCI
- Kubernetes ready

### Performances Cibles
- 100-1000 utilisateurs simultanés
- 1M+ dossiers
- Temps de réponse < 2 secondes

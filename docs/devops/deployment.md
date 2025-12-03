# 🚀 Guide de Déploiement - Backend NestJS

## Vue d'ensemble du workflow

Ce projet utilise un pipeline CI/CD automatisé avec GitHub Actions pour construire, tester et déployer l'application backend NestJS avec base de données PostgreSQL externe.

## 🔄 Workflow de déploiement

### 1. Déclenchement automatique

Le pipeline CICD unifié se déclenche automatiquement sur :
- **Pull Requests** → Build + Tests + Image `unstable` + Rapport PR
- **Pull Requests avec `[DEPLOY]`** → Build + Tests + Image `unstable` + Déploiement PREPROD + Rapport PR
- **Push sur `main`** → Build + Tests + Image `PREPROD` + Déploiement PREPROD
- **Tags `vXX.YY.ZZ`** → Build + Tests + Image `RELEASE` + Déploiement PROD

### 2. Étapes du pipeline optimisé

```mermaid
graph TD
    A[Code Push/PR] --> B[Trigger CICD]
    B --> C[Build NestJS]
    C --> D{Build réussi?}
    D -->|Oui| E[ESLint]
    D -->|Oui| F[Tests + PostgreSQL]
    D -->|Oui| G[Semgrep Security]
    D -->|Non| O[PR Report]
    E --> H{Tous les scans OK?}
    F --> H
    G --> H
    H -->|Oui| I[Docker Build]
    H -->|Non| O[PR Report]
    I --> J[Push Image]
    J --> K{Type de build}
    K -->|PR avec DEPLOY| L[Deploy PREPROD]
    K -->|main| M[Deploy PREPROD]
    K -->|tag v*| N[Deploy PROD]
    K -->|PR| O[PR Report]
    L --> O
    M --> P[Workflow Status]
    N --> P
    O --> P
    
    style A fill:#e1f5fe
    style B fill:#f3e5f5
    style C fill:#fff3e0
    style D fill:#ffecb3
    style H fill:#ffecb3
    style I fill:#fff3e0
    style J fill:#e8f5e8
    style K fill:#fce4ec
    style L fill:#ffeb3b
    style M fill:#ffeb3b
    style N fill:#4caf50
    style O fill:#e3f2fd
    style P fill:#f3e5f5
```

### 3. Types d'images Docker

| Contexte | Tag | Description |
|----------|-----|-------------|
| **Pull Request** | `unstable` | Version de test |
| **Pull Request avec [DEPLOY]** | `unstable` | Version de test + Déploiement PREPROD |
| **Branche main** | `PREPROD` | Pré-production + Déploiement PREPROD |
| **Tag vXX.YY.ZZ** | `RELEASE` | Version de production + Déploiement PROD |

### 4. Déploiement sur demande

Pour déclencher un déploiement PREPROD depuis une Pull Request, ajoutez `[DEPLOY]` dans le titre :

**Exemples de titres valides :**
- `[DEPLOY] Ajout de nouvelles fonctionnalités API`
- `Feature: Nouvelle route utilisateurs [DEPLOY]`
- `[DEPLOY] Fix: Correction du bug d'authentification`

**Avantages :**
- Test en PREPROD avant merge sur main
- Validation rapide des changements
- Déploiement contrôlé par l'équipe

### 5. Déploiement PROD

**Déclenchement :** Push de tag `vX.Y.Z`

**Processus :**
1. ✅ Vérification des conditions CI (build, lint, tests, semgrep)
2. 🔧 Mise à jour configuration Coolify PROD
3. 🐳 Configuration de l'image Docker
4. 🚀 Lancement du déploiement
5. ⏳ Suivi en temps réel (max 10min)
6. ✅ Validation du déploiement
7. 🗄️ Exécution des migrations Prisma si nécessaire

**Configuration :**
- **Image :** `ghcr.io/teamdivergentes/website_backend/dvg_web_backend`
- **Tag :** `RELEASE` (version + SHA)
- **Environnement :** Production
- **URL :** https://api.teamdivergentes.fr
- **Base de données :** PostgreSQL externe (Coolify)

**Gestion d'erreurs :**
- Timeout après 10 minutes
- Retry automatique en cas d'échec temporaire
- Logs détaillés pour le debugging

## 🐳 Utilisation des images Docker

### Récupérer une image

```bash
# Image spécifique (par commit)
docker pull ghcr.io/teamdivergentes/website_backend/dvg_web_backend:COMMIT_SHA

# Image par type de build
docker pull ghcr.io/teamdivergentes/website_backend/dvg_web_backend:unstable
docker pull ghcr.io/teamdivergentes/website_backend/dvg_web_backend:dev
docker pull ghcr.io/teamdivergentes/website_backend/dvg_web_backend:PREPROD
docker pull ghcr.io/teamdivergentes/website_backend/dvg_web_backend:RELEASE

# Versions spécifiques avec SHA
docker pull ghcr.io/teamdivergentes/website_backend/dvg_web_backend:1.0.0-unstable-abc1234
docker pull ghcr.io/teamdivergentes/website_backend/dvg_web_backend:1.0.0-PREPROD-abc1234
docker pull ghcr.io/teamdivergentes/website_backend/dvg_web_backend:1.0.0-RELEASE
```

### Lancer l'application

```bash
# Lancer l'image avec variables d'environnement
docker run -d -p 3000:3000 \
  -e DATABASE_URL="postgresql://user:pass@host:5432/db" \
  -e JWT_SECRET="your-secret-key" \
  -e NODE_ENV="production" \
  --name backend \
  ghcr.io/teamdivergentes/website_backend/dvg_web_backend:PREPROD

# Accéder à l'API
curl http://localhost:3000/health
```

### Commandes utiles

```bash
# Voir les logs
docker logs backend

# Exécuter les migrations Prisma
docker exec -it backend npx prisma migrate deploy

# Accéder au container
docker exec -it backend sh

# Arrêter l'application
docker stop backend

# Redémarrer l'application
docker restart backend

# Supprimer l'application
docker rm backend
```

## 🔧 Déploiement automatique

### Environnements

- **PREPROD** : Déploiement automatique sur `main`
- **PROD** : Déploiement automatique sur les tags `vXX.YY.ZZ`

### Configuration requise

Les secrets suivants doivent être configurés dans GitHub :

| Secret | Description |
|--------|-------------|
| `COOLIFY_URL` | URL de votre instance Coolify |
| `COOLIFY_API_KEY` | Clé API Coolify |
| `COOLIFY_APPID_PREPROD_BACKEND` | ID de l'app PREPROD |
| `COOLIFY_APPID_PROD_BACKEND` | ID de l'app PROD |
| `SEMGREP_APP_TOKEN` | Token Semgrep pour analyse sécurité |

### Configuration Coolify

#### PostgreSQL externe

1. Créer une ressource PostgreSQL dans Coolify
2. Noter l'URL de connexion fournie
3. Configurer dans les variables d'environnement de l'app

#### Variables d'environnement requises

```env
DATABASE_URL=postgresql://user:password@host:5432/database
JWT_SECRET=your-super-secret-key
JWT_EXPIRES_IN=3h
NODE_ENV=production
PORT=3000
ALLOWED_ORIGINS=https://yourdomain.com
RATE_LIMIT_MAX=100
LOG_LEVEL=info
```

## 📊 Monitoring et rapports

### Rapports automatiques

- **Pull Requests** : Rapport détaillé avec statuts et commandes Docker
- **Logs** : Disponibles dans l'onglet "Actions" de GitHub
- **Health Check** : Endpoint `/health` pour monitoring

### Informations de build

Chaque build génère :
- ✅ Statut des tests (Build, Lint, Tests, Semgrep)
- 🐳 Tags Docker (spécifique + workflow)
- 🚀 Statuts de déploiement (PREPROD, PROD)
- 📅 Date/heure du build
- 👤 Utilisateur qui a déclenché
- 🔗 Liens vers la documentation

### Rapport PR enrichi

Le rapport PR inclut :
- **Tableau complet** : Tous les statuts (Build, Lint, Tests, Semgrep, Docker, Déploiements)
- **Section déploiement** : Statuts en temps réel avec icônes appropriées
- **URLs des environnements** : Liens directs vers PREPROD et PROD
- **Instructions [DEPLOY]** : Guide pour déclencher les déploiements
- **Configuration BDD** : Rappels pour la base de données externe
- **Sections repliables** : Interface propre et organisée

## 🗄️ Base de données PostgreSQL

### Configuration

La base de données est **externe** au container Docker :
- Une instance PostgreSQL par environnement (PREPROD/PROD)
- Configuration dans Coolify
- URL de connexion via variable `DATABASE_URL`

### Migrations Prisma

Après chaque déploiement :

```bash
# Accéder au container
docker exec -it <container-name> sh

# Exécuter les migrations
npx prisma migrate deploy

# Vérifier le statut
npx prisma migrate status
```

### Prisma Studio (développement)

```bash
npx prisma studio
```

## 🛠️ Développement local

### Prérequis

- Node.js 20+
- PostgreSQL 17+
- Docker (optionnel)

### Commandes de développement

```bash
# Installation
npm install

# Générer Prisma Client
npx prisma generate

# Migrations
npx prisma migrate dev

# Développement
npm run start:dev

# Build
npm run build

# Tests
npm run test
npm run test:e2e
npm run lint
```

### Docker local

```bash
# Construire l'image localement
docker build -t dvg-backend:local .

# Lancer avec PostgreSQL
docker run -d -p 3000:3000 \
  -e DATABASE_URL="postgresql://..." \
  -e JWT_SECRET="local-secret" \
  --name dvg-backend \
  dvg-backend:local
```

## 🔍 Dépannage

### Problèmes courants

1. **Build échoue** : Vérifiez les logs dans GitHub Actions
2. **Tests échouent** : Vérifiez la connexion PostgreSQL de test
3. **Image non trouvée** : Vérifiez que le job Docker s'est exécuté
4. **Déploiement échoue** : Vérifiez les secrets Coolify
5. **Health check échoue** : Vérifiez `DATABASE_URL` et la connexion PostgreSQL
6. **Migrations échouent** : Vérifiez les permissions de la base de données

### Logs utiles

- **GitHub Actions** : Onglet "Actions" du repository
- **Docker** : `docker logs backend`
- **Coolify** : Interface d'administration Coolify
- **Application** : Logs dans le container

### Health Check

```bash
curl https://api.yourdomain.com/health
```

Réponse attendue :
```json
{
  "status": "ok",
  "timestamp": "2025-01-01T00:00:00.000Z",
  "uptime": 123.45
}
```

## 📚 Documentation complète

- [Dockerfile](../../Dockerfile) - Configuration de l'image
- [Prisma Schema](../../prisma/schema.prisma) - Schéma de base de données
- [devsecops.yml](../../devsecops.yml) - Configuration des gates de qualité et sécurité

---

*Pour plus de détails, voir [CI-CD pipeline](ci-cd-pipeline.md) et [Workflow détaillé](workflow-detailed.md).*

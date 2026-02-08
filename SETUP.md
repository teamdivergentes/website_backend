# Configuration CI/CD Backend

Guide de configuration du pipeline CI/CD pour le backend NestJS.

## Architecture CI/CD

Le pipeline comprend 8 jobs automatiques :

1. **Build** - Compilation NestJS + génération Prisma Client
2. **Lint** - Vérification qualité du code (ESLint)
3. **Test** - Tests unitaires + e2e avec PostgreSQL
4. **Semgrep** - Analyse de sécurité
5. **Docker** - Build image multi-architecture (amd64/arm64)
6. **Deploy PREPROD** - Déploiement pré-production
7. **Deploy PROD** - Déploiement production
8. **PR Report** - Rapport automatique sur les PRs

## Secrets GitHub

Configurer dans `Settings > Secrets and variables > Actions` :

| Secret | Description | Exemple |
|--------|-------------|---------|
| `SEMGREP_APP_TOKEN` | Token Semgrep pour l'analyse de sécurité | Obtenir sur semgrep.dev |
| `COOLIFY_URL` | URL de votre instance Coolify | `https://coolify.domain.com` |
| `COOLIFY_API_KEY` | Clé API Coolify | Dans Coolify > Settings > API |
| `COOLIFY_APPID_PREPROD_BACKEND` | UUID app PREPROD | Format: `uuid-xxxx-xxxx` |
| `COOLIFY_APPID_PROD_BACKEND` | UUID app PROD | Format: `uuid-xxxx-xxxx` |

## Configuration Coolify

### Étape 1 : Base de données PostgreSQL

Créer une ressource PostgreSQL séparée :

1. Coolify > **Add Resource** > **PostgreSQL 17** (ou version compatible Prisma)
2. Configuration :
   - Name: `dvg-backend-db-preprod` (ou `-prod`)
   - Database: `teamdivergente`
   - Username: `teamdivergent`
   - Password: (généré automatiquement)
   - Version: 17.x (recommandé pour stabilité)
3. Déployer et copier l'URL de connexion

**Note:** PostgreSQL 17.x recevra automatiquement les patches de sécurité (17.1, 17.2...) sans breaking changes

### Étape 2 : Application Backend

Créer une application Docker :

1. Coolify > **Add Application** > **Docker Image**
2. Docker Registry :
   - Registry: `ghcr.io`
   - Image: `ghcr.io/teamdivergentes/website_backend/dvg_web_backend`
   - Tag: `PREPROD` (ou `RELEASE` pour prod)
   - Credentials: Token GitHub avec permissions `read:packages`

3. Variables d'environnement :

```env
DATABASE_URL=<url-copiée-étape-1>
JWT_SECRET=<générer-clé-forte>
JWT_EXPIRES_IN=3h
NODE_ENV=production
PORT=3000
ALLOWED_ORIGINS=https://yourdomain.com,https://preprod.yourdomain.com
RATE_LIMIT_MAX=100
RATE_LIMIT_WINDOW_MS=900000
LOG_LEVEL=info
LOG_FILE_ENABLED=true
```

4. Health Check :
   - Path: `/health`
   - Port: `3000`
   - Interval: `30s`

5. Port : `3000`

### Étape 3 : Migrations Prisma

Après le premier déploiement, exécuter les migrations :

```bash
# Accéder au container
docker exec -it <container-name> sh

# Exécuter les migrations
npx prisma migrate deploy

# (Optionnel) Seed la base
npx prisma db seed
```

## Workflow de déploiement

### Pull Request

```bash
git checkout -b feature/nouvelle-fonctionnalite
git push origin feature/nouvelle-fonctionnalite
```

Résultat : Build + Lint + Tests + Semgrep + Docker (pas de déploiement)

### Pull Request avec déploiement PREPROD

Ajouter `[DEPLOY]` dans le titre :

```
[DEPLOY] Feature: nouvelle fonctionnalité
```

Résultat : Pipeline complet + déploiement PREPROD

### Déploiement PREPROD automatique

```bash
git push origin main
```

Résultat : Pipeline complet + déploiement PREPROD

### Déploiement PROD automatique

```bash
git tag v1.0.0
git push origin v1.0.0
```

Résultat : Pipeline complet + déploiement PROD

## Tags Docker

Le système génère automatiquement plusieurs tags :

| Tag | Usage | Exemple |
|-----|-------|---------|
| SHA complet | Commit spécifique | `ghcr.io/.../dvg_web_backend:abc123...` |
| PREPROD | Dernière version preprod | `ghcr.io/.../dvg_web_backend:PREPROD` |
| RELEASE | Dernière version prod | `ghcr.io/.../dvg_web_backend:RELEASE` |
| Version + SHA | Version identifiable | `ghcr.io/.../dvg_web_backend:1.0.0-PREPROD-abc1234` |
| unstable-branch | PR en cours | `ghcr.io/.../dvg_web_backend:unstable-feature-x` |

## Configuration avancée

### Modifier les timeouts

Éditer `devsecops.yml` :

```yaml
deployment:
  timeout_minutes: 10
  check_interval_seconds: 15
  curl:
    connect_timeout: 30
    retry_count: 3
```

### Changer la version du projet

Éditer `devsecops.yml` :

```yaml
project:
  version: "1.1.0"  # Suivre semver.org
```

### Activer/désactiver des jobs

Éditer `.github/workflows/cicd.yml` ou utiliser les conditions dans `devsecops.yml`.

## Vérifications

### Health check

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

### Logs

```bash
# Logs Docker
docker logs <container-name>

# Logs Coolify
Voir dans Coolify Dashboard > Application > Logs
```

### Test local du build Docker

```bash
docker build -t backend-test .
docker run -p 3000:3000 \
  -e DATABASE_URL="postgresql://..." \
  -e JWT_SECRET="test" \
  backend-test
```

## Troubleshooting

### Build échoue

- Vérifier `npm run build` en local
- Vérifier les tests : `npm run test`
- Vérifier le linter : `npm run lint`

### Tests échouent

- Vérifier que PostgreSQL est accessible
- Vérifier la variable `DATABASE_URL` pour les tests
- Exécuter les tests en local : `npm run test:e2e`

### Docker échoue

- Vérifier le Dockerfile
- Tester le build local : `docker build .`
- Vérifier les secrets GitHub

### Déploiement échoue

- Vérifier les secrets GitHub (UUID Coolify, API key)
- Vérifier que l'application existe dans Coolify
- Vérifier les logs dans GitHub Actions

### Health check échoue

- Vérifier `DATABASE_URL` dans Coolify
- Vérifier que PostgreSQL est accessible
- Vérifier les logs du container
- Vérifier le port 3000

### Migrations Prisma échouent

- Vérifier `DATABASE_URL`
- Vérifier les permissions de la base de données
- Exécuter `npx prisma migrate deploy` manuellement

## Maintenance

### Rollback

Dans Coolify :
1. Sélectionner un déploiement précédent
2. Ou redéployer un tag antérieur

### Mise à jour de version

1. Mettre à jour `devsecops.yml` :
```yaml
project:
  version: "1.1.0"
```

2. Commit et tag :
```bash
git add devsecops.yml
git commit -m "chore: bump version to 1.1.0"
git tag v1.1.0
git push origin main --tags
```

### Backups base de données

Configurer dans Coolify > PostgreSQL > Backups

## Sécurité

- Ne jamais commit de secrets (`.env`, `DATABASE_URL`, `JWT_SECRET`)
- Utiliser GitHub Secrets pour toutes les credentials
- Rotation régulière des tokens et secrets
- Activer SSL pour PostgreSQL en production
- Configurer CORS strictement avec `ALLOWED_ORIGINS`

## Différences avec le Frontend

Le backend diffère du frontend sur ces points :

- **Base de données** : PostgreSQL externe requise
- **Tests e2e** : Avec base de données de test
- **Variables runtime** : Configurées dans Coolify (vs build-time pour Angular)
- **Migrations** : Prisma migrations à exécuter manuellement
- **Health check** : Endpoint API `/health` (vs `/index.html`)

Pour une comparaison détaillée, voir les deux `devsecops.yml`.

## Ressources

- [NestJS Documentation](https://docs.nestjs.com)
- [Prisma Documentation](https://www.prisma.io/docs)
- [GitHub Actions](https://docs.github.com/en/actions)
- [Coolify Documentation](https://coolify.io/docs)
- [Semgrep](https://semgrep.dev/docs/)


# DVG Web Backend

Backend NestJS pour l'application web de Team Divergentes.

## Technologies

- **Framework**: NestJS 11
- **Runtime**: Node.js 20
- **Base de données**: PostgreSQL 17
- **ORM**: Prisma 6
- **Langage**: TypeScript
- **Tests**: Jest

## Prérequis

- Node.js 20+
- PostgreSQL 17+ (version 17.x recommandée pour compatibilité Prisma)
- npm ou yarn

## Installation

```bash
npm install
```

## Configuration

Créer un fichier `.env` à partir du template :

```bash
cp .env.template .env
```

Variables d'environnement principales :

```env
DATABASE_URL="postgresql://user:password@localhost:5432/dbname"
JWT_SECRET="your-secret-key"
JWT_EXPIRES_IN="3h"
PORT=3000
NODE_ENV="development"
```

## Base de données

### Générer le client Prisma

```bash
npx prisma generate
```

### Migrations

```bash
# Créer une migration
npx prisma migrate dev --name init

# Appliquer les migrations (production)
npx prisma migrate deploy

# Interface graphique
npx prisma studio
```

## Développement

```bash
# Mode développement
npm run start:dev

# Mode debug
npm run start:debug
```

L'API sera accessible sur `http://localhost:3000`

## Tests

```bash
# Tests unitaires
npm run test

# Tests e2e
npm run test:e2e

# Coverage
npm run test:cov

# Watch mode
npm run test:watch
```

## Build

```bash
npm run build
```

## Production

```bash
npm run start:prod
```

## Endpoints

- `GET /` - Message de bienvenue
- `GET /health` - Health check (utilisé par Docker)
- `POST /auth/login` - Authentification
- Voir la documentation API complète sur `/api/docs` (à venir)

## Qualité du code

```bash
# Linter
npm run lint

# Format
npm run format
```

## CI/CD

Le projet utilise GitHub Actions pour l'intégration et le déploiement continus.

### Pipeline automatique

- **Pull Request** : Build + Lint + Tests + Semgrep + Docker
- **Push sur main** : Déploiement automatique en PREPROD
- **Tag `v*.*.*`** : Déploiement automatique en PROD

### Déploiement manuel PREPROD

Ajouter `[DEPLOY]` dans le titre de la PR :
```
[DEPLOY] Feature: nouvelle fonctionnalité
```

### Configuration requise

Voir [SETUP.md](./SETUP.md) pour la configuration complète du CI/CD.

## Structure du projet

```
src/
├── auth/          # Module d'authentification
├── users/         # Module utilisateurs
├── app.module.ts  # Module principal
└── main.ts        # Point d'entrée

prisma/
└── schema.prisma  # Schéma de base de données

.github/
├── workflows/     # Workflows GitHub Actions
└── scripts/       # Scripts de déploiement
```

## Base de données externe

La base de données est hébergée séparément (non incluse dans le container Docker).

Pour la production, configurer une instance PostgreSQL dans Coolify et utiliser l'URL de connexion fournie.

## Documentation

- [Configuration CI/CD](./SETUP.md) - Setup complet du pipeline
- [devsecops.yml](./devsecops.yml) - Configuration qualité et sécurité

## Support

Pour toute question ou problème, créer une issue sur le repository GitHub.

## License

UNLICENSED - Usage privé uniquement

# CLAUDE.md - Backend NestJS

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

NestJS 11 backend for Team Divergentes (DVG), a French esports/gaming organization website. Uses PostgreSQL 17 with Prisma ORM, JWT authentication, and TypeScript.

## Common Commands

```bash
# Development
npm run start:dev          # Start with hot reload
npm run start:debug        # Start with debugger

# Testing
npm run test               # Run unit tests
npm run test:watch         # Watch mode
npm run test:cov           # Coverage report
npm run test:e2e           # End-to-end tests
npx jest path/to/file.spec.ts  # Run single test file

# Database
npx prisma generate        # Generate Prisma client (after schema changes)
npx prisma migrate dev     # Create and apply migration
npx prisma studio          # Visual database browser
npx prisma db seed         # Seed database

# Code quality
npm run lint               # ESLint with auto-fix
npm run format             # Prettier formatting
npm run build              # TypeScript compilation
```

---

## Architecture

### Module Structure (13 modules)

| Module | Path | Description |
|--------|------|-------------|
| **AuthModule** | `src/auth/` | JWT authentication (Passport), guards, decorators |
| **UsersModule** | `src/users/` | User CRUD |
| **RolesModule** | `src/roles/` | Role and permission management |
| **ConfigModule** | `src/config/` | Key-value configuration storage |
| **StaffModule** | `src/staff/` | Staff member management (categories: ADMIN, HEADSTAFF, AMBASSADOR) |
| **TeamsModule** | `src/teams/` | Teams + team members (2 controllers, 2 services) |
| **GamesModule** | `src/games/` | Game catalog (LoL, Valorant, RL, CS, TFT) |
| **SponsorsModule** | `src/sponsors/` | Sponsors with images + links |
| **UploadModule** | `src/upload/` | Image upload (Multer + Sharp) |
| **ContactModule** | `src/contact/` | Contact form (email + Discord webhook) |
| **RecruitmentModule** | `src/recruitment/` | Job postings and applications |
| **ProfileModule** | `src/profile/` | User profile management |
| **CommonModule** | `src/common/` | Shared constants (permissions) |

### Prisma Schema Models

```
Role          1--* User              (roleId FK)
Team          1--* TeamMember        (teamId FK, cascade delete)
Sponsor       1--* SponsorImage      (sponsorId FK, cascade delete)
Sponsor       1--* SponsorLink       (sponsorId FK, cascade delete)
Config        (standalone key-value)
StaffMember   (standalone with category enum)
Game          (standalone game catalog)
RecruitmentPost (standalone job postings)
```

**Enums:**
- `StaffCategory`: ADMIN, HEADSTAFF, AMBASSADOR
- `LinkType`: WEBSITE, TWITTER, INSTAGRAM, DISCORD, PROMO_CODE, OTHER
- `ImageLayout`: LAYOUT_1, LAYOUT_2, LAYOUT_3

**Prisma client** is generated to `generated/prisma/` (not node_modules):
```typescript
import { PrismaClient } from '../generated/prisma';
```

### Authentication Pattern

JWT authentication is applied **globally** via `JwtAuthGuard` in `AppModule`. Routes are protected by default.

```typescript
// Make a route public (skip JWT)
import { Public } from '../auth/decorators/public.decorator';
@Public()
@Get()
findAll() { ... }

// Require specific role(s)
import { Roles } from '../auth/decorators/roles.decorator';
@Roles('admin')
@Post()
create() { ... }
```

**JWT Config:**
- Secret: `process.env.JWT_SECRET`
- Expiration: 1 day (configurable via `JWT_EXPIRES_IN`)
- Payload: `{ sub: userId, email: email }`
- Strategy: Bearer token extraction via Passport

**Guards:**
- `JwtAuthGuard` - Global authentication, checks `@Public()` metadata
- `RolesGuard` - Per-endpoint role checking (case-insensitive)

**Seed Roles (isSystem=true):**
- **Admin** - All permissions
- **CM** (Community Manager) - Content/article permissions
- **Gestionnaire** (Manager) - Team, game, sponsor, staff, recruitment permissions

### Validation

Global `ValidationPipe` configured in `AppModule`:
- `whitelist: true` - Strip unknown properties
- `forbidNonWhitelisted: true` - Reject unknown properties
- `transform: true` - Auto-transform payloads to DTO instances

Use `class-validator` decorators in DTOs.

### Upload System

**Multer Configuration:**
- Storage: Disk to `./uploads/`
- Filename: 32-char random hex + original extension
- Size limit: **5MB**
- Allowed formats: JPEG, PNG, WebP, GIF, SVG

**Sharp Optimization:**
- PNG: quality 85, compression level 9, resize 1920x1920 max
- JPEG/WebP: quality 85, progressive, resize 1920x1920 max
- GIF/SVG: Pass-through (no optimization)
- `fit: 'inside', withoutEnlargement: true`

**Endpoints:** `POST /api/upload/image`, `DELETE /api/upload/:filename` (both `@Roles('admin')`)

### Contact System

Dual notification: Email (Nodemailer) + Discord webhook.
- SMTP config read from database Config table
- HTML + text email templates with DVG branding
- Discord embeds with color `#32D299`

### Prisma Migrations (CRITICAL)

Les fichiers de migration Prisma (`prisma/migrations/*/migration.sql`) sont **immuables**. Une fois creee, une migration ne doit **jamais** etre modifiee.

**Regles strictes** :
- **Ne jamais modifier** un fichier `migration.sql` existant, meme pour reordonner des colonnes ou reformater le SQL
- **Ne jamais regenerer** une migration existante avec `prisma migrate dev` si elle a deja ete committee
- Pour tout changement de schema, **toujours creer une nouvelle migration** via `npx prisma migrate dev --name descriptive_name`
- Si une migration existante pose probleme (erreur, oubli), creer une migration corrective qui ALTER/DROP les elements concernes
- Lors d'un rebase ou merge, si un conflit touche un fichier de migration, **garder la version deja presente sur la branche cible** (celle deja appliquee en base) et creer une nouvelle migration pour les ajouts manquants

**Pourquoi** : Les migrations sont appliquees sequentiellement et tracees dans la table `_prisma_migrations`. Modifier une migration deja appliquee cree une divergence entre le schema en base et l'historique des migrations, ce qui casse `prisma migrate deploy` en production.

### Static Files

Uploads served from `/uploads/` directory via Express static assets middleware in `main.ts`.

---

## Global Configuration (main.ts)

- **CORS Origins:** localhost:4200, localhost:8080, 127.0.0.1 variants
- **Swagger:** Available at `/api/docs` (conditional on `SWAGGER_ENABLED`)
- **Port:** 3000 (default)

---

## Environment Variables

**Required:**
```
DATABASE_URL=postgresql://user:password@localhost:5432/dbname
JWT_SECRET=your-secret-key
```

**Optional:**
```
JWT_EXPIRES_IN=1d
PORT=3000
NODE_ENV=development
SWAGGER_ENABLED=true
```

**Contact form (from database Config table):**
```
contact_smtp_host, contact_smtp_port, contact_smtp_user, contact_smtp_pass
contact_email, contact_discord_webhook
```

---

## Seed Data (prisma/seed.ts)

- **3 system roles** (Admin, CM, Gestionnaire) with specific permissions
- **1 admin user** (admin@teamdivergentes.fr / admin123)
- **11 config entries** (social links, page visibility flags)
- **11 staff members** (6 Admin, 4 HeadStaff)
- **5 games** (LoL, Valorant, Rocket League, CS, TFT)
- **3 sponsors** (Pulsar Corp, Monster Energy, SecretLab)

---

## Docker Configuration

**4-stage multi-stage build:**
1. Dependencies - `node:20-alpine`, `npm ci`, Prisma generate
2. Builder - TypeScript compilation to `dist/`
3. Prod-deps - Production dependencies only
4. Production - `node:20-alpine`, `dumb-init`, non-root user `nestjs` (uid 1001)

**entrypoint.sh:** Runs `prisma migrate deploy` then `node dist/src/main.js`

**Health check:** `GET /health` every 30s

---

## CI/CD

Unified workflow (`.github/workflows/cicd.yml`). Docker images pushed to `ghcr.io/teamdivergentes/website_backend/dvg_web_backend`.

**Pipeline:** build -> lint -> test (with Postgres service) -> semgrep -> docker -> deploy

- PR: Build + Lint + Tests + Semgrep + Docker build (tag `unstable-{branch}`)
- Push to main: All checks + Docker push (tag `PREPROD`) + Auto-deploy via Ansible
- Tag `v*.*.*`: All checks + Docker push (tag `RELEASE`) + Auto-deploy PROD
- `[DEPLOY]` in PR title: Manual PREPROD deployment

**Required secrets:** `SEMGREP_APP_TOKEN`, `DEPLOY_REPO`, `DEPLOY_TOKEN`

---

## Key Dependencies

| Package | Usage |
|---------|-------|
| `@nestjs/*` v11 | Framework |
| `@prisma/client` v6 | ORM |
| `passport-jwt` | JWT strategy |
| `bcrypt` v6 | Password hashing (cost factor 12) |
| `sharp` v0.34 | Image optimization |
| `nodemailer` | Email sending |
| `class-validator` / `class-transformer` | DTO validation |
| `@nestjs/swagger` v11 | API documentation |

---

## Outils MCP et Plugins

### Context7

Utiliser `resolve-library-id` puis `query-docs` pour consulter la documentation a jour de :
- **NestJS** : modules, guards, interceptors, pipes, decorators
- **Prisma** : schema, migrations, queries, relations
- **class-validator** : decorators de validation
- **Passport/JWT** : strategies d'authentification
- **Sharp** : transformations d'images

### Playwright (via orchestrateur)

Les tests E2E des endpoints peuvent etre verifies via Playwright :
- Tester les reponses API (status codes, body)
- Verifier les headers de securite
- Tester les flux d'authentification

---

## Securite - Regles Obligatoires

### Validation des entrees
- **Toujours** utiliser des DTOs avec `class-validator` pour chaque endpoint
- `whitelist: true` et `forbidNonWhitelisted: true` sont globaux
- Valider les types, longueurs, formats (email, dates, etc.)

### Authentification & Autorisation
- Les routes sont **protegees par defaut** (JwtAuthGuard global)
- Utiliser `@Public()` uniquement pour les endpoints publics
- Utiliser `@Roles()` pour le controle d'acces par role
- Ne jamais exposer le mot de passe dans les reponses API

### Injection SQL
- Prisma parametrise les requetes par defaut
- **Ne jamais** utiliser `$queryRawUnsafe` avec des entrees utilisateur
- Preferer les methodes Prisma (findMany, create, update, etc.)

### Securite des fichiers
- Valider le type MIME des fichiers uploades
- Limiter la taille (5MB max)
- Generer des noms aleatoires (pas de noms utilisateur)
- Sanitiser les noms de fichiers lors de la suppression

### Headers de securite
- Helmet middleware recommande (EPIC-8)
- CORS strictement configure (origines listees)
- Rate limiting sur les endpoints sensibles (login, register, contact)

### Secrets
- **Jamais** de secrets dans le code source
- Utiliser les variables d'environnement
- `JWT_SECRET` doit etre change en production
- Le fallback `'your-secret-key-change-in-production'` est un warning volontaire

---

## Fichiers et chemins importants

```
src/
├── main.ts                           # Bootstrap, CORS, Swagger, static files
├── app.module.ts                     # Global config, module imports, guards
├── app.controller.ts                 # Root endpoint + /health
├── prisma.service.ts                 # PrismaClient lifecycle
├── auth/
│   ├── auth.service.ts               # Login, register, validateUser
│   ├── strategies/jwt.strategy.ts    # Token validation + user loading
│   ├── guards/jwt-auth.guard.ts      # Global auth guard
│   ├── guards/roles.guard.ts         # Per-endpoint role guard
│   ├── decorators/public.decorator.ts
│   └── decorators/roles.decorator.ts
├── upload/
│   ├── upload.controller.ts          # POST /upload/image, DELETE /upload/:filename
│   └── upload.service.ts             # Sharp optimization
├── contact/
│   └── contact.service.ts            # Email + Discord notifications
├── common/
│   └── constants/permissions.ts      # Permission definitions
prisma/
├── schema.prisma                     # Database schema (11 models, 3 enums)
├── seed.ts                           # Seed data
└── migrations/                       # Auto-generated migrations
generated/prisma/                     # Generated Prisma client
```

---

## Testing

**Jest configuration:**
- Unit tests: `src/**/*.spec.ts`
- E2E tests: `test/*.e2e-spec.ts` (separate Postgres database)
- Coverage: `npm run test:cov`

**Existing test files:**
- `auth.service.spec.ts`, `auth.controller.spec.ts`
- `roles.service.spec.ts`, `roles.controller.spec.ts`
- `users.service.spec.ts`, `users.controller.spec.ts`
- `recruitment-application.service.spec.ts`
- `test/app.e2e-spec.ts`, `test/roles.e2e-spec.ts`

---

## Notes specifiques au projet

1. **French-first** : Messages de validation et labels en francais
2. **Prisma client** genere dans `generated/prisma/` (pas node_modules)
3. **Roles systeme** (`isSystem=true`) ne doivent pas etre supprimes
4. **Cascade delete** sur TeamMember, SponsorImage, SponsorLink
5. **Config dynamique** : parametres editables depuis l'admin (visibilite pages, liens sociaux)
6. **StaffCategory** : ADMIN = direction, HEADSTAFF = responsables, AMBASSADOR = ambassadeurs
7. **TypeScript** : target ES2023, `nodenext` module resolution, strict null checks
8. **Deployment** : tag-driven (`vX.Y.Z` pour PROD, `[DEPLOY]` dans titre PR pour PREPROD)

## Review Format

When reviewing code, use this structure:
1. Points positifs (what's done well)
2. Points a ameliorer (improvements needed)
3. Suggestions ou alternatives

Priority levels:
- **majeur** - Critical issues (security, data loss, crash)
- **mineur** - Minor improvements (style, naming, optimization)
- **suggestion** - Optional enhancements

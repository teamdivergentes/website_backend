# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

NestJS 11 backend for Team Divergentes web application. Uses PostgreSQL 17 with Prisma ORM, JWT authentication, and TypeScript.

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

## Architecture

### Module Structure

All modules follow NestJS conventions with controller/service/module separation:
- `src/auth/` - JWT authentication with Passport, guards, decorators
- `src/users/` - User management
- `src/roles/` - Role-based permissions
- `src/config/` - Key-value configuration storage
- `src/staff/` - Staff member management with categories (ADMIN, HEADSTAFF)
- `src/teams/` - Team and team member management
- `src/upload/` - Image upload with Sharp optimization

### Authentication Pattern

JWT authentication is applied globally via `JwtAuthGuard` in `AppModule`. Routes are protected by default.

To make a route public:
```typescript
import { Public } from '../auth/decorators/public.decorator';

@Public()
@Get()
findAll() { ... }
```

To require specific roles:
```typescript
import { Roles } from '../auth/decorators/roles.decorator';

@Roles('admin')
@Post()
create() { ... }
```

### Database Access

`PrismaService` (src/prisma.service.ts) extends PrismaClient and handles connection lifecycle. Import from generated client:
```typescript
import { PrismaClient } from '../generated/prisma';
```

Prisma client is generated to `generated/prisma/` (not node_modules).

### Validation

Global ValidationPipe configured in AppModule with:
- `whitelist: true` - Strip unknown properties
- `forbidNonWhitelisted: true` - Reject unknown properties
- `transform: true` - Auto-transform payloads to DTO instances

Use class-validator decorators in DTOs.

### Static Files

Uploads served from `/uploads/` directory via Express static assets middleware.

## Environment Variables

Required in `.env`:
```
DATABASE_URL=postgresql://user:password@localhost:5432/dbname
JWT_SECRET=your-secret-key
```

Optional:
```
JWT_EXPIRES_IN=3h
PORT=3000
NODE_ENV=development
SWAGGER_ENABLED=true  # Set to false in production
```

## CI/CD

Unified workflow (`.github/workflows/cicd.yml`). Docker images pushed to `ghcr.io/teamdivergentes/website_backend/dvg_web_backend`.

- PR: Build + Lint + Tests + Semgrep + Docker image build (tag `unstable-{branch}`)
- Push to main: All checks + Docker push (tag `PREPROD`) + Auto-deploy to PREPROD via Ansible workflow dispatch
- Tag `v*.*.*`: All checks + Docker push (tag `RELEASE`) + Auto-deploy to PROD via Ansible workflow dispatch
- Add `[DEPLOY]` in PR title for manual PREPROD deployment

Deployment triggers the VPS Ansible `deploy.yml` workflow with `--tags website`. Ansible pulls the latest GHCR images and redeploys the Docker Compose stack.

Configuration in `devsecops.yml`. CI scripts in `.github/scripts/` (determine-tags.sh, deploy.sh, get-config-value.sh).

Required GitHub secrets: `SEMGREP_APP_TOKEN`, `DEPLOY_REPO` (e.g. `teamdivergentes/vps_ansible`), `DEPLOY_TOKEN` (PAT with `actions:write` scope).

# SonarQube — Backend (dvg-backend)

## Instance

- URL : https://sonarqube.tellebma.fr
- Projet : `dvg-backend`
- Dashboard : https://sonarqube.tellebma.fr/dashboard?id=dvg-backend

## Quality Gate active : `Sonar way` (built-in, Clean as You Code compliant)

La QG s'applique uniquement sur le **New Code** (code ajouté/modifié depuis la branche de référence — `main`).

| Condition (metric) | Opérateur | Seuil | Sens |
|---|---|---|---|
| `new_violations` | `>` | `0` | Aucun nouveau problème (bug, vulnérabilité, code smell) |
| `new_coverage` | `<` | `80` | Le nouveau code doit avoir ≥ 80% de coverage |
| `new_duplicated_lines_density` | `>` | `3` | Le nouveau code doit avoir ≤ 3% de lignes dupliquées |
| `new_security_hotspots_reviewed` | `<` | `100` | Tous les nouveaux security hotspots doivent être review-és |

**La CI échoue si une seule condition est violée.** Le job `docker` dépend du job `sonarqube` → aucune image GHCR n'est publiée si la QG bloque.

## Configuration repo

| Élément | Emplacement |
|---|---|
| Config scanner | `sonar-project.properties` (racine) |
| Job CI | `.github/workflows/cicd.yml` → job `sonarqube` |
| Secret GitHub Actions | `SONAR_TOKEN_DVG` (Project Analysis Token, expiration 2027-04-22) |
| Coverage source | `coverage/lcov.info` (Jest, reporters `text,json-summary,lcov`) |

## Scan local

```bash
# 1. Générer le coverage (nécessite une DB Postgres accessible)
docker run -d --name tmp-pg --rm \
  -e POSTGRES_USER=test -e POSTGRES_PASSWORD=test -e POSTGRES_DB=test \
  -p 55433:5432 postgres:17-alpine
DATABASE_URL="postgresql://test:test@localhost:55433/test" \
JWT_SECRET=local JWT_EXPIRES_IN=1h NODE_ENV=test \
  npx prisma migrate deploy && \
DATABASE_URL="postgresql://test:test@localhost:55433/test" \
JWT_SECRET=local JWT_EXPIRES_IN=1h NODE_ENV=test \
  npm run test:cov
docker stop tmp-pg

# 2. Scanner vers Sonar
docker run --rm \
  -e SONAR_HOST_URL=https://sonarqube.tellebma.fr \
  -e SONAR_TOKEN=<PROJECT_ANALYSIS_TOKEN> \
  -v "$PWD:/usr/src" \
  sonarsource/sonar-scanner-cli:latest
```

## Exclusions de coverage

Définies dans `sonar-project.properties` → `sonar.coverage.exclusions`. Ne pas y toucher sans concertation (DTOs, modules, bootstrap — code sans logique testable).

## Rotation des tokens

| Token | Endpoint |
|---|---|
| Project Analysis Token (CI) | `POST /api/user_tokens/generate?type=PROJECT_ANALYSIS_TOKEN&projectKey=dvg-backend&name=ci-dvg-backend` |
| Badge Token (README) | `POST /api/project_badges/token?project=dvg-backend` |

## Modifier la Quality Gate

La `Sonar way` est **built-in** et ne peut pas être modifiée. Pour durcir les seuils :

1. SonarQube → Quality Gates → `Sonar way` → **Copy** → nom `DVG Strict`
2. Modifier les conditions dans `DVG Strict` (ex. 90% au lieu de 80%)
3. Projet `dvg-backend` → Project Settings → Quality Gate → assigner `DVG Strict`

## Troubleshooting

| Symptôme | Cause probable | Solution |
|---|---|---|
| Job `sonarqube` échoue avec `401 Unauthorized` | `SONAR_TOKEN_DVG` expiré ou manquant | Régénérer via l'API, mettre à jour le secret GitHub |
| `No LCOV files were found` | Jest n'a pas généré `coverage/lcov.info` | Vérifier `coverageReporters` dans `package.json` |
| QG échoue sur `new_coverage` | Coverage du New Code < 80% | Ajouter des tests sur le code modifié |
| QG échoue sur `new_violations` | Bug/vulnerabilité/smell introduit | Voir l'onglet Issues du dashboard SonarQube |

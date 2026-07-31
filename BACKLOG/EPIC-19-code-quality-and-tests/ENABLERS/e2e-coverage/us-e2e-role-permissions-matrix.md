# US — Matrice E2E de permissions par rôle (Admin / CM / Gestionnaire)

## User Story

**En tant que** équipe QA,
**je veux** une couverture E2E Playwright par rôle utilisateur sur les parcours sensibles,
**afin de** détecter automatiquement toute régression de permission (ex : « rôle CM ne peut plus uploader d'image ») avant déploiement.

## Contexte

- Déclencheur : bug du 2026-05-16 où le rôle CM ne pouvait pas uploader d'image dans un article alors qu'il pouvait créer l'article (`@Roles('admin')` au lieu de `@Roles('admin', 'cm')` sur `UploadController`). Aucun test E2E ne couvrait ce cas.
- Rôles seedés (`backend/prisma/seed.ts`) : `ADMIN`, `CM`, `Gestionnaire`. Seul l'admin a un compte utilisateur dans le seed.
- Avant cette US : la fixture Playwright `auth.fixture.ts` ne supportait qu'un seul rôle (admin).

## Critères d'acceptation

- [x] Helper `frontend/e2e/helpers/test-users.ts` qui crée/supprime des users de test via les endpoints admin `POST /api/users` et `DELETE /api/users/:id` (pas de modification du seed Prisma).
- [x] Fixture `frontend/e2e/fixtures/roles.fixture.ts` exposant `authenticatedPageAdmin`, `authenticatedPageCM`, `authenticatedPageGestionnaire` avec setup/teardown.
- [x] Spec `tests/roles/articles-permissions.spec.ts` :
  - ADMIN : create + edit + delete + toggle ✓
  - CM : create + edit + toggle ✓ ; DELETE → 403
  - Gestionnaire : read ✓ ; create → 403
- [x] Spec `tests/roles/image-upload-permissions.spec.ts` (non-régression du bug du 2026-05-16) :
  - ADMIN : 201 sur `/api/upload/image` et `/api/upload/image-editor`
  - **CM : 201 sur les deux endpoints** (l'inverse de l'ancien comportement buggué)
  - Gestionnaire : 403
  - Non authentifié : 401
- [x] Spec `tests/roles/access-denied-matrix.spec.ts` : CM et Gestionnaire ne peuvent pas atteindre `/admin/users` et `/admin/roles`.
- [x] `frontend/e2e/E2E-JOURNEYS.md` : nouvelle section « Tests par rôle ».
- [x] `E2E-TRACKER.md` (racine) : compteur global mis à jour, dossier `roles/` ajouté.
- [x] `npx playwright test --list` énumère les nouveaux specs sans erreur de parsing.
- [x] `npm run lint` frontend : aucune nouvelle erreur introduite.
- [ ] Exécution Playwright verte en CI (Docker actif requis — déférée).

## Fichiers impactés

- `frontend/e2e/helpers/test-users.ts` (nouveau, 168 lignes)
- `frontend/e2e/fixtures/roles.fixture.ts` (nouveau, 109 lignes)
- `frontend/e2e/fixtures/images/test-small.png` (nouveau, 74 octets)
- `frontend/e2e/tests/roles/articles-permissions.spec.ts` (nouveau, 308 lignes)
- `frontend/e2e/tests/roles/image-upload-permissions.spec.ts` (nouveau, 270 lignes)
- `frontend/e2e/tests/roles/access-denied-matrix.spec.ts` (nouveau, 221 lignes)
- `frontend/e2e/E2E-JOURNEYS.md` (étendu)
- `E2E-TRACKER.md` (étendu)

## Hors périmètre

- Création de comptes CM/Gestionnaire dans le seed Prisma : non requis, les comptes E2E sont créés via l'API admin et nettoyés en `afterAll`.
- Extension de la matrice aux autres modules (teams, sponsors, staff, recruitment) : à intégrer dans `us-e2e-admin-crud-flows.md` lors du passage de cet enabler.

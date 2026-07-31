# Enabler — Frontend test coverage >= 80 %

## Contexte technique

Audit local (2026-04-25) :

- 134 fichiers source
- 42 fichiers `.spec.ts` (~31 %)
- Tests Karma + Jasmine (cf. `frontend/angular.json` → `codeCoverage: true`)
- Rapport LCOV remonté à Sonar via `coverage/frontend/lcov.info`

Exclusions de couverture (Sonar) déjà définies :
- `main.ts`, `environments/**`, `*.module.ts`, `*.routes.ts`, `app.config.ts`, `*.mock.ts`, `*.stub.ts`, `assets/**`

## Objectifs

- **Couverture lignes >= 80 %** sur le périmètre testable
- **100 %** sur les services de sécurité (`AuthService`, `authInterceptor`, guards)
- **100 %** sur les pipes purs et utils
- **>= 80 %** sur les composants critiques (formulaires admin, login, contact)
- Tests asynchrones avec `fakeAsync` / `tick()` pour les Signals + RxJS

## Direction technique

### Stratégie

- **Tests de service** : isoler le service avec `TestBed`, mocker `ApiService` et `HttpClient`
- **Tests de composant** : `ComponentFixture`, `By.css`, simuler les interactions (`click()`, `input`)
- **Tests de Signals** : appel direct des `signal()`/`computed()` après injection
- **Tests d'interceptor** : `HttpTestingController`
- **Tests de guard** : `TestBed.runInInjectionContext` + mocks
- **Tests de pipe** : appel direct, pas de `TestBed`

### Conventions

- 1 fichier `*.spec.ts` côte à côte avec le source
- Helper `frontend/src/testing/` :
  - `mock-api.service.ts`
  - `mock-auth.service.ts`
  - `mock-config.service.ts`
  - `test-helpers.ts` (factory user, role, etc.)

### Modules prioritaires

1. `shared/services/api/auth.service.ts` (Signals critiques)
2. `shared/interceptors/auth.interceptor.ts`
3. `shared/guards/*.ts`
4. `app/shared/services/*.service.ts` (config, upload, etc.)
5. Composants admin CRUD (formulaires + dialogs)
6. Composants publics (contact, login, recruitment apply)

## US

| US | Claude | PO | E2E | Livré |
|----|--------|----|----|-------|
| [us-karma-coverage-config-and-helpers.md](us-karma-coverage-config-and-helpers.md) | A faire | A faire | A faire | A faire |
| [us-test-auth-service-and-guards.md](us-test-auth-service-and-guards.md) | A faire | A faire | A faire | A faire |
| [us-test-shared-services-and-pipes.md](us-test-shared-services-and-pipes.md) | A faire | A faire | A faire | A faire |
| [us-test-admin-crud-components.md](us-test-admin-crud-components.md) | A faire | A faire | A faire | A faire |
| [us-test-public-pages-components.md](us-test-public-pages-components.md) | A faire | A faire | A faire | A faire |

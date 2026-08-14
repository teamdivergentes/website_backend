# US — Stabiliser les E2E et brancher le reporting

## Rôle / Action / Bénéfice

> **En tant que** Expert QA + DevSecOps,
> **je veux** des E2E stables (0 flaky) avec captures, vidéos et traces uploadées en artifact CI,
> **afin que** chaque échec soit immédiatement diagnosticable et que la confiance dans la CI ne s'érode pas.

## Critères d'acceptation

### Configuration

- [ ] `frontend/playwright.config.ts` :
  - `retries: 1` en CI (0 en local)
  - `screenshot: 'only-on-failure'`
  - `video: 'retain-on-failure'`
  - `trace: 'retain-on-failure'`
  - `reporter: [['html'], ['github'], ['junit', { outputFile: 'test-results/junit.xml' }]]`
  - `workers: 4` en local, `workers: 2` en CI
- [ ] `webServer` config pour démarrer Docker compose si besoin (ou s'appuyer sur GitHub Actions services)

### CI

- [ ] Job `e2e-frontend` dans `.github/workflows/ci.yml` :
  - Démarre Docker compose (postgres + backend)
  - Build frontend en mode test (proxy backend)
  - Run `npx playwright test`
  - Upload `playwright-report/` et `test-results/` en artifact (rétention 7 j)
- [ ] Le job est **required** dans la branch protection

### Stabilité

- [ ] Lancer la suite **5 fois consécutives** sur la branche → 0 flaky
- [ ] Quarantaine documentée pour les rares tests flaky : marquer `test.fixme` + créer une US dédiée
- [ ] Helper de retry custom pour les actions UI lentes (debounce, animations)

## Effort estimé

M (~1.5 j)

## Dépendances

- Toutes les US E2E précédentes (sinon rien à stabiliser)

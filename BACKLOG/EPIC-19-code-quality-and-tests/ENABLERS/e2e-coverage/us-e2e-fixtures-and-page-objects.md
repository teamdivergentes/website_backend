# US — Mettre en place les fixtures Playwright et le Page Object Model

## Rôle / Action / Bénéfice

> **En tant que** Expert QA,
> **je veux** des fixtures Playwright (admin pré-logué, data isolée) et un Page Object Model centralisé,
> **afin que** chaque nouveau test E2E soit court, lisible et résistant aux changements UI.

## Critères d'acceptation

### Fixtures

- [ ] `frontend/e2e/fixtures/auth.fixture.ts` :
  - Fixture `loggedAsAdmin` qui pré-logue via API et injecte le cookie/token avant `page.goto()`
  - Fixture `loggedAsCM`, `loggedAsGestionnaire` (si pertinent)
- [ ] `frontend/e2e/fixtures/data.fixture.ts` :
  - Helpers `createTeam()`, `createUser()`, `createSponsor()`, etc. via API
  - Cleanup automatique en `afterEach`
- [ ] Tous les tests existants utilisent ces fixtures

### Page Object Model

- [ ] `frontend/e2e/pages/login.po.ts`
- [ ] `frontend/e2e/pages/admin-dashboard.po.ts`
- [ ] `frontend/e2e/pages/admin-users.po.ts`
- [ ] `frontend/e2e/pages/admin-teams.po.ts`
- [ ] `frontend/e2e/pages/admin-sponsors.po.ts`
- [ ] `frontend/e2e/pages/admin-staff.po.ts`
- [ ] `frontend/e2e/pages/admin-recruitment.po.ts`
- [ ] `frontend/e2e/pages/admin-articles.po.ts`
- [ ] `frontend/e2e/pages/admin-config.po.ts`
- [ ] `frontend/e2e/pages/public-home.po.ts`
- [ ] `frontend/e2e/pages/public-contact.po.ts`
- [ ] `frontend/e2e/pages/public-equipes.po.ts`
- [ ] `frontend/e2e/pages/public-recrutement.po.ts`

### Sélecteurs

- [ ] Convention `data-testid` ajoutée sur tous les éléments interactifs critiques (à coordonner avec l'enabler `frontend-code-quality`)
- [ ] Documentation dans `frontend/e2e/README.md`

## Effort estimé

M (~1.5 j)

## Dépendances

- Aucune

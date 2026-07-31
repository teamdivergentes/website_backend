# Enabler — E2E coverage Playwright

## Contexte technique

État actuel (2026-04-25) :

- 27 fichiers E2E Playwright dans `frontend/e2e/`
- 10 fichiers E2E Jest backend dans `backend/test/`
- Lancement local via `npx playwright test` (nécessite Docker actif)
- CI : à confirmer (cf. enabler `ci-quality-enforcement`)

Règle existante (`CLAUDE.md` projet) : chaque feature doit avoir un E2E nominal + 1 erreur critique.

## Objectifs

- Couvrir **tous** les parcours admin CRUD bout-en-bout (login → action → vérification)
- Couvrir les parcours publics critiques (home, contact, recrutement candidature, équipes)
- Couvrir les parcours sécurité (login KO, redirection 401, permission refusée)
- Tests stables : 0 flaky test sur 5 runs consécutifs
- Captures (screenshots / vidéos) sur échec, traces uploadées en CI artifact

## Direction technique

### Convention Playwright

- Page Object Model (`frontend/e2e/pages/*.po.ts`)
- Fixtures custom (`frontend/e2e/fixtures/auth.fixture.ts`) qui pré-loguent un admin
- Données de test isolées (préfixe `e2e-` dans tous les noms créés, nettoyage après run via `afterEach`)
- Sélecteurs robustes : `data-testid="..."` plutôt que classes CSS

### Backend E2E (Jest e2e)

Pour les flux non couverts par Playwright (ex : intégration SMTP simulée, queue jobs) :
- Utiliser `pg-mem` ou un Docker postgres dédié au CI
- Réutiliser les helpers de l'enabler `backend-test-coverage`

## US

| US | Claude | PO | E2E | Livré |
|----|--------|----|----|-------|
| [us-e2e-fixtures-and-page-objects.md](us-e2e-fixtures-and-page-objects.md) | En cours (fixtures loggedAsCM/Gestionnaire + data.fixture.ts livrés 2026-05-19 ; reste : seed comptes CM/Gestionnaire backend + migration POs naming + 8 specs avec loginAsAdmin local) | A faire | A faire | A faire |
| [us-e2e-public-flows.md](us-e2e-public-flows.md) | A faire | A faire | A faire | A faire |
| [us-e2e-admin-crud-flows.md](us-e2e-admin-crud-flows.md) | A faire | A faire | A faire | A faire |
| [us-e2e-security-flows.md](us-e2e-security-flows.md) | A faire | A faire | A faire | A faire |
| [us-e2e-stability-and-reporting.md](us-e2e-stability-and-reporting.md) | En cours (config Playwright + helper retry + README e2e livrés 2026-05-19 ; reste : job e2e required en branch protection + 5 runs 0 flaky après fix Docker) | A faire | A faire | A faire |
| [us-e2e-role-permissions-matrix.md](us-e2e-role-permissions-matrix.md) | Fait (fixture multi-roles + 3 specs roles/, 32 tests Playwright enumeres, 2026-05-16) | A faire | A faire | A faire |
| [us-e2e-a11y-drag-drop.md](us-e2e-a11y-drag-drop.md) | A faire (cree 2026-05-19 suite a la livraison enabler `a11y-drag-drop-keyboard`) | A faire | A faire | A faire |

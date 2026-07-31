# Feature F3 — Upgrade ESLint 9 → 10 (flat config)

## Repos

`backend` + `frontend`

## Branche git

`chore/eslint-10-upgrade` (creee dans chaque repo independamment, meme nom).

## Contexte

ESLint 10 supprime le support du legacy `.eslintrc.*` et impose le format flat config (`eslint.config.js`). Les configs des deux repos sont peut-etre deja flat ; sinon une migration est necessaire.

PRs a fermer apres merge :

| Repo | PR | Bump |
|------|----|------|
| backend | #30 | eslint 9.39.2 → 10.1.0 (dev) |
| backend | #18 | @eslint/js 9.39.2 → 10.0.1 (dev) |
| frontend | #70 | eslint 9.39.2 → 10.1.0 (dev) |

## Suivi US

| US | Claude | PO | E2E | Livre |
|----|--------|----|----|-------|
| [us-bump-eslint-backend.md](us-bump-eslint-backend.md) | Fait | A faire | A faire | A faire |
| [us-bump-eslint-frontend.md](us-bump-eslint-frontend.md) | Fait | A faire | A faire | A faire |

## Risques

- Migration `.eslintrc` → `eslint.config.js` si pas deja faite.
- Plugins (typescript-eslint, angular-eslint, jest…) doivent supporter ESLint 10 — verifier les peer deps.
- Regles `eslint:recommended` peuvent introduire de nouveaux warnings.

## Charge estimee

S (≈ 4 h cumulees).

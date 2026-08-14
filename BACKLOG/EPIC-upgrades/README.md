# EPIC-upgrades — Mises a niveau majeures (Dependabot backlog)

## Objectif

Traiter les bumps majeurs ouverts par Dependabot qui n'ont pas pu etre auto-merges car ils introduisent du breaking change. L'objectif est de remettre les 3 repos sur les versions cibles tout en garantissant la non-regression fonctionnelle et de tests.

## Contexte

Apres le menage Dependabot du 2026-04-25, **14 PRs minor/patch ont ete mergees** sur develop/main :

- backend : #32, #36, #44, #45, #46, #47, #48
- frontend : #78, #79, #80, #81, #83, #85 (#88 en conflit, rebase demande)
- vps : #11

Restent **8 PRs Dependabot** qui cassent le build, regroupees ici par sujet pour eviter de les rejouer une par une.

## Perimetre — 5 features

| Code | Sujet | Repo(s) | PRs Dependabot a fermer |
|------|-------|---------|------------------------|
| F1 | Angular 21 | frontend | #82, #84, #86, #87, #89, #90, #44 (ng-bootstrap) |
| F2 | Prisma 7 | backend | #49, #50 |
| F3 | ESLint 10 (flat config) | backend + frontend | #18, #30 (backend), #70 (frontend) |
| F4 | Node 25-alpine Docker | backend + frontend | #11 (backend), #36 (frontend) |
| F5 | GitHub Actions Node.js 24 | backend + frontend + ansible_vps | aucune (suite warning runner CI) |

## Hors perimetre

- Stryker mutation testing (#53 backend / #96 frontend) → suivi separe.
- Self-hosted runner (#54 / #97) → suivi separe.

## Branche git

Une branche par feature, partant de `develop` (backend/frontend) ou `main` (vps) :

- `chore/angular-21-upgrade`
- `chore/prisma-7-upgrade`
- `chore/eslint-10-upgrade`
- `chore/node-25-docker`
- `chore/gh-actions-node-24`

## Suivi par feature

| Feature | Claude | PO | E2E | Livre |
|---------|--------|----|----|-------|
| [F1 — Angular 21](FEATURES/angular-21/README.md) | A faire | A faire | A faire | A faire |
| [F2 — Prisma 7](FEATURES/prisma-7/README.md) | A faire | A faire | A faire | A faire |
| [F3 — ESLint 10](FEATURES/eslint-10/README.md) | A faire | A faire | A faire | A faire |
| [F4 — Node 25 Docker](FEATURES/node-25-docker/README.md) | A faire | A faire | A faire | A faire |
| [F5 — GitHub Actions Node 24](FEATURES/github-actions-node-24/README.md) | Fait (PRs #116 backend, #163 frontend mergees ; ansible_vps deja sur v6.0.2/v6.2.0 ; verif 2026-05-09) | A faire | A faire | A faire |

## Strategie globale

1. **Une branche, un sujet** : ne jamais melanger Angular 21 + Prisma 7 dans le meme PR.
2. **Fermer les PR Dependabot doublons** des qu'une branche manuelle est ouverte (commenter `@dependabot close`).
3. **Tester en local d'abord** : `npm ci`, `lint`, `test`, `build`, smoke E2E avant de pousser.
4. **VQO obligatoire** sur chaque feature avant merge.

## Criteres de validation EPIC

- Toutes les PR Dependabot citees ci-dessus sont fermees (mergees ou closed)
- Build vert sur les 3 repos sur la nouvelle stack
- Aucune regression detectee sur les pages publiques ni l'admin
- VQO >= 9.5/10 sur tous les domaines impactes

## Deadlines externes

- **2 juin 2026** : GitHub force les actions JavaScript a tourner sur Node.js 24 → F5 doit etre **livree avant** pour eviter une CI rouge surprise.
- **16 septembre 2026** : retrait definitif de Node.js 20 des runners GitHub. Apres cette date, le contournement `ACTIONS_ALLOW_USE_UNSECURE_NODE_VERSION=true` n'est plus disponible.

> **Reco PO** : remonter F5 en priorite **Haute** des que EPIC-20 est livre.
> Source : [GitHub changelog 2025-09-19](https://github.blog/changelog/2025-09-19-deprecation-of-node-20-on-github-actions-runners/).

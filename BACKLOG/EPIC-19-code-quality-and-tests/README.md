# EPIC-19 — Qualité du code, couverture TU et E2E

## Objectif

Élever durablement la qualité du code (backend + frontend) au niveau requis pour la production : passer un Quality Gate Sonar strict, atteindre **>= 80 % de couverture** sur les TU, fiabiliser les parcours critiques par des tests E2E Playwright, et bloquer toute régression de qualité dans la CI.

## Pourquoi maintenant

État actuel constaté (2026-04-25) :

| Indicateur | Backend | Frontend |
|------------|---------|----------|
| Fichiers source | 54 | 134 |
| Fichiers de tests unitaires | 19 (~35 %) | 42 (~31 %) |
| Tests E2E | 10 (Jest e2e) | 27 (Playwright) |
| Fichiers > 500 lignes | 2 (`analytics.service.ts` 678, `sponsors.service.ts` 486 hors limite douce 400) | 5 (`admin-dashboard` 604, `team-members-dialog` 600, `users` 544, `article-editor` 506, `sponsor-links-dialog` 400+) |
| Sonar configuré | Oui (`backend/sonar-project.properties`) | Oui (`frontend/sonar-project.properties`) |
| Quality Gate bloquant CI | Non | Non |
| Stryker (mutation testing) | Configuré, jamais lancé en CI | Non |

L'instance SonarQube de référence : <https://sonarqube.tellebma.fr/> (projets `dvg-backend` et `dvg-frontend`).

## Périmètre

7 enablers techniques couvrant les deux dépôts et la CI :

1. **sonar-baseline-and-gates** — Capturer la baseline Sonar actuelle, définir un Quality Gate explicite, l'attacher aux deux projets.
2. **backend-code-quality** — Résoudre bugs / vulnérabilités / code smells / duplications backend, découper les fichiers > 400 lignes.
3. **frontend-code-quality** — Idem côté Angular + accessibilité (WCAG AA) sur les composants partagés.
4. **backend-test-coverage** — Atteindre >= 80 % de couverture lignes/branches sur la logique métier (services, guards, controllers utiles).
5. **frontend-test-coverage** — Atteindre >= 80 % de couverture sur services + composants critiques (auth, admin CRUD, formulaires).
6. **e2e-coverage** — Couvrir tous les parcours admin (CRUD users / teams / sponsors / staff / recruitment / articles / config) + parcours publics critiques (home, contact, recrutement, équipes, login).
7. **ci-quality-enforcement** — Quality Gate Sonar + seuil de couverture + audit ESLint/Prettier bloquants en GitHub Actions sur PR.

## Hors périmètre

- Refonte d'architecture (modules, signaux, etc.) — un EPIC dédié si besoin.
- Mutation testing en CI (Stryker) — gardé en backlog (envisagé après baseline Sonar stable).
- Audit sécurité applicative (OWASP) — couvert par les audits finaux listés dans `CLAUDE.md`.

## Branche git

`chore/epic-19-code-quality` (depuis `main`).

## Suivi par enabler

| Enabler | Claude | PO | E2E | Livré |
|---------|--------|----|----|-------|
| [Sonar baseline & quality gates](ENABLERS/sonar-baseline-and-gates/README.md) | Fait (PR #62 mergee : baselines back+front + QG `DVG-Strict` cree via API + S2699 derog #63 mergee) | A faire | A faire | A faire |
| [Backend code quality](ENABLERS/backend-code-quality/README.md) | Fait (PR #110 mergée develop 2026-05-04 : 32 smells corrigés, 0 violation QG, 0 bug) | A faire | A faire | A faire |
| [Frontend code quality](ENABLERS/frontend-code-quality/README.md) | Fait (PR #153 mergée develop 2026-05-04 : BUG a11y résolu, 0 violation QG, sonarqube PASS) | A faire | A faire | A faire |
| [Backend test coverage](ENABLERS/backend-test-coverage/README.md) | En cours (PR #110 mergée : +8 specs, 512 tests, new_coverage 75.8% — 80% bloqué par branches EPIC-17 hors scope PR) | A faire | A faire | A faire |
| [Frontend test coverage](ENABLERS/frontend-test-coverage/README.md) | En cours (PR #153 mergée : +7 specs, 793 tests, new_coverage 92% QG PASS) | A faire | A faire | A faire |
| [E2E coverage](ENABLERS/e2e-coverage/README.md) | En cours (audit gaps + config Playwright + fixtures multi-rôles livrés 2026-05-19, branche locale ; reste 4 US à finaliser après fix Docker postgres) | A faire | A faire | A faire |
| [CI quality enforcement](ENABLERS/ci-quality-enforcement/README.md) | A faire | A faire | A faire | A faire |
| [Accessibilite drag-drop clavier (WCAG 2.1.1)](ENABLERS/a11y-drag-drop-keyboard/README.md) | Fait (PR #206 mergee develop 2026-05-18, livre main via PR #205 le 2026-05-19) | A faire | A faire | Fait (2026-05-19) |

## Critères de validation EPIC

- Quality Gate Sonar **passé** sur `dvg-backend` ET `dvg-frontend` (baseline post-refacto)
- **0 bug** Sonar (Reliability rating A)
- **0 vulnérabilité** Sonar (Security rating A)
- **<= 5 code smells par projet** (Maintainability rating A)
- **Duplications < 3 %** sur chaque dépôt
- **Couverture lignes >= 80 %** backend + frontend (LCOV remonté à Sonar)
- **Couverture branches >= 70 %** sur la logique métier
- **Aucun fichier > 400 lignes** (sauf justification documentée)
- **E2E** Playwright vert sur tous les parcours critiques (liste dans l'enabler `e2e-coverage`)
- **CI bloque** le merge si Quality Gate KO ou couverture < seuil
- **VQO >= 9.5/10** sur tous les domaines
- Aucune régression fonctionnelle (audit manuel + E2E)

## Dépendances inter-enablers

```
sonar-baseline-and-gates
        ├── backend-code-quality ──┐
        ├── frontend-code-quality ─┤
        ├── backend-test-coverage ─┤
        └── frontend-test-coverage ┤
                                   ├── e2e-coverage
                                   └── ci-quality-enforcement
```

`sonar-baseline-and-gates` est **bloquant** : sans baseline ni gate, on ne sait pas où viser.
`ci-quality-enforcement` se livre en dernier (sinon il bloque les PRs des autres enablers).

## Estimation

XL (~2-3 semaines à temps plein partagé entre experts backend, frontend, devsecops, QA).

## Liens

- Instance SonarQube : <https://sonarqube.tellebma.fr/>
- Config Sonar backend : `backend/sonar-project.properties`
- Config Sonar frontend : `frontend/sonar-project.properties`
- Rules globales : `CLAUDE.md` + `.claude/rules/quality.md`

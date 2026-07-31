# EPIC-20 — Commentaire PR CI synchronisé avec les jobs réels

## Objectif

Aligner le commentaire automatique posté sur chaque Pull Request (backend + frontend) avec **l'ensemble des jobs réellement exécutés** par les workflows GitHub Actions, et le maintenir synchrone à chaque ajout de job. Aujourd'hui le commentaire ment par omission : plusieurs jobs (E2E backend, validate-migrations, Trivy, Lighthouse, e2e-fullstack, semantic-release, notify Discord) tournent sans apparaître dans le résumé, et certains statuts sont déjà passés en variables d'env mais jamais affichés.

## Pourquoi maintenant

État constaté (2026-04-26) sur les scripts `generate-pr-report.sh` des deux dépôts :

### Backend (`backend/.github/scripts/generate-pr-report.sh`)

| Job réel dans `cicd.yml` | Affiché dans le commentaire ? | Variable env passée par `pr-report` ? |
|--------------------------|------------------------------|--------------------------------------|
| `build` | Oui | Oui |
| `lint` | Oui | Oui |
| `test-unit` | Oui | Oui |
| `test-e2e` | Oui | Oui |
| `validate-migrations` | **Non** | **Non** (et pas dans `needs:` !) |
| `semgrep` | Oui | Oui |
| `docker` | Oui | Oui |
| `scan-image` (Trivy) | **Non** | Non |
| `deploy-preprod` / `deploy-prod` | Oui | Oui |
| `release` (semantic-release) | **Non** | Non |
| `notify` (Discord) | **Non** | Non |

### Frontend (`frontend/.github/scripts/generate-pr-report.sh`)

| Job réel dans `cicd.yml` | Affiché dans le commentaire ? | Variable env passée par `pr-report` ? |
|--------------------------|------------------------------|--------------------------------------|
| `build` | Oui | Oui |
| `lint` | Oui | Oui |
| `test` (Karma) | **Non** (BUG) | Oui (`TEST_STATUS`) |
| `e2e` (Playwright) | **Non** | Oui (`E2E_STATUS`) |
| `lighthouse` | **Non** | Oui (`LIGHTHOUSE_STATUS`) |
| `semgrep` | Oui | Oui |
| `docker` | Oui | Oui |
| `scan-image` (Trivy) | **Non** | Non |
| `deploy-preprod` / `deploy-prod` | Oui | Oui |
| `release` | **Non** | Non |
| `notify` | **Non** | Non |
| `e2e-fullstack.yml` (workflow séparé) | **Non** | N/A |

### Conséquences

1. Les reviewers n'ont pas de visibilité sur Trivy, validate-migrations et Lighthouse — pourtant gating ou informationnels critiques.
2. Le statut « ✅ SUCCESS » global du commentaire est **faux** : il ignore `validate-migrations`, `scan-image`, `e2e`, `lighthouse`. Une PR peut afficher SUCCESS alors qu'une migration Prisma est cassée ou Trivy a remonté du HIGH.
3. L'ajout de `validate-migrations` (récent, EPIC schema) et `lighthouse` (BP-006) n'a jamais été reporté dans le commentaire — dérive à corriger maintenant avant que d'autres jobs soient ajoutés (EPIC-19 va en ajouter : Sonar gate, coverage threshold).
4. Le bug frontend (TU Karma absent de la table alors que la variable est passée) est une vraie régression de visibilité.

## Périmètre

3 enablers :

1. **backend-pr-comment-sync** — Étendre `backend/.github/scripts/generate-pr-report.sh` et le job `pr-report` pour couvrir tous les jobs manquants côté backend (validate-migrations, scan-image, release, notify). Recalculer le statut global en incluant tous les jobs gating.
2. **frontend-pr-comment-sync** — Idem côté frontend (test Karma, e2e, lighthouse, scan-image, release, notify, e2e-fullstack). Reprendre le bug du commentaire qui n'affiche pas les TU malgré la variable d'env passée.
3. **pr-comment-harmonization-and-docs** — Harmoniser la structure backend/frontend (mêmes sections, mêmes emojis, même logique de calcul du statut global), produire `docs/devsecops/pr-comment.md` (catalogue des jobs + procédure d'ajout), ajouter une checklist dans `CONTRIBUTING.md` (« lors de l'ajout d'un job CI, mettre à jour le commentaire PR »).

## Hors périmètre

- Refondre la chaîne de publication du commentaire (`publish-pr-comment.cjs`) — fonctionne, on garde.
- Migrer vers une action tierce type `marocchino/sticky-pull-request-comment` — gardé en backlog si la dette devient lourde.
- Quality Gate Sonar dans le commentaire — couvert par EPIC-19 (`ci-quality-enforcement`), juste prévoir le slot.
- Branch protection / required checks — couvert par EPIC-19.
- Ajout de nouveaux jobs CI (Sonar, Stryker, etc.) — couvert par EPIC-19.

## Branche git

Trois branches indépendantes :
- `chore/epic-20-pr-comment-backend-sync`
- `chore/epic-20-pr-comment-frontend-sync`
- `chore/epic-20-pr-comment-harmonization`

## Suivi par enabler

| Enabler | Claude | PO | E2E | Livré |
|---------|--------|----|----|-------|
| [Backend PR comment sync](ENABLERS/backend-pr-comment-sync/README.md) | Fait (PR #84 mergée sur develop 2026-04-30, sha b46f333) | A faire | A faire | Fait |
| [Frontend PR comment sync](ENABLERS/frontend-pr-comment-sync/README.md) | Fait (PR #126 mergee sur develop 2026-04-29) | A faire | A faire | A faire |
| [PR comment harmonization & docs](ENABLERS/pr-comment-harmonization-and-docs/README.md) | Fait Claude (PR backend #95 + frontend #136 mergées develop 2026-05-04) | A faire | A faire | Fait |

## Critères de validation EPIC

- Le commentaire PR backend liste **100 %** des jobs présents dans `backend/.github/workflows/cicd.yml` (gating ou informationnels)
- Le commentaire PR frontend liste **100 %** des jobs présents dans `frontend/.github/workflows/cicd.yml` + une mention pour `e2e-fullstack.yml`
- Le statut global « SUCCESS » n'est affiché que si **tous les jobs gating** sont passés (alignement avec `workflow-status`)
- Les jobs informationnels (Trivy, Lighthouse, e2e quand skipped) apparaissent avec un état explicite (✅ / ⚠️ / ⏭️) et n'invalident pas le SUCCESS global
- Liens vers les artefacts pertinents : Playwright report, Lighthouse report, Trivy SARIF (GitHub Security tab)
- Documentation `docs/devsecops/pr-comment.md` existe et est à jour
- Checklist d'ajout de job présente dans `CONTRIBUTING.md` (ou équivalent par dépôt)
- VQO >= 9.5/10 sur les 3 PRs livrées

## Priorité

**Haute** — à livrer avant l'enabler `ci-quality-enforcement` de l'EPIC-19, sinon les nouveaux jobs Sonar/Coverage continueront la dérive.

## Estimation

S à M (~1.5 j cumulé : 0.5 j backend, 0.5 j frontend, 0.5 j harmonisation/docs).

## Dépendances inter-enablers

```
backend-pr-comment-sync   ─┐
                           ├── pr-comment-harmonization-and-docs
frontend-pr-comment-sync ──┘
```

L'harmonisation se livre **après** les deux syncs (sinon elle réécrit du code en cours de modif).

## Liens utiles

- `backend/.github/workflows/cicd.yml`
- `backend/.github/scripts/generate-pr-report.sh`
- `backend/.github/scripts/publish-pr-comment.cjs`
- `frontend/.github/workflows/cicd.yml`
- `frontend/.github/workflows/e2e-fullstack.yml`
- `frontend/.github/scripts/generate-pr-report.sh`
- `frontend/.github/scripts/publish-pr-comment.cjs`

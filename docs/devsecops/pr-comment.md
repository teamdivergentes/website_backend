# Commentaire PR CI/CD — Documentation

## Vue d'ensemble

À chaque Pull Request (ou commentaire `/run-*`), le pipeline CI/CD génère automatiquement un commentaire récapitulatif dans GitHub. Ce commentaire est produit par le script `.github/scripts/generate-pr-report.sh` de chaque dépôt et publié via `.github/scripts/publish-pr-comment.cjs`.

Le commentaire affiche le statut de chaque job du workflow, des sections repliables avec détails (Docker, E2E, Lighthouse, Trivy, déploiement), et un statut global `SUCCESS` / `FAILED` basé sur les jobs **gating**.

---

## Catalogue des jobs

### Backend (`teamdivergentes/dvg-web-backend`)

| Nom du job | Workflow | Catégorie | Déclencheurs | Artefacts produits |
|---|---|---|---|---|
| `build` | `cicd.yml` | **Gating** | push, PR, dispatch | — |
| `lint` | `cicd.yml` | **Gating** | push, PR, dispatch | — |
| `test-unit` | `cicd.yml` | **Gating** | push, PR, dispatch | `coverage-lcov` |
| `semgrep` | `cicd.yml` | **Gating** | push main/tag/dispatch uniquement | — |
| `sonarqube` | `cicd.yml` | Conditionnel | push, PR, dispatch (après test-unit) | — (résultats SonarQube) |
| `docker` | `cicd.yml` | **Gating** | push, PR, dispatch (après lint+test+semgrep+sonar) | Image GHCR |
| `scan-image` | `cicd.yml` | Informationnel | après docker success | `trivy-results.sarif` (Security tab) |
| `test-e2e` | `cicd.yml` | Conditionnel | push, approval PR, `/run-e2e`, dispatch | — |
| `mutation-test` | `cicd.yml` | Informationnel | push main, approval PR, `/run-mutation`, dispatch | `stryker-mutation-report` |
| `deploy-preprod` | `cicd.yml` | Conditionnel | push main ou PR avec `[DEPLOY]` | — |
| `deploy-prod` | `cicd.yml` | Conditionnel | tag `v*` | — |
| `release` | `cicd.yml` | Conditionnel | push main (non-chore) | Tag git, CHANGELOG |
| `notify` | `cicd.yml` → `discord-notify.yml` | Informationnel | après deploy-preprod/deploy-prod | Message Discord |
| `pr-report` | `cicd.yml` | Infrastructurel | PR, issue_comment | Commentaire PR |
| `workflow-status` | `cicd.yml` | Infrastructurel | always | — |

### Frontend (`teamdivergentes/dvg-web-frontend`)

| Nom du job | Workflow | Catégorie | Déclencheurs | Artefacts produits |
|---|---|---|---|---|
| `build` | `cicd.yml` | **Gating** | push, PR, dispatch | — |
| `lint` | `cicd.yml` | **Gating** | push, PR, dispatch | — |
| `test` | `cicd.yml` | **Gating** | push, PR, dispatch | `coverage-report` |
| `semgrep` | `cicd.yml` | **Gating** | push main/tag/dispatch uniquement | — |
| `sonarqube` | `cicd.yml` | Conditionnel | après test (push, PR, dispatch) | — (résultats SonarQube) |
| `docker` | `cicd.yml` | **Gating** | push, PR, dispatch (après lint+test+semgrep+sonar) | Image GHCR |
| `scan-image` | `cicd.yml` | Informationnel | après docker success | `trivy-results.sarif` (Security tab) |
| `e2e` | `cicd.yml` | Conditionnel | push, approval PR, `/run-e2e`, dispatch | `playwright-report`, `playwright-test-results` |
| `lighthouse` | `cicd.yml` | Informationnel | push main/tag, `/run-lighthouse`, dispatch | `lighthouse-results` |
| `mutation-test` | `cicd.yml` | Informationnel | push main, approval PR, `/run-mutation`, dispatch | `stryker-mutation-report` |
| `deploy-preprod` | `cicd.yml` | Conditionnel | push main ou PR avec `[DEPLOY]` | — |
| `deploy-prod` | `cicd.yml` | Conditionnel | tag `v*` | — |
| `release` | `cicd.yml` | Conditionnel | push main (non-chore) | Tag git, CHANGELOG |
| `notify` | `cicd.yml` → `discord-notify.yml` | Informationnel | après deploy-preprod/deploy-prod | Message Discord |
| `pr-report` | `cicd.yml` | Infrastructurel | PR, issue_comment | Commentaire PR |
| `workflow-status` | `cicd.yml` | Infrastructurel | always | — |

### Workflows indépendants

| Workflow | Dépôt | Déclencheurs | Description |
|---|---|---|---|
| `e2e-fullstack.yml` | frontend | push main, approval PR, `/run-e2e`, dispatch | Stack complète via `docker-compose.e2e.yml` (PG + backend + frontend). Résultat récupéré via `gh api` cross-workflow. |
| `ghcr-cleanup.yml` | backend + frontend | schedule (cron) + dispatch | Nettoyage des images GHCR obsolètes. Mention uniquement dans le commentaire (informationnel). |
| `discord-notify.yml` | backend + frontend | Appelé en `uses:` depuis `cicd.yml` | Workflow réutilisable, notification Discord post-déploiement. |
| `runner-check.yml` | backend + frontend | schedule + dispatch | Santé du self-hosted runner. |

---

## Logique du statut global

Le commentaire affiche `✅ SUCCESS` ou `❌ FAILED` selon les trois catégories de jobs :

### Gating (bloquent SUCCESS)

Un seul job gating en `failure` ou `cancelled` => `OVERALL_STATUS = ❌ FAILED`.

**Backend :** `build`, `lint`, `test-unit`, `semgrep` (si non-skipped), `docker`

**Frontend :** `build`, `lint`, `test`, `semgrep` (si non-skipped), `docker`

Les jobs gating sont évalués dans la boucle `for gating_job in ...` du script. Un job `skipped` est acceptable (ne casse pas SUCCESS).

### Conditionnel (échouent seulement s'ils ont tourné)

Ces jobs ne bloquent SUCCESS que s'ils ont effectivement été déclenchés et ont échoué.

- `test-e2e` / `e2e` : déclenché sur push, approval, ou `/run-e2e`
- `deploy-preprod`, `deploy-prod` : déclenché selon le contexte
- `sonarqube` : déclenché après les tests (non-bloquant en cas d'échec de la QG — `continue-on-error: true`)
- `lighthouse` (frontend) : informationnel, non bloquant

### Informationnel (n'impactent pas SUCCESS)

Ces jobs apparaissent dans le commentaire mais n'influencent jamais `OVERALL_STATUS` :

- `scan-image` (Trivy) : non bloquant
- `mutation-test` (Stryker) : non bloquant (`continue-on-error: true`)
- `notify` / `release` : infrastructurel
- `e2e-fullstack` (cross-workflow) : affiché dans le tableau et dans la section nightly

---

## Sections du commentaire (ordre)

Les deux commentaires (backend et frontend) partagent le même ordre de sections :

1. **En-tête** — `## {emoji} Rapport de Build - {Backend NestJS|Frontend Angular}`
2. **Statut global** — `### 📊 Statut global` + `OVERALL_STATUS`
3. **`🔧 Détails du build`** — Table principale avec tous les jobs
4. **`🐳 Image Docker`** — Tags, commandes pull/run, ou message d'erreur
5. **`🎭 Tests E2E`** — Détail E2E isolé (supertest pour backend, Playwright pour frontend)
6. **`🔁 E2E Full-Stack`** — Statut cross-workflow `e2e-fullstack.yml`
7. **`🔍 Sécurité image (Trivy)`** — Résultat scan Trivy + lien Security tab
8. **`📋 Informations sur le build`** — Commit, branche, acteur, date, lien run
9. **`🚀 Déploiement`** — Statut PREPROD/PROD ou instructions `[DEPLOY]`
10. **`🗄️ Base de données`** — Config PostgreSQL / Prisma (backend uniquement)
11. **`⚡ Lighthouse`** — Résultat audit (frontend uniquement)
12. **`🌙 Nightly checks`** — Statut nightly des jobs conditionnels sur `main`
13. **Pied de page** — `*Ce rapport a été généré automatiquement par le pipeline CI/CD.*`

---

## Procédure d'ajout d'un nouveau job CI

Lors de l'ajout d'un job dans `cicd.yml`, suivre cette checklist dans l'ordre :

1. **Ajouter le job dans `.github/workflows/cicd.yml`** avec sa logique `if:` et ses `needs:`.

2. **Si le job est gating** : l'ajouter aux `needs:` du job `workflow-status` ET vérifier que le script `workflow-status` teste bien son résultat avec `exit 1` en cas de failure.

3. **Ajouter le job aux `needs:` du job `pr-report`** pour que son statut soit disponible.

4. **Exposer une variable `<NOM_JOB>_STATUS`** dans le bloc `env:` du job `pr-report` :
   ```yaml
   env:
     MON_JOB_STATUS: ${{ needs.mon-job.result || 'skipped' }}
   ```

5. **Ajouter une ligne dans la table principale** de `generate-pr-report.sh` (section `🔧 Détails du build`), en respectant le format :
   ```bash
   | **Nom affiché** | ${MON_JOB_EMOJI} \`${MON_JOB_STATUS}\` | Description courte — [détails](${RUN_LINK}) |
   ```
   Et l'emoji correspondant juste avant la table :
   ```bash
   MON_JOB_EMOJI="$(status_emoji "$MON_JOB_STATUS")"
   ```

6. **Ajouter une section repliable** si le job produit des artefacts ou des liens externes pertinents (rapport HTML, Security tab, etc.). Utiliser le pattern `if/elif/else` existant pour les états success/failure/skipped.

7. **Mettre à jour le calcul `OVERALL_STATUS`** selon la catégorie :
   - Gating : ajouter la variable dans la boucle `for gating_job in ...`
   - Conditionnel : documenter le comportement dans un commentaire
   - Informationnel : ne rien changer au calcul

8. **Mettre à jour ce fichier** (`docs/devsecops/pr-comment.md`) : ajouter une ligne au tableau du catalogue, et mettre à jour la section « Logique du statut global » si nécessaire.

9. **Tester sur une PR réelle** : vérifier que le commentaire reflète bien le nouveau job (statut correct, lien valide, section repliable opérationnelle).

---

## Debugging

### Trouver les logs d'un job

Chaque ligne du tableau contient un lien `[détails]` pointant vers le run courant. Cliquer dessus ouvre la page Actions du run, puis sélectionner le job concerné.

### Jobs conditionnels — déclencher manuellement

Les jobs conditionnels peuvent être déclenchés par commentaire sur la PR :

| Commande | Job déclenché |
|---|---|
| `/run-e2e` | `test-e2e` (backend) ou `e2e` (frontend) + `e2e-fullstack.yml` |
| `/run-mutation` | `mutation-test` |
| `/run-lighthouse` | `lighthouse` (frontend uniquement) |

### Section Nightly checks

La section `🌙 Nightly checks` affiche le dernier statut sur `main` des jobs conditionnels. Ces statuts sont récupérés via l'API GitHub (`gh api`) au moment de la génération du commentaire. Si le token n'est pas disponible ou si le réseau est inaccessible, les valeurs s'affichent `—`.

### Commentaire non publié / non mis à jour

Le script `publish-pr-comment.cjs` cherche un commentaire existant avec le marqueur `<!-- dvg-ci-report -->`. S'il n'en trouve pas, il en crée un nouveau. S'il en trouve un, il le met à jour. En cas d'erreur de permissions, vérifier que le job `pr-report` a bien `pull-requests: write` dans ses `permissions:`.

### Rapport généré mais vide

Si `generate-pr-report.sh` échoue silencieusement (variables gating manquantes), le script sort avec `exit 1`. Vérifier que toutes les variables `*_STATUS` obligatoires sont bien exposées dans le bloc `env:` du job `pr-report`.

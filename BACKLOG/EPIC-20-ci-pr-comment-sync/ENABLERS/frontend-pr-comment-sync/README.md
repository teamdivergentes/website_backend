# Enabler — Frontend PR comment sync

## Contexte technique

Le job `pr-report` de `frontend/.github/workflows/cicd.yml` reçoit déjà `TEST_STATUS`, `E2E_STATUS` et `LIGHTHOUSE_STATUS` en variables d'env, mais le script `generate-pr-report.sh` **ne les lit jamais** : la table « 🔧 Détails du build » n'affiche ni les TU Karma, ni l'E2E Playwright, ni Lighthouse. C'est un bug de visibilité qui dure depuis l'ajout de ces jobs.

En plus, les jobs `scan-image` (Trivy), `release` (semantic-release) et `notify` (Discord) ne sont pas non plus reportés. Et le workflow externe `e2e-fullstack.yml` (E2E full-stack via Docker Compose, déclenché sur approbation de PR) n'a aucun rendu dans la PR de son repo.

## Objectif

Refléter **tous** les jobs frontend dans le commentaire PR, plus une mention informative pour `e2e-fullstack.yml`. Recalculer le statut global pour qu'il tienne compte des jobs gating réels.

## Direction technique

1. Étendre la table « 🔧 Détails du build » de `generate-pr-report.sh` avec :
   - **Tests unitaires** (TEST_STATUS — bug existant à corriger)
   - **Tests E2E** (E2E_STATUS, conditionnel)
   - **Lighthouse** (LIGHTHOUSE_STATUS, conditionnel)
   - **Scan image (Trivy)** (informationnel)
   - **Release** (semantic-release, skipped sur PR)
   - **Notification Discord** (skipped sur PR)
2. Ajouter au job `pr-report` les variables `SCAN_IMAGE_STATUS`, `RELEASE_STATUS`, `NOTIFY_STATUS` et les `needs:` correspondants.
3. Ajouter une section repliable « 🎭 Tests E2E » avec :
   - Statut Playwright
   - Lien vers l'artifact `playwright-report` (commande pour télécharger)
   - Mention « Pour relancer manuellement : commenter `/run-e2e` sur la PR »
4. Ajouter une section repliable « ⚡ Lighthouse » avec :
   - Statut + lien artifact `lighthouse-results`
   - Mention « Non bloquant. Pour déclencher manuellement : commenter `/run-lighthouse` »
5. Ajouter une section repliable « 🔍 Sécurité image (Trivy) » avec lien GitHub Security tab.
6. Ajouter une section repliable « 🔁 E2E Full-Stack » qui mentionne le workflow externe `e2e-fullstack.yml`, son statut récupéré via API GitHub (best-effort) ou simplement une note explicative + lien vers le run.
7. Recalculer `OVERALL_STATUS` selon la même logique que `workflow-status` (build, lint, test, semgrep, docker gating ; e2e/lighthouse conditionnels ; scan-image informationnel).

## US

| US | Claude | PO | E2E | Livré |
|----|--------|----|----|-------|
| [us-fix-test-unit-row.md](us-fix-test-unit-row.md) | Fait | A faire | A faire | A faire |
| [us-add-e2e-and-lighthouse.md](us-add-e2e-and-lighthouse.md) | Fait | A faire | A faire | A faire |
| [us-add-scan-image-trivy.md](us-add-scan-image-trivy.md) | Fait | A faire | A faire | A faire |
| [us-add-release-and-notify.md](us-add-release-and-notify.md) | Fait | A faire | A faire | A faire |
| [us-add-e2e-fullstack-mention.md](us-add-e2e-fullstack-mention.md) | Fait | A faire | A faire | A faire |
| [us-recompute-global-status.md](us-recompute-global-status.md) | Fait | A faire | A faire | A faire |

## Critères de validation enabler

- Sur une PR frontend, le commentaire CI liste les 6 nouvelles lignes
- Les TU Karma s'affichent enfin (régression d'origine corrigée)
- Une PR avec `e2e: failure` (déclenché par `/run-e2e`) affiche le statut et le lien artifact
- Une PR avec `scan-image: failure` reste en SUCCESS global mais avec encart d'alerte
- Pas de régression sur la section Docker / Déploiement existante

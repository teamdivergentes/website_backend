# US — Recalculer le statut global du commentaire frontend

## Rôle / Action / Bénéfice

> **En tant que** reviewer frontend,
> **je veux** que le statut global du commentaire CI reflète **réellement** la santé de la CI frontend,
> **afin de** ne pas merger en pensant que tout est vert alors qu'un job gating a été ignoré dans le calcul.

## Critères d'acceptation

- [ ] Le calcul de `OVERALL_STATUS` dans `frontend/.github/scripts/generate-pr-report.sh` (ligne 19 actuelle) est aligné avec la logique du job `workflow-status` de `cicd.yml`
- [ ] Jobs **gating** (failure → SUCCESS impossible) :
  - `build`, `lint`, `test` (Karma), `semgrep`, `docker`
- [ ] Jobs **conditionnels** (skipped accepté) :
  - `e2e` (Playwright, déclenché sur approbation/commentaire)
  - `lighthouse` (déclenché sur main/commentaire)
- [ ] Jobs **informationnels** (n'invalident pas SUCCESS) :
  - `scan-image` (Trivy)
  - `deploy-preprod` / `deploy-prod` (skipped sur PR sans `[DEPLOY]`)
  - `release` / `notify` (skipped sur PR)
- [ ] Une PR avec `test: failure` (Karma) affiche `❌ FAILED`
- [ ] Une PR avec `lighthouse: failure` mais tous les gating verts reste `✅ SUCCESS` avec encart d'alerte
- [ ] Documentation inline dans le script (commentaire en tête) listant les 3 catégories

## Effort estimé

S (~1 h)

## Dépendances

- US `us-fix-test-unit-row.md`
- US `us-add-e2e-and-lighthouse.md`
- US `us-add-scan-image-trivy.md`
- US `us-add-release-and-notify.md`

## Note

À livrer **en dernier** dans l'enabler.

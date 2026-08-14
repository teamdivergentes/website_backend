# US — Recalculer le statut global du commentaire backend

## Rôle / Action / Bénéfice

> **En tant que** reviewer,
> **je veux** que le statut global affiché en haut du commentaire PR reflète **réellement** la santé de la CI,
> **afin de** ne pas merger en pensant que tout est vert alors qu'un job gating a été ignoré dans le calcul.

## Critères d'acceptation

- [ ] Le calcul de `OVERALL_STATUS` dans `generate-pr-report.sh` (ligne 22 actuelle) est aligné avec la logique du job `workflow-status` de `cicd.yml`
- [ ] Jobs **gating** (failure → SUCCESS impossible) :
  - `build`, `lint`, `test-unit`, `validate-migrations`, `semgrep`, `docker`
- [ ] Jobs **conditionnels** (skipped accepté) :
  - `test-e2e` (peut être skipped sur PR push, normal)
- [ ] Jobs **informationnels** (n'invalident pas SUCCESS, mais visibles) :
  - `scan-image` (Trivy, `exit-code: 0`)
  - `deploy-preprod` / `deploy-prod` (skipped sur PR sans `[DEPLOY]`)
  - `release` / `notify` (skipped sur PR)
- [ ] Une PR avec `validate-migrations: failure` affiche `❌ FAILED`
- [ ] Une PR avec `scan-image: failure` mais tous les gating verts affiche `⚠️ SUCCESS (avec alertes)` (nouvel état) ou reste `✅ SUCCESS` avec un encart d'avertissement clair
- [ ] Documentation inline dans `generate-pr-report.sh` (commentaire en tête de la section calcul) listant les 3 catégories de jobs

## Effort estimé

S (~1 h)

## Dépendances

- US `us-add-validate-migrations.md`
- US `us-add-scan-image-trivy.md`
- US `us-add-release-and-notify.md`

## Note

À livrer **en dernier** dans l'enabler (rebase sur les 3 autres US).

# Enabler — Backend PR comment sync

## Contexte technique

Le job `pr-report` de `backend/.github/workflows/cicd.yml` ne reçoit ni n'affiche les jobs `validate-migrations`, `scan-image` (Trivy), `release` (semantic-release) et `notify` (Discord). De plus, le statut global calculé par `generate-pr-report.sh` ignore `validate-migrations` et `scan-image`, ce qui peut afficher « ✅ SUCCESS » alors qu'une migration Prisma est cassée ou qu'un CVE HIGH a été détecté.

## Objectif

Refléter dans le commentaire PR **tous les jobs réellement exécutés** côté backend, avec un statut global qui tient compte des jobs gating (build, lint, test-unit, semgrep, validate-migrations, docker, scan-image) et un affichage informationnel pour les autres (test-e2e quand skipped, release, notify).

## Direction technique

1. Ajouter `validate-migrations` au `needs:` du job `pr-report` (manquant aujourd'hui).
2. Passer les nouvelles variables d'env au job `pr-report` :
   - `VALIDATE_MIGRATIONS_STATUS`
   - `SCAN_IMAGE_STATUS`
   - `RELEASE_STATUS`
   - `NOTIFY_STATUS`
3. Étendre la table « Détails du build » de `generate-pr-report.sh` avec ces 4 lignes.
4. Recalculer `OVERALL_STATUS` en incluant `validate-migrations` et `scan-image` comme jobs gating, en gardant `test-e2e` informationnel (peut être `skipped` sur PR push, c'est normal).
5. Ajouter une section repliable « 🔍 Sécurité image (Trivy) » avec lien vers GitHub Security tab quand `scan-image` a tourné.
6. Ajouter une section repliable « 🗄️ Migrations Prisma » qui rend explicite l'exécution `prisma migrate diff` (succès = base à jour vs schema, échec = drift).

## US

| US | Claude | PO | E2E | Livré |
|----|--------|----|----|-------|
| [us-add-validate-migrations.md](us-add-validate-migrations.md) | Fait | A faire | A faire | A faire |
| [us-add-scan-image-trivy.md](us-add-scan-image-trivy.md) | Fait | A faire | A faire | A faire |
| [us-add-release-and-notify.md](us-add-release-and-notify.md) | Fait | A faire | A faire | A faire |
| [us-recompute-global-status.md](us-recompute-global-status.md) | Fait | A faire | A faire | A faire |

## Critères de validation enabler

- Sur une PR backend, le commentaire CI affiche les 4 nouvelles lignes
- Le statut global « ❌ FAILED » s'affiche si un job gating réel échoue (testé en cassant volontairement une migration sur une PR de test)
- Lien Trivy SARIF visible quand `scan-image` a tourné
- Aucune régression sur les sections existantes (Build, Docker, Déploiement, Base de données)

## Réconciliation post-rebase (2026-04-30)

Au moment du merge sur `develop`, le scope a été réduit suite à la simplification du job `pr-report` côté `develop` (PR #90, #91, #94 antérieures à la livraison de #84) :

- `validate-migrations` retiré du workflow → step inline `Validate schema drift` dans `test-unit` (cf. PR #90), donc plus de ligne dédiée dans le tableau
- `release`, `notify` retirés du `needs` de `pr-report` → plus de variables `RELEASE_STATUS` / `NOTIFY_STATUS`
- `SCAN_IMAGE_STATUS` retiré du `needs` exposé (le job `scan-image` reste dans `needs:` pour le séquencement mais son statut n'est plus dans le tableau)
- Section Trivy conditionnelle et section Migrations repliable supprimées

Reste livré (PR backend #84, sha `fbf5691`) :

- Helper `status_icon()` ✅/❌/⏭️/⚠️
- Liens `[logs]` cliquables sur chaque ligne du tableau (via `GITHUB_RUN_ID`)
- `OVERALL_STATUS` recalculé sur les 5 jobs gating réels (`build`, `lint`, `test-unit`, `semgrep`, `docker`)
- Section « Nightly checks » avec `fetch_last_nightly_job()` pour `mutation-test` et `test-e2e`

L'écart entre la direction technique initiale et le scope final est tracé pour information — les US `us-add-validate-migrations.md`, `us-add-scan-image-trivy.md`, `us-add-release-and-notify.md` sont obsolètes au moment du merge mais leur valeur métier (recalcul global + lisibilité) est conservée par `us-recompute-global-status.md`.

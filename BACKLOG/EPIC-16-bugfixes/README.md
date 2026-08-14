# EPIC-16 — Bugfixes (footer, analytics, auth admin)

## Objectif

Corriger 3 bugs remontes par le chef de projet le 2026-04-25, sans introduire de nouvelle fonctionnalite. Branche courte, livraison rapide en preprod.

## Perimetre

3 enablers techniques :
- Aligner la visibilite des pages entre header et footer
- Fixer l'UX du dashboard admin Analytics (chargement initial, metriques vides, info consent)
- Renforcer la persistance de la session admin (cookie HttpOnly + refresh + correction du bug de rehydratation)

## Hors perimetre

- Migration vers Matomo / autre solution analytique → reporte dans **EPIC-18**
- Toute nouvelle feature (live, twitch, page joueurs) → reporte dans **EPIC-17**

## Branche git

`fix/epic-16-bugfixes` (depuis `main`).

## Suivi par enabler

| Enabler | Claude | PO | E2E | Livre |
|---------|--------|----|----|-------|
| [Footer / header alignment](ENABLERS/footer-pages-visibility/README.md) | Fait | Fait | Fait | A faire |
| [Analytics dashboard UX fix](ENABLERS/analytics-dashboard-fix/README.md) | Fait (PR #132 mergee sur develop 2026-04-29) | Fait | Fait | A faire |
| [Admin auth persistence](ENABLERS/admin-auth-persistence/README.md) | Fait (PR #160 mergee sur develop 2026-05-06, valide 7/7 Playwright preprod) | A faire | A faire | A faire |
| [Nginx security headers /admin et /auth](ENABLERS/nginx-security-headers-admin-auth/README.md) | Fait (PR #172 mergee 2026-05-07) | A faire | A faire | A faire |
| [Divergences CI trivy + build-push-action](ENABLERS/ci-trivy-build-push-divergence/README.md) | Fait (PRs #164 #120 #173 mergees 2026-05-06/07) | A faire | A faire | A faire |
| [Permissions upload images role CM](ENABLERS/cm-upload-role-permissions/README.md) | Fait (3 decorateurs @Roles + spec TDD, 257/257 verts, branches non pushees 2026-05-16) | A faire | A faire | A faire |
| [Seed catégories d'articles en prod](ENABLERS/seed-article-types/README.md) | Fait (migration 20260517140000 + seed.ts, 625/625 tests verts, 2026-05-17) | A faire | A faire | A faire |

## Criteres de validation EPIC

- VQO >= 9.5/10 sur tous les domaines
- Toutes les US enabler en `Fait Claude` + `Fait PO`
- Tests E2E pour les 3 sujets (parcours nominal + erreur)
- Aucune regression sur les pages publiques ni sur le panel admin

# Enabler E1 — Backend config seed pour `page_twitch_visible`

## Objectif

Creer la cle de configuration `page_twitch_visible` cote backend pour qu'elle existe sur DB fresh (via le seed) ET sur les bases existantes (via migration data idempotente).

## Repos

`backend`

## Branche git

`feat/epic-22-twitch-visibility-toggle` (depuis `develop`).

## Suivi par US

| US | Claude | PO | E2E | Livre |
|----|--------|----|----|-------|
| [us-add-page-twitch-visible-seed.md](us-add-page-twitch-visible-seed.md) | A faire | A faire | A faire | A faire |
| [us-migration-upsert-page-visible-keys.md](us-migration-upsert-page-visible-keys.md) | A faire | A faire | A faire | A faire |

## Criteres de validation enabler

- [ ] `prisma/seed.ts` contient `page_twitch_visible` (ligne ajoutee dans la liste des Config visibilite)
- [ ] `prisma/seed.sql` contient `page_twitch_visible` ET `page_articles_visible` (alignement avec seed.ts)
- [ ] Nouvelle migration Prisma data (`prisma/migrations/<date>_add_page_twitch_visible_config/migration.sql`) effectue un INSERT idempotent
- [ ] La migration ajoute aussi `page_articles_visible` si manquante (cleanup de coherence)
- [ ] `npx prisma migrate deploy` reste idempotent (re-run sans erreur)
- [ ] Tests unitaires/e2e backend continuent de passer
- [ ] Description claire du toggle visible dans le panneau admin (ex : "Afficher la page En Live (Twitch)")

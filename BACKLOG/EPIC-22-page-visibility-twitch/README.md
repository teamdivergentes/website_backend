# EPIC-22 — Visibilite admin de la page En Live (Twitch) — `FAIT CLAUDE`

## Objectif

Permettre aux administrateurs de masquer/afficher la page publique `/twitch` ("EN LIVE") depuis le panneau de configuration, au meme titre que les autres pages publiques toggleables (boutique, contact, equipes, sponsors, recrutement, articles).

## Contexte

Demande PO du 2026-05-09 : depuis la livraison d'EPIC-17 (page Twitch), aucun mecanisme admin ne permet de la desactiver temporairement (ex : aucune chaine configuree, debug, downtime Twitch). Le toggle doit s'integrer au mecanisme existant `page_<nom>_visible` deja utilise par les autres pages.

## Etat des lieux (audit 2026-05-09)

Le systeme de visibilite est deja **partiellement integre** cote frontend :

| Composant | Etat |
|-----------|------|
| `frontend/src/app/admin/pages/config/config-page.component.ts` ligne 61 | **Fait** : champ `page_twitch_visible` dans le formulaire admin |
| `frontend/src/app/admin/pages/config/config-page.component.html` ligne 461-463 | **Fait** : toggle UI + binding |
| `frontend/src/app/shared/services/config.service.ts` ligne 64-68 | **Fait** : computed `pageTwitchVisible` (default `true` si cle absente) |
| `frontend/src/shared/services/page-visibility.service.ts` ligne 19, 60-62 | **Fait** : routing `/twitch` -> config |
| `frontend/src/shared/headers/header/header.ts` ligne 87-89 | **Fait** : link "EN LIVE" hidden si toggle `false` |
| `backend/prisma/seed.ts` | **Manquant** : pas d'entree `page_twitch_visible` |
| `backend/prisma/seed.sql` | **Manquant** : pas d'entree `page_twitch_visible` (ni `page_articles_visible` au passage) |
| Migration data | **Manquant** : pas d'UPSERT pour les bases existantes |

## Perimetre

1 feature + 1 enabler :

- **F1** : Toggle admin "Afficher la page En Live (Twitch)" dans le panneau de configuration (~validation cote frontend, deja code)
- **E1** : Seed backend + migration Prisma pour creer la cle `page_twitch_visible` (et corriger la cle manquante `page_articles_visible` pour coherence)

## Hors perimetre

- Modifier la logique de la page `/twitch` elle-meme (les 3 etats live/offline/no-channel restent inchanges)
- Ajouter un guard cote route Angular pour bloquer l'acces direct par URL — le hide du lien header suffit (comportement aligne sur les autres pages)
- Refonte du systeme de visibilite (deja en place, on ajoute juste une cle)

## Branche git

- `feat/epic-22-twitch-visibility-toggle` (depuis `develop`, backend repo)

## Suivi par feature/enabler

| Feature / Enabler | Claude | PO | E2E | Livre |
|-------------------|--------|----|----|-------|
| [E1 — Backend config seed Twitch](ENABLERS/backend-config-seed-twitch/README.md) | Fait (PR backend #127 mergee develop 2026-05-09) | A faire | A faire | A faire |
| [F1 — Admin toggle Twitch visibility](FEATURES/admin-toggle-twitch-visibility/README.md) | Fait (PR frontend #175 mergee develop 2026-05-09) | A faire | A faire | A faire |

## Criteres de validation EPIC

- [ ] La cle `page_twitch_visible` existe en base (default `true`) sur DB fresh ET DB existante (migration)
- [ ] Le toggle dans le panneau admin met a jour la valeur en base et persiste apres reload
- [ ] Quand `page_twitch_visible = false` :
  - le lien "EN LIVE" disparait du header desktop ET du menu mobile
  - la LED rouge associee disparait
  - la route `/twitch` reste accessible par URL directe (comportement existant des autres pages)
- [ ] Quand `page_twitch_visible = true` (defaut) le comportement actuel n'est pas altere
- [ ] Tests E2E couvrent les deux etats (toggle on/off)
- [ ] Aucune regression sur la page `/twitch` (3 etats live/offline/no-channel)
- [ ] Aucune regression sur les 6 autres toggles existants (boutique, contact, equipes, sponsors, recrutement, articles)
- [ ] VQO >= 9.5/10 sur tous les domaines

## Origine

Demande PO du 2026-05-09 : "creer une EPIC sur la visibilite des pages dans le panneau de configuration afin d'ajouter la visibilite ou non de la page En live / twitch".

## Estimation

XS (~1 h cumulee : ~30min backend + ~30min E2E + revue).

## Dependances

Aucune. EPIC-17 (page Twitch) deja livre. Le systeme de toggle existe deja.

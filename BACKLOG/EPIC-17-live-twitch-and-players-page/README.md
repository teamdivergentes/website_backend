# EPIC-17 — Live Twitch & restructuration page joueurs

## Objectif

Apporter deux nouvelles fonctionnalites majeures au site :

1. Une page publique **`/twitch`** ("EN LIVE") qui affiche les streamers Divergentes en cours de stream avec un statut temps reel, accessible via un nouvel item de menu "EN LIVE" + LED rouge dans le header.
2. Une **gestion admin des chaines Twitch** (CRUD) pour piloter quels streamers apparaissent sur la page En Live.
3. Une **restructuration de la page detail equipe** pour mettre le nom de l'equipe en titre principal, ajouter une section "Notre Coaching staff" (conditionnelle), et reorganiser la hierarchie visuelle.

## Perimetre

4 features + 1 enabler technique :

- **F1** : Page En Live (`/twitch`) avec 3 etats (1 streamer / N streamers / aucun)
- **F2** : Indicateur live dans le header (item "EN LIVE" + LED rouge animee / grise)
- **F3** : Admin Twitch CRUD (page `/admin/twitch-channels` + modal create/edit)
- **F4** : Restructuration page joueurs avec ajout du coaching staff
- **E1** : Modeles BDD `TwitchChannel` + `CoachingStaff` + integration API Twitch Helix

## Hors perimetre

- Migration vers EventSub Twitch (push) → si polling 60 s suffit, on reste sur Helix polling. EventSub fait l'objet d'un spike technique en debut d'EPIC.
- Stats avancees (top games joues, historique de streams, replay) → pourra faire l'objet d'un EPIC ulterieur.

## Branche git

`feat/epic-17-live-twitch` (depuis `main`).

## Suivi par feature

| Feature / Enabler | Claude | PO | E2E | Livre |
|-------------------|--------|----|----|-------|
| [E1 — BDD & API Twitch / Coaching](ENABLERS/twitch-and-coaching-data-layer/README.md) | Fait (PR #117 data migration permissions mergee develop 2026-05-06 + PR #118 include coachingStaff en cours) | Fait (recette 2026-05-05) | A faire | A faire |
| [F1 — Page En Live](FEATURES/page-en-live/README.md) | Fait (PR #154 mergee develop 2026-05-05) | Fait (recette 2026-05-05) | A faire | A faire |
| [F2 — Header live indicator](FEATURES/header-live-indicator/README.md) | Fait (PR #154 mergee develop 2026-05-05) | Fait (recette 2026-05-05) | A faire | A faire |
| [F3 — Admin Twitch CRUD](FEATURES/admin-twitch-management/README.md) | Fait (PR #119 mergee develop 2026-05-04) | Fait (recette 2026-05-05) | A faire | A faire |
| [F4 — Restructuration page joueurs](FEATURES/players-page-reorganization/README.md) | Fait (admin coaching staff CRUD implémenté 2026-05-07 — branche feat/epic-17-admin-coaching-staff-crud) | Fait (joueurs + section coaching publique — recette 2026-05-05) | A faire | A faire |

> **Note 2026-05-07** : L'admin CRUD coaching staff (`us-admin-coaching-staff-management.md`) **revient dans le scope EPIC-17** (decision PO du 2026-05-07, revirement de la decision du 2026-05-05). Pre-requis BDD :
> - ✅ PR #117 (data migration permissions) **mergee develop 2026-05-06**
> - 🔄 PR #118 (include coachingStaff dans teams.service.findBySlug) en cours CI
> - ✅ Backend CRUD admin coaching staff deja complet

## Decisions structurantes (brainstorming 2026-04-25)

- Route page live : **`/twitch`** (deja prevue en navigation-pages.ts, juste a activer)
- Layout dynamique : **embed unique** si 1 stream / **grille de cards** si >= 2 / **chaines clickables** si aucun
- Detection live : **polling Helix toutes les 60 s** cote backend (cache 60 s) — EventSub considere via spike
- Header : item "EN LIVE" tout a droite (avant icone Twitch) + LED rouge animee si live, grise sinon, dans **les deux cas le menu reste cliquable**
- Style badge : **rectangulaire** (pas de border-radius)
- Modele BDD :
  - `TwitchChannel` standalone avec `teamMemberId Int?` (optionnel) — permet de couvrir les streamers non lies a une team (ambassadeurs)
  - `CoachingStaff` modele separe lie a `Team` (sememantique distincte de `TeamMember`, vocabulaire de role distinct : Head Coach, Drafter, Preparateur, Analyste, Manager…)
- Page detail equipe (ordre des sections) :
  1. Nom equipe (H1 blanc, Bebas Neue, centre)
  2. "NOS JOUEURS" (H2 vert, centre, gros) → grille
  3. "NOTRE COACHING STAFF" (H2 vert, conditionnelle si >= 1 coach) → grille
  4. Image + description (en bas, layout existant)

## Criteres de validation EPIC

- VQO >= 9.5/10 sur tous les domaines
- Toutes les features en `Fait Claude` + `Fait PO`
- Tests E2E : page En Live (3 etats), navigation header live, page joueurs reorganisee, admin Twitch CRUD
- Variables d'env Twitch documentees (`TWITCH_CLIENT_ID`, `TWITCH_CLIENT_SECRET`)
- Aucune regression sur les pages publiques existantes ni sur l'admin existant

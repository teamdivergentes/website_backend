# Feature — Restructuration page detail equipe + admin coaching staff

## Routes

- `/structure/equipes/:slug` (page publique existante a restructurer)
- `/admin/teams/:teamId/coaching-staff` (nouveau sous-onglet admin) — ou integration dans la page admin team detail

## Branche git

`feat/epic-17-live-twitch` (commune a tout l'EPIC-17).

## Fonctionnalites

### Restructuration page publique

Reorganiser `/structure/equipes/:slug` (composant `team-detail.html`) selon le nouvel ordre demande :

1. **Nom de l'equipe** en H1 blanc, Bebas Neue, centre, gros (48 px desktop)
2. **"NOS JOUEURS"** en H2 vert, centre, gros (42 px desktop)
3. Grille des joueurs (existante)
4. **"NOTRE COACHING STAFF"** en H2 vert, centre — affichage **conditionnel** : visible uniquement si `coachingStaff.length >= 1`
5. Grille du coaching staff (3 col centre, 75% largeur)
6. Image + description (existante, en bas)

Le bouton "Retour" reste en haut a gauche.

### Admin coaching staff

CRUD complet des `CoachingStaff` integre dans le panel admin Teams. Calque sur l'existant `TeamMember` :
- Liste des coachs sous la liste des joueurs dans `/admin/teams/:id`
- Bouton "+ Ajouter un coach" qui ouvre une modal
- Champs : nom, vrai nom, role (libre), image, biographie, position, slug, socials
- Actions : modifier, supprimer, reordonner

## Suivi US

| US | Claude | PO | E2E | Livre |
|----|--------|----|----|-------|
| [us-restructure-team-detail-page.md](us-restructure-team-detail-page.md) | Fait (PR #133 mergee develop 2026-04-29) | Fait (recette 2026-05-05) | A faire | A faire |
| [us-frontend-coaching-staff-section.md](us-frontend-coaching-staff-section.md) | Fait (PR #133 mergee develop 2026-04-29) | Fait (recette 2026-05-05) | A faire | A faire |
| [us-admin-coaching-staff-management.md](us-admin-coaching-staff-management.md) | Fait | A faire | A faire | A faire |

> **Decision PO 2026-05-07** : `us-admin-coaching-staff-management.md` est **re-integre dans le scope EPIC-17** (revirement de la decision du 2026-05-05). Maxime souhaite finaliser la feature coaching staff de bout en bout dans l'EPIC pour livrer une feature complete (public + admin) en v1.4.0.

### Pre-requis BDD identifies (investigation 2026-05-07)

Avant de lancer le dev frontend admin, verifier / completer :

1. **PR #117 (data migration permissions Twitch & Coaching)** est encore OPEN — doit etre mergee sur develop pour que les roles systeme `Admin` et `Gestionnaire` aient les permissions `coaching_staff:*` en preprod/prod (sinon 403 a l'usage admin reel).
2. **`teams.service.findBySlug()` n'inclut pas `coachingStaff`** dans le `include` Prisma — l'US `us-frontend-coaching-staff-section.md` exige pourtant cet include (ligne 11). Le frontend `team-detail.ts` lit `team.coachingStaff` mais l'endpoint `GET /api/teams/:slug` ne le renvoie pas. **Petit fix backend a glisser dans la PR admin** (1 ligne `include: { coachingStaff: { orderBy: { position: 'asc' } } }`).
3. Backend CRUD admin coaching staff : **complet** (cf. `coaching-staff.controller.ts` + endpoints attendus tous presents).

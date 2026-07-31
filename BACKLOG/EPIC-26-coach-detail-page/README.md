# EPIC-26 — Pages dediees des coachs

## Objectif

Offrir une page de fiche detaillee pour chaque membre du **coaching staff** (route publique `/equipes/:teamId/coach/:slug`), en miroir de l'existant joueurs (`/equipes/:teamId/joueur/:playerSlug`), afin de mettre en valeur les coachs au meme niveau editorial et SEO que les joueurs.

## Perimetre

- **Backend** : exposer un endpoint public `GET /api/coaching-staff/by-slug/:slug` (ou equivalent) renvoyant la fiche coach + son equipe.
- **Frontend** : nouveau composant `CoachDetailComponent` + route publique, miroir de `PlayerDetailComponent`.
- **Lien depuis la page equipe** : rendre cliquables les cartes de la section "Notre Coaching staff" introduite en EPIC-17.
- **Parite modele** : aligner `CoachingStaff` sur `TeamMember` pour les champs editoriaux (`nationality`, `birthDate`, `customFields`).
- **SEO** : meta tags + JSON-LD `Person` sur les fiches coach (parite avec l'enabler JSON-LD Person de l'EPIC-23).

## Hors perimetre

- Refonte des pages joueurs deja livrees.
- CRUD admin du coaching staff (deja livre dans **EPIC-17** feature "Restructuration page detail equipe + admin coaching staff").
- Pages dediees pour d'autres roles non-coachs (managers, partenaires, etc.).

## Branche git

`feat/epic-26-coach-detail-page` (depuis `develop`).

## Suivi par feature / enabler

| Item | Claude | PO | E2E | Livre |
|------|--------|----|----|-------|
| [Feature — Page detail coach](FEATURES/coach-detail-page/README.md) | Fait (2026-05-17) | A faire | A faire | Fait (2026-05-22, backend PR #145 + frontend PR #205) |
| [Feature — SEO de la fiche coach](FEATURES/coach-seo/README.md) | Fait (2026-05-17) | A faire | A faire | Fait (2026-05-22, frontend PR #205) |
| [Enabler — Parite modele CoachingStaff / TeamMember](ENABLERS/coach-model-parity/README.md) | Fait (2026-05-17, backend + form admin) | A faire | A faire | Fait (2026-05-22, backend PR #145) |

## Livraison Claude (2026-05-17)

Branches :
- backend `feat/epic-26-coach-detail-page` (5 commits) : migration Prisma `add_coaching_staff_editorial_fields` + DTOs + endpoint `GET /api/coaching-staff/by-slug/:slug` + tests — **625 tests OK**
- frontend `feat/epic-26-coach-detail-page` (7 commits) : composant `CoachDetailComponent` + route `/structure/equipes/:teamId/coach/:slug` + cards cliquables page equipe + SEO meta + JSON-LD Person + form admin coaching staff parité (nationalité, birthDate, customFields textarea JSON) — **1036 tests OK**

**Reste a faire avant merge** :
1. VQO ≥ 9.5/10 sur les 2 branches
2. Push + créer 2 PRs (backend + frontend)
3. Application migration Prisma au prochain démarrage Docker (`npx prisma migrate deploy`)
4. Recette PO : créer un coach avec les 3 nouveaux champs, ouvrir sa fiche, vérifier meta tags + JSON-LD via Rich Results Test

## Criteres de validation EPIC

- L'URL `/equipes/:teamId/coach/:slug` resout pour chaque coach existant et affiche son contenu.
- Les cartes de la section coaching staff (page equipe) sont cliquables et ouvrent la fiche detail.
- La fiche coach reprend les memes blocs editoriaux que la fiche joueur (photo, bio, role, reseaux sociaux, nationalite si disponible).
- Meta tags + JSON-LD `Person` valides (test via Rich Results Test).
- Tests unitaires backend + frontend, et test E2E Playwright sur le parcours nominal.
- VQO >= 9.5/10 sur tous les domaines.
- Aucune regression sur la fiche joueur ni sur la page equipe.

## Notes

- Le modele `CoachingStaff` possede deja `slug`, `biography`, `image`, `role`, `socials` — l'enabler de parite ne fait qu'ajouter `nationality`, `birthDate`, `customFields` (migration Prisma non destructive).
- Cet EPIC vient en suite logique de l'**EPIC-17** (qui a introduit le modele, l'admin CRUD et la section "Notre Coaching staff" sur la page equipe).
- Pour l'enabler SEO, s'aligner sur les conventions deja appliquees dans l'**EPIC-23** (`SeoService`, JSON-LD via `JsonLdService`).

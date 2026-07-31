# Feature — Page detail coach

## Objectif

Mettre en place une page publique dediee a chaque coach, miroir de la page joueur (`/equipes/:teamId/joueur/:playerSlug`), afin de valoriser le coaching staff au meme niveau editorial.

## Routes

- `GET /equipes/:teamId/coach/:slug` (frontend, lazy-loaded)
- `GET /api/coaching-staff/by-slug/:slug` (backend, public)

## Composants impactes

- Backend : nouveau handler dans `coaching-staff.controller.ts` + methode `findBySlug` dans `coaching-staff.service.ts`.
- Frontend :
  - Nouveau composant standalone `frontend/src/app/pages/equipes/coach-detail/` (HTML, SCSS, TS, spec).
  - Route ajoutee dans `app.routes.ts` a cote de la route joueur.
  - Cartes coach (page equipe) rendues cliquables → `[routerLink]="['/equipes', teamId, 'coach', coach.slug]"`.

## Suivi par US

| US | Claude | PO | E2E | Livre |
|----|--------|----|----|-------|
| [Endpoint backend coach par slug](us-backend-coach-by-slug-endpoint.md) | Fait | A faire | A faire | A faire |
| [Composant frontend `CoachDetailComponent`](us-frontend-coach-detail-component.md) | A faire | A faire | A faire | A faire |
| [Rendre la section coaching staff cliquable](us-link-coaching-staff-cards-to-detail.md) | A faire | A faire | A faire | A faire |

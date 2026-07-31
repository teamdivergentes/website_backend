# US — Backend CRUD `CoachingStaff`

## Role / Action / Benefice

> **En tant que** developpeur backend,
> **je veux** un module NestJS `CoachingStaffModule` exposant les endpoints CRUD,
> **afin que** l'admin puisse gerer le staff coaching de chaque equipe.

## Criteres d'acceptation

- [ ] Module : `backend/src/coaching-staff/` calque sur `team-members` (sous-module de `teams/` ou autonome a discuter — preferer **sous-module dans teams/** pour coherence avec `TeamMember`).
- [ ] Endpoints (tous proteges par `@Roles('admin', 'gestionnaire')`) :
  - `GET /api/admin/teams/:teamId/coaching-staff` — liste les coachs d'une equipe
  - `POST /api/admin/teams/:teamId/coaching-staff` — creation
  - `PATCH /api/admin/coaching-staff/:id` — modification
  - `DELETE /api/admin/coaching-staff/:id` — suppression
  - `PATCH /api/admin/teams/:teamId/coaching-staff/reorder` — reordonner
- [ ] Endpoint **public** : la relation est exposee via la response de `GET /api/teams/:slug` qui inclut deja les `members` → ajouter `coachingStaff` dans le `include` Prisma. Pas de nouvel endpoint public dedie.
- [ ] DTOs : `CreateCoachingStaffDto`, `UpdateCoachingStaffDto` avec validation (`name`, `role` obligatoires ; `image`, `biography`, `socials`, `position`, `slug` optionnels).
- [ ] Permissions seed : `coaching_staff:read`, `coaching_staff:write`, `coaching_staff:delete`.
- [x] Tests unitaires service + e2e controller.

## Effort estime

M (≈ 1 j)

## Dependances

Bloque par : `us-prisma-coaching-staff-model.md`

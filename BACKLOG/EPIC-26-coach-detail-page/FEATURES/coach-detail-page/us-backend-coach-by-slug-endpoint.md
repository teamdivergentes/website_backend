# US — Endpoint backend pour recuperer un coach par slug

## Role / Action / Benefice

> **En tant que** visiteur du site,
> **je veux** que le frontend puisse charger la fiche d'un coach a partir de son slug,
> **afin de** consulter sa fiche detaillee a l'URL `/equipes/:teamId/coach/:slug` sans avoir besoin de l'identifiant numerique.

## Criteres d'acceptation

- [ ] Endpoint `GET /api/coaching-staff/by-slug/:slug` (route publique, **pas** sous le prefixe admin).
- [ ] Retourne 200 avec le DTO `CoachingStaffDetailDto` incluant : `id`, `name`, `realName`, `role`, `image`, `biography`, `socials`, `slug`, `position`, `nationality`, `birthDate`, `customFields` (les champs nouveaux viennent de l'enabler parite).
- [ ] Inclut `team: { id, name, slug, game }` pour pouvoir afficher le contexte equipe.
- [ ] Retourne 404 si le slug n'existe pas.
- [ ] Test unitaire service : cas nominal + cas not found.
- [ ] Test d'integration controller (Supertest) : 200 + 404.

## Notes techniques

- S'inspirer de l'endpoint deja en place pour `TeamMember` (`team-members.controller.ts`).
- Slug deja unique au niveau Prisma (`slug String? @unique`) — utiliser `findUnique`.
- Verifier que les permissions guards ne bloquent pas l'acces public (route doit etre annotee `@Public()`).

## Suivi

| Volet | Claude | PO | E2E | Livre |
|-------|--------|----|----|-------|
| Backend | Fait | A faire | A faire | A faire |

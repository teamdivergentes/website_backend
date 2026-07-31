# US — API Trophies

**Statut Claude** : Fait (2026-06-04)

**En tant que** frontend (public et admin),
**je veux** une API REST pour lire et gérer les trophées,
**afin d'** afficher le palmarès et permettre aux CM de le maintenir.

## Critères d'acceptation

- [x] `GET /api/trophies` public (`@Public()`) : ne renvoie que `active: true`, tri `date desc` puis `placement asc`, filtres `featured?` et `teamId?`
- [x] `POST` / `PATCH /:id` / `DELETE /:id` protégés par **PermissionsGuard** avec `trophies:write` (POST/PATCH) et `trophies:delete` (DELETE) (pas de `@Roles` — dette RBAC EPIC-36 non reproduite)
- [x] DTOs class-validator : `placement` entier ≥ 1, `competition` non vide, `date` ISO valide, `image`/`description`/`teamLabel` optionnels
- [x] Un utilisateur CM peut créer/modifier/supprimer ; un utilisateur sans permission reçoit 403
- [x] TU Jest : service (tri, filtres, mapping) + guard de permission — couverture ≥ 80 % sur le module
- [x] Swagger à jour automatiquement

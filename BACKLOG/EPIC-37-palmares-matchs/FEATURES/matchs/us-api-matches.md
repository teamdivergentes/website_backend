# US — API Matches

**Statut Claude** : Fait (2026-06-04)

**En tant que** frontend (public et admin),
**je veux** une API REST pour lire et gérer les matchs,
**afin d'** afficher l'agenda/les résultats et permettre aux CM de les maintenir.

## Critères d'acceptation

- [x] `GET /api/matches` public (`@Public()`) : `active: true` uniquement ; `status=upcoming` → `scheduledAt > now`, tri `scheduledAt asc` ; `status=past` → date passée **et** les 2 scores remplis, tri `scheduledAt desc` ; filtres `teamId?`, `limit?`
- [x] Un match passé sans score n'apparaît jamais dans `status=past`
- [x] `POST` / `PATCH /:id` / `DELETE /:id` protégés par **PermissionsGuard** avec `matches:write` (POST/PATCH) et `matches:delete` (DELETE)
- [x] DTOs class-validator : `teamId` requis, `opponentName` non vide, `scheduledAt` ISO, scores entiers ≥ 0 optionnels mais **les deux ou aucun**, `streamUrl` URL valide optionnelle, `articleId` optionnel
- [x] TU Jest : statut dérivé (3 cas), tri, validation scores appariés, permissions — couverture ≥ 80 % sur le module
- [x] Swagger à jour

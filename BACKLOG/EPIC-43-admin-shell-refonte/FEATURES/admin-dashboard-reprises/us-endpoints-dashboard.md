# US — Endpoints dashboard (lot 6)

## Role / Action / Benefice

> **En tant que** frontend admin,
> **je veux** deux endpoints exposant les brouillons en cours et les anomalies detectables,
> **afin de** construire les blocs "Reprendre" et "A faire" sans charger de listes completes.

## Criteres d'acceptation

- [ ] `GET /api/admin/dashboard/resume` -> `{ drafts: ArticleSummary[] }`
      - `Article.published = false` ET `updatedAt >= now() - 30j`
      - tri `updatedAt desc`, ceux de l'utilisateur courant (`userId`) en premier
      - limite 5
      - retourne une **liste vide** plutot qu'un 403 si `articles:read` manque
- [ ] `GET /api/admin/dashboard/todo` -> compteurs seuls (pas d'entites) :

  | Champ | Requete |
  |-------|---------|
  | `matchesWithoutScore` | `scheduledAt < now()` ET (`scoreDvg IS NULL` OU `scoreOpponent IS NULL`) ET `active = true` |
  | `articlesWithoutImage` | `published = true` ET `imageUrl IS NULL` |
  | `matchesWithoutStream` | `scheduledAt > now()` ET `streamUrl IS NULL` ET `active = true` |
  | `dormantDrafts` | `published = false` ET `updatedAt < now() - 30j` |

- [ ] Chaque compteur est **omis** de la reponse si la permission de lecture correspondante manque.
      Pas de 403 : une alerte qu'on ne peut pas traiter n'a pas a etre remontee.
- [ ] Les deux endpoints sont proteges par `authGuard`.
- [ ] Le seuil de 30 jours est le meme que celui de `resume`, garantissant qu'un brouillon
      n'apparait jamais dans les deux blocs.
- [ ] Tests unitaires : chaque requete sur jeu de donnees fixture ; **test dedie** sur le seuil —
      un brouillon a exactement 30 jours ne doit apparaitre que dans un seul bloc.
- [ ] Tests unitaires : compteur omis quand la permission manque.

## Notes

Retourner des compteurs seuls plutot que les entites evite de charger des listes completes pour
afficher un nombre. Les routes de destination sont calculees cote frontend.

## Depot et branche

`backend/` est un depot git **independant** du frontend. Cette US a donc sa propre branche
`feat/admin-dashboard-endpoints` et sa propre PR — elle ne peut pas etre commitee avec les lots
frontend. Le depot est actuellement sur `feat/boutique-commandes` : creer la branche avant de
demarrer.

Le contrat d'API ci-dessus doit etre **fige avant de commencer**, pour permettre au lot 7
(frontend) d'avancer en parallele plutot qu'en sequence.

## Suivi

| Volet | Claude | PO | E2E | Livre |
|-------|--------|----|----|-------|
| Backend | Fait (2026-07-31) | A faire | A faire | A faire |

## Livraison Claude (2026-07-31)

Module `dashboard` livre sur la branche backend `feat/articles-server-sort` (commit `a55292c`).

Les deux endpoints n'utilisent pas `PermissionsGuard` : chaque bloc se retire seul quand la
permission manque. Un 403 priverait l'utilisateur des blocs qu'il peut pourtant traiter.

Le seuil de 30 jours est partage avec des bornes complementaires (`>=` / `<`) ; un test dedie
verrouille qu'un brouillon ne peut jamais apparaitre dans les deux blocs.

21 tests. Suite backend complete : 1064 tests.

**Note** : `articles:read` est semee et servie par `roles.service` mais absente de
`common/constants/permissions.ts`. Signale en commentaire, non corrige — l'ajouter modifierait
`ALL_PERMISSIONS`, qui pilote l'attribution des roles.

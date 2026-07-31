# US — Endpoint admin pour la configuration complète

**En tant qu'** administrateur du panel DVG,
**je veux** continuer à lire et éditer toutes les clés de configuration,
**afin que** la restriction de l'endpoint public ne casse pas la gestion de la config.

## Critères d'acceptation

- [ ] Nouvel endpoint `GET /api/config/admin/all` (ou équivalent) protégé `@Roles('admin')` retournant **toutes** les clés (secrets compris) pour un admin authentifié.
- [ ] Sans token ou sans rôle admin → **401/403** (pas d'accès aux clés complètes).
- [ ] Les endpoints d'écriture existants (`POST`/`PUT`/`DELETE`) restent `@Roles('admin')` (déjà le cas).
- [ ] Le **frontend admin** (panel configuration) est mis à jour pour consommer ce nouvel endpoint — coordination avec l'agent `frontend-angular`.
- [ ] Tests TDD backend (accès admin OK, accès anonyme refusé) + test E2E du panel config admin.

## Statut
`A faire`

# SEC-N03 — Uniformiser l'autorisation sur PermissionsGuard

**Sévérité** : 🟢 BASSE (dette structurelle) — **OWASP** : A01 (Broken Access Control)
**Statut Claude** : A faire

## User Story

> **En tant que** mainteneur du backend,
> **je veux** que tous les endpoints protégés utilisent `PermissionsGuard` + `@RequirePermission(...)` (et non des noms de rôle en dur),
> **afin que** le contrôle d'accès soit cohérent, granulaire et aligné sur le RBAC seedé et le frontend.

## Contexte technique

- Incohérence : `users/`, `roles/`, `teams/`, `sponsors/`, `games/`, `staff/`, `recruitment/`, `articles/`, `article-types/`, `config/`, `upload/`, `twitch-channels/` utilisent `@Roles('admin'|'cm'|'gestionnaire')` **en dur**.
- `analytics/` et `coaching-staff/` utilisent déjà `@RequirePermission(PERMISSIONS.*)`.
- Le **frontend** guard exclusivement par permission (`users:read`, etc.).
- **Bug fonctionnel déjà présent** : le rôle `Gestionnaire` est seedé avec les permissions teams/games/sponsors/staff/recruitment, mais les endpoints exigent `@Roles('admin')` → un Gestionnaire voit les pages admin (UI OK) mais reçoit **403** en API.
- Risque : un rôle custom avec `teams:write` n'a aucun accès tant qu'il ne s'appelle pas littéralement `admin`.

## Critères d'acceptation

- [ ] Tous les endpoints CRUD admin protégés par `@RequirePermission(PERMISSIONS.*)` + `PermissionsGuard`, suppression des `@Roles(...)` en dur.
- [ ] Le rôle `Gestionnaire` accède bien en API aux ressources couvertes par ses permissions seedées.
- [ ] Un rôle custom avec les bonnes permissions accède aux endpoints correspondants.
- [ ] Aucune régression : `admin` conserve l'accès complet.
- [ ] TU couvrant chaque guard migré + E2E sur un parcours Gestionnaire.

## Note de cadrage

Migration potentiellement large (12 modules). Décision PO : traiter en une fois ou en sous-tâches par module. Si conséquent → promouvoir en EPIC enabler dédié.

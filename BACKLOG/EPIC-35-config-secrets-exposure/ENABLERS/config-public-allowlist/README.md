# ENABLER-1 — Filtrage allow-list de l'endpoint config public

> 🔴 CRITIQUE — cœur du hotfix. Branche : `fix/epic-35-config-secrets-leak`.

## Problème technique

`src/config/config.controller.ts` :
- `GET /api/config` → `@Public()` → `configService.findAll()` renvoie **toutes** les clés.
- `GET /api/config/:key` → `@Public()` → `configService.findOne(key)` renvoie **n'importe quelle** clé, secrets compris.

Les secrets (`contact_smtp_pass`, `*_webhook`) sont utilisés **uniquement** côté serveur (module Contact via `getValue()`), jamais par le frontend public.

## Solution

1. Constante `PUBLIC_CONFIG_KEYS: ReadonlySet<string>` (ou tableau readonly) dans `src/config/`.
2. `GET /api/config` public → ne retourne que les entrées dont la `key ∈ PUBLIC_CONFIG_KEYS`.
3. `GET /api/config/:key` public → si la clé n'est **pas** publique → `404 NotFound` (ne pas révéler l'existence d'une clé privée ; pas de `403` qui confirmerait son existence).
4. Nouvel endpoint admin `GET /api/config/admin/all` (ou équivalent) `@Roles('admin')` → renvoie **toutes** les clés pour le panel d'administration.
5. `getValue()` interne **inchangé** (le module Contact continue de lire les secrets en base).

## Suivi

| US | Claude | PO | E2E | Livré |
|----|--------|----|----|-------|
| [us-filter-public-config](us-filter-public-config.md) | Fait (allow-list + 404 fail-safe, 654 tests backend verts) | A faire | A faire | A faire |
| [us-admin-config-endpoint](us-admin-config-endpoint.md) | Fait (back `GET /api/config/admin/all` + front `getAllConfigsAdmin()`, 1208 tests front verts) | A faire | A faire | A faire |

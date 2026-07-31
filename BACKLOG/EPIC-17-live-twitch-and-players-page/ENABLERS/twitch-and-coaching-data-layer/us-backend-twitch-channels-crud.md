# US — Backend CRUD `TwitchChannel`

## Role / Action / Benefice

> **En tant que** developpeur backend,
> **je veux** un module NestJS `TwitchChannelsModule` exposant les endpoints CRUD,
> **afin que** l'admin puisse creer, lister, modifier, supprimer, reordonner les chaines Twitch.

## Criteres d'acceptation

- [ ] Module : `backend/src/twitch-channels/` calque sur l'existant `staff/` ou `teams/` :
  - `twitch-channels.module.ts`
  - `twitch-channels.service.ts`
  - `twitch-channels.controller.ts`
  - `dto/create-twitch-channel.dto.ts`, `dto/update-twitch-channel.dto.ts`
- [ ] Endpoints (tous proteges par `@Roles('admin', 'gestionnaire')` sauf indication contraire) :
  - `GET /api/admin/twitch-channels` — liste complete (avec status live enrichi via `TwitchHelixService`)
  - `POST /api/admin/twitch-channels` — creation
  - `GET /api/admin/twitch-channels/:id` — detail
  - `PATCH /api/admin/twitch-channels/:id` — modification partielle
  - `DELETE /api/admin/twitch-channels/:id` — suppression
  - `PATCH /api/admin/twitch-channels/reorder` — reordonner par drag-drop
- [ ] DTOs avec `class-validator` :
  - `username` obligatoire, format `^[a-zA-Z0-9_]{4,25}$` (regle Twitch)
  - `displayName`, `gameLabel`, `description`, `teamMemberId`, `position`, `active` optionnels
- [ ] Permission ajoutee dans le seed de roles : `twitch_channels:read`, `twitch_channels:write`, `twitch_channels:delete`.
- [x] Tests unitaires service (mock Prisma) : create, list, update, delete, reorder.
- [x] Tests e2e controller : auth, validation, Roles guard.

## Effort estime

M (≈ 1 j)

## Dependances

Bloque par : `us-prisma-twitch-channel-model.md`, `us-twitch-helix-service.md`

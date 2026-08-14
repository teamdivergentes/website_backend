# Enabler — Permissions upload images pour le rôle CM

## Contexte technique

Bug remonté par un utilisateur avec le rôle `CM` le 2026-05-16 : impossible d'ajouter une image dans un article depuis l'éditeur admin. L'éditeur Editor.js appelle `POST /api/upload/image-editor` et reçoit `403 Forbidden`.

**Cause racine identifiée** : `backend/src/upload/upload.controller.ts` déclare `@Roles('admin')` sur les 3 endpoints du module upload, alors que `ArticlesController` autorise déjà `@Roles('admin', 'cm')` pour create/update. Le rôle CM peut donc rédiger un article mais pas y joindre d'image — incohérence flagrante.

## Direction technique

Aligner les permissions du `UploadController` sur celles déjà accordées au CM dans le `ArticlesController` :

- `POST /api/upload/image` → `@Roles('admin', 'cm')`
- `POST /api/upload/image-editor` → `@Roles('admin', 'cm')`
- `DELETE /api/upload/:filename` → `@Roles('admin', 'cm')`

Ajouter des tests unitaires sur la métadonnée Reflect `roles` des 3 méthodes pour bloquer toute régression future. Non-régression couverte par un scénario E2E dédié dans `EPIC-19 / e2e-coverage` (voir `us-e2e-role-permissions-matrix.md`).

## US

| US | Claude | PO | E2E | Livré |
|----|--------|----|----|-------|
| [us-allow-cm-to-upload-images.md](us-allow-cm-to-upload-images.md) | Fait | A faire | A faire | A faire |

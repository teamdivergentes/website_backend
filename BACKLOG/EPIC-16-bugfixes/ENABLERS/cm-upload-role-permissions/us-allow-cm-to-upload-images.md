# US — Autoriser le rôle CM à uploader des images dans les articles

## User Story

**En tant que** Community Manager (rôle CM),
**je veux** pouvoir uploader une image directement depuis l'éditeur d'article,
**afin de** publier des annonces et articles illustrés sans dépendre d'un Admin.

## Contexte

- Endpoint impacté : `POST /api/upload/image`, `POST /api/upload/image-editor`, `DELETE /api/upload/:filename`
- Symptôme observé : `403 Forbidden` côté client lorsque l'éditeur Editor.js tente d'envoyer l'image.
- Cause racine : `@Roles('admin')` sur les 3 méthodes du `UploadController` (vs `@Roles('admin', 'cm')` côté `ArticlesController`).

## Critères d'acceptation

- [x] `POST /api/upload/image` retourne 201 pour un utilisateur CM authentifié avec un fichier image valide.
- [x] `POST /api/upload/image-editor` retourne 201 pour un utilisateur CM (réponse au format Editor.js).
- [x] `DELETE /api/upload/:filename` retourne 200/204 pour un utilisateur CM.
- [x] `Gestionnaire` et utilisateur non authentifié continuent à recevoir respectivement 403 / 401.
- [x] Tests unitaires backend ajoutés dans `backend/src/upload/upload.controller.spec.ts` :
  - métadonnée Reflect `roles` = `['admin', 'cm']` sur les 3 méthodes,
  - cycle TDD vérifié (RED avant fix, GREEN après).
- [x] `npm run test` backend : 257/257 verts.
- [x] `npm run lint` backend : aucune nouvelle erreur introduite.
- [ ] Scénario E2E de non-régression dans `frontend/e2e/tests/roles/image-upload-permissions.spec.ts` (livré dans l'enabler `e2e-coverage` de l'EPIC-19).
- [ ] Validation PO sur un compte CM réel après merge.

## Fichiers impactés

- `backend/src/upload/upload.controller.ts` (3 décorateurs `@Roles`)
- `backend/src/upload/upload.controller.spec.ts` (nouveau, 109 lignes)

## Hors périmètre

- Refonte du modèle de permissions vers un système granulaire `media:write` : noté pour un EPIC futur, non requis ici car le projet utilise actuellement la stratégie « roles avec liste de noms ».
- Modification du seed Prisma (`backend/prisma/seed.ts`) : non requise, le rôle CM existe déjà.

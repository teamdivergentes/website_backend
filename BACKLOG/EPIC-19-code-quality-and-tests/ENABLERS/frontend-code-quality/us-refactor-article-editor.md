# US — Refactorer `article-editor.component.ts` (506 lignes)

## Rôle / Action / Bénéfice

> **En tant que** Expert Frontend Angular,
> **je veux** déporter la logique de manipulation des blocs d'article dans un service Signals,
> **afin que** l'éditeur soit testable, modulaire et que l'ajout d'un nouveau type de bloc devienne mécanique.

## Critères d'acceptation

- [ ] Création de :
  - `article-editor.service.ts` — Signals pour la liste des blocs, opérations add/remove/move/duplicate
  - `article-block-editor.component.ts` — éditeur d'un bloc unique (selon son type)
  - `article-toolbar.component.ts` — barre d'outils d'ajout de blocs
- [ ] `article-editor.component.ts` < 200 lignes (orchestration uniquement)
- [ ] Validation pure dans `article-validators.ts`
- [ ] Externalisation HTML / SCSS
- [ ] **Aucune régression** : E2E admin articles CRUD vert
- [ ] Tests unitaires sur le service (100 %) + sur les composants (>= 80 %)
- [ ] `npm run lint` + `ng build` propres

## Effort estimé

L (~1.5 j)

## Dépendances

- Aucune

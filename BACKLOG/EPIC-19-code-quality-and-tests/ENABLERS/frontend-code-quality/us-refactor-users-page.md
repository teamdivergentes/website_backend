# US — Refactorer `users.component.ts` (544 lignes)

## Rôle / Action / Bénéfice

> **En tant que** Expert Frontend Angular,
> **je veux** scinder la page admin users en composants spécialisés,
> **afin que** la liste et le filtre soient réutilisables pour d'autres pages CRUD admin.

## Critères d'acceptation

- [x] Création de :
  - `user-table.component.ts` — affichage table + tri + pagination
  - `user-filters.component.ts` — recherche, filtres rôle, statut
  - `user-row-actions.component.ts` — boutons éditer / désactiver / supprimer
- [x] `users.component.ts` < 200 lignes (orchestration) — **175 lignes**
- [x] Externalisation HTML / SCSS si > 80 lignes
- [ ] **Aucune régression** : E2E admin users CRUD vert (à valider en environnement Docker)
- [x] Tests unitaires sur chaque sous-composant (>= 80 %) — **50/50 tests verts**
- [x] `npm run lint` propre
- [ ] `ng build` propre — bloqué par bug pré-existant `lenis.css` sur `origin/develop` (non lié au refactor)

**Statut Claude** : Fait — branche `chore/epic-19-refactor-users-page` poussée

## Effort estimé

M (~1 j)

## Dépendances

- Aucune

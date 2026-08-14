# US — Refactorer `team-members-dialog.component.ts` (600 lignes)

## Rôle / Action / Bénéfice

> **En tant que** Expert Frontend Angular,
> **je veux** scinder le dialog team-members en composants à responsabilité unique,
> **afin que** la complexité descende et que les formulaires deviennent réutilisables.

## Critères d'acceptation

- [ ] Création de :
  - `team-member-form.component.ts` — formulaire d'ajout/édition d'un membre
  - `team-member-list.component.ts` — liste éditable des membres avec drag & drop
  - `team-member-row.component.ts` — ligne unique avec actions
- [ ] Le dialog principal < 200 lignes (orchestration uniquement)
- [ ] Validation extraite dans `team-member-validators.ts` (fonctions pures testables)
- [ ] Templates et SCSS externalisés
- [ ] **Aucune régression** : E2E admin teams → membres CRUD vert
- [ ] Tests unitaires sur chaque sous-composant et sur les validators (100 % sur les validators)
- [ ] `npm run lint` + `ng build` propres

## Effort estimé

L (~1.5 j)

## Dépendances

- Aucune

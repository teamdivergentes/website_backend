# Enabler — Frontend code quality

## Contexte technique

Audit local (2026-04-25) :

- 134 fichiers source TypeScript dans `frontend/src/`
- Plusieurs composants admin dépassent largement la limite douce de 400 lignes :
  - `frontend/src/app/admin/dashboard/admin-dashboard.component.ts` — **604 lignes**
  - `frontend/src/app/admin/pages/teams/team-members-dialog.component.ts` — **600 lignes**
  - `frontend/src/app/admin/pages/users/users.component.ts` — **544 lignes**
  - `frontend/src/app/admin/pages/articles/article-editor.component.ts` — **506 lignes**
  - `frontend/src/app/admin/pages/sponsors/sponsor-links-dialog.component.ts` — **400 lignes**
  - `frontend/src/app/shared/components/editor-blocks-renderer/editor-blocks-renderer.component.ts` — 397 lignes
  - `frontend/src/app/admin/pages/recruitment/recruitment-form-dialog.component.ts` — 373 lignes

## Objectifs

Atteindre sur `dvg-frontend` :

- Reliability rating **A** (0 bug)
- Security rating **A**
- Maintainability rating **A** (technical debt < 5 %)
- Duplications **< 3 %**
- Aucun composant > 400 lignes (template + class)
- Aucun warning ESLint (`npm run lint`)
- Build prod sans warning Angular

## Direction technique

### Refactoring composants admin

Stratégie générale : extraire en sous-composants par responsabilité (form, list, item, actions), déplacer la logique métier dans des **services Signals**, externaliser les templates HTML et les SCSS dans des fichiers séparés (au-dessus de 80 lignes).

| Composant | Stratégie |
|-----------|-----------|
| `admin-dashboard.component.ts` (604) | Extraire les sections en sous-composants (`dashboard-stats`, `dashboard-traffic`, `dashboard-recent`), externaliser HTML/SCSS |
| `team-members-dialog.component.ts` (600) | Séparer en `team-member-form` + `team-member-list` ; extraire le service de validation |
| `users.component.ts` (544) | Extraire `user-table`, `user-filters`, `user-row-actions` |
| `article-editor.component.ts` (506) | Extraire `article-block-editor`, `article-toolbar`, et déplacer la logique de blocs dans un service |
| `sponsor-links-dialog.component.ts` (400) | Extraire `sponsor-link-form` + `sponsor-link-row` |
| `editor-blocks-renderer.component.ts` (397) | Découper par type de bloc (`block-text`, `block-image`, etc.) |
| `recruitment-form-dialog.component.ts` (373) | Extraire `recruitment-form` (réutilisable) + `recruitment-skills-input` |

### Hygiène globale

- ESLint Angular sans warning ni erreur
- Imports `@angular/material` regroupés via providers / barrels
- Suppression du dead code (composants commentés, variables non lues — `ts-prune`)
- Conventions Signals respectées (`signal()`, `computed()`, `effect()` au lieu de RxJS quand possible)
- `OnPush` change detection sur les composants pures (déjà standardisé en zoneless)
- Pas de `any` (sauf justifié)
- Pas de `subscribe()` orphelin (utiliser `async` pipe ou `takeUntilDestroyed`)

### Accessibilité (a11y)

- Tous les boutons ont un label accessible (`aria-label` ou texte visible)
- Toutes les images ont un `alt`
- Contrastes conformes WCAG AA (vérification visuelle + audit Lighthouse)
- Navigation clavier complète sur l'admin

## US

| US | Claude | PO | E2E | Livré |
|----|--------|----|----|-------|
| [us-refactor-admin-dashboard.md](us-refactor-admin-dashboard.md) | Fait (PR #127 mergee sur develop 2026-04-29) | A faire | A faire | A faire |
| [us-refactor-team-members-dialog.md](us-refactor-team-members-dialog.md) | Fait (PR #128 mergee sur develop 2026-04-29) | A faire | A faire | A faire |
| [us-refactor-users-page.md](us-refactor-users-page.md) | Fait (PR #129 mergee sur develop 2026-04-29) | A faire | A faire | A faire |
| [us-refactor-article-editor.md](us-refactor-article-editor.md) | A faire | A faire | A faire | A faire |
| [us-refactor-other-large-components.md](us-refactor-other-large-components.md) | A faire | A faire | A faire | A faire |
| [us-fix-sonar-bugs-vulns-frontend.md](us-fix-sonar-bugs-vulns-frontend.md) | A faire | A faire | A faire | A faire |
| [us-resolve-frontend-code-smells.md](us-resolve-frontend-code-smells.md) | A faire | A faire | A faire | A faire |
| [us-eliminate-frontend-duplications.md](us-eliminate-frontend-duplications.md) | A faire | A faire | A faire | A faire |

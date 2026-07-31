# US — Tester les composants CRUD admin (>= 80 %)

## Rôle / Action / Bénéfice

> **En tant que** Expert QA,
> **je veux** que tous les composants admin CRUD aient au moins 80 % de couverture lignes/branches,
> **afin que** les fonctionnalités d'administration soient protégées contre les régressions.

## Périmètre

Pour chaque page admin, tester (au minimum) :
- Le composant page (liste / table / filtres)
- Le composant dialog (formulaire CRUD)
- Les sous-composants extraits par les US `frontend-code-quality`

| Page | Composants à couvrir |
|------|---------------------|
| `admin/dashboard` | Sous-composants extraits (`dashboard-stats`, `dashboard-traffic`, `dashboard-recent`) |
| `admin/users` | `users.component`, `user-table`, `user-filters`, dialog d'édition |
| `admin/roles` | `roles.component` + dialogs |
| `admin/teams` | `teams.component` + `team-members-dialog` (et ses sous-composants) |
| `admin/games` | `games.component` + dialog |
| `admin/sponsors` | `sponsors.component` + `sponsor-images-dialog` + `sponsor-links-dialog` |
| `admin/staff` | `staff.component` + dialog |
| `admin/recruitment` | `recruitment.component` + form-dialog |
| `admin/articles` | `article-editor` + sous-composants de blocs |
| `admin/config` | `config.component` |

## Critères d'acceptation

- [ ] Pour chaque composant : fichier `*.spec.ts`
- [ ] Tests des interactions clés :
  - Affichage de la liste (succès + erreur API)
  - Ouverture du dialog (création + édition)
  - Validation des formulaires (champs requis, formats)
  - Soumission (succès + erreur API)
  - Suppression avec confirmation
- [ ] Couverture lignes >= **80 %** par composant
- [ ] Couverture branches >= **70 %** par composant
- [ ] Tests rapides : `npm test` mode CI < 90 sec

## Effort estimé

XL (~7-10 j) — peut être éclatée par page admin

## Dépendances

- US `us-karma-coverage-config-and-helpers.md`
- Refactos `frontend-code-quality` idéalement terminés (sinon double travail)

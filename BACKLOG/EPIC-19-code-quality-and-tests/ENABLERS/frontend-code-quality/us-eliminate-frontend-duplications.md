# US — Éliminer les duplications frontend (< 3 %)

## Rôle / Action / Bénéfice

> **En tant que** Expert Frontend Angular,
> **je veux** ramener `duplicated_lines_density` sous 3 % sur `dvg-frontend`,
> **afin de** réduire le risque de divergence entre composants similaires (ex : dialogs CRUD admin).

## Critères d'acceptation

- [ ] Récupérer la liste : `/api/duplications/show?key=<file>`
- [ ] Pour chaque duplication, extraire en :
  - **Composant partagé** (`shared/components/`) — ex : `DialogShellComponent`, `ConfirmDeleteDialogComponent`, `DataTableComponent`
  - **Directive** réutilisable
  - **Pipe** pur réutilisable
  - **Service** Signal partagé
  - **Util** (`shared/utils/`)
- [ ] Renforcer `frontend/src/app/shared/` et `frontend/src/shared/` comme bibliothèques internes
- [ ] **Aucune régression** : tests existants verts + visuel inchangé
- [ ] `duplicated_lines_density` final < 3 % sur `dvg-frontend`

## Effort estimé

M-L (~2 j)

## Dépendances

- US `us-capture-sonar-baseline.md`
- Idéalement après les refactos

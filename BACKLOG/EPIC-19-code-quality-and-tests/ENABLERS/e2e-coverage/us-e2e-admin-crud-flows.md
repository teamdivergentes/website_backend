# US — Couvrir les parcours admin CRUD en E2E

## Rôle / Action / Bénéfice

> **En tant que** Expert QA,
> **je veux** un test E2E complet par module CRUD admin (create / read / update / delete),
> **afin que** les régressions du panel admin soient détectées avant production.

## Critères d'acceptation

Pour chaque module ci-dessous, fournir un fichier `frontend/e2e/admin/*.spec.ts` couvrant :
- Login admin (via fixture)
- Création d'un item → succès, présent dans la liste
- Édition de l'item → modifs persistées, visibles dans la liste
- Suppression de l'item → confirmation + disparu de la liste
- Tentative de soumission champs manquants → erreurs de validation visibles

### Modules à couvrir

- [ ] `admin/users`
- [ ] `admin/roles`
- [ ] `admin/teams` (équipe + membres dans le dialog)
- [ ] `admin/games`
- [ ] `admin/sponsors` (sponsor + images + liens dans les dialogs)
- [ ] `admin/staff`
- [ ] `admin/recruitment`
- [ ] `admin/articles`
- [ ] `admin/config`

### Hygiène

- [ ] Tous les items créés par les tests sont préfixés `e2e-` et supprimés en `afterEach`
- [ ] Aucune dépendance d'ordre entre tests
- [ ] Tests parallélisables (pas d'état global partagé)
- [ ] Stabilité : 0 flaky sur 5 runs consécutifs
- [ ] Temps total des E2E admin < 10 min (parallèle)

## Effort estimé

XL (~5-7 j)

## Dépendances

- US `us-e2e-fixtures-and-page-objects.md`
- Refactos `frontend-code-quality` finis (sinon les sélecteurs `data-testid` bougent)

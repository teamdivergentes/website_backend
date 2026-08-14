# US — Éliminer les duplications backend (< 3 %)

## Rôle / Action / Bénéfice

> **En tant que** Expert Backend NestJS,
> **je veux** ramener `duplicated_lines_density` sous 3 % sur `dvg-backend`,
> **afin de** réduire la dette technique et le risque de divergence entre copies de code.

## Critères d'acceptation

- [ ] Récupérer la liste des duplications : `/api/duplications/show?key=<file>`
- [ ] Pour chaque bloc dupliqué, extraire en :
  - Util pur (`*.util.ts`) si logique sans dépendance
  - Service partagé (`common/`) si DI nécessaire
  - DTO commun (`common/dto/`) si validation répétée
- [ ] Créer un dossier `backend/src/common/` clairement organisé (utils, services, dtos, guards)
- [ ] **Aucune régression** : tests existants verts
- [ ] **Couverture des nouveaux utils** : 100 % (faciles à tester)
- [ ] `duplicated_lines_density` final < 3 % sur `dvg-backend`
- [ ] Sonar : 0 duplication > 100 lignes

## Effort estimé

M (~1.5 j)

## Dépendances

- US `us-capture-sonar-baseline.md`
- Idéalement après les refactos (sinon double travail)

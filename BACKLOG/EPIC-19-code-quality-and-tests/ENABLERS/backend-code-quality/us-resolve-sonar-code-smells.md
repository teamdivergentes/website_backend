# US — Résoudre les code smells backend (Maintainability rating A)

## Rôle / Action / Bénéfice

> **En tant que** Expert Backend NestJS,
> **je veux** ramener `dvg-backend` à un Maintainability rating A,
> **afin que** la dette technique reste maîtrisée et que la lecture du code soit naturelle pour les nouveaux contributeurs.

## Critères d'acceptation

- [ ] Récupérer les code smells via `/api/issues/search?componentKeys=dvg-backend&types=CODE_SMELL`
- [ ] Trier par sévérité (Blocker / Critical / Major / Minor / Info)
- [ ] Traiter au moins **100 %** des Blocker / Critical / Major
- [ ] Traiter au moins **80 %** des Minor
- [ ] Pour chaque catégorie usuelle, exemples d'actions :
  - "Cognitive Complexity too high" → extraire des fonctions privées, simplifier les conditions
  - "Method too long" → splitter, utiliser `find` / `map` à la place de boucles imbriquées
  - "Dead code" → supprimer
  - "Use `??` instead of `||` for null/undefined check" → corriger
  - "Prefer `for-of` over `forEach` when await needed" → corriger
- [ ] Maintainability rating final = **A** sur `dvg-backend`
- [ ] Technical debt ratio < 5 %
- [ ] `npm run lint` propre
- [ ] Aucun TU existant cassé

## Effort estimé

L (~2-3 j) selon volume

## Dépendances

- US `us-capture-sonar-baseline.md`
- Idéalement après les refactos des gros services (sinon double travail)

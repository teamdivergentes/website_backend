# US — Résoudre les code smells frontend (Maintainability rating A)

## Rôle / Action / Bénéfice

> **En tant que** Expert Frontend Angular,
> **je veux** ramener `dvg-frontend` à un Maintainability rating A,
> **afin que** la dette technique reste maîtrisée et que les conventions Angular 20+ (Signals, OnPush, standalone) soient appliquées partout.

## Critères d'acceptation

- [ ] Récupérer les code smells via `/api/issues/search?componentKeys=dvg-frontend&types=CODE_SMELL`
- [ ] Traiter 100 % Blocker / Critical / Major et 80 % Minor
- [ ] Catégories d'actions courantes :
  - "Cognitive Complexity too high" → extraire des méthodes ou des composants
  - "Method too long" → splitter
  - "Use Signal instead of BehaviorSubject" → migrer si possible
  - "Avoid `any`" → typer correctement
  - "Missing accessibility attribute" → ajouter `aria-label`, `alt`, etc.
  - "Subscription leak" → utiliser `takeUntilDestroyed()` ou `async` pipe
  - "Use `inject()` over constructor injection" → harmoniser sur le pattern Angular 20
- [ ] Maintainability rating final = **A**
- [ ] Technical debt ratio < 5 %
- [ ] `npm run lint` propre
- [ ] Aucun TU existant cassé

## Effort estimé

L (~2-3 j)

## Dépendances

- US `us-capture-sonar-baseline.md`
- Idéalement après les refactos des gros composants

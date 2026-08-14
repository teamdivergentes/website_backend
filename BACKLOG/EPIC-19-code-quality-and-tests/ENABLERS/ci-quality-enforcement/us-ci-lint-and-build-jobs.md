# US — Jobs CI lint + build (backend + frontend)

## Rôle / Action / Bénéfice

> **En tant que** Expert DevSecOps,
> **je veux** que chaque PR exécute lint + build pour les deux dépôts,
> **afin que** les erreurs de typage et de style soient détectées avant le merge.

## Critères d'acceptation

- [ ] Job `lint-backend` :
  - Setup Node 20 + cache npm
  - `cd backend && npm ci`
  - `npm run lint` → échec si warnings
- [ ] Job `lint-frontend` analogue
- [ ] Job `build-backend` :
  - `npm run build` (compilation TypeScript)
  - Échec si erreurs
- [ ] Job `build-frontend` :
  - `ng build` (production build)
  - Vérifier la taille du bundle (< 5 MB) — warning si dépassé
- [ ] Tous les jobs en parallèle, durée < 5 min chacun
- [ ] Cache npm + node_modules entre jobs

## Effort estimé

S (~0.5 j)

## Dépendances

- Aucune

# US — Required checks et résumé qualité en commentaire PR

## Rôle / Action / Bénéfice

> **En tant que** Expert DevSecOps,
> **je veux** que tous les jobs qualité soient required dans la branch protection de `main`, et qu'un commentaire de PR récapitule les indicateurs,
> **afin qu'aucun merge** ne puisse contourner les contrôles et que les reviewers aient une vue synthétique.

## Critères d'acceptation

### Branch protection

- [ ] Sur `main`, les checks required sont :
  - `lint-backend`, `lint-frontend`
  - `unit-backend`, `unit-frontend`
  - `build-backend`, `build-frontend`
  - `sonar-backend`, `sonar-frontend`
  - `e2e-frontend`
- [ ] Require **branches up-to-date** avant merge
- [ ] Require **1 review** approuvante minimum
- [ ] Linear history (pas de merge commits → squash & merge ou rebase)

### Résumé PR

- [ ] Action GitHub qui poste/met à jour un commentaire unique sur la PR contenant :
  - Coverage backend (lignes / branches)
  - Coverage frontend (lignes / branches)
  - Quality Gate Sonar (statut + lien)
  - Nombre de tests E2E passés / total
  - Durée totale CI
- [ ] Le commentaire est mis à jour à chaque push (pas de bruit)

### Documentation

- [ ] `docs/devsecops/ci.md` : description de chaque job, comment debugger un échec, où trouver les rapports

## Effort estimé

M (~1 j)

## Dépendances

- Toutes les US précédentes de l'EPIC

## Note

Cette US est **la dernière à livrer**, sinon elle bloque les PRs des autres enablers.

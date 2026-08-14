# US — Capturer la baseline Sonar des deux projets

## Rôle / Action / Bénéfice

> **En tant que** Tech Lead qualité,
> **je veux** disposer d'un instantané chiffré des métriques Sonar des projets `dvg-backend` et `dvg-frontend`,
> **afin de** pouvoir mesurer objectivement la progression de l'EPIC-19 et identifier les sujets prioritaires.

## Critères d'acceptation

- [ ] Lancer une analyse Sonar fraîche sur `main` pour les deux projets (backend + frontend) avec rapport LCOV à jour
- [ ] Récupérer pour chaque projet via l'API Sonar (`/api/measures/component`) :
  - `bugs`, `vulnerabilities`, `code_smells`, `security_hotspots`
  - `coverage`, `line_coverage`, `branch_coverage`
  - `duplicated_lines_density`
  - `sqale_index` (dette technique en minutes)
  - `reliability_rating`, `security_rating`, `sqale_rating`
  - `ncloc` (lignes de code)
- [ ] Top 20 des "issues" critiques/bloquantes par projet (export CSV via `/api/issues/search?severities=BLOCKER,CRITICAL`)
- [ ] Top 10 des fichiers avec la plus mauvaise couverture
- [ ] Top 10 des fichiers les plus dupliqués
- [ ] Synthèse rédigée dans `docs/sonar-baseline-2026-XX-XX-backend.md` et `docs/sonar-baseline-2026-XX-XX-frontend.md` :
  - Métriques globales en tableau
  - Top issues commentées (faux positif / vraie dette / blocant)
  - Recommandation de priorisation pour les enablers suivants

## Définition de "Done"

- Documents committés sur la branche `chore/epic-19-code-quality`
- Baseline partagée à Maxime (lien dans le README de l'EPIC)

## Effort estimé

S (~0.5 j)

## Dépendances

- Token Sonar `SONAR_TOKEN` disponible (à demander à Maxime / DevSecOps)
- Aucun blocage technique

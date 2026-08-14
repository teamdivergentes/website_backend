# US — Définir et activer le Quality Gate `DVG-Strict`

## Rôle / Action / Bénéfice

> **En tant que** Tech Lead qualité,
> **je veux** un Quality Gate custom `DVG-Strict` partagé par `dvg-backend` et `dvg-frontend`,
> **afin que** les seuils de qualité soient explicites, versionnés et appliqués automatiquement à chaque analyse.

## Critères d'acceptation

### Quality Gate `DVG-Strict`

- [ ] Créé dans SonarQube via UI ou API (`/api/qualitygates/create`)
- [ ] Conditions sur **New Code** (par défaut) :
  - [ ] `new_reliability_rating` is worse than A → bloque
  - [ ] `new_security_rating` is worse than A → bloque
  - [ ] `new_security_hotspots_reviewed` < 100 % → bloque
  - [ ] `new_maintainability_rating` is worse than A → bloque
  - [ ] `new_coverage` < 80 % → bloque
  - [ ] `new_duplicated_lines_density` >= 3 % → bloque
- [ ] Conditions sur **Overall Code** :
  - [ ] `bugs` > 0 → bloque
  - [ ] `vulnerabilities` > 0 → bloque
  - [ ] `coverage` < 80 % → bloque
  - [ ] `duplicated_lines_density` >= 3 % → bloque
- [ ] Attaché aux deux projets (`dvg-backend`, `dvg-frontend`)
- [ ] Définition exportée dans `docs/sonar-quality-gates.md` (avec justification de chaque seuil)

### Communication

- [ ] Note de communication interne : pourquoi ces seuils, qu'est-ce qu'on accepte d'assouplir temporairement (et quelle US y répond)

## Effort estimé

S (~0.5 j)

## Dépendances

- US `us-capture-sonar-baseline.md` (pour confirmer que les seuils sont atteignables ou planifier des dérogations temporaires)

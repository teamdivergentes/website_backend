# US — Brancher Sonar sur GitHub Actions

## Rôle / Action / Bénéfice

> **En tant que** Expert DevSecOps,
> **je veux** que chaque PR déclenche une analyse Sonar et échoue si le Quality Gate `DVG-Strict` n'est pas vert,
> **afin que** la qualité ne puisse jamais régresser sans décision explicite.

## État actuel (2026-04-25)

Sonar est **déjà branché** dans les deux dépôts (commits `bdad15d` puis `ba27240`) :

- Job `sonarqube` dans `backend/.github/workflows/cicd.yml` (ligne 422) — blocant `docker`
- Job `sonarqube` dans `frontend/.github/workflows/cicd.yml` (ligne 138) — blocant `docker`
- Actions épinglées par SHA : `SonarSource/sonarqube-scan-action@v5.1.0` + `SonarSource/sonarqube-quality-gate-action@v1.1.0`
- Coverage uploadée en artifact `coverage-lcov` (backend) / `coverage-report` (frontend) puis téléchargée par le job Sonar
- `fetch-depth: 0` configuré pour le blame Git
- Quality Gate par défaut `Sonar way` (le gate custom `DVG-Strict` est livré dans l'US `us-create-quality-gate-dvg-strict.md`)

**Reste à faire :**

- Externaliser l'URL Sonar via la variable de repo `SONAR_URI` (déjà créée le 2026-04-25 sur les deux repos, valeur `https://sonarqube.tellebma.fr/`) au lieu de la valeur hardcodée
- Valider que `SONAR_TOKEN_DVG` (secret) + `SONAR_URI` (variable) fonctionnent bout-en-bout sur une PR de test

## Critères d'acceptation

### CI (déjà présent — à confirmer)

- [x] Job `sonarqube` dans les deux `cicd.yml`
- [x] `fetch-depth: 0` (Sonar a besoin de l'historique)
- [x] Setup Node 22 + cache npm
- [x] Coverage LCOV générée par les jobs `test-unit` (backend) / `test` (frontend) puis transmise via artifact
- [x] `SonarSource/sonarqube-scan-action` exécuté avec `projectBaseDir` implicite (.)
- [x] `SonarSource/sonarqube-quality-gate-action` exécuté (échec si gate KO)
- [x] Les jobs s'exécutent en parallèle dans chaque repo sur chaque PR ciblant `main`

### Variables / Secrets

- [x] `SONAR_TOKEN_DVG` ajouté dans GitHub Actions Secrets (backend + frontend)
- [x] `SONAR_URI` ajouté dans GitHub Actions Variables (backend + frontend)
- [ ] Workflows utilisent `${{ vars.SONAR_URI }}` au lieu de la valeur hardcodée
- [ ] Documentation dans `docs/devsecops/secrets.md`

### Tests

- [ ] PR backend de cette US → job `sonarqube` passe en utilisant `vars.SONAR_URI` + `secrets.SONAR_TOKEN_DVG`
- [ ] PR frontend de cette US → idem
- [ ] PR introduisant volontairement un bug Sonar → le job échoue et bloque le merge (à faire dans une US de test dédiée)
- [ ] PR introduisant une baisse de coverage à < 80 % → le job échoue (idem)

## Effort estimé

S (~2 h) — Sonar déjà branché, il ne reste que l'externalisation de l'URL + la validation bout-en-bout.

## Dépendances

- US `us-create-quality-gate-dvg-strict.md` (pour passer du gate `Sonar way` au gate `DVG-Strict`)
- Accès aux secrets / variables GitHub (déjà fait)

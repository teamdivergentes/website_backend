# Enabler — Sonar baseline & Quality Gates

## Contexte technique

SonarQube est déjà branché sur les deux dépôts via `sonar-project.properties`, mais :

- Aucune baseline n'a été capturée et partagée
- Aucun **Quality Gate** custom n'est défini (le projet utilise le gate par défaut `Sonar way`)
- L'analyse Sonar n'est pas (ou plus) déclenchée par la CI sur chaque PR
- Le token `SONAR_TOKEN` n'est pas documenté dans le projet

Cet enabler est **bloquant** pour les autres enablers de l'EPIC : sans cible chiffrée, impossible de prouver qu'on a amélioré la qualité.

## Décisions retenues

- **Quality Gate custom** : `DVG-Strict` appliqué aux deux projets
  - 0 bug (Reliability rating = A)
  - 0 vulnérabilité (Security rating = A)
  - 0 hotspot non revu
  - Coverage on new code >= 80 %
  - Duplicated lines on new code < 3 %
  - Maintainability rating on new code = A
- **Baseline figée le jour J** stockée dans `docs/sonar-baseline-YYYY-MM-DD.md` (par projet)
- **CI** : étape Sonar dans `ci.yml`, échec si Quality Gate KO sur la PR
- Token `SONAR_TOKEN` stocké dans GitHub Actions Secrets

## Direction technique

### SonarQube
- Créer le Quality Gate `DVG-Strict` via l'UI ou l'API admin
- Attacher `dvg-backend` et `dvg-frontend` au gate `DVG-Strict`
- Générer un token de service `claude-ci` (scope `Execute Analysis`)

### CI/CD
- Étape `Sonar Scan` dans `.github/workflows/ci.yml` (deux jobs en matrice : backend, frontend)
- Utiliser l'action officielle `sonarsource/sonarqube-scan-action`
- `sonarsource/sonarqube-quality-gate-action` pour échouer la PR si gate KO
- Branche `pull/<num>` détectée automatiquement, comparée à `main`

### Documentation
- `docs/sonar-baseline-2026-XX-XX.md` (1 par projet) avec capture des métriques actuelles
- `docs/sonar-quality-gates.md` : définition du gate `DVG-Strict` et justification des seuils

## Configuration GitFlow (2026-04-29)

### Problème

SonarQube comparait le "new code" des PRs contre `main`. Dans un workflow GitFlow où `develop` est la branche d'intégration, tout commit présent sur `develop` mais pas encore sur `main` apparaissait comme "new code" — générant des faux positifs systématiques.

Cas concret : commit `9051170` (fix 14 bugs Sonar) mergé sur `develop`, pas encore sur `main` (PR release #120 ouverte). Le QG `DVG-Strict` (condition `bugs > 0`) voyait 14 bugs comme "nouveaux" → CI rouge sur toutes les PRs vers `develop` (#127, #128, #132, #134).

### Solution : New Code Definition = Reference Branch `develop`

La définition "new code" doit pointer vers `develop` (et non vers la version précédente ou `main`).

**Commandes API à exécuter avec le token admin :**

```bash
# dvg-frontend
curl -s -u "$SONAR_TOKEN_TELLEBMA:" -X POST \
  "https://sonarqube.tellebma.fr/api/new_code_periods/set?project=dvg-frontend&type=REFERENCE_BRANCH&value=develop"

# dvg-backend
curl -s -u "$SONAR_TOKEN_TELLEBMA:" -X POST \
  "https://sonarqube.tellebma.fr/api/new_code_periods/set?project=dvg-backend&type=REFERENCE_BRANCH&value=develop"

# Vérification
curl -s -u "$SONAR_TOKEN_TELLEBMA:" \
  "https://sonarqube.tellebma.fr/api/new_code_periods/show?project=dvg-frontend"
curl -s -u "$SONAR_TOKEN_TELLEBMA:" \
  "https://sonarqube.tellebma.fr/api/new_code_periods/show?project=dvg-backend"
```

Résultat attendu : `{"type":"REFERENCE_BRANCH","value":"develop",...}`

**Alternative UI** : SonarQube → Project Settings → General Settings → New Code → "Reference Branch" → `develop`.

### Etat avant configuration

```json
{"projectKey":"dvg-frontend","type":"PREVIOUS_VERSION","inherited":true}
{"projectKey":"dvg-backend","type":"PREVIOUS_VERSION","inherited":true}
```

### Etat cible après configuration

```json
{"projectKey":"dvg-frontend","type":"REFERENCE_BRANCH","value":"develop"}
{"projectKey":"dvg-backend","type":"REFERENCE_BRANCH","value":"develop"}
```

### Note : le QG DVG-Strict n'est pas modifié

Les conditions du Quality Gate restent inchangées. C'est uniquement la définition du périmètre "new code" qui change — les bugs déjà corrigés sur `develop` ne sont plus comptés comme nouveaux.

## US

| US | Claude | PO | E2E | Livré |
|----|--------|----|----|-------|
| [us-capture-sonar-baseline.md](us-capture-sonar-baseline.md) | Fait (docs/sonar-baseline-2026-04-26-{backend,frontend}.md commitees via PR #62 mergee) | A faire | A faire | A faire |
| [us-create-quality-gate-dvg-strict.md](us-create-quality-gate-dvg-strict.md) | Fait (QG cree via API SonarQube, attache aux 2 projets, allege en CAYC-only) | A faire | A faire | A faire |
| [us-wire-sonar-into-github-actions.md](us-wire-sonar-into-github-actions.md) | Partiel (front #98 mergee, back #55 OPEN attend CI) | A faire | A faire | A faire |

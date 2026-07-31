# US — Bumper les GitHub Actions residuelles du repo frontend vers Node.js 24

> **Statut Claude (2026-05-09) : Fait.** PR #163 (`chore(ci): bumper actions residuelles a Node.js 24 baseline`) mergee sur develop. Verification `grep "uses:"` du 2026-05-09 confirme `actions/checkout@v6.0.2`, `actions/setup-node@v6.3.0`, `actions/cache@v5.0.4`, `actions/download-artifact@v8.0.1`, `github/codeql-action/upload-sarif@v4.35.1`, `SonarSource/sonarqube-scan-action@v7.1.0`, `docker/login-action@v4.1.0`. Aucune ref `v4.x` residuelle sur les actions critiques.

## Role / Action / Benefice

> **En tant que** Expert DevSecOps,
> **je veux** terminer la migration des actions JavaScript du frontend vers Node.js 24,
> **afin que** la CI frontend ne remonte plus le warning de depreciation Node.js 20 et que toutes les actions soient harmonisees sur la meme baseline.

## Perimetre fichiers

- `frontend/.github/workflows/cicd.yml` (residus a corriger)
- `frontend/.github/workflows/e2e-fullstack.yml`
- `frontend/.github/workflows/discord-notify.yml`
- `frontend/.github/workflows/ghcr-cleanup.yml`
- `frontend/.github/workflows/runner-check.yml`

## Constat

Le frontend est deja en grande partie sur `actions/checkout@v6.0.2` et `actions/setup-node@v6.3.0`. Reste quelques references heritees a nettoyer :

| Fichier | Ligne | Action | Etat |
|---------|-------|--------|------|
| `cicd.yml` | 272 | `actions/checkout@v4.2.2` | A bumper en `v6.0.2` |
| `cicd.yml` | 349 | `actions/checkout@v4.2.2` | A bumper en `v6.0.2` |
| `cicd.yml` | 358 | `actions/setup-node@v4.1.0` | A bumper en `v6.x` |
| `cicd.yml` | 365 | `actions/cache@v4.2.3` | A bumper en `v5.0.4` |
| `cicd.yml` | 1042 | `actions/setup-node@v4` (tag flottant) | Pinner sur derniere `v6.x` SHA |
| `cicd.yml` | 669 / 774 / 873 | `docker/login-action@v3.3.0` | A bumper en `v4.1.0` |
| `e2e-fullstack.yml` | 94, 102, 199 | `actions/cache@v4.2.3` | A bumper en `v5.0.4` |
| `cicd.yml` | 114, 154, 187, 458, 556 | `actions/cache@v4.2.3` | A bumper en `v5.0.4` |

## Criteres d'acceptation

- [ ] `grep -r "@11bd71901bbe" frontend/.github/` ne retourne plus rien.
- [ ] `grep -rE "actions/(checkout|setup-node|cache|download-artifact)@v4" frontend/.github/` ne retourne plus rien.
- [ ] Tous les `docker/login-action` sont sur `v4.1.0` (SHA `4907a6ddec99...`).
- [ ] Aucun tag flottant (ex : `@v4`, `@main`) — uniquement des SHA + commentaire.
- [ ] CI frontend complete passe : `lint-and-test`, `build`, `sonar`, `e2e-fullstack`, `lighthouse`, `release`, `notify`.
- [ ] Le warning `Node.js 20 actions are deprecated` disparait des logs du job suivant.
- [ ] Cache `actions/cache@v5` fonctionne (verifier `cache-hit: true` au 2eme run).

## Notes techniques

- `actions/cache@v5` change la maniere de calculer la cle de fallback : tester explicitement le cas `npm ci` sur une 2eme execution.
- `actions/setup-node@v6` accepte `node-version-file: '.nvmrc'` ; pas de breaking change sur le `cache: 'npm'` integré.
- `treosh/lighthouse-ci-action@v12` reste compatible (deja Node 20 mais marque "non concerne" — confirmer dans les logs).

## Effort

S (≈ 1.5 h).

## Dependances

Aucune. Peut etre joue en parallele du backend.

# US — Bumper les GitHub Actions du repo backend vers Node.js 24

> **Statut Claude (2026-05-09) : Fait.** PR #116 (`chore(ci): bump GitHub Actions a Node.js 24 baseline`) mergee sur develop. Verification `grep "uses:"` du 2026-05-09 confirme :
> - `actions/checkout@v6.0.2`
> - `actions/setup-node@v6.3.0`
> - `actions/cache@v5.0.4`
> - `actions/download-artifact@v8.0.1`
> - `github/codeql-action/upload-sarif@v4.35.1`
> - `SonarSource/sonarqube-scan-action@v7.1.0`
> Aucune ref `v4.x` residuelle sur les actions critiques.

## Role / Action / Benefice

> **En tant que** Expert DevSecOps,
> **je veux** mettre a jour toutes les actions JavaScript du workflow backend vers des versions tournant sur Node.js 24,
> **afin que** la CI ne remonte plus le warning de depreciation Node.js 20 et reste fonctionnelle apres le passage force du 2 juin 2026.

## Perimetre fichiers

- `backend/.github/workflows/cicd.yml` (principal — ~15 references a bumper)
- `backend/.github/workflows/discord-notify.yml`
- `backend/.github/workflows/ghcr-cleanup.yml`
- `backend/.github/workflows/runner-check.yml`

## Bumps a effectuer

| Action | De | Vers | Occurrences |
|--------|----|----|-------------|
| `actions/checkout` | `v4.2.2` (`11bd71901bbe...`) | `v6.0.2` (`de0fac2e4500...`) | ~12 |
| `actions/setup-node` | `v4.1.0` (`39370e3970a6...`) | derniere v6 par SHA | 1 |
| `actions/cache` | `v4.2.3` (`5a3ec84eff66...`) | `v5.0.4` (`668228422ae6...`) | 1 |
| `actions/download-artifact` | `v4.1.9` (`cc203385981b...`) | `v8.0.1` (`3e5f45b2cfb9...`) | 1 |
| `github/codeql-action/upload-sarif` | `v3.28.18` (`ff0a06e83cb2...`) | `v4.35.1` (`c10b8064de6f...`) | 1 |
| `SonarSource/sonarqube-scan-action` | `v5.1.0` (`aa494459d7c3...`) | `v7.1.0` (`299e4b793aaa...`) | 1 |
| `docker/login-action` | `v4.1.0` (deja Node 24) | conserver | 3 |
| `docker/build-push-action` | `v6.4.1` (deja Node 24) | conserver | 1 |

## Criteres d'acceptation

- [ ] Recherche `grep -r "actions/checkout@" backend/.github/` ne retourne plus aucun `v4.x` ni SHA `11bd71901bbe...`.
- [ ] Tous les `uses:` ont un commentaire `# vX.Y.Z` a cote du SHA.
- [ ] Le workflow `cicd.yml` est lance manuellement ou via une PR de test : le warning Node.js 20 disparait des logs.
- [ ] Job `validate-migrations` reste vert.
- [ ] Job `lint-and-test` reste vert (Sonar v7 doit accepter l'auth).
- [ ] Job `build` Docker reste vert (multi-stage Dockerfile inchange).
- [ ] Job `trivy` reste vert (codeql v4 doit uploader le SARIF correctement).
- [ ] Job `release` GHCR reste vert.
- [ ] Cache Yarn/npm fonctionne toujours apres le bump `actions/cache@v5` (verifier le `cache-hit` dans les logs).
- [ ] Aucune regression de duree de pipeline > 10 %.

## Notes techniques

- Sonar v7 utilise toujours `SONAR_TOKEN` mais a change le bin local (`sonar-scanner-cli` recompile). Verifier que `sonar-project.properties` reste compatible.
- CodeQL v4 demande un `category` explicite dans `upload-sarif` (deja present : `category: 'trivy-config-backend'`).
- Si une action exige Node >= 18 cote local pour la generation des SHA, lancer `npm dedupe` avant.

## Effort

M (≈ 2 h).

## Dependances

Aucune (les workflows backend sont autonomes).

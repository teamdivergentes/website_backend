# Feature F5 — Bump des GitHub Actions vers runtime Node.js 24

## Repos

`backend` + `frontend` + `ansible_vps`

## Branche git

`chore/gh-actions-node-24` (creee dans chaque repo).

## Contexte

GitHub a annonce la depreciation du runtime Node.js 20 sur les runners (changelog 2025-09-19) :

- **2 juin 2026** : les actions JavaScript seront forcees a tourner sur Node.js 24 par defaut.
- **16 septembre 2026** : Node.js 20 sera retire des runners.

La CI emet deja le warning suivant sur tous nos jobs :

> `Node.js 20 actions are deprecated. The following actions are running on Node.js 20 and may not work as expected: actions/checkout@11bd71901bbe5b1630ceea73d27597364c9af683.`

Plusieurs actions de notre pipeline pointent encore sur des versions qui embarquent le runtime Node.js 20 (notamment `actions/checkout@v4.2.2`, `actions/setup-node@v4.1.0`, `actions/cache@v4.2.3`, `actions/download-artifact@v4.1.9`, `actions/setup-python@v5`, `docker/login-action@v3.3.0`, `github/codeql-action/upload-sarif@v3.28.18`, `SonarSource/sonarqube-scan-action@v5.1.0`). Le frontend a deja partiellement migre (`v6.0.2`/`v6.3.0`), il reste a finir les 3 repos.

Cible : aligner toutes les actions JavaScript sur une version Node.js 24, en pinning par commit SHA (regle CI deja en place dans les workflows).

## Inventaire des actions a bumper (releve 2026-05-06)

| Action | Version actuelle (a bumper) | Version cible | Repo(s) impactes |
|--------|----------------------------|---------------|------------------|
| `actions/checkout` | `v4.2.2` (SHA `11bd71901bbe...`) | `v6.0.2` (deja utilise frontend/ansible) | backend (~15 ref), frontend cicd (2 ref) |
| `actions/setup-node` | `v4.1.0` (SHA `39370e3970a6...`) | `v6.x` (Node 24) | backend (1 ref), frontend cicd (1 ref) |
| `actions/cache` | `v4.2.3` (SHA `5a3ec84eff66...`) | `v5.0.4` (deja utilise backend) | frontend cicd + e2e (~5 ref), backend (1 ref residuelle) |
| `actions/download-artifact` | `v4.1.9` (SHA `cc203385981b...`) | `v8.0.1` (deja utilise frontend) | backend (1 ref) |
| `actions/setup-python` | `v5` (non pinne) | `v6.x` pinne par SHA | ansible_vps (2 ref) |
| `docker/login-action` | `v3.3.0` (SHA `9780b0c442fb...`) | `v4.1.0` (deja utilise backend) | frontend (3 ref) |
| `github/codeql-action/upload-sarif` | `v3.28.18` | `v4.35.1` (deja utilise frontend) | backend (1 ref) |
| `SonarSource/sonarqube-scan-action` | `v5.1.0` | `v7.1.0` (deja utilise frontend) | backend (1 ref) |

> **Source** : le scan `grep "uses:" .github/workflows/*.yml` du 2026-05-06 sur les 3 repos.

## Suivi US

| US | Claude | PO | E2E | Livre |
|----|--------|----|----|-------|
| [us-bump-actions-backend.md](us-bump-actions-backend.md) | Fait (PR #116 mergee 2026-05-04) | A faire | A faire | A faire |
| [us-bump-actions-frontend.md](us-bump-actions-frontend.md) | Fait (PR #163 mergee 2026-05-06) | A faire | A faire | A faire |
| [us-bump-actions-ansible.md](us-bump-actions-ansible.md) | Fait (deja sur v6.0.2/v6.2.0 verifie 2026-05-09) | A faire | A faire | A faire |

## Strategie

1. Une branche par repo, un PR par repo (les workflows sont independants).
2. Avant le bump, **resoudre la version cible commune** dans un `.github/actions-versions.md` ou en commentaire au sommet du workflow pour eviter la re-derive (ex : `# Node 24 baseline 2026-05-06`).
3. Pinning **toujours par SHA** (regle de securite deja appliquee), suivie du tag en commentaire.
4. **Ne pas activer** `FORCE_JAVASCRIPT_ACTIONS_TO_NODE24=true` comme contournement : on bumpe les actions proprement.
5. CI verte sur chaque PR avant merge ; warning Node 20 disparait dans les logs du job suivant.

## Risques

- Certaines actions changent de signature majeure (ex : `actions/cache@v5` a un comportement de hashing modifie pour les fallback keys → tester les caches `npm`).
- `actions/setup-node@v6` peut imposer des versions Node minimales pour `node-version-file`.
- `SonarSource/sonarqube-scan-action@v7` change l'auth (token-based) — verifier la compat avec notre `SONAR_TOKEN` et le `quality-gate-action` (qui reste sur `v1.2.0`).
- `actions/setup-python@v6` impose Python >= 3.8 (sans incidence sur ansible).

## Criteres de validation feature

- [ ] Tous les jobs CI ne remontent **plus** le warning `Node.js 20 actions are deprecated`.
- [ ] Aucun bump partiel : aucune ref `actions/checkout@v4`, `actions/setup-node@v4`, `actions/cache@v4`, `actions/download-artifact@v4` ne subsiste.
- [ ] Tous les SHA sont presents dans le commentaire `# vX.Y.Z` a cote du `uses:`.
- [ ] Pipelines CI verts sur les 3 repos (validate-migrations, tests, build, Trivy, Sonar, Lighthouse, E2E, deploy).
- [ ] Pas de regression sur la duree des jobs > 10 % apres bump.

## Charge estimee

M (≈ 4 h cumulees, principalement sur le backend).

## Dependances

- Compatible avec EPIC-20 (commentaire PR CI sync) — ne touche pas la logique, seulement les versions des actions.
- A faire **avant le 2 juin 2026** pour eviter le passage force qui pourrait casser l'auth/cache.

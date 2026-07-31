# EPIC-24 — Release Pipeline Fixes

## Objectif

Corriger les bugs et fragilités du pipeline CI/CD identifies lors de la release v1.3.6 frontend / v1.4.0 backend (soiree du 2026-05-11). Plusieurs ont necessite des contournements manuels qui ne sont pas acceptables a long terme.

## Contexte

La release Matomo (EPIC-18 Phase 1) a expose une douzaine de problemes dans le pipeline. Tous resolus dans la soiree par hotfix ou contournement manuel, mais doivent etre corriges proprement avant la prochaine release.

## Issues GitHub creees (2026-05-11)

| Issue | Repo | Severite | Titre |
|-------|------|----------|-------|
| [#190](https://github.com/teamdivergentes/website_frontend/issues/190) | website_frontend | CRITIQUE | CI: Tag push by DEPLOY_TOKEN does not re-trigger workflow → deploy-prod skip |
| [#131](https://github.com/teamdivergentes/website_backend/issues/131) | website_backend | CRITIQUE | CI: Tag push by DEPLOY_TOKEN does not re-trigger workflow → deploy-prod skip |
| [#132](https://github.com/teamdivergentes/website_backend/issues/132) | website_backend | CRITIQUE | CI: Backend image RELEASE not pushed to GHCR (Ansible deploy fail 404) |
| [#191](https://github.com/teamdivergentes/website_frontend/issues/191) | website_frontend | MAJEUR | CI: smoke-release job fails with standalone container (nginx host not found: backend) |
| [#192](https://github.com/teamdivergentes/website_frontend/issues/192) | website_frontend | MINEUR | CI: workflow-status evaluates prematurely (race condition with long jobs) |
| [#193](https://github.com/teamdivergentes/website_frontend/issues/193) | website_frontend | MINEUR | CI: mutation-test job has no timeout (Stryker runs >1h indefinitely) |
| [#194](https://github.com/teamdivergentes/website_frontend/issues/194) | website_frontend | MINEUR | Perf: Lighthouse performance score <0.7 on 3 public pages |
| [#133](https://github.com/teamdivergentes/website_backend/issues/133) | website_backend | MINEUR | CI: test-e2e fails on self-hosted runner (postgres container not found) |
| [#134](https://github.com/teamdivergentes/website_backend/issues/134) | website_backend | MINEUR | CI: semantic-release fails on step "success" due to invalid issue reference |

## Etat d'avancement

| Item | Claude | PO | E2E | Livre |
|------|--------|----|----|-------|
| ENABLER-1 : Re-trigger workflow on tag push (frontend + backend) | Fait | A faire | N/A | A faire |
| ENABLER-2 : Smoke-release sans dependance backend | A faire | A faire | N/A | A faire |
| ENABLER-3 : Backend image RELEASE push reliable | Fait | A faire | N/A | A faire |
| ENABLER-4 : workflow-status job timing fix | A faire | A faire | N/A | A faire |
| ENABLER-5 : Mutation-test timeout / incremental mode | A faire | A faire | N/A | A faire |
| ENABLER-6 : Backend test-e2e postgres runner fix | A faire | A faire | N/A | A faire |
| ENABLER-7 : Semantic-release "success" plugin failure | A faire | A faire | N/A | A faire |
| ENABLER-8 : Lighthouse perf > 0.7 sur pages publiques | A faire | A faire | A faire | A faire |

## Hors scope

- Refactor complet du pipeline (deja modulaire)
- Migration semantic-release vers une autre solution (release-it, changesets…)
- Re-tagger v1.4.0 frontend (decision PO 2026-05-11 : laisser v1.3.6)

## Journal

### 2026-05-27 — ENABLER-1 + ENABLER-3 implémentés (branche `fix/epic-24-tag-retrigger-prod-fallback`, front + back)

Implémentation déléguée aux agents DevSecOps. **Commité + PRs ouvertes vers `develop`** : frontend [#220](https://github.com/teamdivergentes/website_frontend/pull/220), backend [#152](https://github.com/teamdivergentes/website_backend/pull/152).

Décision PO 2026-05-27 : pas de `required_reviewers` ajouté sur l'environnement `production` — la promotion `develop → main` tient lieu de validation humaine. Flux nominal (push main → tag → deploy-prod auto, gated par smoke-release + rollback auto post-deploy via `deploy.sh`) inchangé.

**Volet 1 — Filet de secours `workflow_dispatch`** : input `deploy_tag` (ex. `v1.4.2`). Sur ce chemin, `smoke-release` + `deploy-prod` deviennent déclenchables manuellement depuis l'UI Actions sans dépendre d'un tag qui re-trigger. Pas de rebuild : on re-déploie l'image **immuable `X.Y.Z-RELEASE`** déjà sur GHCR (pas le tag flottant `:RELEASE`, qui pourrait pointer une version plus récente). Approbation Environments `production` conservée.

**Volet 2 — Garde-fou anti tag-fantôme** : après `release` (semantic-release crée le tag), attente 90s + interrogation API GitHub Actions ; si 0 run sur le tag → alerte Discord (`DISCORD_DEPLOY_WEBHOOK`, secret confirmé présent) avec instructions de fallback. Non bloquant. **Limite connue** : filtre `head_branch` peu fiable pour les runs de tag → durcissement ultérieur possible (filtrer sur `head_sha`).

**Volet 3 — ENABLER-3** : sur le chemin dispatch, vérification 3 niveaux de présence de l'image `X.Y.Z-RELEASE` sur GHCR (`docker manifest inspect` dans `docker`, `docker pull` dans `smoke-release`, échec explicite avant Ansible) → fini le 404 obscur.

Fichiers : `frontend/.github/workflows/cicd.yml`, `backend/.github/workflows/cicd.yml`, `backend/.github/scripts/determine-tags.sh` (ajout mode `DISPATCH_DEPLOY_TAG`). YAML + `bash -n` validés.

## Priorisation

1. **CRITIQUE** : ENABLER-1 (tag re-trigger) + ENABLER-3 (backend RELEASE) → sans ces 2, chaque release necessite des steps manuels
2. **MAJEUR** : ENABLER-2 (smoke-release) → bloque inutilement deploy-prod
3. **MINEUR** : autres → ameliorations qualite, pas bloquantes

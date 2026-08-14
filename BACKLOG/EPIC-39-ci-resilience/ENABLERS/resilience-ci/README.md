# ENABLER — Résilience CI

**Statut** : EN COURS
**Repos concernés** : `website_backend` + `website_frontend` (workflows symétriques → 1 MR par repo et par US)

## Suivi

| US | Priorité | Claude | PO | E2E | Livré |
|----|----------|--------|----|----|-------|
| [us-supervision-runners](us-supervision-runners.md) | 🔴 1 | Fait | A faire | - | A faire |
| [us-repartition-jobs-ci](us-repartition-jobs-ci.md) | 🟠 2 | Fait | A faire | - | A faire |
| [us-reprise-release-manquante](us-reprise-release-manquante.md) | 🟡 3 | Fait | A faire | - | A faire |

## Livraison (2026-07-22) — 4 MR vers `develop`

| US | Backend | Frontend |
|----|---------|----------|
| US1 — supervision runners | [#166](https://github.com/teamdivergentes/website_backend/pull/166) | [#235](https://github.com/teamdivergentes/website_frontend/pull/235) |
| US2 + US3 — `cicd.yml` | [#167](https://github.com/teamdivergentes/website_backend/pull/167) | [#236](https://github.com/teamdivergentes/website_frontend/pull/236) |

**Résultat US2** : jobs dépendant des runners self-hosted ramenés de **10/16 à 4/18** (backend) et **5/18** (frontend).

### Actions humaines requises avant / après merge

- [ ] 🔴 **Portée du secret `DEPLOY_TOKEN`** (admin org) — lister les runners d'org exige `admin:org` / `Administration: read`. Sans elle, seuls les contrôles d'engorgement restent actifs (US1).
- [ ] 🟠 **Sémantique du tag flottant `:RELEASE`** (PO) — valider qu'une reprise sur un `deploy_tag` antérieur repositionne `:RELEASE` sur cette version (US3).
- [ ] 🟡 **Surveiller le 1er run après merge** : caches froids partout (changement de clé) et durée de `mutation-test` sur GitHub-hosted (pas de `timeout-minutes`).
- [ ] 🟡 **Tester `release-rebuild` en conditions réelles** via un dispatch sur un tag de test (chemin non exercé).

### Vérifié avant push
- SonarQube joignable depuis l'extérieur du VPS (`api/system/status` → 200, `UP`) : la bascule de ce job sur `ubuntu-latest` ne casse rien.

## Ordre

```
us-supervision-runners      (runner-check.yml — fichier indépendant)
us-repartition-jobs-ci   ┐
us-reprise-release       ┴─ touchent tous deux cicd.yml : à séquencer
```

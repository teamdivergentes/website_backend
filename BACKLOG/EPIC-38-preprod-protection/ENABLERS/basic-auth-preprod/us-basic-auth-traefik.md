# US — Basic Auth Traefik sur la preprod

## User Story

**En tant que** membre de l'équipe Divergentes,
**je veux** que l'accès au site preprod soit protégé par un identifiant/mot de passe simple,
**afin que** les visiteurs non autorisés (« petits coquins ») ne puissent pas consulter les contenus en cours de validation, sans gêner le travail de l'équipe ni la CI.

## Critères d'acceptation

- [ ] **AC1** — `GET https://preprod.teamdivergentes.fr/` sans identifiants retourne `401 Unauthorized` avec header `WWW-Authenticate: Basic`
- [ ] **AC2** — `GET https://preprod.teamdivergentes.fr/api/health` sans identifiants retourne `401` (l'API est aussi protégée)
- [ ] **AC3** — Avec les identifiants corrects, le site est entièrement fonctionnel : navigation publique, login admin, appels API, images `/uploads/`
- [ ] **AC4** — Le navigateur mémorise les identifiants pour la session (comportement Basic Auth standard — pas de re-saisie à chaque page)
- [ ] **AC5** — La prod (`teamdivergentes.fr`) n'est **pas** impactée : aucun 401, aucun changement de comportement
- [ ] **AC6** — Le hash htpasswd est stocké en **Ansible Vault** (`vault_preprod_basic_auth`), jamais en clair dans le repo
- [ ] **AC7** — Les healthchecks CI post-deploy preprod restent verts (adaptation `curl -u` ou tolérance 401 documentée)
- [ ] **AC8** — Les headers de sécurité existants (`security-headers@file`) et le rate-limit restent appliqués sur la preprod

## Implémentation retenue

Middleware Traefik `basicAuth` conditionnel à `env == preprod`, soit en labels Docker dans `docker-compose-website.yml.j2`, soit en middleware `@file` dans `dynamic.yml.j2` (au choix du DevSecOps selon la cohérence avec l'existant).

## Statut

| Claude | PO | E2E | Livré |
|--------|----|----|-------|
| Fait | A faire | N/A | A faire |

> Implémenté le 2026-06-04 (middleware `@file` `basic-auth-preprod`, rendu validé jinja2+yaml, syntax-check OK). Reste : entrée vault `vault_preprod_basic_auth_users` (action humaine) puis commit/push.

> E2E : `N/A` — protection infra, validée par les AC1/AC2/AC7 (curl) plutôt que par Playwright.

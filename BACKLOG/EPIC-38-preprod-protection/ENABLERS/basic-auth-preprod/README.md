# ENABLER-1 — Basic Auth Traefik sur la preprod

## Contexte technique

Le template `ansible_vps/roles/website/templates/docker-compose-website.yml.j2` est **partagé preprod/prod** via la variable `{{ env }}`. Les routers Traefik (`website-{{ env }}`, `api-{{ env }}`) référencent les middlewares `security-headers@file` et `rate-limit@file` définis dans `roles/traefik/templates/dynamic.yml.j2`.

L'ajout du middleware `basicAuth` doit être **conditionnel à l'environnement preprod** (Jinja `{% if env == 'preprod' %}` ou variable `website_basic_auth_enabled` par environnement).

## Points d'attention

- **Hash htpasswd** : généré via `htpasswd -nbB` (bcrypt), stocké dans Ansible Vault. Attention à l'échappement des `$` dans les labels Docker Compose (`$$`)
- **Webhooks entrants** : vérifier qu'aucun service externe (HelloAsso EPIC-34 futur, Discord) n'appelle l'API preprod — sinon prévoir une exclusion de path
- **CI** : le job `deploy-preprod` (`frontend/.github/workflows/cicd.yml` + backend) — vérifier les healthchecks post-deploy et le garde-fou Discord (EPIC-24) ; un `401` ne doit pas être interprété comme un échec de déploiement (ou utiliser `curl -u`)
- **smoke-release** : non impacté (tourne en local sur le runner, port 18080)
- Le middleware doit s'appliquer aux **deux routers** preprod (`website-preprod` ET `api-preprod`)

## Suivi

| US | Claude | PO | E2E | Livré |
|----|--------|----|----|-------|
| [us-basic-auth-traefik](us-basic-auth-traefik.md) | Fait | A faire | N/A | A faire |

# US — Superviser le process Node et sonder sa santé

**En tant que** DevSecOps
**Je veux** que la mort du serveur SSR fasse tomber le conteneur
**Afin de** ne pas servir des 502 en silence pendant des jours

## Contexte

Le `location /health` actuel renvoie 200 dès que Nginx tourne. Avec le SSR, Nginx peut être parfaitement vivant alors que Node est mort : Traefik continuerait de router du trafic vers un conteneur incapable de rendre une page.

## Acceptance criteria

- [ ] `entrypoint.sh` lance le serveur SSR en arrière-plan puis Nginx au premier plan
- [ ] Si le process Node s'arrête, le conteneur s'arrête — pas de Nginx orphelin servant des 502
- [ ] Le `location /health` sonde le serveur SSR, pas seulement Nginx
- [ ] Un `HEALTHCHECK` Docker est déclaré et devient `unhealthy` quand Node est mort
- [ ] La génération de `assets/config.json` est conservée
- [ ] La génération conditionnelle de `robots.txt` selon `ROBOTS_ALLOW` est conservée
- [ ] La substitution `envsubst` de `BACKEND_URL` et `ROBOTS_TAG` dans la configuration Nginx est conservée
- [ ] **L'injection `awk` des placeholders `__OG_TITLE__`, `__OG_DESCRIPTION__` et `__OG_IMAGE__` est conservée** : `index.html` reste servi tel quel pour les routes admin en rendu client
- [ ] `SSR_API_BASE_URL` est transmise au process Node, avec `http://backend:3000` comme valeur par défaut
- [ ] Les logs du serveur SSR sont visibles dans `docker logs`, sans se mélanger de façon illisible avec ceux de Nginx
- [ ] Test manuel : `kill` du process Node dans le conteneur en preprod, vérification que le conteneur s'arrête

## Dépendances

Bloquée par `us-nginx-ssr-proxy.md`.

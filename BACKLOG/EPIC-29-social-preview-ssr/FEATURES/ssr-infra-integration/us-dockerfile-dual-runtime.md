# US — Image Docker portant Node et Nginx

**En tant que** DevSecOps
**Je veux** une image frontend qui embarque le serveur SSR et Nginx
**Afin de** déployer le rendu serveur sans changer la topologie des conteneurs

## Contexte

L'image actuelle part de `nginx:alpine` et ne copie que `dist/frontend/browser`. Il lui faut désormais un runtime Node et le dossier `dist/frontend/server`.

## Acceptance criteria

- [ ] L'étape de production part de `node:22-alpine` avec Nginx installé (`apk add nginx`)
- [ ] `dist/frontend/browser` **et** `dist/frontend/server` sont copiés depuis l'étape de build
- [ ] L'exécution en utilisateur non-root est conservée, ainsi que les permissions sur `/var/cache/nginx`, `/var/log/nginx`, `/run` et `/etc/nginx`
- [ ] Les correctifs de sécurité `apk upgrade` sont conservés
- [ ] Le port exposé reste `80`
- [ ] Les dépendances de production Node nécessaires au serveur SSR sont présentes dans l'image, sans embarquer les `devDependencies`
- [ ] La taille de l'image finale est mesurée et notée dans la PR ; un écart supérieur à 150 Mo par rapport à l'image actuelle est justifié ou optimisé
- [ ] L'image se construit en CI sur le runner self-hosted sans allonger le build de plus d'une minute

## Dépendances

Bloquée par les trois US de la feature `ssr-angular-core`.

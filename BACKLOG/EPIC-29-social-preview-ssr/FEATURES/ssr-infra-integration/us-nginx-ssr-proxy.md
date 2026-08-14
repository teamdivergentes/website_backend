# US — Router le HTML vers le serveur SSR sans perdre les headers

**En tant que** DevSecOps
**Je veux** que Nginx proxifie les requêtes de page vers Node tout en conservant sa configuration de sécurité
**Afin de** livrer le rendu serveur sans régression de sécurité ni de routage

## Contexte

`add_header` dans un bloc `location` écrase **tous** les `add_header` du niveau `server`. Piège déjà consigné dans `WEB/CLAUDE.md`. La nouvelle `location /` doit donc réémettre l'intégralité des headers de sécurité.

## Acceptance criteria

- [ ] `location / { ... }` remplace `try_files $uri $uri/ /index.html;` par `proxy_pass http://127.0.0.1:4000;`
- [ ] Les en-têtes `Host`, `X-Real-IP`, `X-Forwarded-For` et `X-Forwarded-Proto` sont transmis au serveur SSR
- [ ] La nouvelle `location /` réémet **tous** les headers de sécurité : `Content-Security-Policy`, `Strict-Transport-Security`, `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`, `X-Robots-Tag`
- [ ] Les assets statiques (`.js`, `.css`, images, polices) continuent d'être servis depuis le disque, sans passer par Node
- [ ] Les 7 redirects 301 SEO (`/team`, `/shop`, `/stream`, `/evenements`, `/graphic-chart`, `/jeux`) répondent toujours en 301
- [ ] Le rate limiting sur `/api/auth/login`, `/api/contact` et les candidatures est inchangé
- [ ] Les blocs `location ^~ /admin/` et `^~ /auth/` continuent de servir `index.html` avec leurs headers propres et `X-Robots-Tag: noindex, nofollow`
- [ ] `/uploads/`, `/sitemap.xml`, `/health` et les blocages de fichiers sensibles sont inchangés
- [ ] Vérification par `curl -I` en preprod : présence de chacun des 7 headers de sécurité sur une page publique, une page admin et un asset statique
- [ ] Le timeout de proxy vers Node est explicite et cohérent avec le temps de rendu observé

## Dépendances

Bloquée par `us-dockerfile-dual-runtime.md`.

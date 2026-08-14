# Feature — Intégration Docker et Nginx (P0)

## Contexte

Troisième lot de l'EPIC-29. C'est ce lot qui rend le SSR effectif en production : il route le trafic HTML vers le serveur Node bâti par la feature `ssr-angular-core`.

Décision PO du 2026-07-29 : **Nginx reste en frontal dans le même conteneur**, Node derrière sur `127.0.0.1:4000`. Traefik, le rôle Ansible `website` et le `docker-compose` ne bougent pas — hormis l'ajout de la variable `SSR_API_BASE_URL`.

```
Traefik :443
   └─ conteneur website-<env>-frontend :80  [nginx]
        ├─ /api/, /uploads/       → backend:3000        (inchangé)
        ├─ *.js *.css *.webp ...  → disque dist/browser (inchangé)
        ├─ 7 redirects 301 SEO    → inchangés
        └─ tout le reste          → 127.0.0.1:4000  [node ssr]
```

## Pourquoi Nginx reste devant

Le `nginx.conf` actuel porte la CSP, les headers de sécurité, le rate limiting sur `/api/auth/login`, `/api/contact` et les candidatures, 7 redirects 301 SEO, le proxy `/api` et `/uploads`, le cache des uploads et le `robots.txt` dynamique. Les réimplémenter en Express aurait été un chantier à part entière, avec un risque élevé de régression de sécurité pour un gain nul.

## Le piège Nginx à ne pas manquer

`add_header` dans un bloc `location` **écrase tous** les `add_header` du niveau `server`. Ce comportement est déjà consigné dans `WEB/CLAUDE.md`. La nouvelle `location /` devra donc réémettre intégralement : `Content-Security-Policy`, `Strict-Transport-Security`, `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy` et `X-Robots-Tag`.

Un oubli ici retire silencieusement la CSP de tout le site public. C'est le défaut le plus probable de ce lot, et il ne se voit pas à l'œil.

## Branche

`feat/epic-29-ssr` (frontend) + PR distincte sur `vps_ansible` si la variable `SSR_API_BASE_URL` impose une modification du template `docker-compose-website.yml.j2`.

## US

| US | Claude | PO | E2E | Livré |
|----|--------|----|----|-------|
| [us-dockerfile-dual-runtime.md](us-dockerfile-dual-runtime.md) | A faire | A faire | A faire | A faire |
| [us-nginx-ssr-proxy.md](us-nginx-ssr-proxy.md) | A faire | A faire | A faire | A faire |
| [us-entrypoint-supervision.md](us-entrypoint-supervision.md) | A faire | A faire | A faire | A faire |
| [us-nginx-microcache.md](us-nginx-microcache.md) | A faire | A faire | A faire | A faire |

## Validation

- Le conteneur démarre et sert une page publique rendue côté serveur
- Les headers de sécurité sont **tous** présents sur une page publique, CSP comprise, vérifiés par `curl -I` en preprod
- Les 7 redirects 301 SEO répondent toujours en 301
- Le rate limiting sur `/api/auth/login` et `/api/contact` fonctionne toujours
- `/uploads/` est toujours servi et mis en cache
- `robots.txt` et `assets/config.json` sont toujours générés au démarrage
- Les routes admin servent toujours `index.html` avec ses valeurs OG injectées
- Si le process Node est tué, le conteneur s'arrête au lieu de servir des 502 en silence
- Recette manuelle exhaustive en preprod **avant** toute promotion en production

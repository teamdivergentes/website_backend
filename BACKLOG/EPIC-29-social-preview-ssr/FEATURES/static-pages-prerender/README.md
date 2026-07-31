# Feature — Prerender des routes statiques — `ABANDONNEE`

> **2026-07-29** : abandonnée suite au pivot d'EPIC-29 vers le **SSR runtime** (décision PO). Le prerendering statique fige le HTML à l'heure du build, ce qui ne convient pas à un site qui publie des articles et vend des produits. Remplacée par les features [ssr-angular-core](../ssr-angular-core/README.md) et [ssr-infra-integration](../ssr-infra-integration/README.md). Conservée pour documenter la direction technique écartée. Ne plus mettre à jour.

## Contexte

Premiere etape de l'EPIC-29 : prouver que le prerendering Angular fonctionne pour les routes publiques qui n'ont pas de parametre dynamique. Ce sont les routes les plus simples a prerendrer (liste fixe, pas de fetch backend au build). Une fois cette feature livree, le partage social fonctionne deja pour la moitie des pages cibles.

## Routes ciblees

- `/`
- `/contact`
- `/boutique`
- `/structure`
- `/structure/sponsors`
- `/structure/equipes`
- `/structure/recrutement`
- `/twitch`
- `/articles` (liste des articles, pas le detail)
- `/equipes` (liste des equipes, pas la fiche joueur)
- `/legal/mentions-legales`
- `/legal/politique-confidentialite`
- `/404`

## Branche

`feat/epic-29-static-prerender` (depuis `develop`)

## Direction technique

1. **Installation** : `ng add @angular/ssr` (Angular 19+, deja en place dans le projet)
2. **Configuration** dans `angular.json` :
   ```json
   "build": {
     "options": {
       "outputMode": "static",
       "prerender": {
         "routes": ["/", "/contact", "/boutique", ...]
       }
     }
   }
   ```
3. **`index.html` template** : conserver `__OG_DESCRIPTION__` comme **fallback** (utilise uniquement pour les routes non prerenderees), et laisser le `SeoService` cote serveur injecter les vraies meta tags par route au build
4. **Dockerfile frontend** : copier le dossier `dist/<app>/browser/` (avec les `.html` generes) au lieu de `dist/<app>/`
5. **Nginx** : modifier la directive `try_files` :
   ```nginx
   try_files $uri $uri.html $uri/index.html /index.html;
   ```
   Cette regle sert le `.html` prerendere quand il existe, sinon fallback sur l'index SPA
6. **Audit `isPlatformBrowser`** : verifier que tous les composants en route prerenderee ne touchent pas `window`/`document` au constructeur (`SeoService` deja conforme depuis EPIC-25)
7. **Build CI** : verifier que le runner self-hosted termine le build en < 5 min

## US

| US | Claude | PO | E2E | Livre |
|----|--------|----|----|-------|
| [us-angular-ssr-setup.md](us-angular-ssr-setup.md) | A faire | A faire | A faire | A faire |
| [us-static-routes-list.md](us-static-routes-list.md) | A faire | A faire | A faire | A faire |
| [us-nginx-html-serving.md](us-nginx-html-serving.md) | A faire | A faire | A faire | A faire |
| [us-platform-browser-audit.md](us-platform-browser-audit.md) | A faire | A faire | A faire | A faire |

## Validation

- `curl -s https://preprod.teamdivergentes.fr/` retourne un HTML avec le bon `<title>` et meta tags **sans execution JS**
- Idem pour les 13 routes ciblees
- `curl -s https://preprod.teamdivergentes.fr/articles/quelconque-slug` retourne le `index.html` SPA (fallback Nginx fonctionne)
- Lighthouse SEO >= 90 maintenu sur toutes les routes prerenderees
- Aucune regression console : pas d'erreur `ReferenceError: window is not defined` au build
- Build CI frontend < 5 min total

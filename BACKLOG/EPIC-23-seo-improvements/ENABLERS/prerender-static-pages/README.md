# Enabler — Prerender statique des pages publiques (P2) — `PROMU EPIC-29`

> **2026-05-21** : cet enabler est **promu** en EPIC dedie [EPIC-29](../../../EPIC-29-social-preview-ssr/README.md) suite a un constat PO sur les previews Discord. Ne plus mettre a jour cet enabler — toute evolution se fait dans EPIC-29.
>
> **2026-07-29** : la direction technique decrite ci-dessous (prerendering statique) est **abandonnee** au profit du **SSR runtime**, sur decision PO. Motif : un HTML fige au build ne convient pas a un site qui publie des articles et vend des produits. Ce document reste comme trace de l'option ecartee.

## Contexte technique

L'application est une SPA Angular pure (zoneless, standalone). Le serveur Nginx envoie un `index.html` quasi-vide a chaque requete, et Angular monte le contenu cote client. Consequence pour le SEO :

- **Googlebot** crawle correctement le JS (rendu en deuxieme passe) mais avec un delai de wave 2 pouvant depasser une semaine
- **Bing**, **LinkedIn Post Inspector**, **Facebook Sharing Debugger**, **Twitter Card Validator**, **WhatsApp** ne rendent pas le JS — ils voient uniquement le HTML initial. Resultat : les previews et titres des pages internes (articles, equipes, postes) sont identiques a la home

La solution la moins risquee est le **prerender statique** : Angular 19+ peut generer un `.html` complet par route a la build, sans aucun serveur Node a runtime. Nginx sert ensuite le `.html` correspondant a chaque URL avant de fallback sur `index.html` pour les routes dynamiques.

## Direction technique

- `ng add @angular/ssr` puis configuration `outputMode: 'static'` ou `prerender: true`
- Liste explicite des routes a prerendrer dans `prerender.routes` :
  - `/`
  - `/contact`
  - `/boutique`
  - `/structure`
  - `/structure/sponsors`
  - `/structure/equipes`
  - `/structure/recrutement`
  - `/twitch`
  - `/articles`
  - `/legal/mentions-legales`
  - `/legal/politique-confidentialite`
  - `/404`
- Routes dynamiques (`:slug`, `:teamId`) : `PrerenderFallback.None` -> Nginx fallback `try_files` vers `index.html`, le SPA prend le relais
- Adapter le Dockerfile frontend pour copier le dossier `dist/.../browser/` (avec les `.html` generes)
- Ajuster Nginx : `try_files $uri $uri.html $uri/ /index.html;` pour servir le `.html` quand il existe

**Risques** :
- Allongement du temps de build CI (~30-60s par route prerenderee)
- Necessite que les composants ne dependent pas de `window` / `document` au constructeur (utiliser `isPlatformBrowser` — deja present dans `SeoService`)
- Configuration Nginx a tester en preprod avant prod

## US

| US | Claude | PO | E2E | Livre |
|----|--------|----|----|-------|
| [us-ssr-setup.md](us-ssr-setup.md) | A faire | A faire | A faire | A faire |
| [us-prerender-static-routes.md](us-prerender-static-routes.md) | A faire | A faire | A faire | A faire |
| [us-prerender-dynamic-fallback.md](us-prerender-dynamic-fallback.md) | A faire | A faire | A faire | A faire |

## Decision

Cet enabler est **P2** : a livrer apres que l'EPIC-23 P0+P1 soit complet et que les metriques GSC montrent qu'il y a un ROI mesurable (si Bing / LinkedIn restent sources de trafic significatives, le ROI est evident ; sinon le P2 peut etre repousse).

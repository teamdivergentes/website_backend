# EPIC-23 — Ameliorations SEO du site public — `FAIT CLAUDE` (P0+P1)

## Objectif

Renforcer la visibilite organique de Team Divergentes sur les moteurs de recherche et les reseaux sociaux : completer la couverture meta tags, enrichir les donnees structurees JSON-LD (Google for Jobs, rich snippets joueurs, fil d'Ariane), eliminer le CLS lie aux images sans dimensions, durcir la qualite SEO en CI, et preparer le terrain pour le prerendering statique des pages publiques.

L'audit complet realise le **2026-05-09** (par l'agent `seo-expert`) a identifie 6 quick-wins P0, 7 ameliorations P1 et 6 chantiers P2. Cet EPIC livre les P0 et P1 en priorite ; le P2 prerender est isole en enabler dedie pour decision Go/No-Go ulterieure.

## Perimetre

Pages publiques uniquement (`/`, `/contact`, `/boutique`, `/structure*`, `/articles*`, `/twitch`, `/legal/*`, `/404`). Aucune modification fonctionnelle metier — uniquement balises, schemas, sitemap, attributs HTML.

## Hors perimetre

- Refonte du contenu editorial des pages
- Migration vers Angular Universal en mode SSR runtime (le prerender static est le seul mode considere)
- Optimisation des images uploadees (deja gere par Sharp cote backend)
- Tracking analytics / consentement (deja couvert par EPIC-16 et EPIC-18)

## Diagnostic resume (audit 2026-05-09)

**Forces** :
- `SeoService` solide (`frontend/src/app/shared/services/seo.service.ts`) avec gestion title / description / canonical / OG / Twitter / robots / JSON-LD
- 7 pages dynamiques deja couvertes (home, contact, articles, equipes, joueur, politique-confidentialite)
- Sitemap dynamique backend (`backend/src/sitemap/sitemap.service.ts`) avec lastmod
- Robots.txt environnement-aware via `entrypoint.sh` Nginx
- 6 redirections 301 deja en place pour preserver le crawl historique
- Lighthouse CI configure (`.lighthouserc.json`) — seuil SEO actuellement en `warn 0.8`

**Faiblesses prioritaires** :
- Page `/structure/recrutement/postuler` indexable sans contenu unique (devrait etre `noindex`)
- `/twitch` absent du sitemap
- JSON-LD `JobPosting`, `Person`, `BreadcrumbList` (hors articles) absents -> pas d'eligibilite Google for Jobs ni rich snippets etendus
- Images de joueurs / membres / Twitch sans `width`/`height` -> CLS imprevisible
- `og:image:width` / `og:image:height` absents -> previews sociales degradees
- Lighthouse SEO en `warn` non bloquant
- SPA pure : crawlers non-Google (Bing, LinkedIn, FB, Twitter, WhatsApp) ne voient pas les meta dynamiques sur les pages internes

## Branche git

`feat/epic-23-seo` (depuis `develop`). Une PR par feature/enabler pour faciliter la revue.

## Suivi par feature et enabler

| Feature / Enabler | Priorite | Claude | PO | E2E | Livre |
|-------------------|----------|--------|----|----|-------|
| [ENABLER — Quickfixes SEO P0](ENABLERS/seo-quickfixes/README.md) | P0 | Fait | A faire | En cours | A faire |
| [FEATURE — JSON-LD donnees enrichies](FEATURES/jsonld-rich-data/README.md) | P1 | Fait | A faire | A faire | A faire |
| [ENABLER — Dimensions images / CLS](ENABLERS/images-cls-fix/README.md) | P1 | Fait | A faire | A faire | A faire |
| [ENABLER — Enrichissement sitemap](ENABLERS/sitemap-enrichment/README.md) | P1 | Fait | A faire | En cours | A faire |
| [ENABLER — Metadonnees sociales Twitter / OG articles](ENABLERS/twitter-social-metadata/README.md) | P1 | Fait (us-twitter-site-handle bloque PO) | A faire | A faire | A faire |
| [ENABLER — Prerender statique des pages publiques](ENABLERS/prerender-static-pages/README.md) | P2 -> **promu [EPIC-29](../EPIC-29-social-preview-ssr/README.md) (2026-05-21)**, direction technique **abandonnée au profit du SSR** (2026-07-29) | Promu | - | - | - |

## Criteres de validation EPIC

- Lighthouse SEO score >= 90 sur toutes les pages publiques (bloquant CI)
- Lighthouse Accessibility >= 90 maintenu
- Core Web Vitals : CLS < 0.1, LCP < 2.5s, INP < 200ms (mesures lab)
- 100 % des pages publiques avec `<title>`, `<meta description>`, `<link rel="canonical">`
- 100 % des pages indexables ont une entree dans le sitemap
- 100 % des pages transactionnelles / sans contenu unique sont en `noindex`
- Tous les JSON-LD valides via https://validator.schema.org/ et https://search.google.com/test/rich-results
- Aucune image de contenu avec `alt=""` ni sans `width`/`height` declares
- VQO >= 9.5/10 sur tous les domaines
- Tests E2E couvrant les balises critiques sur 3 pages types (home, article detail, poste de recrutement)

## Metriques cibles

| Metrique | Avant | Cible apres EPIC |
|----------|-------|------------------|
| Lighthouse SEO | ~80 (warn) | >= 90 (error) |
| Pages avec JSON-LD | 4/14 | 12/14 (postuler + 404 exclus) |
| Pages avec BreadcrumbList | 2/14 | 8/14 |
| CLS images joueurs/equipes | inconnu | < 0.1 |
| Images contenu sans alt | 2 (articles) | 0 |
| Sitemap coverage | 13/14 | 14/14 (`/twitch` ajoute) |

## Outils de validation

- https://validator.schema.org/ (JSON-LD)
- https://search.google.com/test/rich-results (Google Rich Results)
- https://developers.facebook.com/tools/debug/ (Open Graph)
- https://cards-dev.twitter.com/validator (Twitter Card)
- https://www.linkedin.com/post-inspector/ (LinkedIn)
- Google Search Console (sitemap submission, Core Web Vitals, erreurs crawl)

## Origine

Demande PO du 2026-05-09 : **"Peux-tu faire une analyse complete du site web et creer une EPIC sur les ameliorations a prendre en compte pour ameliorer la SEO du site"**.

Audit detaille : voir le rapport complet de l'agent `seo-expert` du 2026-05-09 (5 sections, 23 findings, 30 fichiers touches au total).

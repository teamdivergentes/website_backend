# US — Prerendrer les pages statiques publiques

## Role / Action / Benefice

> **En tant que** Bing / LinkedIn / Facebook crawlant le site,
> **je veux** recevoir un HTML complet contenant le contenu et les meta tags des pages publiques,
> **afin que** mon index reflete reellement le site et que les previews sociales soient correctes.

## Contexte

Apres `us-ssr-setup`, configurer la liste des routes statiques a prerendrer.

## Criteres d'acceptation

- [ ] Les routes suivantes sont prerenderees au build :
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
- [ ] Pour chaque route, le `.html` genere contient :
  - Le contenu du composant (h1, paragraphes principaux)
  - Les meta tags emis par `SeoService` (title, description, og, canonical, JSON-LD)
- [ ] Verification via `curl https://teamdivergentes.fr/contact | grep -c "Contact"` : matches >= 1 dans le HTML initial
- [ ] Aucune regression visuelle (les pages chargent toujours correctement cote client apres hydration)
- [ ] Test E2E Playwright `npx playwright test e2e/tests/public/seo-prerender.e2e.spec.ts` validant la presence des meta tags dans le HTML initial (sans execution JS)

## Effort estime

M (≈ 1 j)

## Dependances

US `us-ssr-setup` livree.

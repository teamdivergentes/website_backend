# US — Fallback CSR pour les routes dynamiques

## Role / Action / Benefice

> **En tant que** crawler arrivant sur une route dynamique (`/articles/:slug`, `/structure/equipes/:teamId`, `/structure/recrutement/:slug`, `/structure/equipes/:teamId/joueur/:playerSlug`),
> **je veux** recevoir le `index.html` SPA classique pour que le rendu se fasse cote client,
> **afin que** je puisse acceder au contenu (Googlebot rend le JS correctement) sans bloquer le build sur la liste exhaustive de toutes les URLs dynamiques.

## Contexte

Prerendrer toutes les URLs dynamiques (potentiellement des centaines d'articles + dizaines de joueurs / postes) :
- Ralentit le build CI
- Necessite une connexion BDD au moment du build
- Cree des artefacts obsoletes (un nouvel article publie n'aura pas de `.html` jusqu'au prochain deploiement)

La meilleure strategie pour DVG est : **prerender uniquement les pages statiques**, et laisser les routes dynamiques en CSR pur (Googlebot s'en occupera). Pour les autres crawlers, c'est acceptable car ils ne sont pas la principale source de trafic sur ces pages individuelles.

Plus tard, si necessaire, on pourra basculer en SSR runtime ou en ISR (Incremental Static Regeneration) — mais hors scope EPIC-23.

## Criteres d'acceptation

- [ ] Les routes dynamiques (`:slug`, `:teamId`, `:playerSlug`) ne sont **pas** prerenderees (pas dans la liste `prerender.routes`)
- [ ] Configuration Angular `prerender.fallback: PrerenderFallback.None` ou equivalent
- [ ] Nginx `try_files $uri $uri.html $uri/ /index.html;` : si pas de `.html` correspondant, sert le `index.html` SPA
- [ ] Les URLs dynamiques continuent de fonctionner identiquement a aujourd'hui (Angular monte le composant cote client)
- [ ] Test E2E Playwright sur une URL d'article : la page se charge correctement et les meta tags sont emis par `SeoService` apres l'hydration
- [ ] Coordination `devsecops` pour ajuster `nginx.conf` (location `/`)

## Effort estime

S (≈ 0.5 j)

## Dependances

US `us-ssr-setup` livree. Coordination `devsecops`.

# Feature — Prerender des routes dynamiques `:slug` — `ABANDONNEE`

> **2026-07-29** : abandonnée suite au pivot d'EPIC-29 vers le **SSR runtime** (décision PO). Le SSR rend les routes `:slug` à la demande, ce qui rend caduques le fetch backend au build, la limite de routes et le fallback SPA. Remplacée par les features [ssr-angular-core](../ssr-angular-core/README.md) et [ssr-infra-integration](../ssr-infra-integration/README.md). Conservée pour documenter la direction technique écartée. Ne plus mettre à jour.

## Contexte

Une fois les routes statiques prerenderees, l'enjeu se deplace sur les pages a forte valeur SEO/social : articles, fiches joueurs, fiches coachs. Ces routes utilisent un parametre `:slug` ou `:id` resolu depuis l'API backend.

Le `@angular/ssr` Angular 19+ supporte le prerender de routes dynamiques via une fonction `getPrerenderParams()` qui interroge une source externe (l'API DVG via `sitemap.service.ts` ou un endpoint dedie). Au build, Angular fetch la liste des slugs, prerender un `.html` par slug, et le packe dans `dist/.../browser/`.

## Routes ciblees

- `/articles/:slug` (detail article — priorite haute, c'est le plus partage)
- `/equipes/:teamId/joueur/:slug` (fiche joueur)
- `/equipes/:teamId/coach/:slug` (fiche coach — depend de EPIC-26)
- `/equipes/:teamId` (fiche equipe — si une page detail existe)

## Branche

`feat/epic-29-dynamic-prerender` (depuis `develop`, apres merge de la feature statique)

## Direction technique

1. **Endpoint backend pour les slugs** : reutiliser ou exposer
   - `GET /sitemap.xml` (deja en place, parsable)
   - Ou nouveau `GET /prerender/routes` qui retourne `{ articles: [...], teamMembers: [...], coaches: [...] }`
   - Privilegier la 2e option (plus structuree)
2. **`getPrerenderParams()` Angular** dans la route `articles/:slug` :
   ```typescript
   export const ARTICLE_ROUTES: Routes = [
     {
       path: ':slug',
       component: ArticleDetailComponent,
       data: {
         prerender: {
           async getPrerenderParams() {
             const res = await fetch('https://api.preprod.teamdivergentes.fr/prerender/routes');
             const { articles } = await res.json();
             return articles.map(slug => ({ slug }));
           }
         }
       }
     }
   ];
   ```
3. **Variable d'env build** : `PRERENDER_API_URL` pointant vers l'API du bon environnement
4. **Limite de routes prerenderees** : top N (par exemple 200 articles les plus recents) pour eviter un build qui explose. Les anciens articles tombent en fallback SPA (visibles pour les humains, juste moins optimaux pour les bots)
5. **Strategie de re-prerender** : a chaque release (push tag), un nouveau build = nouveau prerender. Cadence acceptable pour les articles (~hebdomadaire). Si besoin de fraicheur plus rapide, prevoir un job CI dedie post-publication article (hors scope EPIC)
6. **SeoService cote serveur** : confirmer que `SeoService` peut s'executer dans le contexte Node du prerender et resoudre `siteUrl` correctement (deja env-aware depuis EPIC-25)

## US

| US | Claude | PO | E2E | Livre |
|----|--------|----|----|-------|
| [us-prerender-routes-endpoint.md](us-prerender-routes-endpoint.md) | A faire | A faire | A faire | A faire |
| [us-articles-getprerender-params.md](us-articles-getprerender-params.md) | A faire | A faire | A faire | A faire |
| [us-players-coaches-getprerender-params.md](us-players-coaches-getprerender-params.md) | A faire | A faire | A faire | A faire |
| [us-prerender-route-limit.md](us-prerender-route-limit.md) | A faire | A faire | A faire | A faire |

## Validation

- `curl -A "Discordbot/2.0" -s https://preprod.teamdivergentes.fr/articles/<slug> | grep "og:title"` retourne le titre specifique de l'article (pas la home)
- Idem pour fiches joueurs et coachs
- Le Facebook Sharing Debugger affiche la bonne card pour un article preprod
- Le partage Discord d'un lien article affiche la bonne preview (test manuel)
- Le build CI termine en < 8 min meme avec 200 articles + 50 joueurs + 20 coachs prerenderes
- Aucune route dynamique en 500 si le backend `prerender/routes` est down au build (fallback SPA gracieux)

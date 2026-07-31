# Enabler — URL site environnement-aware (canonical, og:image, JSON-LD)

## Contexte technique

`SeoService` (ligne 14) hardcode :
```ts
private readonly siteUrl = 'https://teamdivergentes.fr';
```

Cette constante est utilisee pour construire :
- `og:url` et `canonical` (l.57-62)
- `og:image` et `twitter:image` (l.70-75)
- Indirectement : passee aux composants qui construisent leur propre JSON-LD `Article` (cf. `article-detail.component.ts` qui hardcode la meme valeur via une constante locale `SITE_URL`)

**Symptome detecte sur preprod 2026-05-17** : article cree sur `preprod.teamdivergentes.fr` => `og:image` pointe vers `https://teamdivergentes.fr/uploads/<hash>.webp` => preview LinkedIn/FB cassee (image 404 en prod car uploadee uniquement en preprod).

## Direction technique

Resoudre `siteUrl` au runtime via une des 3 strategies (a arbitrer par l'agent `frontend-angular` + revue Red Team) :

1. **`window.location.origin`** cote browser (et fallback `process.env` cote SSR si on bascule sur Angular Universal). Simple, correct sur preprod et prod, ne necessite pas de runtime config supplementaire.
2. **`RuntimeConfigService`** : ajouter une cle `siteUrl` dans `/assets/config.json` rendue dynamiquement par `entrypoint.sh` selon `NODE_ENV` ou `SITE_URL` env var (deja en place pour `OG_IMAGE` et `GA_ID`).
3. **Combo** : `window.location.origin` par defaut, surcharge possible via `RuntimeConfigService.siteUrl` (utile pour les environnements futurs : staging, preview deployments).

Recommandation initiale : option 3, alignee sur les patterns existants (`RuntimeConfigService`).

## US

| US | Claude | PO | E2E | Livre |
|----|--------|----|----|-------|
| [us-resolve-runtime-site-url.md](us-resolve-runtime-site-url.md) | A faire | A faire | A faire | A faire |

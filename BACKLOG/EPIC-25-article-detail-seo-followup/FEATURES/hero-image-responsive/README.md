# Feature — Hero image responsive `<picture>` sur article detail

## Contexte

Le modele Article expose 3 champs distincts (`imageUrl`, `mobileImageUrl`, `tabletImageUrl`) mais le template `article-detail.component.html` ne rend qu'une seule `<img src="{{ article.imageUrl }}">`. Les versions mobile et tablet uploadees par les CM sont stockees en BDD mais jamais servies.

**Impact mesure (article PaasCool V2 — 2026-05-17)** : un visiteur mobile (375px de viewport) recoit l'image desktop (1600px de large, 47 Ko WebP). C'est tolerable en WebP mais une version mobile dediee (640px, 14 Ko) reduirait le LCP de ~40% sur 4G.

## Route et branche

- Route impactee : `/articles/:slug` (publique)
- Branche : `feat/epic-25-hero-image-responsive`

## Direction technique

Remplacer le `<img>` actuel par un `<picture>` avec sources mediaqueries :
```html
<picture>
  <source media="(max-width: 599px)" [srcset]="article.mobileImageUrl" type="image/webp">
  <source media="(max-width: 1024px)" [srcset]="article.tabletImageUrl" type="image/webp">
  <img [src]="article.imageUrl" [alt]="..." loading="eager" fetchpriority="high" width="1600" height="..." />
</picture>
```

Fallbacks :
- Si `mobileImageUrl` ou `tabletImageUrl` est `null`, omettre le `<source>` correspondant
- L'attribut `alt` doit etre construit a partir du titre + auteur si possible (cf. recos SEO 2026-05-17 : "PaasCool, capitaine de Mystic Divergentes, a la salle EVA Beauchamp")
- `loading="eager"` + `fetchpriority="high"` sur le hero (LCP critique, pas de lazy loading sur le premier viewport)

## US

| US | Claude | PO | E2E | Livre |
|----|--------|----|----|-------|
| [us-render-picture-srcset.md](us-render-picture-srcset.md) | A faire | A faire | A faire | A faire |
| [us-fetchpriority-eager-lcp.md](us-fetchpriority-eager-lcp.md) | A faire | A faire | A faire | A faire |

## Validation

- Lighthouse mobile : LCP < 2.5s sur `/articles/<slug>` avec hero defini
- DevTools mobile emulation (iPhone SE) : verifier que l'image mobile est bien chargee (Network panel)
- Backward compat : un article SANS `mobileImageUrl`/`tabletImageUrl` doit rendre correctement (fallback `<img>`)

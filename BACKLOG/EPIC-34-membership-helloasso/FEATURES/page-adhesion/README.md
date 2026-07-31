# Feature — Pages d'adhésion `/adherer` + `/adherer/helloasso`

Flux en 2 pages : une vitrine éditoriale qui présente les offres (`/adherer`), et une page de souscription qui embarque le widget HelloAsso (`/adherer/helloasso`).

## Routes & navigation

- `/adherer` : vitrine + 3 offres natives + CTA « Adhérer » → `/adherer/helloasso`.
- `/adherer/helloasso` : widget HelloAsso (iframe) pour la souscription/paiement.
- Entrée navbar publique + footer + CTA home/`structure` → pointent vers `/adherer`.

## Suivi des US

| US | Domaine | Claude | PO | E2E | Livré |
|----|---------|--------|----|----|-------|
| [us-frontend-route-composant](us-frontend-route-composant.md) | Frontend | A faire | A faire | A faire | A faire |
| [us-contenu-editorial](us-contenu-editorial.md) | Frontend + UI/UX | A faire | A faire | A faire | A faire |
| [us-widget-helloasso-embed](us-widget-helloasso-embed.md) | Frontend + Config | A faire | A faire | A faire | A faire |
| [us-seo-adhesion](us-seo-adhesion.md) | SEO | A faire | A faire | A faire | A faire |

## Dépendance

Le widget (us-widget-helloasso-embed) dépend de l'enabler CSP (`../../ENABLERS/csp-helloasso`).

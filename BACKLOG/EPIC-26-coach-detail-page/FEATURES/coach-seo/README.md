# Feature — SEO de la fiche coach

## Objectif

Assurer que la nouvelle page detail coach beneficie des memes optimisations SEO que la fiche joueur (meta tags + JSON-LD `Person`), conformement aux conventions etablies en EPIC-23.

## Composants impactes

- `frontend/src/shared/services/seo.service.ts` : reutiliser la methode `setPersonMeta` (ou equivalent) pour les coachs.
- `frontend/src/shared/services/json-ld.service.ts` : emettre un JSON-LD `Person` pour le coach.

## Suivi par US

| US | Claude | PO | E2E | Livre |
|----|--------|----|----|-------|
| [Meta tags Open Graph / Twitter pour la fiche coach](us-meta-tags-coach-detail.md) | A faire | A faire | A faire | A faire |
| [JSON-LD Person pour la fiche coach](us-jsonld-person-coach.md) | A faire | A faire | A faire | A faire |

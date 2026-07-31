# US — Enrichir le JSON-LD Organization en SportsOrganization

## Role / Action / Benefice

> **En tant que** moteur de recherche construisant un Knowledge Graph,
> **je veux** identifier Team Divergentes comme une organisation **esportive**, pas seulement une organisation generique,
> **afin que** Google associe DVG a la verticale "Esports" et que les rich snippets soient plus pertinents.

## Contexte

`frontend/src/app/shared/services/seo.service.ts::getOrganizationJsonLd()` (l. 127-149) genere actuellement un schema generique `Organization`. Schema.org permet `SportsOrganization` (sous-type) avec proprietes specifiques (`sport`, `coach`, `athlete`, etc.) qui correspondent mieux au domaine.

Documentation : https://schema.org/SportsOrganization

## Criteres d'acceptation

- [x] Modifier `getOrganizationJsonLd()` pour retourner :
  ```json
  {
    "@context": "https://schema.org",
    "@type": ["Organization", "SportsOrganization"],
    "name": "Team Divergentes",
    "alternateName": "DVG",
    "url": "https://teamdivergentes.fr",
    "logo": { ... },
    "sport": "Esports",
    "foundingDate": "2017",
    "address": {
      "@type": "PostalAddress",
      "addressCountry": "FR"
    },
    "description": "...",
    "contactPoint": { ... },
    "sameAs": [ ... ]
  }
  ```
- [x] Test unitaire Jasmine `seo.service.spec.ts` cree et valide la nouvelle structure
- [ ] Validation https://validator.schema.org/ : aucune erreur, types `Organization` et `SportsOrganization` correctement reconnus
- [x] Pas de regression sur la home (le schema reste emis dans `setJsonLd([organization, webSite])`)

## Effort estime

XS (≈ 0.25 j)

## Dependances

Aucune.

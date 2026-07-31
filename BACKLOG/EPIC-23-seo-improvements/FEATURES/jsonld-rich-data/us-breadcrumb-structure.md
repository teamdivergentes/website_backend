# US — BreadcrumbList sur la page Structure et ses enfants

## Role / Action / Benefice

> **En tant que** Googlebot,
> **je veux** comprendre la hierarchie Accueil > Structure et Accueil > Structure > Sponsors,
> **afin que** les pages institutionnelles soient correctement positionnees dans la hierarchie du site.

## Contexte

`/structure` (hub), `/structure/sponsors` n'emettent aucun `BreadcrumbList`.

## Criteres d'acceptation

- [x] Sur `/structure` : `[Accueil, Structure]` (structure.ts)
- [x] Sur `/structure/sponsors` : `[Accueil, Structure, Sponsors]` (sponsors.ts)
- [x] Reutilisation du helper `getBreadcrumbListJsonLd()`
- [x] Tests unitaires Jasmine : structure.spec.ts (8 tests), sponsors.spec.ts (10 tests) GREEN
- [ ] Validation Rich Results Test

## Effort estime

XS (≈ 0.25 j)

## Dependances

US `us-breadcrumb-equipes` (helper partage).

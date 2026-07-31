# US — BreadcrumbList sur la hierarchie recrutement

## Role / Action / Benefice

> **En tant que** Googlebot,
> **je veux** comprendre la hierarchie Accueil > Recrutement > [Poste],
> **afin que** la SERP affiche le fil d'Ariane et que les pages de recrutement beneficient d'un signal de structure clair.

## Contexte

`/structure/recrutement` (listing) et `/structure/recrutement/:slug` (detail) n'emettent aucun `BreadcrumbList`.

## Criteres d'acceptation

- [x] Sur `/structure/recrutement` : `[Accueil, Recrutement]` (recrutement.ts)
- [x] Sur `/structure/recrutement/:slug` : `[Accueil, Recrutement, {post.title}]` (job-detail.component.ts)
- [x] Reutilisation du helper `getBreadcrumbListJsonLd()` (cf. US `us-breadcrumb-equipes`)
- [x] Combinaison dans `setJsonLd([breadcrumbList, jobPosting])` cote detail (cf. US `us-jobposting-jsonld`)
- [x] Tests unitaires Jasmine : recrutement.spec.ts (9 tests), job-detail.component.spec.ts (11 tests) GREEN
- [ ] Validation Rich Results Test passante

## Effort estime

XS (≈ 0.25 j) — depend du helper deja livre dans `us-breadcrumb-equipes`

## Dependances

US `us-breadcrumb-equipes` (helper partage).

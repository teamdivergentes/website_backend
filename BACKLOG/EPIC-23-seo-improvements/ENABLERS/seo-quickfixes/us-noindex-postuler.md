# US — Marquer la page de postulation en noindex

## Role / Action / Benefice

> **En tant que** Googlebot,
> **je veux** ne pas indexer le formulaire de candidature `/structure/recrutement/postuler` car il n'a pas de contenu unique (formulaire transactionnel),
> **afin que** mon budget de crawl reste concentre sur les pages a forte valeur (offres, equipes, articles).

## Contexte

`frontend/src/app/pages/recrutement/application-form.component.ts` ne fait actuellement aucun appel a `seoService`. La page est publique, donc indexable par defaut. Le service a deja la primitive `noIndex: true` dans `updateMetaTags()`.

## Criteres d'acceptation

- [x] Dans `ngOnInit()` du composant `ApplicationFormComponent`, appel a `seoService.updateMetaTags({ title: 'Postuler', description: '...', url: '/structure/recrutement/postuler', noIndex: true })`
- [x] Verification que la balise `<meta name="robots" content="noindex, nofollow">` est presente sur la page
- [ ] La page reste dans le sitemap **uniquement** si on la conserve (a discuter — recommandation : la retirer du sitemap puisque noindex)
- [x] Test unitaire Jasmine verifiant l'appel a `seoService.updateMetaTags` avec `noIndex: true`

## Effort estime

XS (≈ 0.25 j)

## Dependances

Aucune.

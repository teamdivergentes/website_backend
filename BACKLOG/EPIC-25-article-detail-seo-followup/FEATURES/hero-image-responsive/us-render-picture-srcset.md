# US — Rendre l'image hero en `<picture>` responsive

## Role / Action / Benefice

En tant que **lecteur mobile**, je veux recevoir une image hero adaptee a la taille de mon ecran (au lieu de l'image desktop 1600px) afin de charger la page plus vite et d'economiser ma data.

## Criteres d'acceptation

- [ ] `article-detail.component.html` remplace le `<img>` actuel par un `<picture>` avec 3 sources : mobile (`max-width: 599px`), tablet (`max-width: 1024px`), desktop (`<img>` fallback)
- [ ] Les `<source>` mobile / tablet sont OMIS si la valeur correspondante en BDD est `null` ou `""`
- [ ] L'image rendue conserve l'attribut `alt` actuel (titre article) — l'optimisation alt SEO est tracee dans un us a part (us-alt-image-seo)
- [ ] Aucun changement visuel desktop (l'image desktop reste celle servie)
- [ ] Test unitaire composant : avec article ayant 1 image, 2 images, 3 images -> rendu attendu
- [ ] Test E2E Playwright : ouverture d'un article avec emulation mobile -> verifier que `picture > source[media="(max-width: 599px)"]` est present et selectionne

## Fichiers concernes

- `frontend/src/app/pages/articles/article-detail/article-detail.component.html`
- `frontend/src/app/pages/articles/article-detail/article-detail.component.scss` (eventuels ajustements `picture { display: block }` ou similaire)
- `frontend/src/app/pages/articles/article-detail/article-detail.component.spec.ts`
- E2E : `frontend/e2e/articles-detail.spec.ts` (a creer ou etendre)

## DoD

- Lint + tests OK
- Verification manuelle mobile (Chrome DevTools iPhone SE) : Network panel montre le bon fichier
- VQO >= 9.5/10

# US — Convertir `image` en `ImageObject` avec URL absolue

## Role / Action / Benefice

En tant que **Googlebot Image / crawler social**, je veux que le JSON-LD `Article.image` soit un `ImageObject` complet (URL absolue, `width`, `height`) afin de pouvoir afficher correctement l'image dans les rich snippets et eviter les warnings "Image URL is not absolute" dans Search Console.

## Criteres d'acceptation

- [ ] `Article.image` dans le JSON-LD est un objet :
  ```json
  {
    "@type": "ImageObject",
    "url": "https://<environnement>/uploads/<hash>.webp",
    "width": <number>,
    "height": <number>
  }
  ```
- [ ] L'URL est resolue via le `siteUrl` runtime (depend de l'enabler `canonical-and-og-url-runtime`)
- [ ] `width` et `height` sont les dimensions reelles de l'image (recuperer depuis les meta de l'image ou ajouter 2 champs `imageWidth`/`imageHeight` au modele Article — a arbitrer)
- [ ] Si seule la version `imageUrl` desktop est disponible, utiliser celle-ci. Si `tabletImageUrl` existe egalement, fournir un tableau de 3 `ImageObject` (mobile / tablet / desktop)
- [ ] Tests unitaires sur la nouvelle methode `buildArticleJsonLd` avec article mock 1 / 3 images
- [ ] Validation https://validator.schema.org/

## Fichiers concernes

- `frontend/src/app/shared/services/seo.service.ts`
- `frontend/src/app/pages/articles/article-detail/article-detail.component.ts`
- Eventuellement `backend/prisma/schema.prisma` (ajout `imageWidth Int?`, `imageHeight Int?` sur le modele `Article`) + migration + DTO

## Dependances

- BLOQUEE par `us-resolve-runtime-site-url.md` (enabler `canonical-and-og-url-runtime`)

## DoD

- Si extension BDD : migration creee et appliquee localement, DTO mis a jour, formulaire admin mis a jour
- Validation schema.org passee

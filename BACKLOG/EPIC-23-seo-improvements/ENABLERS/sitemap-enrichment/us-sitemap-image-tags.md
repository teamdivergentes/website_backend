# US — Ajouter <image:image> dans le sitemap pour Google Images

## Role / Action / Benefice

> **En tant que** Googlebot Image,
> **je veux** decouvrir les visuels d'articles via le sitemap,
> **afin que** Google Images puisse indexer les images DVG et generer du trafic visuel.

## Contexte

`backend/src/sitemap/sitemap.service.ts` genere des entrees `<url>` pour chaque article publie mais sans bloc `<image:image>`. L'extension Google Sitemaps Image permet de declarer explicitement les visuels associes a chaque URL.

Documentation : https://developers.google.com/search/docs/crawling-indexing/sitemaps/image-sitemaps

## Criteres d'acceptation

- [x] Ajout du namespace `xmlns:image="http://www.google.com/schemas/sitemap-image/1.1"` dans la balise `<urlset>`
- [x] Pour chaque article ayant `imageUrl` non vide, ajouter dans l'entree `<url>` :
  ```xml
  <image:image>
    <image:loc>{URL absolue de l'image}</image:loc>
    <image:title>{article.title echappe XML}</image:title>
  </image:image>
  ```
- [x] Test unitaire `sitemap.service.spec.ts` validant la presence des balises image pour un article avec image
- [x] Test verifiant que les caracteres speciaux (`&`, `<`, `>`) du titre sont bien encodes
- [ ] Validation manuelle : XML genere passe le validator https://www.xml-sitemaps.com/validate-xml-sitemap.html

## Effort estime

S (≈ 0.5 j)

## Dependances

Aucune.

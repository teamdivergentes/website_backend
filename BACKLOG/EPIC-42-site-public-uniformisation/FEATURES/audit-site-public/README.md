# Feature — Audit du site public

## Objectif

Mesurer l'ecart de coherence du site public avant de decider quoi uniformiser, sur le modele de
l'audit qui a ouvert l'EPIC-41.

## Pourquoi un audit prealable

L'EPIC-41 a montre que l'audit ne sert pas seulement a chiffrer la duplication : il revele des
**defauts fonctionnels qu'on ne cherchait pas**. Sur l'admin, quatre agents ont trouve une panne
d'API qui se deguisait en base vide, un acces perdu aux articles au-dela du centieme, et un bug de
specificite CSS qui rendait morts les correctifs responsive de six pages.

Aucun de ces trois defauts n'etait visible depuis la demande initiale, qui portait sur la sidebar.

## Dimensions a auditer

| # | Dimension | Ce qu'on cherche |
|---|-----------|------------------|
| 1 | Structure des pages | En-tetes, conteneurs, espacements, wrappers, template inline vs fichier |
| 2 | Typographie | Titres, sous-titres, corps, echelle, hierarchie semantique |
| 3 | Navigation | Retours arriere, fils d'Ariane, liens internes, ancres |
| 4 | Composants recurrents | Boutons, cartes, listes, badges, images |
| 5 | Etats | Chargement, vide, erreur — la regle skeleton du projet est-elle tenue ? |
| 6 | Formulaires | Contact, candidature, newsletter : validation, messages, retour |
| 7 | SEO et a11y | Meta tags, JSON-LD, `alt`, hierarchie de titres, focus visible |

La dimension 7 merite une attention particuliere : le projet a une **gate Lighthouse SEO bloquante**
(`categories:seo >= 0.9` en `error`) sur `/`, `/articles`, `/structure/equipes` et
`/structure/recrutement`. Tout ecart y a une consequence directe en CI.

## Deja releve, sans audit

- **Retours arriere** : quatre paradigmes sur six pages de detail (voir feature dediee).
- **Titres** : 29 combinaisons de classes, `.title` redefini dans six fichiers SCSS avec six lignes
  identiques sur sept (voir feature dediee).

## Livrable

Un rapport par dimension, avec chemins et numeros de ligne, duplication chiffree, et separation
explicite entre **defauts fonctionnels** (a corriger quoi qu'il arrive) et **ecarts de coherence**
(a arbitrer).

## Suivi

| Volet | Claude | PO | E2E | Livre |
|-------|--------|----|----|-------|
| Audit | A faire | A faire | Sans objet | Sans objet |

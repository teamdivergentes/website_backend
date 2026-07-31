# US — Paginer la liste des articles

## Role / Action / Benefice

> **En tant qu'**administrateur,
> **je veux** acceder a tous les articles, y compris les plus anciens,
> **afin de** pouvoir les relire, les corriger ou les depublier.

## Contexte — le defaut

`articles-list.component.ts:107` appelle `getArticles({ limit: 100 })` et n'expose aucune page
suivante. Le service retourne pourtant un `PaginatedArticles`
(`src/app/shared/services/articles.service.ts:39`).

**Au 101e article, l'administrateur perd silencieusement l'acces aux plus anciens.** Aucun message,
aucun indicateur : la liste s'arrete, c'est tout.

C'est le seul module dont la collection croit sans plafond naturel avec `users`, qui est deja
pagine. Les autres (jeux, equipes, sponsors, offres, chaines) sont bornees par nature.

## Criteres d'acceptation

- [ ] `mat-paginator` sur la liste des articles, avec `pageSizeOptions` aligne sur `users`
      (`[10, 20, 50, 100]`).
- [ ] Pagination **serveur**, comme `users` — pas de chargement complet suivi d'un decoupage client.
- [ ] Le tri existant (`matSort`, aujourd'hui client dans un `computed`, `:75-95`) devient serveur
      pour rester coherent avec la pagination : trier une seule page cote client donnerait un
      resultat faux.
- [ ] Ajout d'un filtre par statut publie/brouillon et d'un filtre par categorie : les deux colonnes
      existent deja dans la liste, et leur absence oblige a parcourir toutes les pages.
- [ ] Le compteur total d'articles est affiche, comme sur `users`.
- [ ] Tests unitaires : changement de page, changement de taille de page, tri serveur, filtres.
- [ ] Test E2E : avec plus de 100 articles en fixture, verifier que la seconde page est atteignable.

## Dependance backend

A verifier avant de commencer : l'endpoint accepte-t-il deja `page`, `limit`, `sort`, `order`,
`published` et `categoryId` ? Si non, une US backend est necessaire dans le depot `backend`, sur sa
propre branche.

## Livraison Claude (2026-07-29)

### Backend — depot `backend`, branche `feat/articles-server-sort`

Commit `baa15fa`. Le DTO acceptait page, limit, published, featured, typeId et search, **mais pas
sortBy ni sortOrder** — que le modele frontend declarait pourtant deja. Ajoutes, avec une liste
blanche stricte `ARTICLE_SORTABLE_FIELDS = ['createdAt', 'updatedAt', 'title']` validee par
`@IsIn` : la valeur alimente directement le `orderBy` Prisma, une valeur libre permettrait de trier
sur n'importe quel champ du modele. Defaut inchange, `createdAt desc`.

701 tests backend OK (31 sur `articles.service`).

### Frontend — commit `9786703`

- `mat-paginator` avec `[10, 20, 50, 100]`, total renvoye par l'API.
- Tri passe en serveur. Le garder cote client aurait trie **la seule page visible** tout en ayant
  l'air de trier l'ensemble — plus trompeur que pas de tri du tout.
- Filtres par statut de publication et par categorie.
- Tout changement de tri ou de filtre ramene en premiere page : rester sur l'index courant
  afficherait une tranche arbitraire du nouvel ordre.
- Changer la taille de page ramene aussi en premiere page : l'index courant pointerait vers un autre
  contenu, voire au-dela du dernier element.
- Premiere spec du composant, 12 tests.

1293 tests frontend OK, lint propre, `ng build` OK.

### Ecart assume

**La colonne Categorie perd son tri.** Le backend contraint `sortBy` a une liste blanche et trier
par nom de categorie exigerait une jointure. La colonne reste affichee, seul l'en-tete triable
disparait. Le filtre par categorie compense largement.

### Dependance de deploiement

Le backend doit etre merge et deploye **avant** le frontend : sans lui, `sortBy` est ignore
silencieusement et le tri semble ne rien faire.

## Suivi

| Volet | Claude | PO | E2E | Livre |
|-------|--------|----|----|-------|
| Frontend | Fait (2026-07-29) | A faire | A faire | A faire |
| Backend | Fait (2026-07-29) | A faire | A faire | A faire |

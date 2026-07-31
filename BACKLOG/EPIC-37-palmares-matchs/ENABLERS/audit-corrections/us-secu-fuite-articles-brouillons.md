# US — Corriger la fuite d'articles non publiés via l'API matchs

**Sévérité** : 🔴 Bloquant — Sécurité HAUTE (OWASP A01 Broken Access Control / exposition de données)
**Domaine** : Backend (`matches` + `articles`)
**ID audit** : SEC-EPIC37-01

## Rôle / Action / Bénéfice

**En tant que** structure DVG,
**je veux** que les articles de compte-rendu de match non publiés (brouillons) restent invisibles côté public,
**afin de** ne pas divulguer d'informations sous embargo (résultats non annoncés, partenariats, etc.) à n'importe quel visiteur anonyme.

## Contexte technique

Chaîne d'exploitation non authentifiée :
1. `GET /api/matches` (`@Public()`) inclut la relation `article { id, slug }` **sans filtrer `published`** → le `articleSlug` d'un brouillon fuite dès qu'un match y est rattaché.
2. `ArticlesService.findBySlug()` (`@Public() GET /api/articles/:slug`) **ne filtre jamais `published: true`** → renvoie le contenu intégral du brouillon.

Le lien est directement exposé sur la home via `match-strip.html` (`[routerLink]="['/articles', match.articleSlug]"`).

## Critères d'acceptation

- [ ] `matches.service.ts` : le `MATCH_INCLUDE` sélectionne `article.published`, et `articleSlug` n'est mappé dans le DTO public **que si** `match.article?.published === true` (sinon `null`).
- [ ] `articles.service.ts#findBySlug()` : filtre `where: { slug, published: true }` (ou lève `NotFoundException` si non publié), aligné sur `findAll()`/`findHomepage()`.
- [ ] Test unitaire `matches.service.spec.ts` : un match lié à un article non publié → `articleSlug: null` en sortie publique.
- [ ] Test unitaire `articles.service.spec.ts` : `findBySlug` d'un slug non publié → `NotFoundException` (ou équivalent).
- [ ] Aucune régression sur l'affichage d'un match lié à un article **publié**.

## Notes

`articles.service` est hors périmètre strict EPIC-37 mais le correctif est indissociable (régression pré-existante amplifiée par les matchs). À traiter dans le même worktree backend.

# US — Endpoint backend pour lister les slugs prerenderables

**En tant que** ingenieur backend
**Je veux** exposer un endpoint qui retourne les slugs des articles, joueurs et coachs publies
**Afin que** le build frontend puisse en deduire la liste des routes a prerendrer

## Acceptance criteria

- [ ] Nouveau controller / service `prerender` dans le backend NestJS
- [ ] Endpoint `GET /prerender/routes` public (pas d'auth) retournant :
  ```json
  {
    "articles": ["slug-1", "slug-2", ...],
    "teamMembers": [{ "teamId": 1, "slug": "joueur-1" }, ...],
    "coaches": [{ "teamId": 1, "slug": "coach-1" }, ...]
  }
  ```
- [ ] Filtre uniquement les entites `published=true` et non archivees
- [ ] Limite par defaut : 200 derniers articles par date desc, tous les joueurs/coachs actifs
- [ ] Pagination possible via query params `?limit=` et `?offset=` pour usages futurs
- [ ] Cache HTTP `Cache-Control: public, max-age=300` (5 min) pour pouvoir absorber les builds CI parallels sans tuer la BDD
- [ ] Tests unitaires couvrant les 3 entites + le filtre `published`
- [ ] Documentation Swagger ajoutee dans la collection publique
- [ ] Reutiliser le code existant dans `sitemap.service.ts` (memes requetes Prisma) pour eviter la duplication

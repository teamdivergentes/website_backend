# US — Déclarer le mode de rendu de chaque route

**En tant que** développeur frontend
**Je veux** que les pages publiques soient rendues côté serveur et les pages admin côté client
**Afin de** gagner les previews sociales sans exposer l'admin au rendu serveur

## Contexte

Décision PO du 2026-07-29 : rendu serveur sur le périmètre public uniquement. Les routes admin n'ont aucun bénéfice SEO, sont derrière `authGuard`, et les inclure imposerait d'auditer 11 modules pour la compatibilité serveur.

## Acceptance criteria

- [ ] `src/app/app.routes.server.ts` créé, exportant `serverRoutes: ServerRoute[]`
- [ ] Les 25 routes publiques listées dans le README de la feature sont en `RenderMode.Server`
- [ ] `/admin/**`, `/auth/**` et `/profile` sont en `RenderMode.Client`
- [ ] La table couvre l'intégralité de `src/app/app.routes.ts` : aucune route publique oubliée
- [ ] `curl -s http://localhost:4000/structure/equipes/<id>/joueur/<slug>` retourne le nom du joueur dans le HTML brut
- [ ] `curl -s http://localhost:4000/admin/users` retourne le shell SPA, sans rendu serveur
- [ ] Test unitaire vérifiant que chaque chemin déclaré dans `app.routes.ts` possède une entrée correspondante dans `app.routes.server.ts` — ce test protège contre l'oubli d'une future route publique
- [ ] `frontend/CLAUDE.md` documente la règle : toute nouvelle route publique se déclare dans `app.routes.server.ts`

## Dépendances

Bloquée par `us-angular-ssr-setup.md`.

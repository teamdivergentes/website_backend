# US — Prerender des fiches joueurs et coachs

**En tant que** developpeur frontend
**Je veux** prerendre les fiches joueurs (`/equipes/:teamId/joueur/:slug`) et coachs (`/equipes/:teamId/coach/:slug`)
**Afin que** les previews sociales fonctionnent pour les pages de la communaute (forte valeur de partage interne et fan)

## Acceptance criteria

- [ ] `getPrerenderParams()` ajoute sur les 2 routes joueur et coach
- [ ] Fetch `/prerender/routes` retourne les paires `{ teamId, slug }` pour chaque entite active
- [ ] Chaque fiche publie un `.html` dans `dist/<app>/browser/equipes/<teamId>/joueur/<slug>.html` (resp. `coach`)
- [ ] Le `.html` contient :
  - `<title>` = nom du joueur/coach + role + equipe
  - `<meta name="description">` = bio courte ou stats clefs
  - `<meta property="og:image>` = avatar ou photo officielle du joueur/coach (URL absolue, env-aware)
  - JSON-LD `Person` complet (deja livre dans EPIC-23 et EPIC-26)
- [ ] Tests E2E Playwright : pour 1 joueur + 1 coach, verifier les meta tags via `request.get`
- [ ] Le partage Discord d'un lien fiche joueur affiche la bonne photo et le bon nom (test manuel sur preprod)
- [ ] Pas de regression cote client : meme rendu apres hydratation
- [ ] Si une fiche est supprimee entre 2 builds, le `.html` orphelin est ignore (404 Nginx) ou nettoye par un script de purge

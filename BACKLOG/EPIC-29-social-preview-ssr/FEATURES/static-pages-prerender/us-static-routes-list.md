# US — Liste explicite des routes statiques prerenderees

**En tant que** developpeur frontend
**Je veux** declarer la liste exhaustive des routes publiques sans parametre dynamique
**Afin de** generer un `.html` specifique par route et que `SeoService` injecte les bonnes meta tags au build

## Acceptance criteria

- [ ] Liste declaree dans `angular.json` ou dans un fichier dedie `prerender.routes.txt` :
  - `/`, `/contact`, `/boutique`, `/structure`, `/structure/sponsors`, `/structure/equipes`, `/structure/recrutement`, `/twitch`, `/articles`, `/equipes`, `/legal/mentions-legales`, `/legal/politique-confidentialite`, `/404`
- [ ] Chaque route generee contient un `<title>` et `<meta name="description">` distincts dans le HTML brut
- [ ] Chaque route contient les `<meta property="og:title|og:description|og:image|og:url|og:type>` corrects
- [ ] La meta description fallback (`__OG_DESCRIPTION__`) reste presente uniquement dans le `index.html` racine, jamais dans les `.html` prerenderes
- [ ] `curl -A "Discordbot/2.0" -s https://preprod.teamdivergentes.fr/contact | grep -E "title|og:description"` retourne les bonnes valeurs propres a `/contact`
- [ ] Test unitaire ou snapshot pour verifier la liste et empecher l'oubli d'une route lors d'un futur ajout

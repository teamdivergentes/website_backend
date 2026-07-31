# US — Setup `@angular/ssr` en mode static

**En tant que** developpeur frontend
**Je veux** activer le prerendering statique dans la config Angular
**Afin de** generer un `.html` par route au build sans avoir besoin d'un runtime Node en prod

## Acceptance criteria

- [ ] `ng add @angular/ssr` execute, dependencies `@angular/ssr` et `express` ajoutees a `package.json` (express utilise uniquement par le builder, pas par le runtime)
- [ ] `angular.json` configure avec `outputMode: 'static'` et un bloc `prerender.routes` initial (au minimum la home)
- [ ] `npm run build` genere un dossier `dist/<app>/browser/` contenant les `.html` prerenderes
- [ ] Le fichier `dist/<app>/browser/index.html` contient le HTML pre-rendu de la home (pas juste un placeholder vide)
- [ ] Aucune erreur `window is not defined` ni `document is not defined` au build
- [ ] Le build CI passe sur le runner self-hosted en < 5 min
- [ ] Pas de regression sur les tests unitaires existants
- [ ] Documentation mise a jour dans `frontend/CLAUDE.md` (section "Build / SSR")

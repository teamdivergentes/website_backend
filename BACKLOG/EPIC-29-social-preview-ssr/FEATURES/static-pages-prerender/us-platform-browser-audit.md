# US — Audit `isPlatformBrowser` sur les composants prerenderes

**En tant que** developpeur frontend
**Je veux** garantir qu'aucun composant prerendere n'utilise `window` ou `document` au constructeur ou en `ngOnInit`
**Afin que** le build prerender Node n'echoue pas avec `ReferenceError: window is not defined`

## Acceptance criteria

- [ ] Audit grep exhaustif : `grep -rn "window\." src/app/pages src/app/shared src/shared` -> verifier que chaque acces est protege par `isPlatformBrowser(PLATFORM_ID)`
- [ ] Idem pour `document.`, `localStorage`, `sessionStorage`, `navigator`
- [ ] Composants concernes par les routes prerenderees (home, contact, structure*, twitch, articles, equipes, legal) audites en priorite
- [ ] Les composants qui touchent au DOM uniquement apres `ngAfterViewInit` ou via un listener `@HostListener('window:...')` sont safe par construction (lifecycle non execute au prerender)
- [ ] Ajout d'un test unitaire qui mock `PLATFORM_ID` comme `'server'` et verifie qu'aucun composant prerendere ne throw
- [ ] Documentation mise a jour dans `frontend/CLAUDE.md` : section "Compatibilite SSR / prerender" avec les regles a respecter pour les nouveaux composants
- [ ] Liste des composants identifies comme non-prerenderables documentee (s'il y en a) avec leur strategie (lazy load apres hydratation, ou marquer la route comme non-prerenderee)

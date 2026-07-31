# US — Dettes mineures frontend EPIC-37

**Sévérité** : 🟢 Mineur
**Domaine** : Frontend
**ID audit** : FRONT-min

## Rôle / Action / Bénéfice

**En tant qu'** équipe frontend,
**je veux** solder les petites incohérences relevées,
**afin de** respecter les conventions Angular 20 du repo et l'accessibilité.

## Critères d'acceptation

- [ ] **Input `compact` mort** (`match-strip.ts`) : supprimé (ou implémenté via une classe conditionnelle si un usage est prévu).
- [ ] **Attribut `alt` des logos jeu** : utilise le **nom complet** du jeu (ex. « League of Legends ») au lieu de la clé technique (`"lol"`), dans `palmares.html` (badges hero/mosaïque/historique). Récupérer le libellé via `GamesService`.
- [ ] **`takeUntilDestroyed`** ajouté aux `subscribe()` de l'admin (`matches-admin.component.ts`, `match-dialog.component.ts`, `score-dialog.component.ts`) par cohérence avec le reste du repo (notamment `teamsService.loadTeams()` dans le dialog).
- [ ] **Contrat `teamLabel`** (trophées) : documenter dans `trophy.model.ts` la distinction `teamId` lié vs `teamLabel` texte libre (aligné avec le backend), et vérifier l'absence d'état incohérent au switch équipe liée → texte libre.
- [ ] `npm run lint` + `npm run test` verts.

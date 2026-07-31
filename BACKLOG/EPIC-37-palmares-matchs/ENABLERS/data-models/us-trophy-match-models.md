# US — Modèles Prisma Trophy & Match + permissions

**Statut Claude** : Fait (2026-06-04)

**En tant que** développeur backend,
**je veux** les modèles `Trophy` et `Match` en base avec leurs permissions et la config de visibilité,
**afin de** permettre aux features palmarès et matchs de s'appuyer sur une couche données stable.

## Critères d'acceptation

- [x] Migration Prisma créée (nouvelle migration, jamais de modification d'une existante) avec les modèles `Trophy` et `Match` conformes à la spec (`docs/superpowers/specs/2026-06-03-palmares-matchs-design.md`)
- [x] `Trophy.teamId` nullable avec `onDelete: SetNull` + champ `teamLabel` fallback ; suppression d'une équipe ne supprime pas ses trophées
- [x] `Match.teamId` avec `onDelete: Cascade` ; `Match.articleId` nullable avec `onDelete: SetNull`
- [x] Index présents : `trophies(teamId)`, `matches(teamId)`, `matches(scheduledAt)`
- [x] Permissions `trophies:read|write|delete` et `matches:read|write|delete` présentes dans `src/common` (constantes) et attribuées aux rôles système Admin et CM via migration de seed
- [x] Entrée config `page_palmares_visible` (défaut `false`) ajoutée au seed
- [x] `npx prisma migrate dev` passe sur une base vierge et sur une base existante

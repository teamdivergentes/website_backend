# US — Aligner la visibilite footer/header sur la config

## Role / Action / Benefice

> **En tant que** chef de projet,
> **je veux** que les pages masquees par la config admin (`pageArticlesVisible`, `pageEquipesVisible`, etc.) soient masquees a la fois dans le header **et** dans le footer,
> **afin que** mes visiteurs ne voient pas de lien orphelin pointant vers une page invisible / desactivee.

## Contexte

Actuellement, `footer.ts` n'a pas de filtre sur `/articles` (et n'a pas anticipe `/twitch`). Toute future page toggleable subira le meme oubli si la logique reste dupliquee entre header et footer.

## Criteres d'acceptation

- [x] Une fonction unique `isPageVisible(path: string): boolean` est exposee depuis `PageVisibilityService` (service dedie dans `src/shared/services/`) et utilisee a la fois par `header.ts` et `footer.ts`.
- [x] La fonction couvre **toutes** les pages config-toggleables : `/boutique`, `/contact`, `/structure/equipes`, `/structure/sponsors`, `/structure/recrutement`, `/articles`, et **prevoit** `/twitch` (anticipation pour EPIC-17).
- [x] Le lien parent `/structure` est masque dans le footer si **toutes** ses sous-pages enfants sont masquees (eviter le lien orphelin) — via `isStructureVisible()`.
- [x] Les tests unitaires de `Footer` et `Header` couvrent les combinaisons cles : article masque seul, structure entierement masque, plusieurs masques simultanes.
- [x] Test E2E ecrit dans `e2e/tests/public/footer-pages-visibility.e2e.spec.ts` : mock de l'API config via `page.route()`, verification footer + header. Docker non actif au moment de l'implementation — E2E differable, test committe.

## Effort estime

S (≈ 0.5 j)

## Dependances

Aucune.

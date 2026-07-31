# US — BreadcrumbList sur la hierarchie equipes

## Role / Action / Benefice

> **En tant que** Googlebot et utilisateur des SERPs,
> **je veux** voir le fil d'Ariane Accueil > Equipes > [Equipe] > [Joueur] sur les pages d'equipe et de joueur,
> **afin que** la SERP affiche la hierarchie cliquable et que la position SEO de la page soit renforcee par le maillage.

## Contexte

Aujourd'hui seules les pages `/articles` et `/articles/:slug` emettent un `BreadcrumbList` (cf. `articles-page.component.ts` l. 270 et `article-detail.component.ts`). Les pages d'equipe et de joueur, qui ont une hierarchie reelle, n'en ont pas.

## Criteres d'acceptation

- [x] Ajouter `getBreadcrumbListJsonLd(items: { name: string, url: string }[]): object` generique dans `seo.service.ts`
- [x] Sur `/structure/equipes` : `[Accueil, Equipes]` (equipes.ts)
- [x] Sur `/structure/equipes/:teamId` : `[Accueil, Equipes, {team.name}]` + `SportsTeam` (team-detail.ts)
- [x] Sur `/structure/equipes/:teamId/joueur/:slug` : `[Accueil, Equipes, {team.name}, {player.name}]` + `Person` (player-detail.ts)
- [x] Le schema utilise `position: 1, 2, 3, ...` et `item` en URL absolue correctement forme
- [x] Tests unitaires Jasmine : seo.service.spec.ts (25 tests), equipes.spec.ts (15 tests), team-detail.spec.ts (23 tests), player-detail.spec.ts (18 tests) GREEN
- [ ] Validation Google Rich Results Test : eligibilite "Breadcrumbs"

## Effort estime

S (≈ 0.5 j)

## Dependances

Aucune.

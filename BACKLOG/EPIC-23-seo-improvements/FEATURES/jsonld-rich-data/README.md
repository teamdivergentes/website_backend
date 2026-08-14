# Feature — JSON-LD donnees enrichies (Rich Results)

## Objectif

Activer les rich results Google sur les pages strategiques : Google for Jobs (recrutement), fiches Person (joueurs), fil d'Ariane (BreadcrumbList sur toutes les pages hierarchiques), et identification SportsOrganization renforcee. Le SeoService dispose deja des primitives `setJsonLd()` et `getOrganizationJsonLd()` — il s'agit donc d'enrichir et d'etendre les usages, pas de batir l'infra.

## Routes impactees

| Route | Schema(s) ajoute(s) |
|-------|---------------------|
| `/` (Home) | Enrichissement `Organization` -> `SportsOrganization` |
| `/structure` | `BreadcrumbList` |
| `/structure/sponsors` | `BreadcrumbList` |
| `/structure/equipes` | `BreadcrumbList` |
| `/structure/equipes/:teamId` | `BreadcrumbList` (en plus du `SportsTeam` existant) |
| `/structure/equipes/:teamId/joueur/:slug` | `Person` + `BreadcrumbList` |
| `/structure/recrutement` | `BreadcrumbList` |
| `/structure/recrutement/:slug` | `JobPosting` + `BreadcrumbList` |

## Branche git

`feat/epic-23-jsonld-rich-data` (depuis `develop`).

## Direction technique

- Etendre `SeoService` avec :
  - `getJobPostingJsonLd(post: RecruitmentPost): object`
  - `getPersonJsonLd(player: Player, team: Team): object`
  - `getBreadcrumbListJsonLd(items: { name: string, url: string }[]): object`
  - Mise a jour de `getOrganizationJsonLd()` -> ajouter `@type: ["Organization", "SportsOrganization"]`, `sport: "Esports"`, `address.addressCountry: "FR"`
- Chaque page passe son tableau de schemas a `setJsonLd([schemaA, schemaB])` (le service accepte deja un tableau)
- Tests unitaires Jasmine pour chaque nouveau getter
- Validation manuelle via https://validator.schema.org/ et https://search.google.com/test/rich-results sur 3 URLs cibles avant merge

## US

| US | Claude | PO | E2E | Livre |
|----|--------|----|----|-------|
| [us-jobposting-jsonld.md](us-jobposting-jsonld.md) | Fait | A faire | A faire | A faire |
| [us-person-jsonld.md](us-person-jsonld.md) | Fait | A faire | A faire | A faire |
| [us-breadcrumb-equipes.md](us-breadcrumb-equipes.md) | Fait | A faire | A faire | A faire |
| [us-breadcrumb-recrutement.md](us-breadcrumb-recrutement.md) | Fait | A faire | A faire | A faire |
| [us-breadcrumb-structure.md](us-breadcrumb-structure.md) | Fait | A faire | A faire | A faire |
| [us-sportsorganization-jsonld.md](us-sportsorganization-jsonld.md) | Fait | A faire | A faire | A faire |

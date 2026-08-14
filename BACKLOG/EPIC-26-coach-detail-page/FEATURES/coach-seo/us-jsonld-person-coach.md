# US — JSON-LD Person pour la fiche coach

## Role / Action / Benefice

> **En tant que** moteur de recherche,
> **je veux** un bloc JSON-LD `Person` sur la fiche coach,
> **afin de** comprendre les donnees structurees (role, equipe affiliee, image, liens sociaux) et eligibilite Rich Results.

## Criteres d'acceptation

- [ ] `CoachDetailComponent` emet un JSON-LD `Person` via `JsonLdService` avec :
  - `@type`: `Person`
  - `name` (= `coach.name`)
  - `alternateName` (= `coach.realName` si renseigne)
  - `jobTitle` (= `coach.role`)
  - `image` (URL absolue)
  - `sameAs` : tableau d'URLs reseaux sociaux (deduit de `socials`)
  - `memberOf` : reference a la `SportsOrganization` Team Divergentes (s'aligner sur EPIC-23 enabler Organization)
  - `affiliation` : `{ '@type': 'SportsTeam', name: team.name, url: teamUrl }`
- [ ] JSON valide via [Rich Results Test](https://search.google.com/test/rich-results).
- [ ] Reutiliser le meme schema/helper que celui de la fiche joueur (US EPIC-23 "JSON-LD Person sur les fiches joueurs").
- [ ] Test unitaire : structure JSON-LD generee.

## Suivi

| Volet | Claude | PO | E2E | Livre |
|-------|--------|----|----|-------|
| Frontend | A faire | A faire | A faire | A faire |
| SEO | A faire | A faire | A faire | A faire |

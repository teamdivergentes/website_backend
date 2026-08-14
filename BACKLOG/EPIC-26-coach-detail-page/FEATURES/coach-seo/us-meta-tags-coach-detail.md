# US — Meta tags Open Graph / Twitter pour la fiche coach

## Role / Action / Benefice

> **En tant que** moteur de recherche ou reseau social,
> **je veux** des balises meta riches (title, description, Open Graph, Twitter Card) sur la fiche coach,
> **afin de** generer un partage attractif (image, titre, description) et indexer la page correctement.

## Criteres d'acceptation

- [ ] `CoachDetailComponent` appelle `SeoService.setSeo(...)` avec :
  - `title` : `{coach.name} — Coach {team.name} | Team Divergentes`
  - `description` : extrait de la biographie (~150 caracteres) ou fallback `Decouvrez {coach.name}, coach de l'equipe {team.name} de Team Divergentes.`
  - `image` : `coach.image` (URL absolue resolue via `siteUrl`) ou fallback OG image globale.
  - `url` : URL canonique `https://teamdivergentes.fr/equipes/{teamId}/coach/{slug}`.
- [ ] Reutiliser les conventions de l'EPIC-23 (alignement avec la fiche joueur).
- [ ] Verifier en preprod via Twitter Card Validator et Facebook Sharing Debugger.
- [ ] Test unitaire : `SeoService.setSeo` est appele avec les bonnes valeurs.

## Suivi

| Volet | Claude | PO | E2E | Livre |
|-------|--------|----|----|-------|
| Frontend | A faire | A faire | A faire | A faire |
| SEO | A faire | A faire | A faire | A faire |

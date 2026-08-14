# US — Rendre la section "Notre Coaching staff" cliquable vers la fiche detail

## Role / Action / Benefice

> **En tant que** visiteur sur la page d'une equipe,
> **je veux** pouvoir cliquer sur la carte d'un coach pour acceder a sa fiche detaillee,
> **afin de** decouvrir ses informations sans avoir a chercher l'URL manuellement.

## Criteres d'acceptation

- [ ] Sur `frontend/src/app/pages/equipes/team-detail/team-detail.html`, les cartes de la section coaching staff ont un `[routerLink]="['/equipes', teamId, 'coach', coach.slug]"`.
- [ ] Indication visuelle au survol identique a celle des cartes joueurs (cursor pointer, transition).
- [ ] Si `coach.slug` est null/vide, la carte n'est **pas** cliquable (fallback graceful).
- [ ] Test unitaire team-detail : presence du `routerLink` + comportement carte sans slug.
- [ ] Verifier l'accessibilite : la carte est focusable au clavier + `aria-label` descriptif.

## Suivi

| Volet | Claude | PO | E2E | Livre |
|-------|--------|----|----|-------|
| Frontend | A faire | A faire | A faire | A faire |

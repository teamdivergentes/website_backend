# US — Composant frontend `CoachDetailComponent`

## Role / Action / Benefice

> **En tant que** visiteur du site,
> **je veux** consulter une page detaillee dediee a un coach de l'equipe,
> **afin de** decouvrir son parcours, ses reseaux sociaux et son role au meme niveau de detail que les joueurs.

## Criteres d'acceptation

- [ ] Nouveau composant standalone `frontend/src/app/pages/equipes/coach-detail/coach-detail.ts` (+ `.html`, `.scss`, `.spec.ts`).
- [ ] Route ajoutee dans `app.routes.ts` : `equipes/:teamId/coach/:slug` → `loadComponent` lazy.
- [ ] Composant charge la fiche via le nouveau endpoint `/api/coaching-staff/by-slug/:slug` (Signals + `HttpResource` ou service dedie).
- [ ] Affichage des blocs (en miroir de `PlayerDetailComponent`) :
  - Photo + bandeau couleur equipe
  - Nom + role + nom reel (si renseigne)
  - Biographie (HTML safe)
  - Reseaux sociaux (icones) — meme pipe que pour le joueur
  - Bouton retour vers `/equipes/:teamId`
- [ ] Etats UI : skeleton de chargement, erreur 404 (redirection vers la page equipe avec toast), erreur reseau.
- [ ] SCSS reutilise les memes mixins / variables que `player-detail.scss` (pas de duplication).
- [ ] Tests unitaires : chargement OK, 404, erreur reseau.
- [ ] Accessibilite : titre `<h1>` unique, alt sur l'image, focus visible sur le bouton retour.

## Suivi

| Volet | Claude | PO | E2E | Livre |
|-------|--------|----|----|-------|
| Frontend | A faire | A faire | A faire | A faire |
| UI/UX | A faire | A faire | A faire | A faire |

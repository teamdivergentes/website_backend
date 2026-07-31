# US — Layout adaptatif (3 etats) de la page `/twitch`

## Role / Action / Benefice

> **En tant que** visiteur,
> **je veux** voir une page `/twitch` qui s'adapte au nombre de streamers en live,
> **afin de** profiter immediatement du contenu live disponible (embed plein si 1, grille si plusieurs, liste de chaines a visiter si aucun).

## Criteres d'acceptation (mockups validees 2026-04-25)

### Etat 1 : exactement 1 streamer en live

- [ ] Badge centre `● EN DIRECT` rouge pulsant (border-radius 0, **rectangulaire**)
- [ ] Sous le badge : nom du streamer (H2 blanc), jeu et nombre de viewers (vert)
- [ ] Embed Twitch player iframe 16:9 plein largeur centree avec border vert `#32D299`
- [ ] Lien CTA "Ouvrir sur Twitch" sous l'embed

### Etat 2 : 2 streamers ou plus en live

- [ ] Badge `● {N} EN DIRECT`
- [ ] Sous le badge : titre H2 "Nos streamers en live"
- [ ] Grille 3 colonnes (responsive 1 col mobile / 2 col tablet / 3 col desktop) de cards :
  - Thumbnail Twitch (16:9, lazy load)
  - Badge `LIVE` rouge en overlay top-left
  - Compteur viewers en overlay bottom-right
  - Nom + jeu en bas de la card
- [ ] Section "Toutes nos chaines" : liste compacte (4 col grid) des chaines offline avec opacity 0.5

### Etat 3 : aucun streamer en live

- [ ] Badge gris `● HORS LIGNE` (LED grise eteinte)
- [ ] Titre H3 "Personne n'est en live actuellement"
- [ ] Sous-titre "Retrouvez nos streamers Divergentes sur leurs chaines Twitch"
- [ ] Grille 3 col des chaines : icone TV + pseudo + URL twitch.tv/xxx → lien externe

### Skeleton de chargement

- [ ] Pendant le fetch initial : skeleton mimant la grille (3 cards 16:9 grises animation pulse)
- [ ] Pas de "spinner generique" — toujours skeleton (regle frontend CLAUDE.md)

### Erreur

- [ ] Si `/api/twitch/live` echoue : afficher un etat d'erreur sobre avec bouton "Reessayer"

### Accessibilite

- [ ] Badge EN DIRECT a un `aria-label="X streamer(s) en direct"` ou similaire
- [ ] Animations LED respectent `prefers-reduced-motion`
- [ ] Embed iframe a un `title` accessible

### Tests

- [ ] Tests unitaires : 3 etats avec donnees mockees
- [ ] Test E2E : afficher la page → verifier le rendu correspond aux 3 cas (mock backend pour simuler)

## Effort estime

L (≈ 2 j)

## Dependances

Bloque par : `us-route-and-config.md`, `us-twitch-helix-service.md`

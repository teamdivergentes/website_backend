# US — Ajouter l'item "EN LIVE" + LED dans le header

## Role / Action / Benefice

> **En tant que** visiteur,
> **je veux** voir en permanence un indicateur "EN LIVE" dans le header avec une LED rouge pulsante si un streamer Divergentes est en direct,
> **afin de** savoir qu'il se passe quelque chose et y acceder en un clic.

## Criteres d'acceptation (mockup validee 2026-04-25)

### Desktop (≥ 800px)

- [ ] Apres l'item "contact" et le separateur `|`, ajouter un nouveau lien `<a routerLink="/twitch">` :
  - Forme : **rectangle** (border-radius 0)
  - Bordure : `1px solid #ff3030` si live / `1px solid #333` si offline
  - Fond : `rgba(255,48,48,0.1)` si live / transparent si offline
  - Padding : `6px 14px`
  - Couleur texte : `#fff` si live / `#888` si offline
  - Espacement interne : LED + texte avec `gap: 8px`
- [ ] LED a gauche du texte :
  - 8 px x 8 px, `border-radius: 50%`
  - Live : fond `#ff3030`, `box-shadow: 0 0 8px #ff3030`, animation keyframes `pulse` 1 s infinite
  - Offline : fond `#555`, pas d'animation
- [ ] Texte : `EN LIVE` (uppercase, letter-spacing 1.5px, font-weight bold)
- [ ] Cliquer sur l'item → navigation vers `/twitch` (peu importe l'etat live).

### Mobile (menu hamburger)

- [ ] Dans le mobile-overlay menu, ajouter un dernier item `en live` apres "contact"
- [ ] LED + texte (meme animation pulse / etat grise selon le service)

### Accessibilite

- [ ] `aria-label` dynamique : "X streamers en direct, voir la page" / "Aucun streamer en direct, voir nos chaines"
- [ ] `prefers-reduced-motion` : desactive l'animation pulse → LED reste rouge fixe

### Tests

- [ ] Test unitaire Header : forcer `liveStatusService.hasLive() = true/false` → verifier la classe / style applique.
- [ ] Test E2E : afficher le site avec mock backend retournant 1 streamer live → LED visible, badge rouge, navigation vers `/twitch` au clic.

## Effort estime

S (≈ 0.5 j)

## Dependances

Bloque par : `us-live-status-service.md`, `us-route-and-config.md`

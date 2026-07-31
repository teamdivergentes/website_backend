# Enabler — Dimensions images / fix CLS

## Contexte technique

Les images de contenu dynamique (joueurs, membres d'equipe, miniatures Twitch, logos sponsors) sont rendues sans `width` ni `height` HTML. Le navigateur ne peut pas reserver l'espace avant chargement, ce qui provoque un **CLS** (Cumulative Layout Shift) imprevisible — un des trois Core Web Vitals critiques mesures par Google.

Cibler CLS < 0.1 (seuil "Good" de Google).

## Direction technique

Deux options par image :
1. **Attributs HTML** `width="X" height="Y"` : preferable quand le ratio est connu et fixe
2. **CSS `aspect-ratio`** : preferable quand l'image est responsive avec des tailles variables

Pour ce projet, le ratio des photos joueurs est generalement carre (400x400) ou portrait (3:4). Les miniatures Twitch sont du 16:9 (440x248). Les logos sponsors sont variables -> CSS `aspect-ratio` prefere.

## US

| US | Claude | PO | E2E | Livre |
|----|--------|----|----|-------|
| [us-player-image-dimensions.md](us-player-image-dimensions.md) | Fait | A faire | A faire | A faire |
| [us-team-member-dimensions.md](us-team-member-dimensions.md) | Fait | A faire | A faire | A faire |
| [us-twitch-thumbnail-dimensions.md](us-twitch-thumbnail-dimensions.md) | Fait | A faire | A faire | A faire |
| [us-sponsor-image-dimensions.md](us-sponsor-image-dimensions.md) | Fait | A faire | A faire | A faire |

# Enabler — Footer / header alignment de visibilite

## Contexte technique

Le `footer.ts` (`src/shared/layouts/footer/`) contient une methode `isPageVisible()` qui filtre certaines pages (boutique, contact, equipes, sponsors, recrutement) mais **pas** la page `/articles` ni `/twitch` (a venir). Le `header.ts` filtre `/articles`, ce qui cree une incoherence.

**Bug constate** : la page Articles s'affiche dans le footer meme quand `pageArticlesVisible()` est `false` cote config admin.

## Direction technique

Extraire la logique `isPageVisible(path: string): boolean` dans un service partage (`PageVisibilityService` ou helper dans `ConfigService`) et l'utiliser depuis `header.ts` ET `footer.ts`. Toute page configurable dans le panel admin doit etre filtree par les deux composants.

## US

| US | Claude | PO | E2E | Livre |
|----|--------|----|----|-------|
| [us-align-footer-on-header-config.md](us-align-footer-on-header-config.md) | Fait | A faire | A faire | A faire |

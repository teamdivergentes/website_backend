# US — Accessibilite et correctifs (lot 3)

## Role / Action / Benefice

> **En tant qu'**utilisateur admin naviguant au clavier ou au lecteur d'ecran,
> **je veux** une sidebar conforme a ce que `DESIGN_SYSTEM.md` §18 promet,
> **afin de** pouvoir utiliser le panel sans souris et sans tomber dans des pieges de navigation.

## Contexte

Deux bugs fonctionnels averes sont corriges ici, ce n'est pas un lot cosmetique.

## Criteres d'acceptation

### Bugs fonctionnels

- [ ] **Bug 1** — `inert` (ou `visibility: hidden`) sur le drawer mobile ferme. Aujourd'hui il est
      masque par `transform: translateX(-100%)`, qui ne retire ni du parcours de tabulation ni de
      l'arbre d'accessibilite : `Tab` depuis le header envoie dans 14 liens invisibles hors ecran.
- [ ] **Bug 2** — override `.sidebar.collapsed { width: 100%; max-width: 280px }` sous 768px.
      Aujourd'hui `.sidebar.collapsed { width: 80px }` n'a aucun override dans la media query :
      replier en desktop puis passer en mobile donne un drawer de 80px, icones muettes.

### Accessibilite

- [ ] `ariaCurrentWhenActive="page"` sur les items -> `aria-current="page"` sur l'item actif et sur
      lui seul.
- [ ] `:focus-visible { outline: 2px solid var(--green); outline-offset: -2px; border-radius: 4px }`
      sur `.nav-item` (offset negatif car la sidebar est a ras du bord gauche).
- [ ] `<nav aria-label="Navigation administration">` et `aria-expanded` sur le bouton collapse.
- [ ] Tooltips `matTooltip` en mode replie, position `right`, `showDelay: 400`, `hideDelay: 0`.
      Sans eux le mode replie reste 14 pictogrammes muets.
- [ ] `Escape` ferme le drawer mobile ouvert ; piege de focus actif tant qu'il est ouvert ; a la
      fermeture le focus retourne au bouton burger du header.
- [ ] Skip-link "Aller au contenu" vers `<main>`.

### CSS et dette

- [ ] `100dvh` au lieu de `100vh` sur `.sidebar` (deborde sous la barre d'URL mobile).
- [ ] `@media (prefers-reduced-motion: reduce) { .nav-item { transition: none } }`.
- [ ] `sidebarCollapsed` persiste en `localStorage` et est relu a l'init.
- [ ] `onHeaderToggle()` passe par `ScreenSizeService` au lieu de lire `window.innerWidth`
      directement (`admin-layout.component.ts:87`) : non reactif au resize, non SSR-safe, duplique
      un service existant.
- [ ] Quand le scroll survient : seul `.sidebar-nav` defile, masques de degrade haut/bas,
      `scrollbar-width: thin`, `scroll-margin-block: 24px` sur `.nav-item`.

### Verification

- [ ] Tests unitaires : `aria-current` present sur l'item actif uniquement ; `sidebarCollapsed` relu
      depuis `localStorage` a l'init.
- [ ] Tests E2E : les items du drawer mobile ferme ne sont **pas** atteignables au `Tab` ;
      replier en desktop puis passer en mobile donne la largeur attendue et non 80px.
- [ ] Audit manuel au clavier seul et au lecteur d'ecran sur les 4 roles.
- [ ] Ratio de contraste des en-tetes verifie (~4.6:1 attendu).

## Suivi

| Volet | Claude | PO | E2E | Livre |
|-------|--------|----|----|-------|
| Frontend | Fait (2026-07-31) | A faire | A faire | A faire |
| UI/UX | Fait (2026-07-31) | A faire | A faire | A faire |

## Livraison Claude (2026-07-31)

Les trois bugs fonctionnels sont corriges et verrouilles par un test de regression.

Le plus subtil : `inert` dependait de l'entree `isMobile`, que le layout ne fournissait pas. Elle
restait a `false`, `hidden()` etait donc toujours faux et **le correctif ne s'appliquait jamais**.
Le layout observe desormais le meme seuil que la media query de la sidebar via `BreakpointObserver`.

Ajoutes au passage : `:focus-visible` sur les entrees et le bouton de repli, `100dvh`,
`prefers-reduced-motion`, override de `.sidebar.collapsed` sous 768px, fermeture par `Escape`.

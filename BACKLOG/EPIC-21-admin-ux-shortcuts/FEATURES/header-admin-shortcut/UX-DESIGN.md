# UX Design — Raccourci "Administration" dans le header public

**Feature :** Header Admin Shortcut  
**Epic :** EPIC-21 Admin UX Shortcuts  
**Auteur :** Agent ui-ux  
**Date :** 2026-05-06  
**Consommateur :** Agent `frontend-angular` pour l'implémentation

---

## 1. Contexte et contraintes

Le header public (`#visitor_navbar`) est un `mat-toolbar` sticky, sombre, avec fond `rgba(12,13,12, 0.871)` + `backdrop-filter: blur(7px)`. Il suit une logique de breakpoint interne : le burger (`navbar-icons`) est visible sous 800px, la `navbar-pages` est visible à partir de 800px. Le point de bascule effectif est donc 800px (pas 1025px comme les breakpoints globaux).

Le raccourci doit être **conditionnel** : visible uniquement si `AuthService.isAuthenticated()` est `true`. Il navigue vers `/admin`. Il ne doit pas provoquer de layout shift (CLS < 0.1) : utiliser `@if` avec une animation d'apparition douce.

Le composant `icon-svg` est la seule abstraction d'icône disponible côté public ; il ne couvre que les `ProjectIconType` existants (YOUTUBE, TWITCH, MENU, INSTAGRAM, TWITTER, DISCORD, MAIL). L'icône admin sera un SVG inline direct dans le template header, sans passer par `icon-svg` ni `icon-link` — cela évite d'étendre l'enum pour un usage unique et contextuel.

---

## 2. Label retenu

**"Administration"** (pas "Panel admin").

Justification :
- Cohérent avec le label de la route `/admin` déjà nommée "Administration" dans le backoffice.
- Plus court que "Panneau d'administration" tout en restant explicite.
- En majuscules dans le rendu (via `text-transform: uppercase`) comme tous les liens `navbar-pages`.

---

## 3. Placement par breakpoint

### 3.1 Desktop (≥ 800px) — Dans `navbar-pages`

Le raccourci s'insère **après le dernier lien de navigation**, séparé par un pipe (`|`) identique aux séparateurs existants, puis affiché comme un lien stylisé distinct des liens de navigation ordinaires.

Structure visuelle de la barre desktop (de gauche à droite) :
```
[LOGO] | ACCUEIL | STRUCTURE | ... | EN LIVE  [ADMIN BTN]  [icône Twitch]
```

Le raccourci "Administration" se place entre le bouton "EN LIVE" et la zone `navbar-icons` (icône Twitch + burger). Il adopte la même logique de séparation que `.live-nav-btn` : il est positionné comme un élément indépendant dans le `.navbar-container` (en flexbox `space-between`), non dans `navbar-pages`.

Rendu visuel cible sur desktop :
- Bouton avec bordure fine `1px solid rgba($green, 0.35)`, fond transparent.
- SVG shield (16×16) à gauche du texte, couleur `$green` atténuée (`rgba($green, 0.7)`).
- Texte "ADMINISTRATION" en Athiti 0.8rem, lettre-spacing 1.5px, couleur `rgba(#fff, 0.65)`.

Au **hover** :
- `border-color` passe à `$green` (plein).
- Couleur du texte passe à `#fff`.
- Couleur du SVG passe à `$green`.
- Transition `0.2s ease` sur `border-color`, `color`.

Au **focus visible** (clavier) :
- `outline: 2px solid $green` avec `outline-offset: 3px`.
- Ne jamais supprimer le focus visible.

À l'**état actif** (route `/admin` active — détecté avec `routerLinkActive`) :
- Même rendu que hover mais persistant.
- Non applicable ici car le header public n'est pas affiché sur les routes `/admin` (admin a son propre layout) — ce cas est donc à ignorer.

### 3.2 Tablet (600px – 799px) — Identique au mobile (burger)

Sous 800px, `navbar-pages` est masquée et `navbar-icons` prend le relais. Le raccourci admin rejoint le **menu burger** (mobile overlay).

### 3.3 Mobile (< 600px) — Dans le menu burger, en bas de liste

Dans `mobile-overlay__menu`, le raccourci admin s'affiche en dernier item, après "EN LIVE" s'il est présent. Il adopte le même rendu que `mobile-overlay__item` mais avec une variante visuelle distincte :

- Modifier `border-bottom` : `1px solid rgba($green, 0.3)` (accent vert au lieu du darkGreen habituel).
- Icône shield (20×20) en `$green` à gauche du texte.
- Texte "Administration" en 20px (même taille que les autres items).
- Flèche arrow-icon à droite en `$green` (identique aux autres items).

---

## 4. Icône : SVG shield inline

Aucune icône existante dans `ProjectIconType` ne convient pour l'administration. Un shield (bouclier) est la convention universelle pour indiquer un espace sécurisé ou administrateur.

**Path SVG à utiliser** (Heroicons `shield-check`, viewBox 0 0 24 24, outline) :
```
M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6
  9.749 9.749 0 0 0 3 11.75c0 5.225 3.34 9.67 8 11.317C16.66 21.42
  20 16.975 20 11.75c0-2.162-.62-4.18-1.688-5.893
  a11.973 11.973 0 0 1-4.18.897 12.01 12.01 0 0 1-5.132-1.04Z
```
stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" fill="none"

Ce path est autonome, sans dépendance à une librairie externe. Il sera écrit directement dans le template header.

---

## 5. Animation d'apparition — Fade-in pour éviter le flash

Le signal `isAuthenticated()` est un `computed()` basé sur `userSignal`. Il est résolu de façon synchrone après `loadProfile()` au bootstrap, mais il y a un court délai entre le premier rendu et la résolution du profil.

Pour éviter un flash (apparition brutale) ou un layout shift :

- L'élément doit être conditionné par `@if (isAuthenticated())`.
- L'animation d'entrée est un `fadeIn` de 0.3s (classe dédiée `.admin-shortcut--enter`).
- Côté desktop : l'élément a `width: 0; overflow: hidden` → `width: auto` n'est pas animable simplement. Solution : utiliser `opacity: 0 → 1` avec `max-width: 0 → 200px` sur 0.3s. Cela évite un saut de layout car l'espace est réservé progressivement.
- Côté mobile (burger overlay) : le menu n'est ouvert qu'après interaction utilisateur ; à ce stade le signal est déjà résolu. L'animation `fadeIn` du mobile-overlay suffit.
- `@media (prefers-reduced-motion: reduce)` : supprimer l'animation, affichage direct.

---

## 6. Accessibilité

### 6.1 `aria-label`
```
aria-label="Accéder au panneau d'administration"
```
Le label aria est plus explicite que le texte visible "ADMINISTRATION" car il précise l'action.

### 6.2 Ordre de tabulation
- Desktop : le raccourci doit se trouver **après** le bouton "EN LIVE" dans l'ordre du DOM, et **avant** l'icône Twitch de `navbar-icons`. Cela correspond à l'ordre de lecture visuel naturel (gauche → droite).
- Mobile overlay : le raccourci est le dernier item de `mobile-overlay__menu`, avant la zone `mobile-overlay__socials`. Tabulation : liens de navigation → raccourci admin → icônes sociales → bouton fermer (ce dernier en premier dans le DOM overlay mais après via `tabindex` naturel).

### 6.3 Contraste AA minimum
- Texte "ADMINISTRATION" en `rgba(#fff, 0.65)` sur fond `rgba(12,13,12, 0.871)` : ratio ~7:1 (AA large). Conforme.
- Texte au hover `#fff` sur même fond : ratio ~19:1. Conforme.
- Icône shield en `rgba($green, 0.7)` = `rgba(50, 210, 153, 0.7)` sur fond sombre : ratio ~4.7:1. Conforme AA (graphique non textuel : seuil 3:1).

### 6.4 Support clavier
- L'élément est un `<a routerLink="/admin">`. Il reçoit le focus naturellement.
- Pas de `tabindex` négatif ou de `pointer-events: none` sur l'élément.
- Activation : `Enter` / `Space` natif sur `<a>`.
- Aucun `(mouseenter)` exclusif : les interactions sont toutes sur `<a>` sans dépendance souris.

### 6.5 Écran conditionnel — ne pas masquer via CSS
Ne jamais masquer le raccourci via `visibility: hidden` ou `opacity: 0` persistant pour les non-authentifiés. Utiliser exclusivement `@if (isAuthenticated())` pour que l'élément soit absent du DOM (pas dans l'arbre d'accessibilité). Cela garantit l'absence de fuite d'information admin dans le DOM pour les visiteurs anonymes.

---

## 7. SCSS — Classes et tokens à créer

Toutes les classes suivantes sont à ajouter dans `header.scss` (scope `#visitor_navbar`).

### `.admin-shortcut` (desktop)
```
display: none;                          // masqué mobile-first
align-items: center;
gap: 7px;
padding: 5px 12px;
border: 1px solid rgba($green, 0.35);
color: rgba(#fff, 0.65);
font-family: 'Athiti', sans-serif;
font-size: 0.8rem;
font-weight: 600;
letter-spacing: 1.5px;
text-decoration: none;
text-transform: uppercase;
border-radius: 0;
transition: border-color 0.2s ease, color 0.2s ease, max-width 0.3s ease, opacity 0.3s ease;
max-width: 200px;
overflow: hidden;

svg { color: rgba($green, 0.7); transition: color 0.2s ease; }

&:hover, &:focus-visible {
  border-color: $green;
  color: #fff;
  outline: none;
  svg { color: $green; }
}

&:focus-visible {
  outline: 2px solid $green;
  outline-offset: 3px;
}

@media (min-width: 800px) { display: flex; }
```

Animation d'entrée (classe appliquée à l'insertion dans le DOM) :
```
@keyframes admin-shortcut-in {
  from { opacity: 0; max-width: 0; }
  to   { opacity: 1; max-width: 200px; }
}
.admin-shortcut--enter {
  animation: admin-shortcut-in 0.3s ease forwards;
}
@media (prefers-reduced-motion: reduce) {
  .admin-shortcut--enter { animation: none; }
}
```

### `.mobile-overlay__item--admin` (mobile)
```
border-bottom-color: rgba($green, 0.3);

.admin-shortcut-mobile-link {
  display: flex;
  align-items: center;
  gap: 10px;
  color: inherit;
  text-decoration: none;
  flex: 1;
  svg { color: $green; flex-shrink: 0; }
}
```

---

## 8. Placement DOM précis

### 8.1 Desktop — Dans `navbar-container`

Insérer l'élément entre le bloc `@if (showLiveItem())` et le `div.navbar-icons` :

```
[div.logo-div]
[nav.navbar-pages]
[@if showLiveItem → a.live-nav-btn]
[@if isAuthenticated → a.admin-shortcut]   ← ICI
[div.navbar-icons]
```

### 8.2 Mobile overlay — Dans `mobile-overlay__menu`

Insérer le `<li>` en dernier dans `ul.mobile-overlay__menu`, après `@if (showLiveItem())` :

```
@for (page of mobileNavigationPages ...)
@if (showLiveItem() → li.mobile-overlay__item--live)
@if (isAuthenticated() → li.mobile-overlay__item.mobile-overlay__item--admin)  ← ICI
```

---

## 9. États du composant

| État | Rendu desktop | Rendu mobile |
|---|---|---|
| Visiteur anonyme (`isAuthenticated = false`) | Absent du DOM | Absent du DOM |
| Admin authentifié, profil chargé | Bouton visible, fade-in 0.3s | Item visible dans le burger |
| Admin authentifié, hover | Bordure verte, texte blanc, icône verte | N/A (touch) |
| Admin authentifié, focus clavier | Outline vert 2px, offset 3px | Outline vert 2px |
| Bootstrap en cours (profil non résolu) | Absent du DOM (signal pas encore `true`) | Absent du DOM |
| `prefers-reduced-motion` | Apparition directe, sans animation | Apparition directe |

---

## 10. Points d'attention pour l'implémentation

1. **Ne pas injecter `AuthService` une deuxième fois** si le composant header l'injecte déjà. Réutiliser le signal existant via `isAuthenticated()` dans le template.
2. **Ne pas étendre `ProjectIconType`** : le SVG shield est inline dans le template, pas via `<app-icon-svg>`.
3. **Tester avec un compte admin** (admin@teamdivergentes.fr / admin123) sur Docker local : ouvrir une page publique, vérifier l'apparition du raccourci et la navigation vers `/admin`.
4. **Tester sans session** (fenêtre navigation privée) : vérifier l'absence totale de l'élément dans le DOM (DevTools → Inspect).
5. **Test clavier** : `Tab` depuis le bouton "EN LIVE" doit atteindre le raccourci admin avant l'icône Twitch.
6. **Test mobile** : ouvrir le burger, vérifier que l'item "Administration" apparaît en dernier, après "EN LIVE".
7. **Lighthouse** : vérifier que le CLS reste < 0.1 avec le fade-in (l'animation `max-width` ne doit pas décaler les éléments voisins — tester avec un compte admin connecté).

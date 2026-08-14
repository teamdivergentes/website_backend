# US — Afficher un raccourci "Administration" dans le header pour les admins authentifies

## Role / Action / Benefice

> **En tant qu**'administrateur deja authentifie,
> **je veux** voir un raccourci visible dans le header public quand je navigue sur le site,
> **afin de** revenir au panel `/admin` en un clic, sans taper l'URL ni me reconnecter.

## Symetrique

> **En tant que** visiteur anonyme,
> **je ne veux** absolument **pas** voir ce raccourci,
> **afin** qu'aucune information sur la presence d'un panel admin ne fuite vers les visiteurs.

## Criteres d'acceptation

### Frontend

- [ ] `Header` (`frontend/src/shared/headers/header/header.ts`) injecte `AuthService` via `inject(AuthService)` (read-only).
- [ ] Le template expose un bouton/lien "Administration" :
  - Visible **si et seulement si** `authService.isAuthenticated()` est `true`
  - Hidden via `@if` (pas de `display:none` qui laisse traces dans le DOM)
  - `routerLink="/admin"` avec `routerLinkActive` pour l'etat actif
  - Aucun flash entre bootstrap et hydratation : le rendu attend `authService.initialized()` ou `authService.user()` avant de decider d'afficher (pas de bouton qui apparait/disparait)
- [ ] Style aligne sur la charte DVG (#32D299) — details dans `UX-DESIGN.md`
- [ ] Versions desktop, tablet et mobile traitees (placement specifique sur chaque breakpoint)
- [ ] Accessibilite :
  - `aria-label="Acceder au panel d'administration"` (ou equivalent)
  - Contraste AA minimum sur fond sombre
  - Navigation clavier : `Tab` y arrive dans un ordre logique
  - Focus visible (outline ou ring respectant la charte)

### Tests unitaires

- [ ] Spec `header.spec.ts` couvre :
  - Cas anonyme (`authService.isAuthenticated() === false`) → le bouton n'est pas dans le DOM
  - Cas authentifie (`authService.isAuthenticated() === true`) → le bouton est dans le DOM avec le bon `routerLink`
  - Cas hydratation : tant que `initialized()` est `false`, le bouton n'est pas affiche (anti-flash)

### Tests E2E

- [ ] Visiteur anonyme : `goto /` → le bouton "Administration" n'est PAS visible
- [ ] Apres login admin : `goto /` → le bouton "Administration" EST visible → click → URL = `/admin`
- [ ] Apres logout : `goto /` → le bouton "Administration" disparait

### Securite

- [ ] Le rendu du bouton est purement cosmetique. La protection reelle reste cote `authGuard` + `permissionGuard` (deja en place). Verifier qu'un visiteur qui forge l'URL `/admin` est toujours redirige vers `/auth/login` si non authentifie.

### Regression

- [ ] Le menu burger mobile fonctionne toujours (ouverture/fermeture)
- [ ] Le sous-menu "Structure" fonctionne toujours
- [ ] L'indicateur "En live" Twitch dans le header fonctionne toujours
- [ ] Aucun nouvel appel reseau au bootstrap (verifier dans les network logs Playwright)

## Effort estime

S (≈ 0.5 j) — touche uniquement le header + tests TU + 1 spec E2E

## Dependances

- US technique : `provideAppInitializer` doit etre en place (deja merge via `fix/preprod-admin-cookie-bootstrap` 2026-05-06) pour garantir la rehydratation au bootstrap.
- Design : `UX-DESIGN.md` produit par l'agent `ui-ux` doit etre valide avant l'implementation par l'agent `frontend-angular`.

## Suivi

| Volet | Claude | PO | E2E | Livre |
|-------|--------|----|----|----|
| Frontend | Fait | A faire | A faire | A faire |
| Tests TU | Fait | A faire | A faire | A faire |
| Tests E2E | Fait | A faire | A faire | A faire |

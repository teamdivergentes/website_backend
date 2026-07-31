# Feature — Bouton Administrateur dans le header public

## Objectif

Permettre a un administrateur deja authentifie qui navigue sur le site public d'acceder en un clic au panel `/admin` sans devoir taper l'URL ou se reconnecter.

## Contexte technique

- L'auth utilise un cookie HttpOnly `dvg_auth_token` (cf. EPIC-16). Le JS ne peut pas lire ce cookie directement.
- `AuthService.userSignal` est charge au bootstrap via `provideAppInitializer` → `loadProfile()` (GET `/api/auth/me`). Cet appel est deja fait pour tous les visiteurs : 200 si admin, 401 si anonyme. Donc detecter "admin connecte" cote frontend = lire `authService.isAuthenticated()`. **Aucun appel reseau supplementaire** introduit par cette feature.
- Pour les visiteurs anonymes, le bouton ne doit jamais s'afficher (pas de fuite d'info admin).
- Le header est partage par toutes les pages publiques (`MainLayout`).

## Routes / fichiers impactes

- `frontend/src/shared/headers/header/header.ts` (logique)
- `frontend/src/shared/headers/header/header.html` (template)
- `frontend/src/shared/headers/header/header.scss` (styles)
- `frontend/src/shared/headers/header/header.spec.ts` (tests TU)
- Tests E2E : `frontend/e2e/tests/admin/auth-cookie-flow.e2e.spec.ts` (extension scenario) ou nouveau spec `e2e/tests/public/admin-shortcut.spec.ts`

## Branche git

`feat/epic-21-header-admin-shortcut` (depuis `develop`).

## Design UX

Reference : [UX-DESIGN.md](UX-DESIGN.md) (produit par l'agent ui-ux).

## Suivi par US

| US | Claude | PO | E2E | Livre |
|----|--------|----|----|-------|
| [us-add-admin-button-in-header.md](us-add-admin-button-in-header.md) | Fait | A faire | A faire | A faire |

## Criteres de validation feature

- Le bouton est invisible pour un visiteur non connecte (verifie en E2E sans cookie)
- Le bouton est visible et clickable pour un admin connecte (verifie en E2E avec cookie)
- Le bouton respecte la charte DVG (#32D299) et l'accessibilite WCAG AA
- Aucune regression sur le header existant (mobile burger, sous-menu structure, indicateur live)

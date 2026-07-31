# Feature F1 — Toggle admin "Afficher la page En Live (Twitch)"

## Repos

`frontend` (deja code, validation uniquement) + tests e2e

## Branche git

`feat/epic-22-twitch-visibility-toggle` (depuis `develop`).

## Suivi par US

| US | Claude | PO | E2E | Livre |
|----|--------|----|----|-------|
| [us-validate-frontend-twitch-toggle.md](us-validate-frontend-twitch-toggle.md) | Fait | A faire | A faire | A faire |
| [us-e2e-twitch-page-visibility-toggle.md](us-e2e-twitch-page-visibility-toggle.md) | Fait | A faire | A faire | A faire |

## Criteres de validation feature

- [x] Le toggle "En live (Twitch)" apparait dans `/admin/config` sous la section "Visibilite des pages"
- [ ] Sa valeur initiale (apres seed E1) est ON (`true`) — depend du merge E1 backend
- [x] Toggle OFF -> lien "EN LIVE" disparait du header (desktop + mobile) — code confirme
- [x] Toggle OFF -> LED rouge associee disparait — code confirme (binding `isLive()` conditionnel)
- [x] Toggle ON -> le lien et la LED reapparaissent
- [x] La route `/twitch` reste fonctionnelle si appelee directement par URL (pas de guard 404)
- [x] Les autres pages toggleables continuent de fonctionner (test non-regression groupe 5)
- [x] Couverture tests >= 80 % (944 TU passent, coverage 78.88% statements)

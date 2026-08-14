# ENABLER — Test Matomo auto-heberge (matomo.tellebma.fr)

## Contexte

Configuration de l'instance Matomo perso de Maxime pour qu'elle puisse tracker la preprod et la prod DVG en mode CNIL-exempted. Pas de cout serveur, instance deja deployee.

## Branche git

`feat/epic-18-matomo-tracker` (livree) — correctif CSP a venir sur `fix/epic-18-csp-frame-src-optout`

## US

| US | Sujet | Claude | PO | E2E | Livre |
|----|-------|--------|----|----|-------|
| us-matomo-create-sites | Creer les 2 sites (preprod + prod) dans Matomo | Fait | A faire | N/A | N/A |
| us-matomo-privacy-config | Anonymisation IP, DoNotTrack, fingerprint salt rotation, NoCookie | Fait (cote tracker) | A faire | N/A | N/A |
| us-matomo-dashboard-setup | Dashboards par defaut + widgets specifiques esport | A faire | A faire | N/A | N/A |
| us-frontend-tracker-integration | Service AnalyticsService etendu Matomo + runtime config injection | Fait | A faire | A faire | Fait |
| us-frontend-csp-update | Etendre CSP Nginx avec matomo.tellebma.fr | Fait | A faire | Fait | En cours |
| us-frontend-optout-link | Lien d'opt-out dans le footer (page /privacy-optout) | Fait | A faire | A faire | Fait |
| us-fix-csp-frame-src-optout | **BUG PROD** — iframe opt-out bloquee par la CSP (`frame-src`) | Fait | A faire | Fait | En cours |

## Notes de verification (2026-08-01)

- Sites Matomo 5 (preprod) / 6 (prod) confirmes dans `ansible_vps/inventory/group_vars/all/main.yml`
- `MatomoService` pousse `disableCookies` et `setDoNotTrack` **avant** le chargement de `matomo.js` — conforme au mode exempte
- La configuration privacy **cote serveur Matomo** (anonymisation IP 2 octets, rotation du salt de fingerprint) n'est pas verifiable depuis le code : recette PO requise
- La CSP prod autorisait Matomo en `script-src` et `connect-src` mais **pas** en `frame-src` → page `/privacy-optout` cassee. **Corrige** sur `fix/epic-18-csp-frame-src-optout`, pousse sur `develop` le 2026-08-01 ; a re-verifier par `curl` apres deploiement prod

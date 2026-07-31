# ENABLER — Test Matomo auto-heberge (matomo.tellebma.fr)

## Contexte

Configuration de l'instance Matomo perso de Maxime pour qu'elle puisse tracker la preprod et la prod DVG en mode CNIL-exempted. Pas de cout serveur, instance deja deployee.

## Branche git

`feat/epic-18-matomo-tracker`

## US

| US | Sujet | Claude | PO | E2E | Livre |
|----|-------|--------|----|----|-------|
| us-matomo-create-sites | Creer les 2 sites (preprod + prod) dans Matomo | A faire | A faire | N/A | N/A |
| us-matomo-privacy-config | Anonymisation IP, DoNotTrack, fingerprint salt rotation, NoCookie | A faire | A faire | N/A | N/A |
| us-matomo-dashboard-setup | Dashboards par defaut + widgets specifiques esport | A faire | A faire | N/A | N/A |
| us-frontend-tracker-integration | Service AnalyticsService etendu Matomo + runtime config injection | A faire | A faire | A faire | A faire |
| us-frontend-csp-update | Etendre CSP Nginx avec matomo.tellebma.fr | A faire | A faire | A faire | A faire |
| us-frontend-optout-link | Lien d'opt-out dans le footer (page /privacy-optout) | A faire | A faire | A faire | A faire |

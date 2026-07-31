# Enabler — Headers de securite Nginx sur /admin/ et /auth/

## Contexte

Detecte par l'agent Red Team (audit 2026-05-06, ID SEC-F02) lors de la revue de la PR #160. Pre-existant, hors scope du commit audite, traite ici en enabler dedie.

Pitfall connu (CLAUDE.md > Known Pitfalls) : `add_header` dans un bloc `location` Nginx **ecrase tous** les `add_header` du niveau `server`. Les blocs `location ^~ /admin/` et `location ^~ /auth/` dans `frontend/nginx.conf` (lignes ~242-249) ajoutent uniquement `X-Robots-Tag` mais ne repetent pas les autres headers de securite : `X-Frame-Options`, `X-Content-Type-Options`, `X-XSS-Protection`, `Strict-Transport-Security`, `Referrer-Policy`, `Permissions-Policy`, `Content-Security-Policy`.

## Impact

Les pages `/admin/*` et `/auth/*` (servies via fallback SPA `try_files $uri $uri/ /index.html`) sont rendues **sans** headers de securite. Vecteurs theoriques :
- **Clickjacking** : aucune restriction X-Frame-Options sur ces pages, embarquables en iframe depuis un domaine tiers.
- **MIME sniffing** : sans X-Content-Type-Options, fichiers servis avec mauvais Content-Type peuvent etre interpretes (faible probabilite mais defense en profondeur).
- **CSP absente** : aucune restriction de chargement de ressources externes sur les pages admin.

Severite : **Faible** (defense en profondeur, pas d'exploit direct identifie en l'etat).

## US

| US | Claude | PO | E2E | Livre |
|----|--------|----|----|-------|
| [us-repeat-security-headers-admin-auth-locations.md](us-repeat-security-headers-admin-auth-locations.md) | Fait (PR #172 mergee develop 2026-05-07 — confirme par audit security 2026-05-07 SEC-001) | A faire | A faire | A faire |

## Branche git

`fix/nginx-security-headers-admin-auth` (depuis `develop`).

## Origine

Audit Red Team 2026-05-06 finding SEC-F02 lors de la review PR #160 (`fix/preprod-admin-cookie-bootstrap`).

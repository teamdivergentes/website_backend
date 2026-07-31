# Enabler — Autoriser HelloAsso dans la CSP

Prérequis technique au widget d'adhésion embarqué. La CSP de production bloque actuellement toute iframe/script HelloAsso.

## Contexte

`frame-src` de la CSP prod liste YouTube, Twitch, Vimeo, Dailymotion, Spotify, Twitter — **pas HelloAsso**. Le widget iframe sera donc bloqué tant que `helloasso.com` n'est pas autorisé.

⚠️ La CSP est définie à **deux endroits** : `frontend/nginx.conf` et `ansible_vps/roles/traefik/templates/dynamic.yml.j2`. La prod applique la CSP **Traefik** (cf. audit 2026-05-27, divergence documentée en EPIC-32 ENABLER-9). Les deux doivent être synchronisées.

## Suivi des US

| US | Claude | PO | E2E | Livré |
|----|--------|----|----|-------|
| [us-csp-frame-src-helloasso](us-csp-frame-src-helloasso.md) | A faire | A faire | N/A | A faire |

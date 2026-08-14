# US — Repeter les headers de securite Nginx dans les blocs /admin/ et /auth/

## Role / Action / Benefice

> **En tant que** Responsable securite,
> **je veux** que les pages `/admin/*` et `/auth/*` soient servies avec tous les headers de securite (X-Frame-Options, CSP, HSTS, etc.),
> **afin** d'appliquer la defense en profondeur et de prevenir clickjacking, MIME sniffing et chargement de ressources non controlees sur les pages les plus sensibles du site.

## Contexte technique

Pitfall Nginx documente dans CLAUDE.md : `add_header` dans un bloc `location` ecrase tous les `add_header` du niveau `server`. Quand un bloc `location` ajoute son propre `add_header` (ici `X-Robots-Tag`), les directives du niveau superieur sont silencieusement perdues.

Fichier impacte : `frontend/nginx.conf`, blocs `location ^~ /admin/` et `location ^~ /auth/` (autour des lignes 242-249 selon la version actuelle).

## Criteres d'acceptation

### Nginx config

- [ ] Le bloc `location ^~ /admin/` repete tous les headers de securite presents au niveau `server` :
  - [ ] `X-Frame-Options "SAMEORIGIN" always`
  - [ ] `X-Content-Type-Options "nosniff" always`
  - [ ] `X-XSS-Protection "1; mode=block" always`
  - [ ] `Referrer-Policy "strict-origin-when-cross-origin" always`
  - [ ] `Permissions-Policy "geolocation=(), microphone=(), camera=()" always`
  - [ ] `Strict-Transport-Security "max-age=31536000; includeSubDomains" always`
  - [ ] `Content-Security-Policy ...` (la chaine complete utilisee au niveau server)
  - [ ] `X-Robots-Tag "noindex, nofollow" always` (existant, conserve)
- [ ] Le bloc `location ^~ /auth/` repete les memes headers, idem.
- [ ] Le `try_files $uri $uri/ /index.html` est conserve (fallback SPA).

### Verification automatique

- [ ] Test Nginx config valide localement avec `nginx -t`.
- [ ] Apres deploy preprod, `curl -I https://preprod.teamdivergentes.fr/admin` retourne tous les headers (verifier avec script ou grep).
- [ ] `curl -I https://preprod.teamdivergentes.fr/auth/login` idem.

### Anti-regression

- [ ] La home `/` continue a renvoyer les memes headers (pas de regression).
- [ ] Le `Cache-Control` et `add_header` sur `/uploads/` ne sont pas affectes.

### Tests E2E

- [ ] (Optionnel) Test Playwright qui verifie la presence de `X-Frame-Options` dans les headers de reponse pour `/admin` et `/auth/login`.

## Effort estime

XS (≈ 1 h) — modification de 2 blocs Nginx, copy-paste des headers du niveau server, deploiement preprod, verification curl.

## Dependances

Aucune. Independant de la PR #160 en cours sur le bug d'auth.

## Suivi

| Volet | Claude | PO | E2E | Livre |
|-------|--------|----|----|-------|
| Nginx config | A faire | A faire | A faire | A faire |

> Agent responsable : `devsecops`.
> Branche : `fix/nginx-security-headers-admin-auth`.

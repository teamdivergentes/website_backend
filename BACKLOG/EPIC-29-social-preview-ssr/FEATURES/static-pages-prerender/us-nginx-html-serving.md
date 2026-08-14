# US — Nginx sert les `.html` prerenderes avec fallback SPA

**En tant que** ingenieur DevSecOps
**Je veux** adapter la config Nginx pour servir les `.html` quand ils existent
**Afin de** delivrer le HTML pre-rendu aux bots sociaux sans casser le routing SPA

## Acceptance criteria

- [ ] Dockerfile frontend mis a jour : `COPY --from=builder /app/dist/<app>/browser /usr/share/nginx/html` (au lieu de `dist/<app>/`)
- [ ] Directive `try_files` Nginx modifiee : `try_files $uri $uri.html $uri/index.html /index.html;`
- [ ] `entrypoint.sh` Nginx continue de remplacer `__OG_DESCRIPTION__` uniquement dans `index.html` racine (fallback SPA), pas dans les `.html` prerenderes
- [ ] Test manuel preprod : `curl -I https://preprod.teamdivergentes.fr/contact` retourne 200 et le `Content-Type: text/html`
- [ ] `curl https://preprod.teamdivergentes.fr/contact` retourne le HTML prerendere (verifier `<title>Contact</title>` et meta tags specifiques)
- [ ] `curl https://preprod.teamdivergentes.fr/route-inexistante` retourne 200 + l'index SPA (qui affichera ensuite le 404 cote client)
- [ ] `curl https://preprod.teamdivergentes.fr/articles/un-vrai-slug` retourne le HTML prerendere (apres livraison feature dynamique) ou l'index SPA en attendant
- [ ] Aucune regression sur le proxy `/api/` et `/uploads/`
- [ ] Test playwright E2E ajoute : verifier qu'au moins 1 route prerenderee retourne le bon HTML brut via `request.get`

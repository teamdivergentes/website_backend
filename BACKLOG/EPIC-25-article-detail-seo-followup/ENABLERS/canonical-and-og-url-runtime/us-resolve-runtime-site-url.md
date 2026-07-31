# US — Resoudre `siteUrl` au runtime selon l'environnement

## Role / Action / Benefice

En tant que **bot Google / crawler social (Facebook, LinkedIn, X)**, je veux que les balises `canonical`, `og:url`, `og:image`, `twitter:image` et les URLs de `JSON-LD` pointent vers le **bon domaine** selon que je visite `preprod.teamdivergentes.fr` ou `teamdivergentes.fr`, afin de ne pas declarer une URL canonique cassee et de ne pas tenter de charger une image inexistante sur un autre domaine.

## Criteres d'acceptation

- [ ] `SeoService.siteUrl` n'est plus une constante hardcodee
- [ ] La valeur est resolue dans cet ordre : (1) `RuntimeConfigService.siteUrl` si definie, (2) `window.location.origin` si browser, (3) fallback `https://teamdivergentes.fr` (pour cas SSR sans config)
- [ ] `entrypoint.sh` ecrit `siteUrl: "<valeur de $SITE_URL env var>"` dans `/assets/config.json` (similaire au pattern existant pour `gaId` et `ogImage`)
- [ ] Variable d'env `SITE_URL` provisionnee dans `ansible_vps/inventory/group_vars/all/main.yml` pour prod ET preprod (`https://teamdivergentes.fr` / `https://preprod.teamdivergentes.fr`)
- [ ] `article-detail.component.ts` n'a plus de constante `SITE_URL` locale ; il injecte `SeoService` et expose un getter public `siteUrl` OU consomme `RuntimeConfigService.siteUrl` directement
- [ ] Tous les composants qui construisent un JSON-LD avec URL absolue (a auditer via `grep -r "https://teamdivergentes.fr" frontend/src/app`) utilisent la nouvelle source de verite
- [ ] Test unitaire : `SeoService` retourne la bonne URL pour chaque source (config / browser / fallback)
- [ ] Test E2E Playwright sur preprod : `canonical` et `og:image` pointent vers `preprod.teamdivergentes.fr/...`

## Fichiers concernes

- `frontend/src/app/shared/services/seo.service.ts` (suppression de la constante hardcodee)
- `frontend/src/app/pages/articles/article-detail/article-detail.component.ts` (suppression du `SITE_URL` local)
- `frontend/src/shared/services/runtime-config.service.ts` (ajout du champ `siteUrl`)
- `frontend/src/assets/config.json` (modele)
- `frontend/entrypoint.sh` (injection runtime)
- `ansible_vps/inventory/group_vars/all/main.yml` (variable d'env)
- `frontend/Dockerfile` (si nouvel ARG/ENV necessaire)

## Notes Red Team

- Verifier que `window.location.origin` est immuable cote browser (pas d'injection via location.href forge dans la doc — c'est natif, donc safe)
- Verifier que la valeur de `SITE_URL` env var ne peut pas etre injectee depuis une source non-confiance (deja le cas via Ansible vault)

## DoD

- Lint + tests OK
- Verification manuelle preprod : `view-source:` sur un article -> `og:image` commence bien par `https://preprod.teamdivergentes.fr/`
- VQO >= 9.5/10

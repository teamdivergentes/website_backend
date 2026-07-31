# EPIC-38 — Protection d'accès à la preprod

## Objectif

Restreindre l'accès au site preprod (`https://preprod.teamdivergentes.fr`) aux seuls membres de l'équipe, afin d'empêcher les visiteurs non autorisés de consulter les contenus en cours de validation et d'éviter l'indexation de la preprod par les moteurs de recherche (contenu dupliqué avec la prod).

## Décision d'architecture (PO + DevSecOps, 2026-06-04)

Le besoin initial exprimé était un « mini mot de passe 6 chiffres + cookie » côté applicatif. Décision : implémenter une **Basic Auth au niveau Traefik** (middleware natif `basicAuth`) plutôt qu'une protection applicative, pour les raisons suivantes :

- **Zéro code applicatif** : rien à implémenter ni à désactiver côté Angular/NestJS, aucun code mort en prod
- **Couverture totale** : pages, assets, API, uploads — aucune route oubliée possible
- **UX équivalente** : le navigateur mémorise les identifiants (équivalent du cookie souhaité)
- **CI compatible** : `curl -u` pour les healthchecks, headers pour Playwright/Lighthouse
- **Bonus SEO** : empêche l'indexation de la preprod par Google

## Périmètre

- `ansible_vps/roles/website/` (labels Traefik du compose preprod) et/ou `roles/traefik/templates/dynamic.yml.j2` (middleware `@file`)
- Secrets : hash htpasswd dans Ansible Vault
- CI : adaptation des étapes qui appellent `preprod.teamdivergentes.fr` (healthchecks post-deploy, garde-fou Discord, E2E éventuels)

## Hors scope

- Protection de la prod (publique par définition)
- Authentification applicative (JWT admin existant inchangé)
- SSO / OAuth équipe — sur-ingénierie pour ce besoin

## Enablers

| Enabler | Priorité | Claude | PO | E2E | Livré |
|---------|----------|--------|----|----|-------|
| [ENABLER-1 — Basic Auth Traefik preprod](ENABLERS/basic-auth-preprod/README.md) | Moyenne | Fait | A faire | N/A | A faire |

## Critères de validation EPIC

- [ ] `https://preprod.teamdivergentes.fr` retourne `401` sans identifiants (toutes routes : `/`, `/api/health`, `/uploads/...`)
- [ ] Le site est entièrement fonctionnel après saisie des identifiants
- [ ] La prod n'est **pas** impactée (aucun 401 sur `teamdivergentes.fr`)
- [ ] La CI deploy-preprod reste verte (healthchecks adaptés)
- [ ] Le hash htpasswd est stocké en Ansible Vault, jamais en clair

## Statut

`EN COURS` — créé le 2026-06-04 sur demande PO (Maxime).

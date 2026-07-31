# EPIC-29 — Previews sociales et SEO par rendu serveur (SSR) — `A FAIRE`

> **MAJ 2026-07-29 (pivot technique, décision PO)** : la direction technique passe du **prerendering statique** au **SSR runtime**. Le PO a relancé le sujet le 2026-07-29 avec le même constat qu'au 2026-05-21, et a demandé de « pérenniser ». Le numéro d'EPIC, le diagnostic et les métriques cibles sont conservés ; le périmètre technique est réécrit. Le dossier a été renommé `EPIC-29-social-preview-prerendering` → `EPIC-29-social-preview-ssr`.
>
> **MAJ 2026-05-27 (audit prod)** : l'audit SEO complet confirme cet EPIC comme **blocage SEO #1**. Prérequis aussi pour SEC-004 (nonces CSP, EPIC-30). Priorité **Haute** confirmée. Les correctifs SEO indépendants sont regroupés dans **EPIC-31**.

**Spec de design** : `frontend/docs/superpowers/specs/2026-07-29-ssr-angular-previews-sociales-design.md`

## Objectif

Rendre les **previews sociales fonctionnelles** sur Discord, LinkedIn, Facebook, X, Slack et WhatsApp pour toutes les pages publiques, et rendre le contenu du site lisible par les crawlers qui n'exécutent pas de JavaScript.

Aujourd'hui, ces bots ne voient qu'un HTML quasi vide portant une seule description globale figée au démarrage du conteneur (`__OG_DESCRIPTION__`), parce que l'application est une SPA Angular pure dont les meta tags ne sont injectés par `SeoService` qu'après exécution du JavaScript.

Concrètement : un lien `/articles/mon-article` partagé sur Discord affiche la même carte que la home.

La solution retenue est le **SSR runtime** : un serveur Node rend la page côté serveur à chaque requête, derrière le Nginx existant qui reste en frontal.

## Diagnostic

Vérification en production le 2026-07-29, avec un user-agent de crawler social :

| Route testée | `<title>` retourné |
|---|---|
| `/` | `Team Divergentes - Structure Esport` |
| `/boutique` | `Team Divergentes - Structure Esport` |
| `/articles` | `Team Divergentes - Structure Esport` |
| `/structure/equipes` | `Team Divergentes - Structure Esport` |

Identique sur les quatre, `og:description` comprise.

| # | Maillon | Preuve |
|---|---------|--------|
| C1 | Nginx sert le même `index.html` pour toute route inconnue | `nginx.conf` — `location / { try_files $uri $uri/ /index.html; }` |
| C2 | Les valeurs OG sont injectées **une fois au démarrage du conteneur**, globales au site | `entrypoint.sh` — substitution `awk` des placeholders |
| C3 | `SeoService` fait son travail par page, mais **en JavaScript après chargement** | `src/app/shared/services/seo.service.ts` |
| C4 | Les scrapers de liens n'exécutent pas de JavaScript | Discord, WhatsApp, Slack, Facebook, LinkedIn, X, iMessage, Signal |

Effet secondaire de C2 : modifier `og_description` dans l'admin n'a **aucun effet tant que le conteneur n'est pas redémarré**. Défaut réel, corrigé mécaniquement par le SSR.

## Pourquoi le SSR plutôt que le prerendering

La version précédente de cet EPIC écartait le SSR runtime comme « overkill ». Arbitrage inversé le 2026-07-29 :

| Critère | Prerender statique | SSR runtime |
|---|---|---|
| Article publié après le build | Invisible jusqu'au prochain déploiement | Rendu immédiatement |
| Produit boutique, stock, prix | Figés à l'heure du build | À jour à chaque requête |
| Nombre de routes dynamiques | Doit être borné sous peine de faire exploser le build CI | Sans objet |
| Build CI | Allongé proportionnellement au nombre de routes | Inchangé |
| Nonces CSP par requête (SEC-004) | Impossible | Possible |
| Infra à maintenir | Aucune | Un process Node |

Le point décisif est le premier : sur un site qui publie des articles et vend des produits, un HTML figé au build reprend le même problème sous une autre forme.

## Architecture cible

```
Traefik :443
   └─ conteneur website-<env>-frontend :80  [nginx]
        ├─ /api/, /uploads/       → backend:3000        (inchangé)
        ├─ *.js *.css *.webp ...  → disque dist/browser (inchangé)
        ├─ 7 redirects 301 SEO    → inchangés
        └─ tout le reste          → 127.0.0.1:4000  [node ssr]
                                        └─ fetch http://backend:3000
```

Nginx conserve la CSP, les headers de sécurité, le rate limiting, les redirects 301 SEO et le cache des uploads. Traefik, le rôle Ansible `website` et le `docker-compose` ne bougent pas.

## Périmètre

Rendu serveur sur les **pages publiques uniquement**. Les routes `/admin/**`, `/auth/**` et `/profile` restent en rendu client : aucun bénéfice SEO, elles sont derrière `authGuard`, et cela évite d'auditer les 11 modules admin pour la compatibilité serveur.

## Hors périmètre

- Rendu serveur des pages admin
- Refonte de `SeoService` (livrée en EPIC-23 et EPIC-25, déjà conforme serveur)
- Nonces CSP (EPIC-30 / SEC-004) — débloqués par cet EPIC, livrés séparément
- Core Web Vitals (EPIC-32)
- Prerendering au build des pages purement statiques — optimisation possible **après** livraison, non retenue au premier jet

## Branche git

`feat/epic-29-ssr` (depuis `develop`). Worktree : `WEB/.worktrees/epic29-ssr`. Une PR par lot.

## Le risque principal n'est pas la configuration SSR

C'est la **mise en conformité serveur du code existant**. Audit du 2026-07-29 sur le périmètre public : **17 fichiers accèdent à `window`, `document` ou `localStorage`, dont 14 sans garde `isPlatformBrowser`**.

Cas bloquant total, `src/shared/layouts/main-layout/main-layout.ts:25` :

```ts
constructor() {
    if (window.matchMedia('(max-width: 599px)').matches) return;
```

`MainLayout` enveloppe **toutes** les routes publiques et l'appel est dans le constructeur. Sans correction, le SSR échoue sur 100 % du périmètre.

Second blocage certain et indépendant : `environment.prod.ts` définit `apiUrl: ''`, donc `ApiService` émet des URLs relatives. Côté Node, une URL relative n'a pas d'origine et `HttpClient` lève une erreur. Sans correction, le SSR rend un HTML **sans contenu** — soit le problème actuel, en plus coûteux et avec l'air de fonctionner.

## Suivi par feature et enabler

| Feature / Enabler | Priorité | Claude | PO | E2E | Livré |
|-------------------|----------|--------|----|----|-------|
| [ENABLER — Compatibilité serveur du code public](ENABLERS/server-compatibility/README.md) | **P0 bloquant** | A faire | A faire | A faire | A faire |
| [FEATURE — Socle SSR Angular](FEATURES/ssr-angular-core/README.md) | P0 | A faire | A faire | A faire | A faire |
| [FEATURE — Intégration Docker et Nginx](FEATURES/ssr-infra-integration/README.md) | P0 | A faire | A faire | A faire | A faire |
| [ENABLER — Validation E2E et validateurs sociaux](ENABLERS/social-preview-validation/README.md) | P1 | A faire | A faire | A faire | A faire |

### Ordre des lots

```
E1  Compatibilité serveur   ─┐
E1b URL de base API serveur ─┴─→ F1  Socle SSR ──→ F2  Infra ──→ E2  Validation
```

E1 et E1b sont mergeables **seuls, sans SSR actif**. F1 est sans effet visible tant que F2 n'est pas livré.

## Critères de validation EPIC

- `curl -A "Discordbot/2.0" https://teamdivergentes.fr/articles/<slug>` retourne le titre, la description et l'image **de l'article**, sans exécution de JavaScript
- Idem sur une fiche joueur, une fiche coach, un produit boutique et une page statique
- Facebook Sharing Debugger, LinkedIn Post Inspector et Twitter Card Validator affichent les bonnes previews sur trois URLs types
- Le partage réel d'un lien sur Discord affiche la carte de la page partagée
- Un article publié via l'admin est correctement prévisualisé **sans redéploiement ni redémarrage de conteneur**
- Aucune régression de headers de sécurité en preprod ni en production, CSP comprise
- Lighthouse SEO ≥ 0,9 maintenu sur les quatre URLs auditées par `.lighthouserc.json`
- Tests E2E Playwright ajoutés : vérification du HTML brut via `request.get(url).text()` sans contexte navigateur
- Le sitemap reste à jour, aucune URL retirée
- VQO ≥ 9,5/10 sur tous les domaines

## Métriques cibles

| Métrique | Avant (vérifié 2026-07-29) | Cible après EPIC |
|----------|---------------------------|------------------|
| Pages avec description spécifique dans le HTML brut | 0 | 100 % des pages publiques |
| Preview Discord pour `/articles/:slug` | Description home générique | Titre, description et image de l'article |
| Preview LinkedIn / FB pour `/structure/equipes/:teamId/joueur/:slug` | Home générique | Carte Person spécifique |
| Délai entre publication d'un article et preview correcte | Jamais (sans redéploiement) | Immédiat |
| Trafic crawlers non-Google (Bing, LinkedIn, IA) | Pages internes invisibles | Pages internes lisibles |
| Build CI frontend (P95) | ~3 min | Inchangé |

## Risques et mitigations

| Risque | Impact | Mitigation |
|--------|--------|------------|
| Accès `window`/`document` non gardés dans le code public | SSR casse sur tout ou partie du périmètre | ENABLER `server-compatibility` livré **en premier**, mergeable seul, 17 fichiers déjà identifiés |
| URLs API relatives côté Node | HTML rendu **vide** — pire que la situation actuelle car indétectable à l'œil | Intercepteur serveur dédié, test E2E qui vérifie la **présence de contenu**, pas seulement le `<title>` |
| `add_header` oublié dans la nouvelle `location /` Nginx | Perte silencieuse de la CSP sur tout le site public | Piège déjà consigné dans `WEB/CLAUDE.md` ; recette explicite des headers en preprod |
| Process Node mort, Nginx toujours vivant | 502 servis en silence pendant des jours | Supervision dans l'entrypoint (Node meurt → conteneur meurt) + healthcheck qui sonde Node, pas Nginx |
| Charge de rendu sur rafale de crawlers | CPU du VPS | Microcache Nginx 60 s sur le HTML SSR |
| Régression en production | Site public dégradé | Rollback = redéploiement du tag d'image précédent. Aucune migration, aucun état persistant. Preprod d'abord. |
| Divergence entre HTML serveur et rendu client | Erreurs d'hydratation, contenu qui saute | `SeoService` idempotent, tests E2E comparant les deux rendus |

## Dépendances et impacts

- **Backend** : aucun changement. Le serveur SSR consomme les mêmes endpoints publics.
- **DevSecOps** : Dockerfile frontend et `nginx.conf` modifiés. À tester en preprod en priorité — une erreur Nginx casse le routing entier.
- **CI** : build inchangé en durée, image plus lourde (Node + Nginx). Lighthouse SEO reste bloquant.
- **EPIC-30 / SEC-004** (nonces CSP) : **débloqué, et mieux que prévu**. Un serveur de rendu peut générer un nonce par requête ; un HTML prerenderé ne le pouvait pas.
- **EPIC-23 / enabler `prerender-static-pages`** : reste marqué comme promu en EPIC-29. La direction technique qu'il décrivait est abandonnée au profit du SSR.
- **EPIC-32** (Core Web Vitals) : à réévaluer après livraison, le SSR change le profil de LCP et de FCP dans les deux sens possibles.

## Origine

Question PO du 2026-05-21 : « quand j'envoie un lien sur discord, la description de la page n'est pas liée à la page que j'ai envoyé, c'est une bonne pratique ou une mauvaise ? »

Relance PO du 2026-07-29 : « peu importe le lien que je prends, si je l'envoie j'aurai toujours le même message / description du site. à quoi est-ce dû, un bug, une mauvaise pratique ? » — suivie de la demande de pérenniser via SSR.

## Notes

- Les features `static-pages-prerender` et `dynamic-pages-prerender` sont **conservées en archive** sous `FEATURES/`, marquées abandonnées. Elles documentent la direction technique écartée le 2026-07-29.
- Angular 20.2 est déjà en place, `@angular/ssr` ne demande aucune montée de version majeure.
- À planifier **avant** toute initiative de content marketing : sans preview sociale fonctionnelle, l'effort éditorial est pénalisé sur le CTR.

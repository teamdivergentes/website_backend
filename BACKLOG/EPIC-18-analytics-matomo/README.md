# EPIC-18 — Analytics CNIL-friendly (Matomo)

## Objectif

Evaluer Matomo comme alternative a Google Analytics 4 (GA) pour tracker 100 % des visiteurs du site DVG **sans bandeau de consentement cookie**, en mode CNIL-exempted.

## Contexte

- Le site utilise actuellement GA via `gtag.js` (id injecte runtime via `config.json`)
- GA necessite un bandeau de consentement et perd ~30-50 % des visiteurs (refus + adblockers)
- Matomo en mode auto-heberge + anonymisation IP + sans cookie peut etre exempte de consentement CNIL → tracking 100 % legal sans bandeau
- Instance Matomo perso deja disponible : https://matomo.tellebma.fr → permet de tester sans cout serveur DVG

## Strategie de test

1. **Phase 1 — Test parallele** (2-4 semaines) — **en cours depuis le 2026-05-11**
   - Garder GA actif
   - Ajouter Matomo en parallele sur preprod puis prod
   - Comparer les chiffres (visiteurs, sessions, top pages, devices)
   - Verifier la fiabilite Matomo (taux de capture, anti-adblock)
2. **Phase 2 — Arbitrage** — **a lancer : la fenetre de test est largement ecoulee (~3 mois)**
   - Si Matomo fiable et suffisant → migration totale + suppression GA + suppression bandeau cookie
   - Si Matomo insuffisant → garder GA, decommissionner Matomo
3. **Phase 3 — Si migration validee** → deployer une instance Matomo dediee sur le VPS DVG (role Ansible `matomo`)

## Contraintes techniques

| Domaine | Contrainte | Solution |
|---------|-----------|----------|
| CORS | Tracking via image GIF 1x1 ou sendBeacon | Pas de blocage CORS (mode no-cors) |
| CSP | Frontend Nginx CSP stricte | Etendre `script-src`, `img-src`, `connect-src` **et `frame-src`** (iframe opt-out) avec `https://matomo.tellebma.fr` |
| RGPD/CNIL | Mode exempte de consentement | Anonymize IP 2 octets + DoNotTrack honor + Disable fingerprint + NoCookie OU cookie < 13 mois |
| Opt-out | Obligatoire CNIL | Lien opt-out accessible (footer) |
| API Reporting | Lecture stats backend DVG | Configurer `cors.cors_domain` dans Matomo config.ini.php |

## Decision sur Grafana (2026-05-11)

**Ne PAS integrer Matomo dans le Grafana DVG** dans un premier temps :
- UI Matomo native plus riche (visiteurs, events, funnels, goals)
- Datasource Grafana-Matomo non officielle et peu maintenue
- Grafana DVG reste oriente infra (Nginx, Docker, PostgreSQL, latence backend)
- A reconsiderer uniquement si besoin d'un dashboard executif "cross-domaines" (business + infra)

## Etat reel constate en production (2026-08-01)

| Constat | Detail |
|---------|--------|
| Double tracking actif | `config.json` prod sert `googleAnalyticsId: G-73G860CZKB` **et** `matomoUrl` + `matomoSiteId: 6` → GA et Matomo tournent en parallele |
| Sites Matomo | ID 5 (preprod) et ID 6 (prod), injectes par Ansible (`inventory/group_vars/all/main.yml`) |
| Tracker frontend | `MatomoService` livre : mode sans cookie (`disableCookies` + `setDoNotTrack`), pageviews suivies sur `NavigationEnd` |
| Page opt-out | `/privacy-optout` livree et liee dans le footer (`shared/layouts/footer/footer.html`) |
| **Bug corrige** | L'iframe opt-out etait **bloquee par la CSP** (`frame-src` sans `matomo.tellebma.fr`) → correctif pousse sur `develop` le 2026-08-01, a revalider apres deploiement prod |
| Dashboard admin | `backend/src/analytics` lit **exclusivement** la GA Data API (`@google-analytics/data`) — aucune lecture Matomo |

## Etat d'avancement

| Item | Claude | PO | E2E | Livre |
|------|--------|----|----|-------|
| ENABLER-1 : Configuration Matomo (matomo.tellebma.fr) | Fait | A faire | N/A | N/A |
| ENABLER-2 : Integration frontend (tracker, CSP, opt-out) | Fait | A faire | Fait | En cours |
| ENABLER-3 : Periode de test parallele 2-4 sem | Fait | A faire | N/A | N/A |
| ENABLER-4 : Arbitrage GA vs Matomo | A faire | A faire | N/A | N/A |

## Reste a faire

1. ~~Corriger la CSP `frame-src`~~ — **fait** (`fix/epic-18-csp-frame-src-optout` sur `develop`), reste a **verifier apres deploiement prod** que l'opt-out fonctionne reellement
2. **Faire valider par le PO** la configuration privacy de l'instance Matomo (anonymisation IP sur 2 octets, rotation du salt de fingerprint, DoNotTrack cote serveur) — non verifiable depuis le code
3. **Arbitrer GA vs Matomo** (ENABLER-4) : comparer les volumes des ~3 mois de tracking parallele et trancher
4. **Si migration validee** : reecrire `backend/src/analytics` sur l'API Reporting Matomo, retirer GA + le bandeau cookie, puis phase 3 (instance dediee sur le VPS)

## Hors scope

- Deploiement Matomo dedie sur VPS DVG (phase 3 conditionnelle)
- Migration historique GA → Matomo (impossible — donnees GA non exportables)
- Suppression bandeau cookie (phase 2 si decision migration)

# EPIC-18 — Analytics CNIL-friendly (Matomo)

## Objectif

Evaluer Matomo comme alternative a Google Analytics 4 (GA) pour tracker 100 % des visiteurs du site DVG **sans bandeau de consentement cookie**, en mode CNIL-exempted.

## Contexte

- Le site utilise actuellement GA via `gtag.js` (id injecte runtime via `config.json`)
- GA necessite un bandeau de consentement et perd ~30-50 % des visiteurs (refus + adblockers)
- Matomo en mode auto-heberge + anonymisation IP + sans cookie peut etre exempte de consentement CNIL → tracking 100 % legal sans bandeau
- Instance Matomo perso deja disponible : https://matomo.tellebma.fr → permet de tester sans cout serveur DVG

## Strategie de test

1. **Phase 1 — Test parallele** (2-4 semaines)
   - Garder GA actif
   - Ajouter Matomo en parallele sur preprod puis prod
   - Comparer les chiffres (visiteurs, sessions, top pages, devices)
   - Verifier la fiabilite Matomo (taux de capture, anti-adblock)
2. **Phase 2 — Arbitrage**
   - Si Matomo fiable et suffisant → migration totale + suppression GA + suppression bandeau cookie
   - Si Matomo insuffisant → garder GA, decommissionner Matomo
3. **Phase 3 — Si migration validee** → deployer une instance Matomo dediee sur le VPS DVG (role Ansible `matomo`)

## Contraintes techniques

| Domaine | Contrainte | Solution |
|---------|-----------|----------|
| CORS | Tracking via image GIF 1x1 ou sendBeacon | Pas de blocage CORS (mode no-cors) |
| CSP | Frontend Nginx CSP stricte | Etendre `script-src`, `img-src`, `connect-src` avec `https://matomo.tellebma.fr` |
| RGPD/CNIL | Mode exempte de consentement | Anonymize IP 2 octets + DoNotTrack honor + Disable fingerprint + NoCookie OU cookie < 13 mois |
| Opt-out | Obligatoire CNIL | Lien opt-out accessible (footer) |
| API Reporting | Lecture stats backend DVG | Configurer `cors.cors_domain` dans Matomo config.ini.php |

## Decision sur Grafana (2026-05-11)

**Ne PAS integrer Matomo dans le Grafana DVG** dans un premier temps :
- UI Matomo native plus riche (visiteurs, events, funnels, goals)
- Datasource Grafana-Matomo non officielle et peu maintenue
- Grafana DVG reste oriente infra (Nginx, Docker, PostgreSQL, latence backend)
- A reconsiderer uniquement si besoin d'un dashboard executif "cross-domaines" (business + infra)

## Etat d'avancement

| Item | Claude | PO | E2E | Livre |
|------|--------|----|----|-------|
| ENABLER-1 : Configuration Matomo (matomo.tellebma.fr) | A faire | A faire | N/A | N/A |
| ENABLER-2 : Integration frontend (tracker, CSP, opt-out) | A faire | A faire | A faire | A faire |
| ENABLER-3 : Periode de test parallele 2-4 sem | A faire | A faire | N/A | N/A |
| ENABLER-4 : Arbitrage GA vs Matomo | A faire | A faire | N/A | N/A |

## Hors scope

- Deploiement Matomo dedie sur VPS DVG (phase 3 conditionnelle)
- Migration historique GA → Matomo (impossible — donnees GA non exportables)
- Suppression bandeau cookie (phase 2 si decision migration)

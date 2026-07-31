# EPIC-32 — Performance & Core Web Vitals (post-audit prod 2026-05-27)

## Objectif

Optimiser les Core Web Vitals (LCP, CLS) et l'efficacité réseau du site public, et corriger le **bug d'affichage des images de la boutique** (collection 2023 invisible). Relie l'ENABLER-8 d'EPIC-24 (Lighthouse > 0.7 sur pages publiques).

## Priorité

**Moyenne** — sauf l'ENABLER-1 (bug images boutique) priorisé **Haute** (défaut visible, impact crédibilité/commercial).

## Contexte

Audit mené par l'agent DevSecOps : mesures Playwright (FCP 420ms, JS 164KB, images 540KB home, 34/46 non-lazy), `curl -I` sur assets prod, lecture Angular/Nginx/Ansible. La home est rapide, mais des preloads incohérents et des images boutique massives (jusqu'à 12 Mo) dégradent les CWV sur les pages secondaires. Rapport complet : `audit/RAPPORT-AUDIT-PROD-2026-05-27.md`.

## Enablers / US

| Enabler / US | Priorité | Métrique visée | Fichier principal | Claude | PO | E2E | Livré |
|--------------|----------|----------------|-------------------|--------|----|----|-------|
| ENABLER-1 : **bug images boutique 2023** (cases noires) — diagnostiquer (glob assets `*.jpg` ? chemins `shopping-list.ts` ? `object-fit` ?) + corriger | **Haute** | Fonctionnel + CLS | `frontend/.../boutique.html`, `data/shopping-list.ts`, `angular.json` | A faire | A faire | A faire | A faire |
| ENABLER-2 : preload Google Fonts `as=style` → pattern non-bloquant (`media=print onload`) | P0 | LCP -100/-200ms, FCP | `frontend/src/index.html` | A faire | A faire | N/A | A faire |
| ENABLER-3 : corriger le preload image LCP (cibler `img1.webp`, pas `slider-1.webp`) | P0 | LCP -50/-150ms | `frontend/src/index.html`, `data/slider-images.ts` | A faire | A faire | N/A | A faire |
| ENABLER-4 : optimiser images boutique (PNG 12Mo → WebP/AVIF <200KB, `<picture>`+srcset+dimensions) | P0 | LCP boutique, CLS | `frontend/.../boutique.html`, pipeline CI (sharp) | A faire | A faire | N/A | A faire |
| ENABLER-5 : `Cache-Control: immutable` sur assets Angular hashés | P1 | Requêtes visites répétées | `frontend/nginx.conf` | A faire | A faire | N/A | A faire |
| ENABLER-6 : activer Brotli (image nginx-brotli ou pre-compress build) | P1 | Transfert JS/CSS -15/25% | `frontend/Dockerfile`, `nginx.conf` | A faire | A faire | N/A | A faire |
| ENABLER-7 : lazy-load bandeau sponsors (ou SVG inline) — 32 imgs eager | P1 | -30 requêtes initiales | `frontend/src/app/pages/home.html` | A faire | A faire | N/A | A faire |
| ENABLER-8 : resserrer budgets Angular (initial 600kB warn / 800kB error) | P1 | Garde-fou CI | `frontend/angular.json` | A faire | A faire | N/A | A faire |
| ENABLER-9 : synchroniser CSP Traefik avec nginx (connect-src Twitch manquant en prod) | P1 | Fonctionnel Twitch | `ansible_vps/.../dynamic.yml.j2` | A faire | A faire | N/A | A faire |
| US-1 : dimensions explicites images équipes/ambassadeurs (anti-CLS) | P2 | CLS | `frontend/.../equipes.html` | A faire | A faire | N/A | A faire |
| US-2 : générer AVIF pour images critiques (pipeline CI) | P2 | Poids images -30/50% | pipeline CI, `home.html` | A faire | A faire | N/A | A faire |
| US-3 : self-host fonts (woff2 latin subset) + supprimer Material Icons en public | P2 | LCP -50/100ms, 1 req | `frontend/src/assets/fonts/`, `index.html` | A faire | A faire | N/A | A faire |
| US-4 : ne pas appeler `/api/auth/me` sans token (supprime 401 + charge backend) | P2 | Bruit console, charge | `frontend/.../auth.service.ts` | A faire | A faire | A faire | A faire |

## Priorisation

1. **Haute / P0** : ENABLER-1 (bug visible), ENABLER-2 + ENABLER-3 (LCP quick wins), ENABLER-4 (boutique lourde).
2. **P1** : ENABLER-5 → 9 (cache, Brotli, lazy, budgets, CSP Twitch).
3. **P2** : US-1 → 4.

## Lien EPIC-24
L'ENABLER-8 d'EPIC-24 (« Lighthouse perf > 0.7 sur 3 pages publiques ») devient atteignable une fois ENABLER-2/3/4 livrés ici. À valider conjointement.

## Hors scope
- Migration CDN images (ex. Cloudflare Images) — backlog ultérieur.
- NB décision PO 2026-04-30 : les PRs boutique #25/#56 restent intactes ; ENABLER-1 corrige le bug d'affichage sans rouvrir ces PRs.

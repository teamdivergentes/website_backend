# EPIC-31 — SEO follow-up batch 3 (post-audit prod 2026-05-27)

## Objectif

Corriger les problèmes SEO indépendants du prerendering identifiés lors de l'audit du 2026-05-27. Le sujet #1 (prerendering / previews sociales) est traité dans **EPIC-29**. Cet EPIC regroupe les correctifs SEO livrables **sans attendre le SSR**.

## Priorité

**Moyenne** — sauf l'enabler `redirect-www-apex` priorisé **Haute** (duplicate content actif en prod).

## Contexte

Audit mené par l'agent SEO sur le `SeoService`, la génération du sitemap, les JSON-LD par page, le maillage. Rapport complet : `audit/RAPPORT-AUDIT-PROD-2026-05-27.md`. Le SEO client-side est de bonne qualité ; ces correctifs comblent les manques structurels.

## Enablers / US

| Enabler / US | Priorité | Fichier principal | Claude | PO | E2E | Livré |
|--------------|----------|-------------------|--------|----|----|-------|
| ENABLER-1 : redirect 301 `www → apex` (Traefik) — corrige duplicate content (SEC-007) | **Haute** | `ansible_vps/roles/traefik/templates/dynamic.yml.j2`, `docker-compose-website.yml.j2` | A faire | A faire | N/A | A faire |
| ENABLER-2 : sitemap — filtrer slugs vides (URL Rocket League invalide) + ajouter pages coachs | Haute | `backend/src/sitemap/sitemap.service.ts` | A faire | A faire | A faire | A faire |
| US-1 : nettoyer les `\n` de l'excerpt dans la meta description article | Haute | `frontend/.../article-detail.component.ts` | A faire | A faire | A faire | A faire |
| US-2 : JSON-LD `ItemList` de `JobPosting` sur /recrutement (Google For Jobs) | Haute | `frontend/src/app/pages/recrutement/recrutement.ts` | A faire | A faire | A faire | A faire |
| US-3 : JSON-LD `Product`/`ItemList` + `og:image` sur /boutique | Moyenne | `frontend/src/app/pages/boutique/boutique.ts` | A faire | A faire | A faire | A faire |
| US-4 : JSON-LD `ItemList` équipes (/structure/equipes) + `AboutPage` (/structure) | Moyenne | `frontend/src/app/pages/...` | A faire | A faire | A faire | A faire |
| US-5 : JSON-LD `ContactPage` sur /contact | Basse | `frontend/src/app/pages/contact/contact.ts` | A faire | A faire | A faire | A faire |
| US-6 : `hreflang="x-default"` dans index.html | Basse | `frontend/src/index.html` | A faire | A faire | N/A | A faire |
| US-7 : convention éditoriale H2/H3 (reformater l'article existant en backoffice + doc) | Basse | backoffice (sans code) | A faire | A faire | N/A | A faire |

## Priorisation

1. **Haute** : ENABLER-1 (www→apex, ROI max), ENABLER-2 (sitemap propre), US-1 (meta propre sur article indexé), US-2 (Google For Jobs).
2. **Moyenne** : US-3, US-4.
3. **Basse** : US-5, US-6, US-7.

## Hors scope
- Prerendering / SSR → **EPIC-29** (prérequis pour rendre ces meta/JSON-LD visibles aux bots ; ces correctifs restent utiles pour Googlebot rendu-JS et pour la base de code).
- Stratégie de contenu éditorial (volume d'articles) → **EPIC-35 (contenu)** à planifier avec le PO, hors périmètre technique.

## Dépendance clé
Sans EPIC-29 (rendu serveur), les JSON-LD et meta ajoutés ici restent injectés côté client → visibles par Googlebot (rendu JS) mais invisibles aux bots sociaux. ENABLER-1 (www→apex) et ENABLER-2 (sitemap) sont eux **indépendants** du rendu serveur et 100 % efficaces immédiatement.

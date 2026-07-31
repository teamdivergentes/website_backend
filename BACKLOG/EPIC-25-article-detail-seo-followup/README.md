# EPIC-25 — Article detail SEO follow-up — `FAIT CLAUDE` (P0 + P1)

## Objectif

Combler les 4 limitations SEO/perf identifiees lors de la creation de l'article PaasCool V2 sur preprod (audit + livraison du 2026-05-17). L'article V2 a demontre l'impact d'un editorial structure (H2, citations, liens internes, image WebP 47Ko vs 3Mo), mais le rendu reste partiellement degrade par 4 problemes cote code frontend qui ne peuvent pas etre corriges par le community manager seul.

## Perimetre

Pages publiques `/articles/:slug` uniquement, composant `article-detail.component.ts` et `SeoService` global. Aucun impact sur le contenu editorial (gere par les CM via l'admin).

## Hors perimetre

- Refonte du backoffice de redaction d'article (deja fonctionnel)
- Pipeline d'optimisation image cote backend (deja gere par Sharp + WebP via Pillow scripts)
- Refonte editoriale des articles existants (laisses tels quels — chaque CM est libre de mettre a jour son contenu une fois la structure technique stabilisee)

## Diagnostic (audit 2026-05-17)

L'audit complet d'un article CM (`/articles/challenger-league-paascool-...`) a identifie 4 problemes recurrents qui ne sont **pas** specifiques a cet article — ils affectent **tous** les articles du site :

| # | Probleme | Fichier | Impact |
|---|----------|---------|--------|
| 1 | `siteUrl` hardcode `https://teamdivergentes.fr` (l.14 `SeoService`) -> sur preprod, `og:image` et `canonical` pointent vers prod (URL 404 si l'image n'existe pas en prod) | `frontend/src/app/shared/services/seo.service.ts` | Previews sociales cassees en preprod, faux signal canonical |
| 2 | `mobileImageUrl` et `tabletImageUrl` stockes en BDD mais **jamais rendus** dans le template -> aucune image responsive servie | `frontend/src/app/pages/articles/article-detail/article-detail.component.{ts,html}` | LCP mobile degrade (image desktop servie sur mobile) |
| 3 | JSON-LD `Article` incomplet : manque `mainEntityOfPage`, `articleSection`, `keywords`, `wordCount`, `inLanguage`, `isPartOf`. `image` en URL relative au lieu d'objet `ImageObject` absolu. | `frontend/src/app/pages/articles/article-detail/article-detail.component.ts` | Rich snippets sous-optimaux, eligibilite Google News reduite |
| 4 | Open Graph Article : prefixe `og:article:` au lieu de `article:` (bug L.88 SeoService). `article:author`, `article:section`, `article:tag` totalement absents. | `frontend/src/app/shared/services/seo.service.ts` + composant article-detail | Previews LinkedIn/Facebook/X degradees, taxonomie article invisible |

Audit complet : ce README + briefs SEO/redaction produits le 2026-05-17 (en session, traces dans la conversation).

## Branche git

`feat/epic-25-article-seo-followup` (depuis `develop`). Une PR par enabler pour faciliter la revue ; la feature `hero-image-responsive` peut etre splittee en 2 PR (backend + frontend) si besoin.

## Suivi par feature et enabler

| Feature / Enabler | Priorite | Claude | PO | E2E | Livre |
|-------------------|----------|--------|----|----|-------|
| [ENABLER — URL site environnement-aware](ENABLERS/canonical-and-og-url-runtime/README.md) | P0 | Fait (2026-05-17) | A faire | A faire | A faire |
| [ENABLER — JSON-LD Article enrichi](ENABLERS/article-jsonld-enrichment/README.md) | P1 | Fait (2026-05-17) | A faire | A faire | A faire |
| [ENABLER — OG Article tags complets](ENABLERS/article-og-tags-complete/README.md) | P1 | Fait (2026-05-17) | A faire | A faire | A faire |
| [FEATURE — Hero image responsive `<picture>`](FEATURES/hero-image-responsive/README.md) | P1 | Fait (2026-05-17) | A faire | A faire | A faire |

## Livraison Claude (2026-05-17)

Branche `feat/epic-25-article-seo-followup` (frontend + ansible_vps) — 11 commits :

| Commits | Sujet |
|---------|-------|
| `c523820` `2493b3d` `b53bd8f` `e563d67` | P0 — `RuntimeConfigService.siteUrl` + SeoService refactor + entrypoint SITE_URL + tests |
| `345889f` `dd12174` `af865a3` | P1 — `SeoService.buildArticleJsonLd()` (mainEntityOfPage, ImageObject absolu, wordCount, articleSection/keywords, inLanguage, isPartOf, author.url) + prefix `article:` corrige + `article:author/section/tag` emis |
| `1be2f69` `fdcf65f` `bc4c0ca` `6c2c6eb` | P1 — Hero image responsive : `<picture>` (deja en place), ajout `fetchpriority="high"` + alt enrichi `heroAlt()` + CSS `.article-hero picture` |

Cote `ansible_vps` (branche `feat/epic-25-article-seo-followup`) : `SITE_URL` deja provisionnee via `site_domain` dans `roles/website/templates/docker-compose-website.yml.j2`, doc ajoutee dans `inventory/group_vars/all/main.yml` + nouveau `roles/website/README.md`.

**Qualite** :
- `npm run lint` vert
- `npx tsc --noEmit` vert
- **1050/1050 tests OK** (vs 1008 baseline, +42 tests)
- Couverture stable au-dessus des seuils CI

**Reste a faire avant merge** :
1. VQO `>=` 9.5/10
2. Push + creation PR
3. Recette PO sur preprod (`og:image`, `canonical`, JSON-LD via Rich Results Test, prevues FB/LinkedIn)

## Criteres de validation EPIC

- `og:image`, `canonical`, JSON-LD `Article.image.url`, JSON-LD `Article.mainEntityOfPage` resolvent vers le bon domaine selon l'environnement (prod = `teamdivergentes.fr`, preprod = `preprod.teamdivergentes.fr`)
- `<picture>` rendu avec sources mobile / tablet / desktop sur `/articles/:slug` quand les 3 URLs sont en BDD ; fallback `<img>` quand seul `imageUrl` est defini
- JSON-LD `Article` contient les 6 champs ajoutes et passe https://validator.schema.org/ sans warning
- Tests E2E Playwright : meta tags + JSON-LD verifies sur 1 article publie en preprod
- Lighthouse SEO >= 90 maintenu sur `/articles/:slug`
- Lighthouse LCP mobile < 2.5s sur un article avec image hero (testable sur l'article PaasCool V2)
- VQO >= 9.5/10 sur tous les domaines

## Metriques cibles

| Metrique | Avant (V2 preprod 2026-05-17) | Cible apres EPIC |
|----------|-------------------------------|------------------|
| `og:image` correct par environnement | Non (toujours prod) | Oui |
| Image servie a un mobile 375px | Hero desktop 47 Ko | Hero mobile 14 Ko |
| Champs JSON-LD `Article` | 7 / 13 | 13 / 13 |
| Balises OG `article:*` correctes | 2 (avec prefixe errone) | 5 (published, modified, author, section, tag×N) |
| Pages d'articles avec preview LinkedIn / FB correcte | 0 (image 404 + meta partielles) | 100 % |

## Outils de validation

- https://validator.schema.org/ (JSON-LD)
- https://search.google.com/test/rich-results (Google Rich Results — eligibilite NewsArticle / Article)
- https://developers.facebook.com/tools/debug/ (OG preview, force re-scrape)
- https://www.linkedin.com/post-inspector/
- Lighthouse CI (.lighthouserc.json — seuil deja P0 dans EPIC-19)

## Origine

Audit V2 article PaasCool / Mystic Divergentes du 2026-05-17 : `seo-expert` + redacteur ont livre la version retravaillee, mais 4 limites techniques restent visibles dans le rendu HTML/meta et ne peuvent etre corrigees que par modification de code (pas par l'admin de redaction).

## Notes

- L'EPIC-23 (SEO global) etait centre sur les pages publiques generiques (sitemap, robots, JSON-LD Job/Person, CLS images). Les 4 limites ci-dessus n'avaient pas ete relevees a l'epoque car l'audit n'incluait pas un cycle de creation d'article avec image WebP responsive.
- Le bug `og:article:` (L.88 SeoService) avait deja ete signale dans `ENABLERS/twitter-social-metadata/us-og-article-times.md` (EPIC-23) — l'US y avait conclu sur le prefixe `og:article:` qui s'avere incorrect au regard de la spec OpenGraph officielle. A reverifier et corriger dans le cadre de l'enabler `article-og-tags-complete` de cet EPIC.

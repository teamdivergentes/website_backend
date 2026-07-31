# BACKLOG — Team Divergentes

Suivi macro de tous les EPICs en cours et a venir. Chaque EPIC a son propre dossier avec ses features, enablers et US.

> **Convention** : la colonne **Claude** est mise a jour en temps reel par l'agent IA. Les colonnes **PO**, **E2E** et **Livre** sont validees par les humains/QA/DevSecOps.

---

## EPICs actifs

| EPIC | Priorite | Statut | Branche | Claude | PO | E2E | Livre |
|------|----------|--------|---------|--------|----|----|-------|
| [EPIC-40 — Boutique collection 2026](EPIC-40-boutique-collection-2026/README.md) | **Haute** | EN REVIEW (recette UI en cours) | `feat/boutique-commandes` (back) / `feat/boutique-collection-2026` (front) | Fait | A faire | A faire | A faire |
| [EPIC-35 — 🔴 HOTFIX exposition secrets `/api/config`](EPIC-35-config-secrets-exposure/README.md) | **🔴 CRITIQUE** | EN REVIEW (mergé develop, PR main #154/#222 ouvertes) | mergé develop (back #153, front #221) | Fait | A faire | A faire | En cours |
| [EPIC-16 — Bugfixes (footer, analytics, auth admin)](EPIC-16-bugfixes/README.md) | Haute | TERMINE | PRs mergees sur develop | Fait | Fait | Fait | A faire |
| [EPIC-20 — Commentaire PR CI synchronise](EPIC-20-ci-pr-comment-sync/README.md) | **Haute** | EN REVIEW | 3 enablers merges develop (2026-05-04) | Fait | A faire | A faire | En cours |
| [EPIC-17 — Live Twitch & restructuration page joueurs](EPIC-17-live-twitch-and-players-page/README.md) | Moyenne | EN COURS | PRs par feature (#60, #103, #104, #119) | En cours | A faire | A faire | A faire |
| [EPIC-19 — Qualite du code, couverture TU et E2E](EPIC-19-code-quality-and-tests/README.md) | Moyenne | EN COURS (6/8 enablers Fait) | a11y + OnPush + Sonar QG livres main via PR #205 (2026-05-19) et PR #211 (2026-05-22) | En cours | A faire | A faire | En cours (batch 2 livre main 2026-05-22) |
| [EPIC-21 — Raccourcis UX pour le panel admin](EPIC-21-admin-ux-shortcuts/README.md) | Basse | EN REVIEW | PR #170 ouverte | Fait | A faire | A faire | A faire |
| [EPIC-22 — Visibilite admin de la page En Live (Twitch)](EPIC-22-page-visibility-twitch/README.md) | Basse | FAIT CLAUDE | PRs mergees develop (back #127, front #175) | Fait | A faire | A faire | A faire |
| [EPIC-23 — Ameliorations SEO du site public](EPIC-23-seo-improvements/README.md) | Moyenne (P0 quickfixes Haute) | FAIT CLAUDE (P0+P1, hors P2 prerender) | 4 branches mergees develop (verif 2026-05-18) | Fait | A faire | A faire | A faire |
| [EPIC-25 — Article detail SEO follow-up](EPIC-25-article-detail-seo-followup/README.md) | Moyenne (P0 Haute) | LIVRE PROD | PR #205 mergee main 2026-05-19 (commit 44256e7) | Fait | A faire | A faire | Fait (2026-05-19) |
| [EPIC-upgrades — Mises a niveau majeures (Dependabot backlog)](EPIC-upgrades/README.md) | Basse (sauf F5 GH Actions Node 24 → Haute, deadline 2026-06-02) | A faire | `chore/*` (par feature) | A faire | A faire | A faire | A faire |
| [EPIC-26 — Pages dediees des coachs](EPIC-26-coach-detail-page/README.md) | Moyenne | LIVRE PROD (full) | Frontend PR #205 mergee 2026-05-19, Backend PR #145 mergee 2026-05-22 | Fait | A faire | A faire | Fait (2026-05-22) |
| [EPIC-27 — Admin bugfixes (batch 2)](EPIC-27-admin-bugfixes-batch-2/README.md) | Basse (**🔴 P0** sur enabler reorder Twitch, PO 2026-06-22) | A faire (necessite Docker + systematic-debugging) | `fix/epic-27-admin-bugfixes` | A faire | A faire | A faire | A faire |
| [EPIC-28 — Raccourcis admin perms-aware + reorga navbar](EPIC-28-admin-shortcuts-perms-navbar/README.md) | Moyenne | EN COURS (Feature 1 Livre PROD, Feature 2 brainstorming PO) | PR #205 mergee main 2026-05-19 | En cours | A faire | A faire | Fait Feature 1 (Feature 2 en cours) |
| [EPIC-29 — Previews sociales et SEO par rendu serveur (SSR)](EPIC-29-social-preview-ssr/README.md) | **Haute** (confirmé audit 2026-05-27, relance PO 2026-07-29) | A faire (spec de design écrite 2026-07-29, pivot prerender → SSR) | `feat/epic-29-ssr` | A faire | A faire | A faire | A faire |
| [EPIC-30 — Durcissement sécurité (post-audit prod)](EPIC-30-security-hardening/README.md) | **Haute** (2 CRITIQUES, hotfix SEC-001/002) | LIVRÉ PROD (10/13 mergés main 2026-06-02 via PR back #158 + front #225, merge commit no-squash, CICD release déclenchée). Reste SEC-008 (design révoc JWT) + SEC-012 (INFO) + SEC-004 (bloqué EPIC-29) | mergé `main` (back #158, front #225) | Fait (10/13) | A faire | A faire | Fait (10/13) |
| [EPIC-31 — SEO follow-up batch 3 (post-audit prod)](EPIC-31-seo-followup-batch-3/README.md) | Moyenne (www→apex Haute) | A faire | `feat/epic-31-seo-followup` | A faire | A faire | A faire | A faire |
| [EPIC-32 — Performance & Core Web Vitals (post-audit prod)](EPIC-32-performance-cwv/README.md) | Moyenne (bug boutique + LCP Haute) | A faire | `feat/epic-32-performance-cwv` | A faire | A faire | A faire | A faire |
| [EPIC-33 — Accessibilité WCAG 2.1 AA (post-audit prod)](EPIC-33-accessibility-wcag/README.md) | Moyenne | A faire | `feat/epic-33-accessibility-wcag` | A faire | A faire | A faire | A faire |
| [EPIC-34 — Page d'adhésion association (HelloAsso)](EPIC-34-membership-helloasso/README.md) | Moyenne | A faire | `feat/epic-34-membership-helloasso` | A faire | A faire | A faire | A faire |
| [EPIC-36 — Audit sécurité API & admin (findings complémentaires)](EPIC-36-admin-api-security-audit/README.md) | Moyenne (SEC-N01 IDOR, SEC-N03 dette RBAC) | A faire | `fix/epic-36-admin-api-security` | A faire | A faire | A faire | A faire |
| [EPIC-37 — Palmarès & Matchs](EPIC-37-palmares-matchs/README.md) | Moyenne | FAIT CLAUDE (enabler + palmarès + matchs + redesign ; E2E exécution CI) | `feat/epic-37-palmares` (branche unique, décision PO 2026-06-04) | A faire | A faire | A faire | A faire |
| [EPIC-38 — Protection d'accès preprod (Basic Auth Traefik)](EPIC-38-preprod-protection/README.md) | Moyenne | EN REVIEW (implémenté 2026-06-04, reste entrée vault + push ; décision PO : Basic Auth infra plutôt que mdp applicatif) | `chore/epic-38-preprod-basic-auth` (ansible_vps) | Fait | A faire | N/A | A faire |
| [EPIC-44 — Mode maintenance du site public](EPIC-44-maintenance-mode/README.md) | Moyenne | A faire (créé 2026-07-31 sur demande PO ; ENABLER-1 démarrable, FEATURE-1 bloquée par EPIC-29) | `feat/epic-44-maintenance-mode` (back + front) | A faire | A faire | A faire | A faire |

## EPICs en backlog (a planifier)

| EPIC | Description |
|------|-------------|
| EPIC-18 — Analytics CNIL-friendly (Matomo) | Test parallele Matomo (instance perso de Maxime) vs GA pendant 2-4 semaines, puis arbitrage. Permet de tracker 100 % des visiteurs sans bandeau cookie en mode "consentless tracking" CNIL. Phase 1 livree 2026-05-11. |
| EPIC-24 — Release Pipeline Fixes | Corriger les fragilites CI/CD identifiees lors de la release v1.3.6/v1.4.0 du 2026-05-11 : tag push ne re-trigger pas workflow, smoke-release faux positif, backend RELEASE image GHCR jamais pushee, etc. 9 issues GitHub creees. Priorite **avant prochaine release**. |
| [EPIC-26 — Pages dediees des coachs](EPIC-26-coach-detail-page/README.md) | Miroir des fiches joueurs pour le coaching staff : nouvelle route `/equipes/:teamId/coach/:slug`, composant `CoachDetailComponent`, endpoint backend par slug, SEO + JSON-LD Person, parite modele `CoachingStaff` ↔ `TeamMember`. **2 features + 1 enabler**. |
| [EPIC-27 — Admin bugfixes (batch 2)](EPIC-27-admin-bugfixes-batch-2/README.md) | Bugs mineurs du panel admin remontes apres EPIC-16. Premier ticket : ecran noir apres enregistrement d'un article (non bloquant, refresh manuel restaure l'affichage). |
| [EPIC-28 — Raccourcis admin perms-aware + reorga navbar](EPIC-28-admin-shortcuts-perms-navbar/README.md) | Generer dynamiquement les raccourcis admin (header, dashboard, navbar) a partir des permissions de l'utilisateur. Reorganiser la navbar admin (audit + brainstorming PO + impl). **2 features**, branche `feat/epic-28-admin-shortcuts-navbar`. |
| [EPIC-42 — Uniformisation du site public](EPIC-42-site-public-uniformisation/README.md) | Pendant public de l'EPIC-41, ouvert par le PO le 2026-07-29. Deux points d'entree : les retours arriere, qui prennent **quatre formes differentes** sur six pages de detail (bouton chevron, fil d'Ariane a separateur `>`, lien texte, fil d'Ariane a separateur `/`) ; et les titres, avec **29 combinaisons de classes** et un `.title` redefini dans six fichiers SCSS ou six lignes sur sept sont identiques. L'enjeu enonce par le PO est le cout futur, pas la dette passee : eviter de reecrire le meme code a chaque page. **3 features**, audit prealable requis. |
| [EPIC-41 — Uniformisation des pages d'administration](EPIC-41-admin-pages-uniformisation/README.md) | Suite de l'audit en 4 dimensions du 2026-07-29 (structure, listes, formulaires, etats), mene par 4 agents en parallele sur les 11 modules admin. Corrige 7 defauts fonctionnels — dont une panne d'API qui se deguise en base vide sur 3 modules, et l'acces perdu aux articles au-dela du 100e — puis extrait 11 primitives transverses et migre 7 formulaires de dialogue vers page routee. Duplication structurelle relevee : ~1 800 lignes sur ~16 500. **3 features / ~15 US**, branche `feat/admin-pages-uniformisation`. Decision PO : pas de composant de liste generique. |
| [EPIC-43 — Refonte du shell admin](EPIC-43-admin-shell-refonte/README.md) | Suite du brainstorming PO du 2026-07-29 (audit de l'EPIC-28 Feature 2). Sidebar reorganisee en 4 groupes semantiques + zone epinglee, fil d'Ariane derive du registre, palette de commandes Cmd+K, dashboard reoriente "reprises en cours". Embarque 3 bugs fonctionnels averes (tabulation dans le drawer mobile ferme, drawer a 80px apres resize, fil d'Ariane casse sur 3 routes). **3 features / 7 lots**, branche `feat/admin-shell-refonte`. Spec : `frontend/docs/superpowers/specs/2026-07-29-admin-shell-refonte-design.md`. |
| [EPIC-39 — Resilience de la chaine CI/CD](EPIC-39-ci-resilience/README.md) | Suite au double incident du 2026-07-22 (CI gelee ~9h par un runner deprecie, non detectee ; image `:RELEASE` de prod supprimee par le cleanup GHCR rendant la prod non redeployable). 3 US : supervision reelle des runners, reduction de la dependance aux 2 runners self-hosted, chemin de reprise quand `:RELEASE` est absente. **Prioritaire** (infrastructure). |

---

## Issu du retour chef de projet (2026-04-25)

Decoupage retenu apres brainstorming PO/Scrum :

- **Option B** : 2 EPICs separes (livraison rapide des fixes vs feature plus longue)
- Sujet analytics scinde : fix UX dashboard immediat dans EPIC-16, decision strategique Matomo isolee dans EPIC-18

## Note priorisation EPIC-20 (2026-04-26)

EPIC-20 (commentaire PR CI sync) est priorise **Haute** : il doit etre livre **avant** l'enabler `ci-quality-enforcement` de l'EPIC-19. Sinon, les nouveaux jobs Sonar / coverage / mutation testing prevus dans EPIC-19 prolongeront la derive entre les jobs reels et le commentaire PR. Cout faible (~1.5 j cumule), benefice immediat sur la visibilite des reviewers.

## Note priorisation EPIC-upgrades F5 (2026-05-06)

La feature **F5 — GitHub Actions Node.js 24** de l'EPIC-upgrades est priorisee **Haute** malgre la priorite globale "Basse" de l'EPIC. La CI emet deja le warning `Node.js 20 actions are deprecated` sur tous les jobs (ex : `actions/checkout@v4.2.2`). GitHub force le passage a Node.js 24 le **2 juin 2026** ; sans bump prealable, certains jobs casseront a cette date. Charge estimee ≈ 4 h, a planifier juste apres EPIC-20.

## Note creation EPIC-23 SEO (2026-05-09)

EPIC-23 cree suite a une demande PO d'audit SEO complet. L'enabler `seo-quickfixes` (P0) est priorise **Haute** au sein de l'EPIC : 6 corrections faible effort / fort impact (noindex postuler, /twitch dans sitemap, alt articles, og:image dimensions, fallback OG image, durcissement Lighthouse SEO) livrables en 1 PR atomique. Les features JSON-LD (Job Posting, Person, BreadcrumbList) et les enablers CLS/sitemap/social suivent en P1. Le prerender statique Angular (P2) est isole en enabler dedie pour decision Go/No-Go ulterieure.

## Note creation EPIC-29 prerendering (2026-05-21)

EPIC-29 cree suite a un constat PO : le partage d'un lien interne sur Discord affiche la meme description que la home, quelle que soit la page. Cause identifiee : Angular SPA pure, meta tags injectes uniquement cote client par `SeoService` apres execution JS — invisibles pour les bots sociaux (Discord, LinkedIn, FB, Twitter, WhatsApp) qui lisent le HTML brut. EPIC-23 contenait deja un enabler P2 `prerender-static-pages` reporte faute de ROI mesurable ; ce constat declenche sa promotion en EPIC dedie. Solution : `@angular/ssr` en mode `outputMode: 'static'` (pas de runtime Node), fallback Nginx `try_files`. **2 features + 1 enabler**. A planifier apres EPIC-19 (qualite stable) et EPIC-20 (visibilite CI).

## Note audit complet prod (2026-05-27)

Audit multi-axes de la prod (Team Leader + 4 agents : SEO, UX/a11y, Sécurité, Perf/Infra) sur demande PO. Rapport de synthèse : `audit/RAPPORT-AUDIT-PROD-2026-05-27.md`. **4 EPICs créés** (30 sécurité, 31 SEO followup, 32 perf/CWV, 33 a11y) + EPIC-29 confirmé blocage #1 et priorité montée à **Haute**.

⚠️ **2 findings CRITIQUES** (EPIC-30) recommandés en **hotfix immédiat hors cycle** : SEC-001 (escalade privilège — `@Roles('admin')` inerte sur `POST /api/auth/register`, tout compte authentifié peut créer un admin) et SEC-002 (fallback JWT secret en dur). Le bug d'affichage des images boutique 2023 (cases noires) est tracé en EPIC-32 ENABLER-1 (Haute), sans rouvrir les PRs boutique #25/#56 (décision PO 2026-04-30).

## Note double incident CI/CD (2026-07-22) — creation EPIC-39

Deux pannes independantes le meme jour, toutes deux resolues, mais revelant des faiblesses structurelles tracees dans [EPIC-39](EPIC-39-ci-resilience/README.md).

1. **CI gelee ~9h sans alerte** — GitHub avait deprecie la version du runner self-hosted (v2.333.1) : le runner s'enregistrait et affichait « Listening for Jobs », mais GitHub ne lui routait aucun job. Aucune erreur dans l'UI Actions, les runs restaient `queued`. Corrige par un bump 2.336.0 ([vps#36](https://github.com/teamdivergentes/vps/pull/36)).
2. **Production non redeployable** — l'image `:RELEASE` avait disparu de GHCR (`docker pull` en 404, tout deploiement Ansible en echec). Cause : `ghcr-cleanup.yml` utilisait `ignore-versions: '^(RELEASE|PREPROD)$'`, or cette option prend une regex sur le *nom de version* — pour un container, c'est le **digest**, jamais le tag : la protection etait **inoperante depuis le debut**. Corrige ([backend#165](https://github.com/teamdivergentes/website_backend/pull/165), [frontend#234](https://github.com/teamdivergentes/website_frontend/pull/234)) et images restaurees a l'identique, deploiement Ansible revalide `success`.

⚠️ **Recurrence a noter** : EPIC-24 listait deja « backend RELEASE image GHCR jamais pushee » parmi les fragilites de mai. Meme symptome, cause racine differente — d'ou la priorite donnee a EPIC-39.

---

## Note livraison EPIC-30 (2026-06-02)

Revue de code + Red Team (GO MERGE, 0 vulnérabilité) puis merge `develop → main` des correctifs sécurité sur les 2 repos : **backend PR #158** (SEC-001/002/003/005) et **frontend PR #225** (SEC-010/011). Merge commit standard (pas de squash — règle release). Lint + TU verts (backend exit 0, frontend 1208/1208). CICD de release déclenchée sur `main` → déploiement prod via semantic-release/tag. **10/13 findings livrés prod**. Reste SEC-008 (design révoc JWT), SEC-012 (INFO Matomo), SEC-004 (bloqué EPIC-29 SSR).

🔴 **Action humaine restante** : **rotation de `JWT_SECRET` en prod**. SEC-002 supprime le fallback en clair mais le secret actuel doit être régénéré (vault Ansible `vault_prod_jwt_secret` + redéploiement). Tant que ce n'est pas fait, un secret potentiellement exposé reste valide.

## Note creation EPIC-44 mode maintenance (2026-07-31)

EPIC-44 créé sur demande PO : pouvoir fermer le site public à chaud pendant une refonte ou un incident, tout en laissant l'équipe naviguer. Besoin non tracé jusqu'ici.

**Ne pas confondre avec EPIC-38.** EPIC-38 protège la **preprod** par Basic Auth Traefik (déjà implémenté, `EN REVIEW`, reste l'entrée vault). EPIC-44 ferme la **prod** à la demande, avec bypass par permission. Deux besoins distincts, deux mécanismes distincts.

**Décision d'architecture** : le flag vit dans le backend (`model Config`, togglable à chaud), pas dans nginx ni Traefik. Motif principal : l'architecture cible d'EPIC-29 route « tout le reste » de nginx vers le process SSR `:4000`, une règle nginx de maintenance en dur entrerait en conflit avec elle.

**Découpage imposé par EPIC-29** : l'ENABLER-1 (flag + guard `503`) est livrable immédiatement et sans effet tant que le flag reste à `false`. La FEATURE-1 (page de maintenance publique) attend le SSR, car sans rendu serveur la page part en `200 OK` et se fait indexer à la place du contenu réel. Nouveau piège identifié pour EPIC-29 : le serveur SSR recevant un `503` du backend doit rendre la page de maintenance, pas un HTML vide.

---

## Etats

`Fait` / `En cours` / `A faire` / `Bloque`

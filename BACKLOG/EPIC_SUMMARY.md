# EPIC Summary — État consolidé au 2026-04-27

Vue synthétique de l'avancement de tous les EPICs actifs après la session marathon des 2026-04-25 → 2026-04-27. Complémentaire à `BACKLOG/README.md` (vue macro avec colonnes Claude/PO/E2E/Livré).

> **Convention statuts** : ✅ Livré sur develop · 🚧 PR ouverte · 📝 DRAFT · 🔒 Bloqué · ⬜ A faire

---

## 🔑 Releases en attente de promotion sur main

| Repo | Tag prod actuel | Cible | PR develop→main | Contenu majeur |
|---|---|---|---|---|
| backend | **v1.3.2** | v1.3.3 | 🚧 [#64](https://github.com/teamdivergentes/website_backend/pull/64) | EPIC-19 (sonar baseline + QG + S2699 derog), EPIC-17 BDD (#57), CI self-hosted runner, mutation testing, dependabot mineurs |
| frontend | **v1.3.5** | v1.3.6 | 🚧 [#120](https://github.com/teamdivergentes/website_frontend/pull/120) | EPIC-16 footer fix (#99), EPIC-17 F1 /twitch route (#103), chromium fix runner (#102), sonar-uri (#98), dependabot mineurs |
| ansible_vps | (pas de tag) | — | — | FOWNER capability runner (mergé sur main) |

**Dépendance critique** : ces releases doivent être mergées pour que main bascule sur le runner self-hosted (actuellement encore sur `ubuntu-latest` → bloqué par billing GitHub Actions).

---

## EPIC-16 — Bugfixes (footer, analytics, auth admin) — 🚧 33% livré

| Enabler | Statut | PR | Détails |
|---|---|---|---|
| Footer / header alignment | ✅ Livré sur develop | #99 mergé | `PageVisibilityService` introduit, refacto header.ts/footer.ts, gère `/twitch` |
| Analytics dashboard UX fix | 🚧 PR ouverte | [#100 frontend](https://github.com/teamdivergentes/website_frontend/pull/100) | default range, empty placeholder, consent banner |
| Admin auth persistence | 🚧 PR ouverte (back+front) | [#56 back](https://github.com/teamdivergentes/website_backend/pull/56) + [#101 front](https://github.com/teamdivergentes/website_frontend/pull/101) | HttpOnly cookie + refresh 7j + fix réhydratation |

**Reste à faire** : merge des 3 PRs (CI en cours), validation PO, E2E Playwright sur les 3 sujets.

---

## EPIC-17 — Live Twitch & restructuration page joueurs — 🚧 50% livré

### Architecture validée (brainstorming 2026-04-25)
- Route page live : `/twitch` (publique, dans `MainLayout`)
- Détection live : polling Twitch Helix toutes les 60s côté backend (cache 60s)
- Modèle BDD : `TwitchChannel` standalone (`teamMemberId Int?`) + `CoachingStaff` lié à `Team`
- Header : item "EN LIVE" rectangulaire avec LED rouge animée / grise
- Page détail équipe : H1 nom équipe blanc → H2 "NOS JOUEURS" → grille → H2 "NOTRE COACHING STAFF" (conditionnel) → image+description

### Avancement par feature

| Code | Feature | Statut | PR | Notes |
|---|---|---|---|---|
| **E1** | BDD + API Twitch / Coaching | 🚧 Partiel | [#57 BDD mergé](https://github.com/teamdivergentes/website_backend/pull/57) + [#60 services OPEN](https://github.com/teamdivergentes/website_backend/pull/60) | Modèles + migration mergés. Services TwitchHelixService + TwitchChannelsService + CoachingStaffService + admin CRUDs livrés en PR #60 (2906 lignes), 2 issues critiques fixées (localeCompare + cognitive complexity) |
| **F1** | Page En Live `/twitch` | 🚧 Partiel | [#103 mergé](https://github.com/teamdivergentes/website_frontend/pull/103) | us-route-and-config Fait : route active, TwitchComponent skeleton, `pageTwitchVisible` config. **us-display-states** + **us-frontend-live-polling** restent A faire |
| **F2** | Header LED indicator | ⬜ A faire | — | Débloqué (F1 mergée). 2 US : `LiveStatusService` singleton + item "EN LIVE" + LED |
| **F3** | Admin Twitch CRUD | 📝 DRAFT | [#119 DRAFT](https://github.com/teamdivergentes/website_frontend/pull/119) | 1462 lignes pushées (composants + service + model + sidebar + routes). Lint+Build OK. **Tests dialog flaky** (Chrome disconnect ~30s) à finaliser |
| **F4** | Restructuration page joueurs | 🚧 PR ouverte | [#104 OPEN](https://github.com/teamdivergentes/website_frontend/pull/104) | Lint+Build+22/22 tests OK. Hiérarchie H1/H2 + section coaching staff conditionnelle. **us-admin-coaching-staff-management** reste A faire |

### Variables d'env requises (à provisionner avant déploiement)

```
TWITCH_CLIENT_ID=<obtenu sur https://dev.twitch.tv/console>
TWITCH_CLIENT_SECRET=<idem>
```

### Ordre de finalisation recommandé

1. **Merger #60 backend** (services Twitch+Coaching) → débloque l'API
2. **Merger #104 frontend** (F4 page équipe) → consomme l'API CoachingStaff
3. **Démarrer F2** (header LED + LiveStatusService) — dépend de l'endpoint `/api/twitch/live` de #60
4. **Finaliser #119 F3 DRAFT** : fixer les tests dialog flaky, ready-for-review
5. **Compléter F1** : us-display-states (3 layouts : 1/N/0 streamers) + us-frontend-live-polling (60s + visibilitychange)
6. **us-admin-coaching-staff-management** (admin CRUD coaching, scope étendable depuis F3)

---

## EPIC-19 — Qualité du code, couverture TU et E2E — 🚧 Enabler 1/7 livré

### Sonar baseline + Quality Gate `DVG-Strict` ✅ Livré

- **PR #62 mergée** sur develop : 3 documents commités dans `backend/docs/` (~514 lignes)
  - `sonar-baseline-2026-04-26-backend.md`
  - `sonar-baseline-2026-04-26-frontend.md`
  - `sonar-quality-gates.md`
- **QG `DVG-Strict` créé** sur SonarQube et **attaché aux 2 projets** (`dvg-backend`, `dvg-frontend`)
- **Allégement temporaire 2026-04-26** : conditions overall `coverage` (50% < 80%) et `duplicated_lines_density` retirées → **CAYC-only sur new code**. Permet aux PRs d'être mergeables sans bloquer sur la dette legacy.
- **Dérogation S2699** ajoutée (PR #63 mergée) : ignore le faux positif `typescript:S2699` sur `test/**.e2e-spec.ts` (Sonar ne reconnaît pas les assertions supertest).
- **Tokens user fournis par PO** (`sqa_*` + `squ_*`) **peuvent être révoqués maintenant** — la CI utilise `SONAR_TOKEN_DVG` (GitHub Secret) indépendant.

### Baseline chiffrée (référence pour les enablers suivants)

| Métrique | Backend (`dvg-backend`) | Frontend (`dvg-frontend`) |
|---|---|---|
| Coverage | **53.1 %** (cible 80%) | **45.0 %** (cible 80%) |
| Bugs | 1 | 14 |
| Vulnérabilités | 0 | 0 |
| Code smells | 240 | 200 |
| Hotspots non revus | 4 | 9 |
| ncloc | 7117 | 29754 |

### Reste à faire (6 enablers)

| Enabler | Priorité | Effort | Levier principal |
|---|---|---|---|
| backend-test-coverage | Haute | M | Couvrir contrôleurs (article-types, articles, coaching-staff, config, games, profile) + `contact.service.ts` (207 lignes 0% cov) |
| frontend-test-coverage | Haute | L | Couvrir admin/articles (4 composants à 0%, ~1200 ncloc) + `team-members-dialog` (571 lignes 0%) + `editor-blocks-renderer` |
| backend-code-quality | Moyenne | S | Découper `analytics.service.ts` (607 lignes), factoriser CRUD redondants |
| frontend-code-quality | Moyenne | M | Fix 4 critiques (`editor-blocks-renderer:217`, `main-layout:100`, `sponsors-list:188`, `auth.service:35`), découper `article-editor.component.ts` (430 lignes 0% cov) et `team-members-dialog` |
| e2e-coverage | Moyenne | L | Playwright sur tous parcours admin + parcours publics critiques |
| ci-quality-enforcement | Basse | S | Bloquer merge si QG KO ou couverture < seuil |

---

## EPIC-20 — Commentaire PR CI synchronisé — ⬜ Planifié, **priorité Haute**

> Doit être livré **avant** l'enabler `ci-quality-enforcement` de l'EPIC-19, sinon les jobs Sonar/coverage/mutation testing prévus prolongeront la dérive entre les jobs réels et le commentaire PR.

3 enablers identifiés :
1. **backend-pr-comment-sync** : étendre `generate-pr-report.sh` + job `pr-report` (validate-migrations, scan-image, release, notify manquants)
2. **frontend-pr-comment-sync** : idem (test Karma absent malgré la variable, e2e, lighthouse, scan-image, release, notify, e2e-fullstack)
3. **pr-comment-harmonization-and-docs** : harmoniser les 2 scripts, créer `docs/devsecops/pr-comment.md`, ajouter checklist dans `CONTRIBUTING.md`

**Avantage** : pas besoin de CI verte ni d'agent (modif de scripts shell), peut être démarré dès la prochaine session.

---

## EPIC-upgrades — Mises à niveau Dependabot — ⬜ A faire

### F1 Angular 20 → 21 (le plus gros)

**8 PRs Dependabot** à grouper dans une seule branche `chore/angular-21-upgrade` :

| PR | Bump |
|---|---|
| #118 | @angular/core 21.2.10 |
| #110 | @angular/compiler 21.2.10 |
| #113 | @angular/router 21.2.10 |
| #117 | @angular/forms 21.2.10 |
| #116 | @angular/material 21.2.8 |
| #115 | @angular/cli 21.2.8 |
| #111 | @angular/build 21.2.8 |
| #44 | @ng-bootstrap/ng-bootstrap 20.0.0 (peer dep) |

**Annexes à inclure** : ESLint 10 (#112), TypeScript ESLint parser 8.59 (#114), CI actions (#105, #109, #108, #106, #107).

**Procédure** : `ng update @angular/core@21 @angular/cli@21` → `ng update @angular/material@21` → bump ng-bootstrap manuel → eslint → tests.

### F2 Prisma 7 (backend)

PRs #50, #49 (Prisma + @prisma/client 7.x). Risque : breaking changes types générés.

### F3 ESLint 10 (back + front)

PRs #30, #18 (back) + #112 (front). Configuration flat config requise.

### F4 Node 25-alpine Docker

PRs #11 (back) + #36 (front). Bump Docker base image.

---

## 🛠️ Infrastructure CI/CD

### Self-hosted runner (mode ephemeral, 2 instances)

- **FOWNER capability** ajoutée (Ansible) → résout les `tar` failures lors du extracted toolchain (setup-node etc.)
- **CAP_DAC_OVERRIDE** déjà en place
- **Chromium installé** sur le runner (PR #102 mergée frontend) via `dpkg --remove --force snapd` + `apt-get install` explicite des libs (`libnspr4`, `libnss3`, etc.)
- **`postgresql-client`** installé pour `validate-migrations`
- **2 runners actifs** depuis 2026-04-26 fin de journée → traitement plus rapide de la queue

### Sonar `DVG-Strict` Quality Gate (CAYC)

Conditions actives sur **new code uniquement** (legacy non bloquant) :

| Condition | Seuil |
|---|---|
| `new_reliability_rating` | A |
| `new_security_rating` | A |
| `new_maintainability_rating` | A |
| `new_security_hotspots_reviewed` | 100% |
| `new_coverage` | ≥ 80% |
| `new_duplicated_lines_density` | < 3% |
| `new_violations` | = 0 |
| `bugs` (overall) | = 0 |
| `vulnerabilities` (overall) | = 0 |

---

## 📌 Points d'attention pour la prochaine session

1. **Releases #64/#120** sont la priorité absolue : leur merge débloque le build sur main (passage ubuntu-latest → self-hosted). Sans elles, `chore(release)` semantic-release ne peut pas tagger.
2. **Limite mensuelle Anthropic atteinte** par l'org pendant la session du 2026-04-26 (a tué l'agent F3 partiellement). Reset typique en début de mois calendaire.
3. **WIP local** stash sur frontend : `git stash list` montre "user WIP: ghcr-cleanup runs-on self-hosted (a reprendre plus tard)" — la branche `fix/cleanup-on-selfhosted` doit être finalisée pour basculer le ghcr-cleanup workflow sur self-hosted.
4. **EPIC-20 priorité Haute** doit être démarré avant les enablers EPIC-19 (ci-quality-enforcement).
5. **Tokens Sonar à révoquer** — `SONAR_TOKEN_DVG` (GitHub Secret) suffit pour la CI quotidienne.
6. **F2 EPIC-17 prêt à être démarré** (F1 mergée).

---

*Généré automatiquement — référence : commits develop {backend: 25 ahead, frontend: 24 ahead} sur main au 2026-04-27.*

# Baseline Sonar — `dvg-backend` au 2026-04-26

Capture instantanée des métriques Sonar du projet `dvg-backend` (NestJS) au démarrage de l'EPIC-19. Sert de référence pour mesurer la progression.

- **Instance** : <https://sonarqube.tellebma.fr/>
- **Projet** : `dvg-backend` (Team Divergentes - Backend)
- **Quality Gate appliqué au moment de la capture** : `Sonar way` (built-in) — sera remplacé par `DVG-Strict` (cf. [sonar-quality-gates.md](./sonar-quality-gates.md))

---

## 1. Métriques globales

### Volume

| Métrique | Valeur |
|---|---|
| Lignes de code (ncloc) | **7 117** |
| Fichiers analysés | 125 |
| Classes | 130 |
| Fonctions | 488 |
| Densité de commentaires | 7.4 % |

### Qualité — Reliability / Security / Maintainability

| Métrique | Valeur | Rating |
|---|---|---|
| Bugs | **1** | **D** (4.0) |
| Vulnérabilités | 0 | A (1.0) |
| Code smells | 240 | A (sqale_rating 1.0) |
| Security hotspots | 4 | E (5.0 — non revus) |
| Dette technique (sqale_index) | 1 701 min ≈ **28 h** | — |
| Complexité cognitive globale | 610 | — |

### Couverture

| Métrique | Valeur |
|---|---|
| Coverage globale | **53.1 %** |
| Line coverage | 56.8 % |
| Branch coverage | 47.9 % |

### Duplication

| Métrique | Valeur |
|---|---|
| Densité lignes dupliquées | 2.2 % |
| Blocs dupliqués | 18 |

---

## 2. Statut du Quality Gate (Sonar way par défaut)

> ⚠️ **PR #60 (EPIC-17 backend services) actuellement bloquée par le QG.**

| Condition | Valeur actuelle | Seuil | Statut |
|---|---|---|---|
| `new_coverage` | 76.2 % | ≥ 80 % | **❌ ERROR** |
| `new_duplicated_lines_density` | 1.15 % | < 3 % | OK |
| `new_violations` (BLOCKER + CRITICAL) | 27 | 0 | **❌ ERROR** |

**Statut global : `ERROR`**

---

## 3. Issues BLOCKER + CRITICAL — répartition

**Total Sonar : 133** (130 BLOCKER + 3 CRITICAL).

### Top règles déclenchées

| # | Règle | Description |
|---|---|---|
| **129** | `typescript:S2699` | "Add at least one assertion to this test case." — **faux positif récurrent** : Sonar ne reconnaît pas les assertions `supertest` (`.expect(200)`) sur les e2e specs comme des assertions Jest. |
| 1 | `typescript:S3516` | (autre) |

### Distribution BLOCKER+CRITICAL par fichier

| Fichier | # |
|---|---|
| `test/authorization.e2e-spec.ts` | 25 |
| `test/security.e2e-spec.ts` | 21 |
| `test/auth.e2e-spec.ts` | 14 |
| `test/users.e2e-spec.ts` | 14 |
| `test/contact.e2e-spec.ts` | 13 |
| `test/twitch.e2e-spec.ts` | 11 |
| `test/coaching-staff.e2e-spec.ts` | 9 |
| `test/upload.e2e-spec.ts` | 8 |
| `test/recruitment.e2e-spec.ts` | 7 |
| `test/teams.e2e-spec.ts` | 7 |

### Issues critiques NON faux-positifs

| Sévérité | Type | Fichier | Issue |
|---|---|---|---|
| `CRITICAL` | BUG | `src/twitch-helix/twitch-helix.service.ts:150` | "Provide a compare function that depends on `String.localeCompare`, to reliably sort..." — vraie dette à corriger avant merge EPIC-17 |
| `CRITICAL` | CODE_SMELL | `src/coaching-staff/coaching-staff.service.ts:145` | "Refactor this function to reduce its Cognitive Complexity from 19 to the 15 allowed." |

---

## 4. Top 10 fichiers — pire couverture (≥ 30 ncloc)

| Coverage | NCLOC | Fichier |
|---|---|---|
| 0 % | 49 | `src/article-types/article-types.controller.ts` |
| 0 % | 96 | `src/articles/articles.controller.ts` |
| 0 % | 59 | `src/coaching-staff/coaching-staff.controller.ts` |
| 0 % | 41 | `src/config/config.controller.ts` |
| 0 % | **207** | `src/contact/contact.service.ts` ⚠️ |
| 0 % | 78 | `src/games/games.controller.ts` |
| 0 % | 38 | `src/metrics/metrics.interceptor.ts` |
| 0 % | 43 | `src/upload/multer.config.ts` |
| 0 % | 35 | `src/profile/profile.controller.ts` |
| 0 % | 68 | `src/profile/profile.service.ts` |

**Constat clé** : la grande majorité des controllers + 2 services applicatifs (`contact`, `profile`) sont **sans aucune spec unitaire**. C'est l'angle d'attaque principal pour atteindre 80 % de couverture.

---

## 5. Top 6 fichiers les plus dupliqués

| Duplication | NCLOC | Fichier |
|---|---|---|
| 17.5 % | 122 | `src/staff/staff.service.ts` |
| 12.8 % | 210 | `src/teams/team-members.service.ts` |
| 12.4 % | 178 | `src/coaching-staff/coaching-staff.service.ts` |
| 12.3 % | 180 | `src/games/games.service.ts` |
| 9.1 % | 225 | `src/teams/teams.service.ts` |
| 7.6 % | 338 | `src/sponsors/sponsors.service.ts` |

**Schéma reconnaissable** : les services CRUD partagent des patterns redondants (création/update/find/list/delete avec validation similaire). Candidat à un **service générique CRUD** ou à des helpers Prisma factorisés.

---

## 6. Top 10 fichiers les plus volumineux

| NCLOC | Cov | Fichier |
|---|---|---|
| **607** | 79.9 % | `src/analytics/analytics.service.ts` ⚠️ > 400 lignes |
| 338 | 28.6 % | `src/sponsors/sponsors.service.ts` |
| 320 | 86.1 % | `src/recruitment/recruitment-application.service.ts` |
| 281 | 83.4 % | `src/articles/articles.service.ts` |
| 225 | 54.1 % | `src/teams/teams.service.ts` |
| 210 | 46.9 % | `src/teams/team-members.service.ts` |
| 207 | **0 %** | `src/contact/contact.service.ts` ❌ critique |
| 206 | 77.2 % | `src/users/users.service.ts` |
| 183 | 94.1 % | `src/articles/link-meta.service.ts` |
| 180 | 44.3 % | `src/games/games.service.ts` |

---

## 7. Recommandation de priorisation pour les enablers EPIC-19

### Court terme (sans changer le code applicatif)

1. **Désactiver / configurer `typescript:S2699` sur les e2e specs** — c'est un faux positif structurel. Soit :
   - Exclure `test/**.e2e-spec.ts` de l'analyse Sonar pour cette règle
   - Ou ajouter un `expect(true).toBe(true)` factice (option dégradée)
   - Ou apprendre à Sonar à reconnaître les assertions `supertest`

   **Action recommandée** : exclure ces fichiers via `sonar.coverage.exclusions` ou `sonar.issue.ignore.multicriteria` dans `sonar-project.properties`.
2. **Corriger les 2 vraies issues critiques** identifiées au §3 : `twitch-helix.service.ts:150` (bug localeCompare) + `coaching-staff.service.ts:145` (cognitive complexity).

### Moyen terme (`backend-test-coverage` enabler)

Cible à atteindre : **80 %** de couverture. Levier principal :

1. **Couvrir les controllers manquants** (gain estimé : +15-20 % de coverage absolue)
2. **Couvrir `contact.service.ts` (207 lignes, 0 %)** — tester l'envoi email + Discord webhook avec mocks
3. **Couvrir `profile.service.ts` (68 lignes, 0 %)** — petits tests unitaires
4. **Améliorer `sponsors.service.ts` (28.6 %)** et `team-members.service.ts` (46.9 %)

### Moyen terme (`backend-code-quality` enabler)

1. **Découper `analytics.service.ts` (607 lignes)** — > 400 lignes, en sous-services par domaine (events, sessions, dimensions...)
2. **Factoriser les CRUD redondants** — helper Prisma + base service
3. **Refactor cognitive complexity** sur `coaching-staff.service.ts:145`

### Long terme (`ci-quality-enforcement` enabler)

- Une fois le QG `DVG-Strict` stable et le code aligné, **bloquer le merge** en CI sur QG KO.

---

## 8. Reproductibilité

Métriques récupérées via :

```bash
# Métriques globales
curl -u "$SONAR_TOKEN:" \
  "https://sonarqube.tellebma.fr/api/measures/component?component=dvg-backend&metricKeys=ncloc,bugs,vulnerabilities,code_smells,security_hotspots,coverage,line_coverage,branch_coverage,duplicated_lines_density,duplicated_blocks,sqale_index,reliability_rating,security_rating,sqale_rating,security_review_rating,cognitive_complexity,classes,files,functions,comment_lines_density"

# Top issues
curl -u "$SONAR_TOKEN:" \
  "https://sonarqube.tellebma.fr/api/issues/search?projects=dvg-backend&severities=BLOCKER,CRITICAL&ps=200"

# Top fichiers
curl -u "$SONAR_TOKEN:" \
  "https://sonarqube.tellebma.fr/api/measures/component_tree?component=dvg-backend&metricKeys=coverage,ncloc,duplicated_lines_density&qualifiers=FIL&ps=500"

# Statut Quality Gate
curl -u "$SONAR_TOKEN:" \
  "https://sonarqube.tellebma.fr/api/qualitygates/project_status?projectKey=dvg-backend"
```

Le token utilisé est un user token Sonar à privilèges admin (à révoquer après commit de cette baseline et création du QG `DVG-Strict`).

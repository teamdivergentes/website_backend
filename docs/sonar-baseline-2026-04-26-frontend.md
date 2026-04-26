# Baseline Sonar — `dvg-frontend` au 2026-04-26

Capture instantanée des métriques Sonar du projet `dvg-frontend` (Angular 20+) au démarrage de l'EPIC-19.

- **Instance** : <https://sonarqube.tellebma.fr/>
- **Projet** : `dvg-frontend` (Team Divergentes - Frontend)
- **Quality Gate appliqué au moment de la capture** : `Sonar way` (built-in) — sera remplacé par `DVG-Strict`

---

## 1. Métriques globales

### Volume

| Métrique | Valeur |
|---|---|
| Lignes de code (ncloc) | **29 754** |
| Fichiers analysés | 212 |
| Classes | 97 |
| Fonctions | 1 185 |
| Densité de commentaires | 8.7 % |

### Qualité — Reliability / Security / Maintainability

| Métrique | Valeur | Rating |
|---|---|---|
| Bugs | **14** | **C** (3.0) |
| Vulnérabilités | 0 | A (1.0) |
| Code smells | 200 | A (sqale_rating 1.0) |
| Security hotspots | 9 | E (5.0 — non revus) |
| Dette technique (sqale_index) | 897 min ≈ **15 h** | — |
| Complexité cognitive globale | 564 | — |

### Couverture

| Métrique | Valeur |
|---|---|
| Coverage globale | **45.0 %** |
| Line coverage | 42.7 % |
| Branch coverage | 58.1 % |

### Duplication

| Métrique | Valeur |
|---|---|
| Densité lignes dupliquées | 0.3 % |
| Blocs dupliqués | 4 |

---

## 2. Statut du Quality Gate (Sonar way par défaut)

| Condition | Valeur actuelle | Seuil | Statut |
|---|---|---|---|
| `new_violations` | 0 | 0 | OK |

**Statut global : `OK`** ✅ (sur le scope CAYC actuel — sans nouvelle régression).

> ⚠️ **Avec `DVG-Strict` (overall code) le statut va passer à ERROR** car couverture globale 45 % << 80 %. C'est attendu et trace l'effort à fournir.

---

## 3. Issues BLOCKER + CRITICAL

**Total : 4** — beaucoup mieux qu'au backend.

| Sévérité | Type | Fichier:ligne | Issue |
|---|---|---|---|
| `CRITICAL` | CODE_SMELL | `editor-blocks-renderer.component.ts:217` | Cognitive Complexity 30/15 — refactor requis. |
| `CRITICAL` | CODE_SMELL | `main-layout.ts:100` | "Refactor this code to not nest functions more than 4 levels deep." |
| `BLOCKER` | CODE_SMELL | `sponsors-list.component.ts:188` | "Output bindings, including aliases, should not be named as standard DOM events." |
| `CRITICAL` | CODE_SMELL | `auth.service.ts:35` | "Refactor this asynchronous operation outside of the constructor." |

→ 4 issues clairement actionnables, à corriger en priorité dans `frontend-code-quality`.

---

## 4. Top 10 fichiers — pire couverture (≥ 30 ncloc)

| Coverage | NCLOC | Fichier |
|---|---|---|
| 0 % | 251 | `src/app/admin/components/admin-header.component.ts` |
| 0 % | 88 | `src/app/admin/layout/admin-layout.component.ts` |
| 0 % | 229 | `src/app/admin/components/admin-sidebar.component.ts` |
| 0 % | 292 | `src/app/admin/pages/articles/article-categories/article-categories.component.ts` |
| 0 % | 133 | `src/app/admin/pages/articles/article-categories/article-category-dialog.component.ts` |
| 0 % | 127 | `src/app/pages/articles/article-detail/article-detail.component.ts` |
| 0 % | **430** | `src/app/admin/pages/articles/article-editor.component.ts` ⚠️ |
| 0 % | 191 | `src/app/admin/pages/articles/articles-list.component.ts` |
| 0 % | 131 | `src/app/admin/pages/config/config-page.component.ts` |
| 0 % | 276 | `src/app/shared/components/editor-blocks-renderer/editor-blocks-renderer.component.ts` |

**Constat clé** : tout le panel **admin/articles** + le `editor-blocks-renderer` sont à 0 %. La feature articles a été livrée sans tests.

---

## 5. Top 3 fichiers les plus dupliqués

| Duplication | NCLOC | Fichier |
|---|---|---|
| **51.8 %** | 137 | `src/app/data/shopping-list.ts` ⚠️ |
| 9.6 % | 226 | `src/app/admin/pages/teams/team-form-dialog.component.ts` |
| 6.4 % | 356 | `src/app/admin/pages/recruitment/recruitment-form-dialog.component.ts` |

`shopping-list.ts` à 51.8 % est probablement un fichier de seed/data avec entrées répétitives. À investiguer (peut-être un faux positif structurel).

---

## 6. Top 10 fichiers les plus volumineux

| NCLOC | Cov | Fichier |
|---|---|---|
| **669** | n/a | `src/app/admin/pages/articles/article-editor.component.scss` ⚠️ |
| 613 | n/a | `src/styles/_admin-shared.scss` |
| 602 | n/a | `src/app/pages/equipes/equipes.scss` |
| **574** | 98.7 % | `src/app/admin/dashboard/admin-dashboard.component.ts` ✅ bien couvert |
| **571** | **0 %** | `src/app/admin/pages/teams/team-members-dialog.component.ts` ❌ |
| 562 | n/a | `src/app/pages/boutique/boutique.scss` |
| 554 | n/a | `src/app/pages/articles/articles-page.component.scss` |
| 482 | n/a | `src/app/pages/equipes/team-detail/team-detail.scss` |
| 473 | n/a | `src/app/pages/contact/contact.scss` |
| 466 | n/a | `src/app/admin/pages/config/config-page.component.html` |

> SCSS / HTML n'ont pas de couverture mesurable. Le rouge est sur `team-members-dialog` (571 lignes, 0 %).

---

## 7. Recommandation de priorisation pour les enablers EPIC-19

### Court terme

1. **Corriger les 4 issues critiques** listées au §3 — gain immédiat sur le rating Reliability/Maintainability.
2. **Investiguer la duplication 51.8 % de `shopping-list.ts`** — si c'est un faux positif structurel, l'exclure du scope Sonar.

### Moyen terme (`frontend-test-coverage` enabler)

Cible : **80 %** de couverture. Levier prioritaire = panel admin (~50 % du code non couvert) :

1. **Couvrir le module admin/articles** (4 composants à 0 % : article-categories, article-detail, article-editor, articles-list) — gros morceau, mais c'est ~1 200 ncloc d'un coup.
2. **Couvrir `team-members-dialog` (571, 0 %)** et `editor-blocks-renderer` (276, 0 %).
3. **Couvrir admin-header / admin-sidebar / admin-layout** — composants de structure, tests unitaires standards.

### Moyen terme (`frontend-code-quality` enabler)

1. **Découper `article-editor.component.ts` (430 ncloc, 0 % cov)** — composant monolithique à fort risque, à splitter par sous-composants éditoriaux.
2. **Découper `team-members-dialog` (571, 0 %)** — idem.
3. **Refactor cognitive complexity** sur `editor-blocks-renderer:217` (30 → ≤ 15).
4. **Sortir l'async du constructor** dans `auth.service.ts:35`.

### Comparaison avec le backend

| Critère | Backend | Frontend | Verdict |
|---|---|---|---|
| Bugs | 1 (D) | 14 (C) | ⚠️ Frontend a plus de bugs (mais moins critiques) |
| Code smells | 240 | 200 | équivalent |
| Hotspots non revus | 4 | 9 | ⚠️ Frontend |
| Coverage | 53.1 % | 45.0 % | Frontend plus loin de 80 % |
| Duplication | 2.2 % | 0.3 % | ✅ Frontend |
| Issues BLOCKER+CRITICAL réelles | 2 (hors faux pos) | 4 | équivalent |
| Volume code | 7 117 ncloc | 29 754 ncloc | Frontend ~4× plus gros |

→ **Effort à investir plus élevé côté frontend** (volume + coverage gap), mais code plus propre en duplications/issues critiques.

---

## 8. Reproductibilité

Voir la procédure dans [`sonar-baseline-2026-04-26-backend.md`](./sonar-baseline-2026-04-26-backend.md#8-reproductibilité) — remplacer `dvg-backend` par `dvg-frontend` dans les URL.

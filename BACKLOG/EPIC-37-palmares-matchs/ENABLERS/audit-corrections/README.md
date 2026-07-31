# ENABLER — Corrections d'audit EPIC-37

**Statut** : EN COURS
**Créé le** : 2026-07-22
**Contexte** : Revue croisée (Backend / Frontend / Red Team) + audit design/UI-UX du code EPIC-37 sur `origin/develop` (front PR #226, back PR #159), réalisée avant merge vers `main`. Instance Docker isolée montée pour validation visuelle (ports 8090/3010/5442).

## Objectif

Corriger l'ensemble des points relevés par l'audit avant tout merge vers `main` : 5 bloquants (dont 1 faille sécurité HAUTE), la dette du design system bas niveau, l'élévation UI/UX du palmarès, et les dettes mineures back/front.

## Suivi

| US | Sévérité | Domaine | Claude | PO | E2E | Livré |
|----|----------|---------|--------|----|----|-------|
| [us-secu-fuite-articles-brouillons](us-secu-fuite-articles-brouillons.md) | 🔴 Bloquant (Sécu HAUTE) | Backend | Fait | A faire | Différé | A faire |
| [us-fix-e2e-palmares-selectors](us-fix-e2e-palmares-selectors.md) | 🔴 Bloquant | Frontend | Fait | A faire | Différé | A faire |
| [us-fix-match-strip-scores-partiels](us-fix-match-strip-scores-partiels.md) | 🔴 Bloquant | Frontend | Fait | A faire | Différé | A faire |
| [us-fix-palmares-error-handling](us-fix-palmares-error-handling.md) | 🔴 Bloquant | Frontend | Fait | A faire | Différé | A faire |
| [us-schema-match-cascade](us-schema-match-cascade.md) | 🔴 Bloquant | Backend/BDD | Fait (option a) | A faire | Différé | A faire |
| [us-design-system-tokens](us-design-system-tokens.md) | 🟠 Majeur | UI/UX | Fait | A faire | Différé | A faire |
| [us-elevation-uiux-palmares](us-elevation-uiux-palmares.md) | 🟡 Amélioration | UI/UX | Fait | A faire | Différé | A faire |
| [us-dettes-mineures-backend](us-dettes-mineures-backend.md) | 🟢 Mineur | Backend | Fait | A faire | Différé | A faire |
| [us-dettes-mineures-frontend](us-dettes-mineures-frontend.md) | 🟢 Mineur | Frontend | Fait | A faire | Différé | A faire |

> **Livraison (2026-07-22)** — les 9 US sont `Fait` (Claude), poussées vers `develop` via 2 MR :
> - Backend → [website_backend#163](https://github.com/teamdivergentes/website_backend/pull/163) — 844 tests verts.
> - Frontend → [website_frontend#232](https://github.com/teamdivergentes/website_frontend/pull/232) — 1370 tests verts.
>
> **Reste à faire (hors session)** :
> - ~~Appliquer/vérifier la migration `20260722120000_match_team_setnull_snapshot`~~ → **fait** (2026-07-26), et complétée par une migration de backfill, cf. ci-dessous.
> - ~~E2E Playwright différés~~ → **fait** (2026-07-27), exécutés contre l'instance Docker isolée.
> - ~~Screenshots « après » du nouveau design~~ → **fait** (2026-07-26).
> - Décisions **PO** : option (a) du schéma Match validée par défaut ; permissions rôle Gestionnaire ; recette métier (colonne PO).
> - Enabler séparé à créer : « Journalisation des actions sensibles » (audit-trail delete, SEC-EPIC37-03).

---

## Livraison sur `develop` (2026-07-27)

Les deux MR sont **mergées** après rebase sur `develop` et CI verte de bout en bout :

- Backend → [website_backend#163](https://github.com/teamdivergentes/website_backend/pull/163), merge `c9eeb71` — 901/901 tests.
- Frontend → [website_frontend#232](https://github.com/teamdivergentes/website_frontend/pull/232), merge `1b3a099` — 1433/1433 tests, 9/9 E2E publics.

La branche a également absorbé la **refonte des bandeaux matchs et le bloc palmarès d'équipe** décidée en cours de recette (voir la section suivante).

### Ce que la recette a fait remonter

| Constat | Suite donnée |
|---------|--------------|
| La migration `match_team_setnull_snapshot` ajoutait `teamNameSnapshot` **sans backfill** : tout match antérieur restait à `NULL` et perdait le nom de son équipe à la suppression de celle-ci — l'objectif même de l'US B5 | Nouvelle migration `20260726120000_backfill_match_team_name_snapshot` (l'originale reste immuable), vérifiée en remettant 6 matchs à `NULL` puis en rejouant `migrate deploy` |
| **Trois tests E2E étaient silencieusement verts** : sélecteurs disparus + `catch` avalant l'échec, ou assertion évaluée avant résolution du fetch | Corrigés ; ils jugent désormais sur la réponse API réelle et échouent franchement. Falsifiabilité prouvée en cassant volontairement le rendu |
| Les tests E2E publics **ne pouvaient pas passer en CI** : le seed ne crée ni équipe, ni match, ni trophée | Seed backend enrichi (2 équipes, 5 trophées, 4 matchs), date du match à venir calculée relativement à `new Date()` pour ne pas périmer |
| Le bandeau matchs **touchait les bords de l'écran** sous 900 px (`.match-container` sans les gouttières des autres conteneurs) | Corrigé, `box-sizing: border-box` explicite pour préserver le plafond |
| Les runs E2E **laissent des résidus en base** (`e2e-%`) : le test de nettoyage fait partie des skips en cascade | **Non corrigé** — purge manuelle de la recette. À traiter séparément |
| `palmares.scss` utilise `[aria-label='1re place']` **comme sélecteur CSS** : l'attribut d'accessibilité est devenu un hook de style, impossible à corriger sans toucher au CSS | **Non corrigé** — dette isolée à la page palmarès. `team-honours` a pris le parti inverse (classe dérivée du placement) |

> **Production non concernée** : `main` est inchangé. Le passage en prod dépend des PR `develop → main` (frontend #227, backend #160).

## Ordre de traitement

```
1. us-secu-fuite-articles-brouillons   (B1 — priorité absolue)
2. us-schema-match-cascade + dettes back (B5 + mineurs, même worktree back)
3. us-fix-* frontend (B2/B3/B4 + dettes front, worktree front)
4. us-design-system-tokens → us-elevation-uiux-palmares (séquentiel, après fixes front)
```

Backend et Frontend sont parallélisables (repos distincts). Le design suit les fixes fonctionnels front (même worktree).

# EPIC-37 — Palmarès & Matchs

**Statut** : PLANIFIE
**Priorité** : Moyenne
**Branches** : `feat/epic-37-palmares` / `feat/epic-37-matchs` (par feature)
**Spec design** : `docs/superpowers/specs/2026-06-03-palmares-matchs-design.md`

## Objectif

Donner aux fans la visibilité sur les résultats de la structure : un palmarès global vivant (« les meilleurs » en avant) décliné subtilement par équipe, et l'agenda des matchs (à venir + résultats passés) géré par les CM dans l'admin.

Besoin exprimé par l'équipe (Discord 2026-05-29, Choko + Vilvi), cadré et validé par le PO le 2026-06-03.

## Périmètre

- Réactivation du slot menu d'origine `/structure/palmares` (jamais implémenté depuis la création du site)
- 2 nouveaux modèles Prisma : `Trophy` + `Match` (pas de machine à états, statut match dérivé)
- Page publique palmarès layout **A2** : accroche éditoriale + rail horizontal scroll-snap des trophées « à la une » + historique par année
- Bandeau compact sur la home : prochain match + 2 derniers résultats
- Page équipe : badges palmarès + bloc matchs de l'équipe
- Admin CRUD (rôles Admin + CM, permissions `trophies:*` / `matches:*` (read/write/delete) via PermissionsGuard)
- Toggle de visibilité `page_palmares_visible`

**Hors scope** : onglet racine « Évènements », sources externes (Toornament…), JSON-LD, stats agrégées.

## Suivi

| Élément | Claude | PO | E2E | Livré |
|---------|--------|----|----|-------|
| [ENABLER — Modèles de données](ENABLERS/data-models/README.md) | Fait | A faire | A faire | A faire |
| [FEATURE — Palmarès](FEATURES/palmares/README.md) | Fait | A faire | A faire | A faire |
| [FEATURE — Matchs](FEATURES/matchs/README.md) | Fait | A faire | A faire | A faire |
| [ENABLER — Corrections d'audit](ENABLERS/audit-corrections/README.md) | Fait | A faire | Fait | Fait (`develop`) |
| ENABLER — Refonte des bandeaux matchs + bloc palmarès d'équipe | Fait | A faire | Fait | Fait (`develop`) |

> **Audit pré-merge (2026-07-22)** : revue croisée Backend/Frontend/Red Team + audit design. 5 bloquants (dont 1 sécu HAUTE), dette design system, élévation UI/UX, dettes mineures — tout tracé dans l'ENABLER « Corrections d'audit ». Merge vers `main` conditionné à la résolution des bloquants.
>
> **Livré sur `develop` (2026-07-27)** : backend `c9eeb71` (PR #163), frontend `1b3a099` (PR #232). CI verte sur les deux, SonarQube inclus. Reste la recette PO (colonne PO) et le passage en production via les PR `develop → main` (#227 / #160).
>
> **Refonte des bandeaux matchs (2026-07-26/27)** : le PO n'était pas convaincu du rendu. Quatre arbitrages validés sur maquette — traitement immersif, largeur plafonnée à 900 px, repli sur le dernier résultat daté quand aucun match n'est programmé, et deux blocs jumeaux sur la page équipe (palmarès doré au-dessus, matchs vert en dessous). Spec et plan : `frontend/docs/superpowers/{specs,plans}/2026-07-26-bandeaux-matchs-palmares-equipe*`.
>
> ⚠️ **Question de fond restée ouverte** : afficher les matchs suppose ~20 saisies manuelles par mois pour 5 équipes, sans source externe (hors scope de l'EPIC). Le design réduit l'exposition et rend l'obsolescence visible (date en clair sur le repli, dates en infobulle des pastilles), mais **aucun responsable de saisie n'est désigné**. C'est ce qui déterminera si le bandeau vieillit bien.

## Dépendances et ordre

```
ENABLER data-models  →  FEATURE palmarès  ┐
                     →  FEATURE matchs    ┴─ parallélisables après l'enabler
```

Experts mobilisés : `database` → `backend-node` → `frontend-angular` + `ui-ux` (+ `seo-expert` pour sitemap/meta, `security` en review des nouveaux endpoints).

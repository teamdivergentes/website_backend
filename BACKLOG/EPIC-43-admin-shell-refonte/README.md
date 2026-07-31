# EPIC-43 — Refonte du shell admin

## Objectif

Rendre la navigation du panel admin lisible et durable. La sidebar affiche ses entrees a plat, sans
hierarchie ; la recherche visuelle est lineaire et la liste grossit a chaque EPIC. On reorganise la
navigation en groupes semantiques, on corrige les bugs d'accessibilite constates, et on reoriente le
dashboard d'accueil vers "ou j'en etais" plutot que "ou puis-je aller".

## Perimetre de reference : `develop`

La branche est desormais rebasee sur `develop`, ou EPIC-37 et le chantier boutique sont **mergés**.
Le registre porte ses **16 entrees** definitives.

| Perimetre | Entrees | Statut |
|-----------|---------|--------|
| `main` au moment du cadrage | 12 | historique |
| + Matchs, Palmares | 14 | merge (EPIC-37) |
| + Boutique, Commandes | 16 | merge (PR #251) |

Repartition par role sur `main` : Admin **12**, Gestionnaire **8**, CM **2**. Le CM est le cas
degenere a traiter en priorite — avec 2 entrees, aucun en-tete de groupe ne doit etre rendu.

## Spec de design

`frontend/docs/superpowers/specs/2026-07-29-admin-shell-refonte-design.md` (commit `ff83dec`)

Design valide par le PO le 2026-07-29 apres brainstorming et consultation d'un expert UX/UI.

## Perimetre

- **Sidebar** : groupes semantiques (Competition / Contenu / **Boutique** / Structure /
  Administration) plus une zone epinglee (Dashboard, Statistiques). Le groupe Boutique reste
  invisible tant que la branche boutique n'est pas mergee — la regle de degradation fait qu'un
  groupe sans item ne rend rien. Pattern a en-tetes non cliquables : tout reste visible, aucun etat
  a persister.
- **Libelles** : Utilisateurs -> Comptes, Configuration -> Parametres, Twitch -> Live Twitch,
  Analytics -> Statistiques, plus les accents manquants sur Roles et Equipes.
- **Fil d'Ariane** : derive de `ADMIN_SHORTCUTS` au lieu d'un mapping code en dur desynchronise.
- **Palette de commandes** : overlay Cmd+K, destinations et actions de creation, index derive des
  permissions.
- **Dashboard** : la grille des 14 liens rapides est remplacee par deux blocs "Reprendre" et
  "A faire" derives de l'etat reel de la base.
- **Accessibilite** : 16 correctifs, dont 3 bugs fonctionnels averes.

## Hors perimetre

- Les 14 pages CRUD (`src/app/admin/pages/*`) — inchangees.
- Le modele de permissions backend — deja en place.
- Un referentiel `Competition`/`Season` (necessaire a l'alerte "palmares manquant") — reporte.
- Epingles / recents personnalisables dans la sidebar — a reconsiderer apres retour d'usage sur la
  palette Cmd+K.

## Bugs fonctionnels embarques

| # | Bug | Impact |
|---|-----|--------|
| 1 | Le drawer mobile ferme reste dans le parcours de tabulation | `Tab` envoie l'utilisateur dans 14 liens invisibles hors ecran |
| 2 | `.sidebar.collapsed` n'a aucun override sous 768px | Replier en desktop puis passer en mobile donne un drawer de 80px inutilisable |
| 3 | `routeTitles` du header code en dur et desynchronise | Le fil d'Ariane affiche "Admin" sur twitch-channels, trophies et matches |

## Branches git — deux depots

`frontend/` et `backend/` sont des depots git **independants** (pas de sous-modules). `WEB/` n'est
pas versionne, donc ce backlog ne l'est pas non plus.

| Depot | Branche | Lots | Statut |
|-------|---------|------|--------|
| `frontend` | `feat/admin-shell-refonte` | 1-5, 7 | **Merge sur `develop` le 2026-07-31** — PR [#252](https://github.com/teamdivergentes/website_frontend/pull/252) |
| `backend` | `feat/articles-server-sort` | 6 | **Merge sur `develop` le 2026-07-31** — PR [#181](https://github.com/teamdivergentes/website_backend/pull/181) |

Le lot 6 a bien voyage sur la branche backend du tri serveur plutot que sur une branche dediee : les
deux changements partaient ensemble et n'avaient pas de raison d'etre separes.

Le lot 6 a sa propre PR et ne peut pas etre commite avec les lots frontend. Le contrat d'API
(spec §4.6) doit etre fige avant de demarrer, pour permettre de paralleliser les lots 6 et 7 plutot
que de les enchainer.

## Coordination avec le chantier boutique — resolue

Le merge a eu lieu en deux temps (Matchs/Palmares/Commandes, puis Boutique). Dans les deux cas,
**git a auto-merge sans conflit** en laissant `section: 'content'`, une valeur que le type ne porte
plus : le conflit attendu ne s'est pas manifeste comme un conflit git mais comme une erreur de
typage. Les trois entrees ont ete arbitrees a la main — Matchs et Palmares en `esport`, Boutique et
Commandes en `boutique`, catalogue avant commandes.

Lecon retenue : un renommage de type ne produit pas forcement un conflit git. Le compilateur reste
le garde-fou, pas le merge.

Decision PO : groupe **BOUTIQUE** dedie plutot que fusion dans CONTENU. Une commande est
transactionnelle, ce n'est pas du contenu editorial, et les fusionner recreerait le fourre-tout que
le redecoupage supprime. Le groupe est aussi atomique en permissions.

Cout assume : 16 entrees et 5 en-tetes portent la sidebar a 879px, au-dessus de la cible de 850px —
un Admin scrollera legerement en 1080p. Le seuil d'alerte de 18 lignes est desormais franchi (21) :
a la prochaine paire d'entrees, reexaminer le pattern plutot que continuer a empiler.

## Suivi par feature

| Feature | Claude | PO | E2E | Livre |
|---------|--------|----|----|-------|
| [Navigation admin](FEATURES/admin-navigation/README.md) | Fait (2026-07-31) | A faire | A faire | A faire |
| [Palette de commandes](FEATURES/admin-command-palette/README.md) | Fait (2026-07-31) | A faire | A faire | A faire |
| [Dashboard reprises en cours](FEATURES/admin-dashboard-reprises/README.md) | Fait (2026-07-31) | A faire | A faire | A faire |

## Ordre d'execution

Les lots 1 et 6 sont parallelisables d'entree. Les lots 4 et 5 ne dependent que du lot 1 et peuvent
avancer pendant les lots 2-3.

```
lot 1 (sections/libelles) ─┬─ lot 2 (sidebar groupes) ── lot 3 (a11y)
                           ├─ lot 4 (fil d'Ariane)
                           └─ lot 5 (palette Cmd+K)

lot 6 (endpoints backend) ─── lot 7 (blocs dashboard)
```

## Criteres de validation EPIC

- La sidebar affiche les groupes ordonnes selon `SECTION_ORDER` (4 sur `main`, 5 apres le merge
  boutique), plus une zone epinglee sans en-tete.
- Un groupe vide ne rend rien ; un groupe a 1 item rend l'item sans en-tete.
- Aucune permission n'est codee en dur dans un template : tout derive de `availableShortcuts()`.
- Le fil d'Ariane est correct sur les 14 routes admin.
- La palette Cmd+K n'expose jamais une destination hors permissions.
- Les 3 bugs fonctionnels ont chacun un test de regression.
- Aucune regression sur les modes replie et mobile.
- Tests unitaires pour 4 roles, matrice E2E pour 3 roles.
- VQO >= 9.5/10 sur tous les domaines.

## Lien avec l'EPIC-28

L'EPIC-28 excluait explicitement la "refonte visuelle complete du panel admin -> autre EPIC si
besoin". Cet EPIC est cet autre EPIC.

- `EPIC-28/FEATURES/admin-navbar-reorg/us-audit-and-brainstorm-navbar.md` — **satisfaite** par le
  spec de design (audit ecrit des 14 entrees, 4 patterns compares, option retenue documentee,
  maquettes ASCII, validation PO).
- `EPIC-28/FEATURES/admin-navbar-reorg/us-implement-navbar-reorg.md` — **absorbee** par les lots 1
  a 3 de cet EPIC.
- `EPIC-28` US #629 (matrice E2E permissions x raccourcis) — **couverte** par les tests E2E de la
  feature Navigation admin.

L'infrastructure posee par l'EPIC-28 Feature 1 (registre `ADMIN_SHORTCUTS`, service
`AdminShortcutsService` avec `shortcutsBySection()`) est le socle de cet EPIC. `shortcutsBySection()`
etait implemente et teste mais consomme par personne : le champ `section` a ete prevu exactement
pour ce chantier.

## Livraison (2026-07-31)

Les sept lots sont livres et mergés sur `develop`. Le deploiement preprod suit.

**Verifications** : 1880 tests frontend, 1064 tests backend, lint `--max-warnings=0` propre sur les
deux depots, builds OK, **quality gate SonarQube au vert**.

### Deux enseignements de la CI

Le gate a d'abord echoue sur les deux depots, sur la seule condition `new_violations` (seuil 0) —
couverture, duplication et notes de fiabilite passaient toutes.

**Backend, une seule violation** : SonarQube lisait le mot `todo` d'un commentaire francais comme un
marqueur TODO a traiter (`typescript:S1135`). L'endpoint s'appelle pourtant `/todo`. A retenir pour
tout commentaire francais du projet.

**Frontend, treize violations** dont la plus structurante : `<app-form-actions>` exposait des sorties
nommees `cancel` et `submit`, soit des noms d'evenements DOM standards avec lesquels elles entrent en
collision (`typescript:S7651`). Renommees `cancelled` / `submitted` dans les quinze points d'appel.

### Reste a faire

- Tests E2E (Docker requis) : ouverture de la palette au raccourci, fil d'Ariane sur
  `/admin/matches`, alignement de l'en-tete sous 599px, matrice permissions x roles.
- Verification visuelle des pages en desktop et sous 599px.
- Recette PO depuis la preprod.

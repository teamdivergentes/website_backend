# Feature — Regle dialogue vs page routee

## Objectif

Inscrire une regle de decision explicite, puis migrer les 7 formulaires qui ne la respectent pas.

## Contexte

L'audit a releve **4 patterns coexistants sans aucune justification ecrite** : dialogue simple, page
routee, formulaire inline plein ecran, et dialogue hybride liste + formulaire.

Le critere implicite actuel est "est-ce que ca tenait dans une modale quand je l'ai ecrit", pas la
complexite reelle. Symptomes :

- `recruitment-form-dialog` fait **920px de large, 373 lignes, 11 champs**, avec scroll interne
  (`max-height: 72vh`). C'est une page deguisee en dialogue : en remplissant un champ long, on perd
  de vue le bouton Enregistrer.
- `teams` ouvre un dialogue de **1200px** en `grid-template-columns: 1fr 1.2fr` — une mise en page a
  deux colonnes dans une modale.
- Inversement, `article-editor` est une page routee pour 4 champs de metadonnees. Son formulaire est
  **plus simple** que celui de `recruitment`, qui est en dialogue.

## Regle retenue

> Un formulaire d'administration passe en **dialogue** si et seulement si les trois conditions sont
> reunies :
> 1. **8 controles maximum** (un upload d'image compte pour 1) ;
> 2. **aucun sous-editeur** (Editor.js, WYSIWYG, editeur de code, table editable) ;
> 3. **aucune liste enfant geree dans le meme ecran** (pas de CRUD imbrique).
>
> Si **une seule** condition est violee -> **page routee** `/admin/<module>/new` et
> `/admin/<module>/edit/:id`.
>
> **Tailles** : `sm` 440px (3 champs max), `md` 600px (4 a 8 champs). **Tout dialogue au-dela de
> 600px est le signal qu'il aurait du etre une page.**
>
> **Un dialogue ne contient jamais un second dialogue.**

A inscrire dans `frontend/CLAUDE.md`.

## Application a l'existant

| Module | Aujourd'hui | Verdict | Motif |
|--------|-------------|---------|-------|
| games (4 champs) | dialogue 500px | reste dialogue | conforme |
| users / password / role | dialogues 500/350/400px | restent dialogues | conforme |
| staff (4 champs) | dialogue 600px | reste dialogue | conforme |
| sponsors/form (6 champs) | dialogue 600px | reste dialogue | conforme |
| twitch (7 champs) | dialogue 600px | reste dialogue | conforme, a la limite |
| teams/form (6 champs) | dialogue 600px | reste dialogue | conforme |
| articles/editor | page routee | reste page | viole 2 (Editor.js) |
| config | page inline | reste page | 25 controles |
| **articles/categories** | dialogue dans dialogue | **de-imbriquer** -> page `/admin/articles/categories` | viole "pas de dialogue dans un dialogue" |
| **recruitment** (11 champs) | dialogue 920px | **-> page routee** | viole 1 |
| **roles** (1 champ + matrice de permissions) | dialogue 700px | **-> page routee** | viole 1 et 3 |
| **teams/membres** (11 champs + liste + drag) | dialogue 1200px | **-> page** `/admin/teams/:id/members` | viole 1 et 3 |
| **teams/coaching** (13 champs + liste + drag) | dialogue 1000px | **-> page** `/admin/teams/:id/coaching` | viole 1 et 3 |
| **sponsors/images** (liste + 3 uploads) | dialogue 800px | **-> page** | viole 3 |
| **sponsors/liens** (liste + form) | dialogue 700px | **-> page** | viole 3 |

**7 formulaires migrent.** Tous les dialogues hybrides liste + formulaire disparaissent — c'est le
pattern qui genere a lui seul les 5 boutons "Fermer" au lieu d'"Annuler", les 2
`markAllAsTouched()` manquants et les 4 conditions `touched` absentes.

## Benefice secondaire

Une page routee est adressable (`/admin/teams/3/members` partageable en support), navigable au
clavier sans piege de focus, et compatible avec le retour arriere du navigateur. Aucun des 6 gros
dialogues actuels n'offre ces trois proprietes.

## Risque

**C'est la feature la plus risquee de l'EPIC** : elle modifie des parcours que le PO connait et
utilise. Chaque migration doit avoir son test E2E de non-regression avant d'etre consideree comme
livree.

## Ordre suggere

1. `recruitment` — le plus simple, pas de liste enfant.
2. `teams/membres` — le plus rentable : 1200px, 209 + 145 lignes.
3. `teams/coaching`, `roles`, `sponsors/images`, `sponsors/liens`, `articles/categories`.

## Suivi par US

Les US seront redigees a l'ouverture de cette feature, une migration par US.

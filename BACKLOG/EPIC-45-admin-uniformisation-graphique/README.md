# EPIC-45 — Uniformisation graphique du panel d'administration

## Objectif

Donner au panel admin le socle graphique que les pages publiques ont deja : une palette nommee, une
echelle typographique, une echelle d'espacement, un jeu de rayons. Aujourd'hui chaque page redecide
ses valeurs, et le panel accumule des variantes que personne n'a choisies.

## Origine

L'EPIC-41 a uniformise le **comportement** transverse des pages admin. Sa ligne rouge etait
explicite : *« uniformiser le comportement transverse, jamais le rendu specifique »*. Le rendu etait
donc volontairement laisse de cote. Le PO l'a demande le 2026-07-31, apres la mise en recette de
l'EPIC-43.

## Audit du 2026-07-31

Mesure sur `src/app/admin/` — **104 fichiers** `.scss` et `.ts` porteurs de style.

### Le constat structurant

`DESIGN_SYSTEM.md` fait 870 lignes et s'intitule **« Design System DVG — Pages Publiques »**. Le
panel admin n'a aucun document equivalent, et n'utilise pas les tokens que ce document decrit
pourtant comme la source unique.

| Mesure | Valeur |
|--------|--------|
| Occurrences de couleur codee en dur | **525** |
| Valeurs de couleur distinctes | **124** |
| Occurrences de `var(--token)` | 285 |
| Taux d'adoption des tokens | **~35 %** |

C'est le meme motif structurel que sur le site public : la couche partagee existe mais n'est pas
atteinte. Sur l'admin, la cause n'etait pas un probleme de specificite CSS (corrige par l'EPIC-41)
mais l'absence pure et simple de reference documentee.

### Les valeurs en dur, par famille

| Famille | Occurrences | A remplacer par |
|---------|-------------|-----------------|
| Vert DVG (`#32D299`, `#32d299`, `rgba(50,210,153,…)`) | 129 | `--green` + alphas nommes |
| Gris (`#999`, `#9e9e9e`, `rgba(211,211,211,…)` × 6 alphas) | 135 | `--gray`, `--text-muted`, `--text-dim` |
| Vert sombre (`#28413b`, `#28413B`, `rgba(40,65,59,…)`) | 68 | `--darkGreen` |
| Blanc | 61 | `--white` |
| Rouge d'erreur | 38 | `--status-error` (a creer) |
| Noir / fonds | 17 | `--background`, `--lightBlack` |
| **Hors famille de marque** | **65** (37 valeurs) | a arbitrer |

Le meme vert de marque est ecrit **`#32D299` 53 fois et `#32d299` 7 fois** : deux graphies pour une
seule couleur, qu'aucune recherche ne trouve ensemble.

### Cinq rouges pour un seul role

`#f44336`, `#ef5350`, `#ef4444`, `#e05c5c`, `#ff6b6b`, `#ff8a80` cohabitent pour dire « erreur » ou
« danger ». Aucun n'est nomme. C'est le defaut le plus visible de la queue hors marque.

### Les echelles

| Dimension | Valeurs distinctes | Cible |
|-----------|--------------------|-------|
| `border-radius` | **18** (de 2px a 20px) | 4 (`--radius-sm` a `--radius-xl`, deja declares) |
| `font-size` | **28** | ~6 rangs |
| `padding` | **72** | echelle 4 / 8 / 12 / 16 / 24 / 32 |
| `gap` | **21** | meme echelle |

Trois tailles de police quasi identiques coexistent : **`0.8rem`, `0.8125rem`, `0.85rem`** — soit
12,8px, 13px et 13,6px. Aucun oeil ne les distingue, mais elles rendent toute reprise ambigue.

Les rayons tokenises `--radius-*` sont declares et documentes comme « source unique » : le panel
admin les utilise **deux fois**, sur 18 valeurs.

### Ce que l'audit a releve mais que cet EPIC ne traite pas

Ces constats sont reels et documentes ici pour ne pas etre reperdus, mais **hors perimetre** par
decision PO du 2026-07-31 :

- **Deux systemes de boutons** : Material (105 occurrences, 29 fichiers) et une classe maison `.btn`
  (14 occurrences, 6 fichiers). Un fichier melange les deux (`date-range-picker`).
- **Trois paradigmes de liste** : `mat-table` (Articles, Roles, Comptes), tableau ecrit a la main
  (Matchs, Palmares, Twitch, Statistiques, Boutique), grille de cartes (Staff, Sponsors, Jeux,
  Equipes, Recrutement).

Le choix du paradigme de liste sera tranche par le PO **sur captures comparatives**, pas sur
description. Il ne bloque ni les tokens ni les echelles.

## Perimetre retenu

Decision PO du 2026-07-31 : **tokens + echelles**, sans reecriture de composant.

- Socle de tokens admin, documente.
- Migration des 525 valeurs en dur vers ces tokens.
- Reduction des quatre echelles aux valeurs cibles.

Consequence assumee : **quelques pixels d'ecart ici et la**. Aucune page ne change de forme, aucun
composant n'est reecrit.

## Hors perimetre

- Unification des systemes de boutons.
- Unification des paradigmes de liste.
- Migration dialogue -> page (EPIC-41 feature 3).
- Le site public (EPIC-42).

## Branches git

Chantier decoupe en **PR empilees**, chacune verifiable seule :

| PR | Contenu | Base |
|----|---------|------|
| 1 | Socle de tokens + `ADMIN_DESIGN_SYSTEM.md` | `develop` |
| 2 | Couleurs -> tokens | PR 1 |
| 3 | Rayons, tailles, espacements -> echelles | PR 2 |

La PR 1 n'a **aucun effet visible** : elle ajoute des declarations sans changer un rendu. C'est ce
qui permet de la relire vite et de la merger sans recette.

## Suivi par feature

| Feature | Claude | PO | E2E | Livre |
|---------|--------|----|----|-------|
| [Socle de tokens](FEATURES/admin-tokens-socle/README.md) | A faire | A faire | A faire | A faire |
| [Echelles typographiques et d'espacement](FEATURES/admin-echelles/README.md) | A faire | A faire | A faire | A faire |

## Criteres de validation EPIC

- Aucune couleur de marque codee en dur dans `src/app/admin/` — un test ou une regle de lint le
  verrouille, sans quoi la derive reprend au premier ajout de page.
- Les quatre echelles sont respectees ; toute valeur hors echelle est justifiee en commentaire.
- `ADMIN_DESIGN_SYSTEM.md` existe et est le pendant de `DESIGN_SYSTEM.md` pour le panel.
- Aucune regression visuelle : comparaison de captures avant / apres sur les 14 pages routees.
- Tests unitaires et lint au vert, quality gate SonarQube passant.

## Note de methode

L'audit du 2026-07-29 (EPIC-41) avait deja mesure ces ecarts sans les traiter. Les chiffres de cet
EPIC ont ete **remesures le 2026-07-31 sur `develop`**, apres les merges de l'EPIC-43 et du chantier
boutique : ceux de l'EPIC-41 ne valaient plus, la boutique ayant ajoute des pages admin entre-temps.

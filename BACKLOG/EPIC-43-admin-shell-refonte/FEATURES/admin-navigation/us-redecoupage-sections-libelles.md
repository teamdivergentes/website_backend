# US — Redecoupage des sections, libelles et icones (lot 1)

## Role / Action / Benefice

> **En tant que** developpeur,
> **je veux** que le registre `ADMIN_SHORTCUTS` porte le decoupage semantique valide, les bons
> libelles et les bonnes icones,
> **afin de** disposer d'une source de verite unique sur laquelle la sidebar, le fil d'Ariane et la
> palette pourront s'appuyer sans divergence.

## Criteres d'acceptation

- [ ] Le type devient
      `AdminShortcutSection = 'esport' | 'contenu' | 'boutique' | 'structure' | 'admin'` ;
      `section: undefined` designe la zone epinglee.
- [ ] Les 14 raccourcis portent la section validee :
      - zone epinglee : Dashboard, Statistiques
      - `esport` : Equipes, Jeux, Matchs, Palmares
      - `contenu` : Articles, Live Twitch, Sponsors
      - `structure` : Staff, Recrutement
      - `admin` : Comptes, Roles, Parametres
- [ ] `'boutique'` est declare dans le type, `SECTION_ORDER` et `SECTION_LABELS` bien qu'aucune
      entree ne le porte encore sur `main`. La regle de degradation fait qu'un groupe sans item ne
      rend rien : le groupe reste invisible jusqu'au merge de la branche boutique, sans code mort
      ni condition speciale.
- [ ] Test unitaire : le groupe `boutique`, declare mais vide, ne rend rien.
- [ ] Deux nouveaux exports : `SECTION_ORDER` (ordre d'affichage des groupes) et `SECTION_LABELS`
      (libelles affiches).
- [ ] Renommages appliques : Utilisateurs -> Comptes, Configuration -> Parametres,
      Twitch -> Live Twitch, Analytics -> Statistiques.
- [ ] Accents corriges : `'Roles'` -> `'Roles'` (avec o circonflexe), `'Equipes'` -> `'Equipes'`
      (avec E accent aigu).
- [ ] Icones corrigees dans `FA_ICON_MAP` et dans le champ `icon` du registre :

  | Entree | FA actuel | FA nouveau | Material actuel | Material nouveau |
  |--------|-----------|------------|-----------------|------------------|
  | Dashboard | `faHome` | `faGaugeHigh` | `dashboard` | `speed` |
  | Comptes | `faUsers` | `faIdBadge` | `group` | `badge` |
  | Equipes | `faGamepad` | `faUsers` | `sports_esports` | `groups` |
  | Jeux | `faDice` | `faGamepad` | `casino` | `sports_esports` |
  | Live Twitch | `faTv` | `faTowerBroadcast` | `live_tv` | `live_tv` |

- [ ] Tests unitaires : chaque raccourci a une `section` valide ou `undefined` ; `SECTION_ORDER`
      couvre toutes les valeurs du type ; `SECTION_LABELS` est exhaustif.
- [ ] Aucune regression : la sidebar continue de fonctionner a plat tant que le lot 2 n'est pas
      livre.

## Notes

Les icones Equipes et Jeux sont actuellement **interverties** : Equipes a une manette
(`faGamepad`), Jeux a un de de casino (`faDice`). Invisible en mode deploye ou le libelle compense,
bloquant en mode replie ou l'icone est le seul signifiant.

## Coordination avec le chantier boutique

La branche `feat/boutique-collection-2026` ajoute deux entrees rangees en `section: 'content'`,
valeur que cette US supprime du type. **Le conflit TypeScript au merge est attendu et voulu** : il
force un arbitrage conscient plutot qu'un rangement silencieux dans un groupe qui n'existe plus.

Resolution : passer les deux entrees en `section: 'boutique'`.

Aucune dependance forte d'ordre. Si la boutique arrive en premier, ce lot range directement les deux
entrees. Si l'EPIC-43 arrive en premier, la branche boutique corrige ses deux `section` au rebase.

## Livraison Claude (2026-07-29)

Branche `feat/admin-shell-refonte` (worktree), 3 commits :

| Commit | Contenu |
|--------|---------|
| `639280b` | Redecoupage des sections, `SECTION_ORDER`, `SECTION_LABELS`, renommages, accents, icones Material |
| `c303cd6` | Icones FontAwesome de la sidebar + premiere spec du composant |
| `4985ad9` | Alignement des specs service et dashboard-stats |

**Verifications** : 1241 tests OK (+32), lint `--max-warnings=0` propre, `ng build` OK.

### Correction de perimetre en cours de route

L'audit initial comptait **14 entrees** car il avait lu l'arbre de travail du checkout principal,
qui est sur `feat/boutique-collection-2026` et donc en avance sur `main`. **`main` n'a que 12
entrees** : Matchs et Palmares appartiennent a EPIC-37, non mergee — ni leurs routes ni leurs
composants n'existent.

Les ajouter au registre aurait cree deux entrees de navigation pointant vers des 404. Elles sont
donc retirees du registre livre et rejoindront le groupe `esport` au merge d'EPIC-37, exactement
comme Boutique et Commandes rejoindront le groupe `boutique`.

Consequence sur les roles, recalculee depuis `seed.ts` : Admin **12**, Gestionnaire **8**, CM **2**
(et non 4). Le CM devient le cas degenere le plus dur du lot 2 : avec 2 entrees, **aucun en-tete de
groupe ne doit etre rendu**.

Un test verrouille l'invariant : aucune entree du registre ne pointe vers une route inexistante.

### Ecart au spec

Le spec assignait l'icone Material `badge` a Comptes, alors que Staff l'utilise deja. Comptes prend
`manage_accounts`. Un test verifie qu'aucune icone n'est utilisee deux fois.

## Suivi

| Volet | Claude | PO | E2E | Livre |
|-------|--------|----|----|-------|
| Frontend | Fait (2026-07-29) | A faire | A faire | A faire |

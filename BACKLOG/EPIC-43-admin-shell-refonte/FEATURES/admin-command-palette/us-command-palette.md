# US — Palette de commandes Cmd+K (lot 5)

## Role / Action / Benefice

> **En tant qu'**utilisateur admin regulier,
> **je veux** atteindre n'importe quelle page ou action en tapant trois lettres,
> **afin de** ne plus dependre du parcours visuel de la sidebar, surtout quand elle est repliee.

## Criteres d'acceptation

- [ ] Overlay CDK, ouvert par `Cmd+K` (macOS) ou `Ctrl+K`, ou par le champ de recherche du header.
- [ ] Index derive de `availableShortcuts()` -> **immunise aux permissions par construction**,
      aucune destination interdite ne peut apparaitre. Aucun filtrage supplementaire n'est ecrit ni
      teste.
- [ ] Deux categories :
      - **Aller a** — les 14 destinations
      - **Actions** — creation : nouvel article, nouveau match, nouveau trophee, nouveau sponsor,
        nouvelle offre. Chaque action n'apparait que si la permission `:write` correspondante est
        presente.
- [ ] Clavier : `⇅` navigation, `↵` ouverture, `Esc` fermeture. Piege de focus actif ; a la
      fermeture, le focus retourne a l'element declencheur.
- [ ] Le raccourci est decouvrable : hint `⌘K` visible dans le champ de recherche du header.
- [ ] Le raccourci ne se declenche pas quand le focus est dans un champ de saisie d'un formulaire
      admin.
- [ ] Etat vide : si la recherche ne retourne rien, message explicite plutot qu'un overlay vide.
- [ ] Tests unitaires : l'index ne contient jamais de destination hors `availableShortcuts()` ;
      navigation clavier `⇅`/`↵`/`Esc` ; focus restaure a la fermeture.
- [ ] Test E2E : ouverture au raccourci, filtrage, `↵` navigue vers la bonne route, `Esc` ferme et
      restaure le focus.

## Maquette

```
┌──────────────────────────────────┐
│  ⌕  art▌                         │
├──────────────────────────────────┤
│  ALLER A                         │
│  ▤  Articles                   ↵ │
│  ⛨  Sponsors                     │
│                                  │
│  ACTIONS                         │
│  ＋  Nouvel article              │
│  ＋  Nouveau sponsor             │
├──────────────────────────────────┤
│  ⇅ naviguer  ↵ ouvrir  esc fermer│
└──────────────────────────────────┘
```

## Suivi

| Volet | Claude | PO | E2E | Livre |
|-------|--------|----|----|-------|
| Frontend | Fait (2026-07-31) | A faire | A faire | A faire |
| UI/UX | Fait (2026-07-31) | A faire | A faire | A faire |

## Livraison Claude (2026-07-31)

Overlay `MatDialog` ouvert par Cmd+K / Ctrl+K ou par le bouton du header, qui affiche le raccourci.
Le piege de focus, `Esc` et la restauration du focus sont le comportement par defaut de `MatDialog` :
rien n'est reimplemente.

L'index est `availableShortcuts()` + `availableActions()` — immunise aux permissions par
construction. Nouveau registre `ADMIN_ACTIONS` pour les cinq creations, chacune derriere sa
permission `:write`.

Recherche insensible aux accents, navigation bouclee, selection replacee en tete apres filtrage.
Le raccourci ne se declenche pas dans un champ de saisie.

**Ecart comble** : seule la creation d'article a une route propre. Les quatre autres passent par un
dialogue porte par la page de liste ; un parametre `?nouveau=1`, honore par `openOnCreateParam()`,
les ouvre. Sans lui la palette n'aurait pu que deposer l'utilisateur sur la liste.

32 tests (21 composant, 11 service) + 6 sur le helper de parametre.

**Reste** : le test E2E (Docker requis).

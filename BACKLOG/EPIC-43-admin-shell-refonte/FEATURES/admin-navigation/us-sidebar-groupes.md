# US — Sidebar en groupes semantiques (lot 2)

## Role / Action / Benefice

> **En tant qu'**utilisateur admin,
> **je veux** une sidebar organisee en groupes avec des en-tetes,
> **afin de** reperer une section d'un coup d'oeil au lieu de lire les 14 entrees de haut en bas.

## Criteres d'acceptation

- [ ] La sidebar consomme `shortcutsBySection()` et boucle sur `SECTION_ORDER` (**pas** sur la Map,
      dont l'ordre d'iteration depend de l'ordre de declaration du registre).
- [ ] Zone epinglee en haut, sans en-tete : Dashboard puis Statistiques, separee du reste par un
      trait `1px solid rgba(50, 210, 153, 0.10)`.
- [ ] Regle de degradation sous permissions :
      - groupe a **0 item** -> rien, ni en-tete ni separateur
      - groupe a **1 item** -> l'item seul, **en-tete masque**
      - groupe a **>= 2 items** -> en-tete + items
- [ ] Densite : items a 40px de hauteur, icones a 20px de largeur fixe, labels a 0.8125rem,
      en-tetes a 24px.
- [ ] En-tetes en Bebas Neue 0.6875rem, `letter-spacing: 0.14em`, majuscules,
      `color: rgba(255, 255, 255, 0.38)`.
- [ ] **Les en-tetes ne sont jamais verts.** Sur `#0C0D0C`, le `#32D299` est le seul point de
      couleur : il doit exclusivement signaler l'etat actif.
- [ ] Etat actif : `box-shadow: inset 3px 0 0 var(--green)` au lieu de `border-left` (supprime le
      decalage de 3px du contenu), `transition` ciblee sur `background-color, color` et non `all`.
- [ ] Mode replie : en-tetes remplaces par un separateur 1px `rgba(50,210,153,.12)` sur 40% de la
      largeur, centre. Le rythme de groupe survit sans texte.
- [ ] Mobile : rendu identique au mode deploye dans le drawer.
- [ ] Pas de scroll jusqu'a 850px de viewport pour un Admin sur le perimetre `main`
      (14 entrees / 4 groupes = 775px). Apres le merge boutique (16 entrees / 5 groupes = 879px),
      un leger scroll est **assume** : seul le role Admin est concerne, seul `.sidebar-nav` defile,
      et la palette Cmd+K rend le scroll rarement necessaire.
- [ ] Le groupe `boutique`, declare mais sans item sur `main`, ne rend rien (aucun en-tete, aucun
      separateur) — garantit que le merge de la branche boutique n'introduira pas de regression.
- [ ] Tests unitaires : rendu pour 4 roles (Admin 14 items / 4 groupes, Gestionnaire 8 / 3, CM 4 / 2
      dont un sans en-tete, anonyme 0) avec assertions sur les sections, l'ordre des groupes et les
      items par groupe.
- [ ] Tests unitaires : groupe a 0 item ne rend rien ; groupe a 1 item rend l'item sans en-tete.

## Maquette validee

```
┌────────────────────────────────┐
│  DVG ADMIN                     │
├────────────────────────────────┤
│  ⌂  Dashboard                  │   zone epinglee, sans en-tete
│  ▤  Statistiques               │
│ ────────────────────────────── │
│  COMPETITION                   │
│  ⚑  Equipes                    │
│  ⛭  Jeux                       │
│  ▦  Matchs                     │
│  ♛  Palmares                   │
│                                │
│  CONTENU                       │
│▍ ▤  Articles                   │
│  ▶  Live Twitch                │
│  ⛨  Sponsors                   │
│                                │
│  BOUTIQUE          (a venir)   │
│  ☐  Boutique                   │
│  ▤  Commandes                  │
│                                │
│  STRUCTURE                     │
│  ⚇  Staff                      │
│  ✉  Recrutement                │
│                                │
│  ADMINISTRATION                │
│  ⌸  Comptes                    │
│  ⚉  Roles                      │
│  ⚙  Parametres                 │
├────────────────────────────────┤
│                            ‹   │
└────────────────────────────────┘
```

Rendu CM (4 items) — le groupe CONTENU tombe a 1 item, son en-tete disparait :

```
⌂ Dashboard
──────────────
COMPETITION
▦ Matchs
♛ Palmares
──────────────
▤ Articles
```

## Suivi

| Volet | Claude | PO | E2E | Livre |
|-------|--------|----|----|-------|
| Frontend | Fait (2026-07-31) | A faire | A faire | A faire |
| UI/UX | Fait (2026-07-31) | A faire | A faire | A faire |

## Livraison Claude (2026-07-31)

Groupes derives de `SECTION_ORDER`, zone epinglee en tete, regles de degradation appliquees
(groupe vide -> rien ; groupe a 1 item -> item sans en-tete). Separateurs en mode replie.

27 tests sur la sidebar, couvrant les profils Admin / Gestionnaire / CM.

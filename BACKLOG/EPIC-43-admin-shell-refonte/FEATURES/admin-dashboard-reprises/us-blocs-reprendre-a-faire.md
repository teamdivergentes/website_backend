# US — Blocs "Reprendre" et "A faire" (lot 7)

## Role / Action / Benefice

> **En tant qu'**utilisateur admin,
> **je veux** retrouver sur le dashboard ce sur quoi je travaillais et ce qui cloche sur le site,
> **afin de** reprendre mon travail sans avoir a chercher, au lieu de voir une grille de liens qui
> duplique la sidebar.

## Criteres d'acceptation

- [ ] La grille des 14 liens rapides de `DashboardStatsComponent` est remplacee par les deux blocs.
- [ ] `DashboardTrafficComponent` (metriques GA) et `DashboardRecentComponent` (etat du site) sont
      **conserves inchanges**.
- [ ] Bloc **Reprendre** : brouillons recents, titre + anciennete relative ("2j"), lien vers
      l'editeur.
- [ ] Bloc **A faire** : une ligne par alerte, chacune avec son compteur et un lien vers la page
      filtree correspondante.
- [ ] **Etat vide** : chaque ligne de "A faire" n'est rendue que si son compteur est > 0. Si les
      quatre compteurs sont a 0, le bloc entier disparait au lieu d'afficher quatre zeros. Idem pour
      "Reprendre" s'il n'y a aucun brouillon recent.
- [ ] Un compteur omis (permission manquante) et un compteur a 0 produisent le **meme rendu** : la
      ligne n'est pas affichee. Aucun message d'acces refuse.
- [ ] **Skeletons CSS** pendant le chargement, reproduisant la forme des blocs (obligation projet :
      tout contenu dynamique charge depuis l'API doit afficher un skeleton, jamais une zone vide ni
      un spinner generique).
- [ ] Tests unitaires : bloc masque si compteurs a 0 ; skeletons affiches pendant le chargement ;
      mapping des reponses API et gestion d'erreur dans `DashboardService`.

## Maquette validee

```
┌─ Bonjour Maxime ───────────────────────────────┐
│                                                │
│  ▸ REPRENDRE                                   │
│    ▤ Brouillon « DVG vs KC »              2j   │
│    ▤ Brouillon « Roster 2026 »            5j   │
│                                                │
│  ▸ A FAIRE                                     │
│    ▦ 3 matchs sans score                       │
│    ▤ 2 articles publies sans image             │
│    ▶ 1 match sans lien de stream               │
│    ▤ 4 brouillons dormants                     │
│                                                │
├─ TRAFIC (7j) ──────────────────────────────────┤
│  ▁▃▆▇▅▃▆   12,4k vues  ▲ 8%                    │
├─ ETAT DU SITE ─────────────────────────────────┤
│  ● En ligne   v2.14.0   14:32                  │
└────────────────────────────────────────────────┘
```

## Suivi

| Volet | Claude | PO | E2E | Livre |
|-------|--------|----|----|-------|
| Frontend | Fait (2026-07-31) | A faire | A faire | A faire |
| UI/UX | Fait (2026-07-31) | A faire | A faire | A faire |

## Livraison Claude (2026-07-31)

Les deux blocs remplacent la grille de quatorze liens. `DashboardTrafficComponent` et
`DashboardRecentComponent` sont inchanges ; `DashboardStatsComponent` est supprime et son message
d'accueil remonte dans l'en-tete.

Un compteur omis (permission manquante) et un compteur a zero produisent le meme rendu : la ligne
disparait, sans message d'acces refuse. Quand plus rien ne reste, c'est le bloc entier qui
disparait.

Skeletons batis sur `styles/_admin-skeleton.scss`, sans nouvelle declaration de keyframes. Une panne
d'API efface le bloc plutot que de barrer la page d'un bandeau.

21 tests.

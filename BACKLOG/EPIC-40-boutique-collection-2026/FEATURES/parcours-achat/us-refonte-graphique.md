# US — Refonte graphique de la boutique et de la fiche produit

**Statut Claude** : Fait
**Source** : maquette Claude Design « Refonte boutique trois maillots »
(`d1ad2a4a-1535-44d1-88b0-d77133438a05`), direction **1b** pour la liste et **1f** pour
la fiche produit, affinée avec Maxime le 2026-07-29.

En tant que **visiteur**, je veux **une boutique qui ressemble à Team Divergentes et pas
à un gabarit** afin de **comprendre en un coup d'œil que les trois maillots sont le même
vêtement dans trois habillages**.

## Demande

Maxime a repris la boutique dans Claude Design et demande d'aller plus loin que la
maquette. Deux consignes explicites :

1. Supprimer les angles arrondis, qui « font très IA ».
2. Supprimer les tirets cadratins et tout ce qui signe une rédaction automatique.

## Critères d'acceptation

- [x] Aucun `border-radius` sur les deux pages
- [x] Langage de forme unique : chanfrein (angle coupé en biais) sur les cadres visuels,
      tracé par un filet de 1px, y compris sur la diagonale
- [x] Liste : une section narrative par déclinaison, visuel et texte alternés
- [x] Liste : un laïus propre à chaque déclinaison (champ `description` du catalogue),
      suivi d'une ligne de méta courte (tailles, flocage)
- [x] Référence d'atelier par maillot (`DVG26 / JOK`), dérivée du slug
- [x] Réassurance en trois colonnes tenues par l'espace, sans cartes ni filets
- [x] Titres nettoyés à l'affichage : ni tiret cadratin, ni croix, ni « DVG » redondant
      (« Maillot 2026 — DVG × Joker » se lit « Maillot 2026 **Joker** »)
- [x] Fiche produit : visuel plein cadre, rail de vues, guide des mesures dépliable
- [x] Fiche produit : total et bouton d'achat collants tant qu'on parcourt le panneau
- [x] Fiche produit : accès direct aux autres déclinaisons, **qui recharge bien la fiche**
- [x] Visuels en `cover` : plus de fond de photo visible à l'intérieur du chanfrein
- [x] Le titre du hero s'accorde sur le nombre de maillots réellement publiés
- [x] Skeletons au format des nouvelles sections, focus visible, `prefers-reduced-motion`
- [x] Aucun débordement horizontal, vérifié de 390 px à 1440 px

## Retours de recette du 2026-07-29

| Retour | Traitement |
|---|---|
| Changer de déclinaison modifiait l'URL mais pas le contenu | `ngOnInit` lisait `route.snapshot` une seule fois. Angular réutilise le composant quand seul `:slug` change : on suit désormais `route.paramMap`, et la sélection (taille, quantité, flocage, vue, guide) repart à zéro |
| Bande « matière · grammage · origine » sous le hero | Supprimée |
| Sections produits trop sèches | Remplacées par un laïus éditorial par maillot, écrit **en base** pour rester modifiable depuis l'admin |
| Réalisation de la section finale | Trois colonnes conservées, filets retirés : c'est l'espace et la typographie qui séparent |
| Le bouton « voir les maillots » renvoyait sur l'accueil | Un `href="#maillots"` est résolu contre le `<base href="/">` de `index.html`, d'où `/#maillots`. Remplacé par `routerLink` + `fragment`, avec `anchorScrolling: 'enabled'` et un offset `ViewportScroller` pour ne pas déposer la cible sous le header fixe |
| Fond de photo visible dans le cadre | Visuels passés en `object-fit: cover`. Les ratios des photos (0,75 à 0,81) étant proches du cadre 4/5, le remplissage ne rogne quasiment rien |

## Notes

**Correctif de plateforme.** `#page-content` portait `overflow: hidden`, ce qui faisait de
`<main>` un conteneur de défilement et neutralisait `position: sticky` sur **toute** page
publique. Remplacé par `overflow-x: clip`, qui coupe le débordement horizontal sans créer
ce conteneur. Vérifié sans régression sur `/`, `/structure`, `/structure/equipes`,
`/boutique` et la fiche produit, en 390 px et 1440 px.

**Bandeau sponsors.** Les deux carrousels défilants ont été remplacés par un bandeau posé,
sans animation. L'exposition contractuelle est conservée ; le défilement n'apportait rien
et détournait l'œil des maillots.

**Sponsor du panneau collant.** Le panneau d'achat entier ne peut pas être collant : il est
la colonne la plus haute de la page, donc sans jeu de défilement. C'est le bloc total +
bouton qui l'est, ce qui répond au besoin réel.

## Données produit à confirmer

| Donnée | Valeur retenue | Statut |
|---|---|---|
| Composition | 100 % polyester | Fiche fabricant, 2026-07-29 |
| Grammage | 135 g/m² | Fiche fabricant, 2026-07-29 — le seed annonçait 160 g/m², corrigé |
| Guide des mesures | XS 46/66 → XXL 61/78 (poitrine/longueur, à plat, en cm) | **Repris de la maquette, à confirmer par le fournisseur** |
| Origine | Sublimé et floqué en France | A confirmer |

Le catalogue en base n'expose que XS→XXL ; le tableau des mesures est filtré sur les
tailles réellement en vente, une taille retirée de l'admin disparaît donc du guide.

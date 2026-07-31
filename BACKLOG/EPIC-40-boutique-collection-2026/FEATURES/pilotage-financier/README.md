# FEATURE — Pilotage financier de la boutique

**Branche** : à créer
**Route** : `/admin/boutique` onglet « Pilotage » (permission `boutique:read`)
**Statut** : Planifié, non démarré

## Objectif

Donner en un écran l'état de la boutique : où en sont les commandes, combien d'argent est
acquis, combien reste engagé, et ce que la collection rapporte réellement.

Aujourd'hui l'admin liste les commandes une par une et affiche la marge de chacune. Lire la
santé de la boutique demande donc de sommer à la main — ce qui, passé la trentaine de
commandes, ne se fait plus.

## Besoin d'origine

Exprimé par Maxime le 2026-07-29 : « des vues graphiques des différents états des ordres
d'achat + argent réalisé, argent en circulation ».

## Vocabulaire retenu

La distinction demandée entre argent « réalisé » et « en circulation » n'a de sens que si
elle est adossée aux statuts. Convention posée ici, à valider par le PO :

| Notion | Statuts | Ce que ça veut dire |
|---|---|---|
| **Réalisé** | `DELIVERED` | Encaissé et la contrepartie est livrée. L'argent est acquis, l'engagement est soldé |
| **En circulation** | `PAID`, `SENT_TO_MERCHANT`, `IN_PRODUCTION`, `SHIPPED` | Encaissé mais un maillot reste dû. L'argent est sur le compte, il n'est pas encore gagné |
| **Non encaissé** | `PENDING` | Panier abandonné en cours de paiement. Ce n'est pas de l'argent, ne jamais l'additionner au reste |
| **Sorti** | `CANCELLED`, `REFUNDED` | Ne compte ni au chiffre d'affaires, ni à la marge |

Le point qui compte : `PENDING` n'est pas du chiffre d'affaires potentiel, c'est du bruit de
tunnel de paiement. Le mélanger au reste gonflerait les chiffres de façon flatteuse et fausse.

## Panneaux

Cinq panneaux, dans cet ordre de lecture.

| # | Panneau | Forme | Ce qu'il répond |
|---|---|---|---|
| 1 | Chiffres clés | 4 compteurs | Combien j'ai gagné, combien reste engagé, quelle marge, combien de maillots |
| 2 | États des commandes | Entonnoir horizontal | Où bloque le flux, combien de paniers sont abandonnés |
| 3 | Chiffre d'affaires et marge dans le temps | Aires empilées, cumul par semaine | La collection décolle-t-elle ou s'essouffle-t-elle |
| 4 | Répartition par maillot et par taille | Barres | Quel maillot marche, quelles tailles recommander au fournisseur |
| 5 | Livraison | Barres comparées | Combien coûte réellement la politique de port |

Le détail de chaque panneau est dans les US.

## Suivi

| US | Claude | PO | E2E | Livré |
|----|--------|----|----|-------|
| [Agrégats côté serveur](us-agregats-serveur.md) | A faire | A faire | A faire | A faire |
| [États des commandes](us-vue-etats-commandes.md) | A faire | A faire | A faire | A faire |
| [Argent réalisé et en circulation](us-vue-argent-realise-circulation.md) | A faire | A faire | A faire | A faire |
| [Répartition produits et livraison](us-vue-repartition-produits.md) | A faire | A faire | A faire | A faire |

## Décisions

| Date | Décision |
|---|---|
| 2026-07-29 | Les agrégats sont calculés en SQL côté serveur, pas dans le navigateur à partir de la liste des commandes. La liste est paginée et filtrée : agréger côté client donnerait des totaux qui changent selon le filtre affiché |
| 2026-07-29 | Pas de librairie de graphiques. Les cinq panneaux se rendent en SVG et en CSS, dans le langage de forme de la boutique (chanfrein, filets `#28413B`, accent `#32D299`). Une dépendance de charting pèserait plus lourd que les cinq formes qu'elle sert |
| 2026-07-29 | `PENDING` est compté et affiché à part, jamais additionné au chiffre d'affaires |

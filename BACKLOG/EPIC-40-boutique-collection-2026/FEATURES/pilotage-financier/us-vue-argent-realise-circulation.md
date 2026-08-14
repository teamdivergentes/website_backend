# US — Argent réalisé et argent en circulation

**Statut Claude** : A faire

En tant que **responsable de la structure**, je veux **distinguer l'argent acquis de l'argent
encore engagé** afin de **savoir ce que je peux réellement réinvestir sans mettre la
trésorerie en difficulté**.

## Panneau 1 — Chiffres clés

Quatre compteurs sur une ligne, chanfreinés, séparés par un filet.

| Compteur | Contenu | Sous-titre |
|---|---|---|
| Réalisé | CA des commandes `DELIVERED` | marge de X € |
| En circulation | CA des commandes payées non livrées | Y commandes à honorer |
| Marge totale | Réalisée + engagée | Z % du chiffre d'affaires |
| Maillots vendus | Quantité, `PENDING` exclu | panier moyen de W € |

Sous les compteurs, une ligne discrète : « N paniers abandonnés au paiement », qui n'entre
dans aucun des quatre chiffres.

## Panneau 3 — Chiffre d'affaires et marge dans le temps

Aires empilées, une barre par semaine, cumul depuis l'ouverture :

- Aire basse : coût (maillots + colis), en `#28413B`
- Aire haute : marge, en `#32D299`
- La hauteur totale est le chiffre d'affaires

Une ligne horizontale marque le seuil de rentabilité de la collection si un objectif est
renseigné dans les réglages. Sinon, pas de ligne — mieux vaut aucune référence qu'une
référence inventée.

## Critères d'acceptation

- [ ] Le réalisé ne compte que les commandes `DELIVERED`
- [ ] L'en-circulation couvre `PAID`, `SENT_TO_MERCHANT`, `IN_PRODUCTION`, `SHIPPED`
- [ ] Les paniers `PENDING` sont affichés à part et n'entrent dans aucun compteur d'argent
- [ ] `CANCELLED` et `REFUNDED` sont exclus des deux
- [ ] Le montant remboursé est affiché séparément quand il est non nul
- [ ] La marge suit la définition de `shop-costs.ts`, coûts figés compris
- [ ] Le graphique hebdomadaire n'affiche que les semaines écoulées, pas la semaine en cours à moitié pleine
- [ ] Un survol donne le détail chiffré de la semaine
- [ ] Sans commande, les compteurs affichent 0 € et le graphique un message, pas une zone vide
- [ ] Le même contenu est disponible en tableau pour le lecteur d'écran

## Notes

**« Réalisé » veut dire livré, pas encaissé.** Un maillot payé mais pas encore expédié
représente une dette : le client peut demander l'annulation, et le fournisseur reste à payer.
Compter cet argent comme gagné donnerait une image flatteuse au pire moment, celui où la
trésorerie sert justement à financer la production.

**La semaine en cours est exclue du graphique.** Une barre incomplète se lit comme une chute
d'activité. La donnée du jour reste visible dans les compteurs, qui eux sont instantanés.

**Le seuil de rentabilité n'est affiché que s'il existe.** Inventer un objectif pour avoir une
ligne à tracer transformerait le graphique en jugement arbitraire.

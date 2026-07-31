# US — Répartition par produit et coût de la livraison

**Statut Claude** : A faire

En tant que **responsable de la structure**, je veux **savoir quel maillot et quelles tailles
se vendent, et ce que la politique de port coûte** afin de **commander au fournisseur au plus
juste et d'arbitrer sur les frais de livraison**.

## Panneau 4 — Répartition par maillot et par taille

Deux séries de barres horizontales côte à côte :

- Par maillot : quantité vendue, avec le chiffre d'affaires et la marge en libellé
- Par taille : quantité vendue sur `S` à `XXL`, toutes déclinaisons confondues

## Panneau 5 — Livraison

Trois lignes comparées :

```
Standard   facturé 85 €   coûté 153 €   17 commandes
Rapide     facturé 40 €   coûté  48 €    4 commandes
Offert                    coûté  63 €    7 commandes
                                  ────
             résultat livraison  −139 €
```

Le résultat de la livraison est affiché en clair, négatif compris.

## Critères d'acceptation

- [ ] Une barre par maillot du catalogue, y compris ceux à zéro vente
- [ ] Les tailles sont dans l'ordre `S`, `M`, `L`, `XL`, `XXL`, jamais triées par volume
- [ ] Le panneau livraison distingue port facturé et port réellement coûté
- [ ] Les commandes à port offert forment leur propre ligne, avec leur coût
- [ ] Le résultat de la livraison est affiché même — et surtout — quand il est négatif
- [ ] Les commandes `PENDING`, `CANCELLED` et `REFUNDED` sont exclues de tous ces comptages
- [ ] Chaque panneau a son équivalent tabulaire accessible

## Notes

**Les tailles restent dans l'ordre des tailles.** Trier par volume ferait un plus joli
graphique et un plus mauvais outil : la question posée est « où est le pic de la courbe des
tailles », qui n'a de sens que sur un axe ordonné.

**Un maillot à zéro vente doit se voir.** C'est l'information la plus actionnable du panneau :
une déclinaison qui ne part pas ne doit pas être recommandée au fournisseur.

**Le résultat de la livraison sera négatif, c'est le design.** Le port est vendu à perte
volontairement, et offert au-delà de 120 €. Ce panneau ne sert pas à s'en alarmer mais à
mesurer le coût de ce choix commercial, et à décider si le seuil de franchise tient.

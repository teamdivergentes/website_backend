# US — Mentions obligatoires sur la fiche produit

**Statut Claude** : Fait

En tant que **client**, je veux **connaître le prix réel, le délai et l'impact du produit**
afin de **décider en connaissance de cause avant de mettre au panier**.

## Critères d'acceptation

- [x] Prix affiché explicitement TTC sur la fiche produit, la liste et le total (art. L112-1)
- [x] Délai de livraison annoncé **avant** l'achat, sur la fiche produit (art. L216-1)
- [x] Mention de rejet de microfibres plastiques au lavage, le maillot étant à 100 % polyester
      (art. L541-9-1 C. env., décret 2022-748)
- [x] Consigne de tri fournie de façon dématérialisée sur la fiche, la vente étant à
      distance (art. R541-12-18 C. env.)
- [ ] **Signalétique Triman** : le pictogramme officiel manque. Bloqué par l'adhésion
      Refashion, qui conditionne aussi l'identifiant unique ADEME
- [x] Les deux vues, liste et fiche, lisent la même source de vérité
- [x] Aucun délai inventé : la valeur manquante affiche « À COMPLÉTER »

## Notes

Le délai n'apparaissait jusqu'ici que sur `/boutique/merci`, donc après le paiement,
et sous une forme non engageante. C'est trop tard : l'information doit précéder la
conclusion du contrat, et à défaut d'indication la loi impose 30 jours.

Le premier jet affichait un badge textuel portant le mot « Triman ». Retiré : la
signalétique est un pictogramme dont la forme est fixée par arrêté, en écrire le nom ne
vaut pas l'apposer et donne l'apparence d'une conformité qu'on n'a pas. La consigne de
tri en toutes lettres reste, elle est due à côté du pictogramme et non à sa place.

Le logo officiel Triman n'est pas intégré : un pictogramme approximatif serait pire
que du texte. À ajouter comme asset une fois obtenu.

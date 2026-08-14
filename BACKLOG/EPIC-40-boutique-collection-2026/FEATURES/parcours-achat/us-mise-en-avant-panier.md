# US — Mise en avant du panier et de la franchise de port

**Statut Claude** : Fait

En tant que **visiteur de la boutique**, je veux **voir ce que j'ai déjà au panier et ce qui me
manque pour la livraison offerte** afin de **savoir où j'en suis sans revenir au panier**.

## Constat

Le seul accès au panier était un lien en bas de la liste : sur une fiche produit, rien ne
rappelait qu'un maillot attendait déjà. Le montant restant pour déclencher la franchise, lui,
n'apparaissait qu'au panier, en petits caractères gris, une fois la décision d'achat prise.

## Critères d'acceptation

- [x] Une pastille panier suit le défilement dès que le panier contient un article
- [x] Elle porte le nombre d'articles, le sous-total et l'accès au panier
- [x] Elle se signale par un battement à chaque ajout, jamais à un retrait
- [x] Le bouton d'ajout bascule en « ajouté au panier » : changement de couleur et glissement latéral du libellé
- [x] Le bouton reste cliquable pendant ce retour visuel, pour un second exemplaire
- [x] La franchise de port est annoncée sur la fiche produit, avec trois états : seuil, montant restant, franchise acquise
- [x] Le panier affiche le même message sur un bloc mis en avant, avec une jauge de progression
- [x] Aucun de ces éléments n'apparaît quand aucun seuil de franchise n'est réglé
- [x] Le mouvement est neutralisé sous `prefers-reduced-motion`, le retour visuel subsiste

## Notes

**« Plus que 120 € » sur un panier vide n'a pas de sens.** D'où les trois états : sans article,
la fiche annonce le seuil ; le panier entamé, ce qui manque ; le seuil franchi, la franchise
acquise. Un seul message aurait été faux dans deux cas sur trois.

**Une jauge plutôt qu'un montant seul.** Un montant restant ne dit pas si l'on est proche du
but. La barre le montre, et c'est elle qui transforme l'information en argument.

**Le battement ne joue qu'à la hausse.** Signaler un retrait avec la même animation qu'un ajout
brouillerait le sens de l'effet.

**Le bouton reste actif pendant le retour visuel.** Le désactiver « le temps de l'animation »
empêcherait de commander un second exemplaire, pour un gain esthétique nul.

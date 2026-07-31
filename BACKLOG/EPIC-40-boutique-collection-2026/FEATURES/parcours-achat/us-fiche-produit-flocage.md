# US — Fiche produit et flocage

**Statut Claude** : Fait

En tant que **fan**, je veux **personnaliser mon maillot avec mon pseudo** afin de
**porter une pièce qui m'est propre**.

## Critères d'acceptation

- [x] Galerie basculant entre face et dos
- [x] Sélection de taille parmi celles du produit
- [x] Flocage optionnel : « sans flocage » est le choix par défaut
- [x] Le prix affiché intègre le surcoût dès qu'un pseudo est saisi
- [x] Un pseudo vide ou composé d'espaces ne facture pas le surcoût
- [x] Saisie invalide → message explicite et ajout au panier bloqué
- [x] Activer le flocage bascule la galerie sur le dos
- [x] Skeleton pendant le chargement, message explicite si le produit est indisponible

## Notes

La longueur du flocage est mesurée sur la valeur **normalisée**, comme côté serveur :
sinon un pseudo suivi d'un espace serait refusé ici alors que l'API l'accepte.

L'aperçu du flocage est un aperçu **typographique**, pas une photo retouchée : le mockup
de dos porte un « Nickname » incrusté qui ne peut pas être masqué proprement. Un dos sans
placeholder de la part du designer permettrait un aperçu superposé sur le visuel.

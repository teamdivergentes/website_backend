# US — Catalogue et réglages

**Statut Claude** : Fait

En tant que **responsable de la structure**, je veux **piloter les prix et les visuels
depuis l'admin** afin de **ne pas dépendre d'un déploiement pour changer un tarif**.

## Critères d'acceptation

- [x] Liste des produits, inactifs compris
- [x] Création, modification et suppression d'un produit
- [x] Upload des visuels face et dos (module upload existant)
- [x] Prix, surcoût de flocage et tailles éditables
- [x] Publication d'un produit sans visuel de face refusée
- [x] Frais de port et e-mail de notification éditables
- [x] Interrupteur d'ouverture de la boutique
- [x] Montants saisis en euros, jamais en centimes

## Notes

Fermer la boutique n'expose ni catalogue ni prix et refuse tout paiement : c'est le moyen
de garder le site en ligne tant que les clés Stripe de production ne sont pas en place.

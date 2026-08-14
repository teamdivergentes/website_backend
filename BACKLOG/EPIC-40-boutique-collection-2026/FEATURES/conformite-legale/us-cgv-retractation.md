# US — CGV et droit de rétractation

**Statut Claude** : Fait

En tant que **client**, je veux **lire les conditions de vente et savoir comment me rétracter**
afin de **savoir ce que j'accepte avant de payer**.

## Critères d'acceptation

- [x] Page `/conditions-generales-de-vente` accessible depuis le footer et depuis le panier
- [x] Identité du vendeur, prix TTC, frais de port, modalités de commande et de paiement
- [x] Délai de livraison annoncé, et rappel du droit de résolution en cas de retard (art. L216-1)
- [x] Droit de rétractation de 14 jours, avec l'exception des biens personnalisés (art. L221-28 3°)
- [x] Encadré des garanties légales de conformité et des vices cachés (art. L217-15)
- [x] Clause réservant le droit de refuser un flocage contraire à l'ordre public ou à un droit de tiers
- [x] Coordonnées du médiateur de la consommation (art. L612-1)
- [x] Page `/retractation` avec l'avis d'information et le formulaire type de l'annexe art. R221-1
- [x] La case du panier lie effectivement les deux pages, elle n'est pas pré-cochée
- [x] Aucune valeur juridique inventée : les données manquantes affichent « À COMPLÉTER »

## Notes

Pas de lien vers la plateforme européenne de règlement en ligne des litiges : elle a
fermé en juillet 2025. L'ajouter serait une information trompeuse.

La distinction floqué / non floqué est le point sensible. Un maillot **sans** flocage
ouvre bien les 14 jours, même s'il est produit à la commande : la fabrication à l'unité
ne supprime pas le droit de rétractation, seule la personnalisation le fait.

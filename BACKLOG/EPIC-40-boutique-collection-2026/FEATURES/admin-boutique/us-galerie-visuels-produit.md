# US — Galerie de visuels par produit

**Statut Claude** : Fait

En tant que **membre de l'équipe**, je veux **ajouter autant de visuels que nécessaire sur un
produit** afin de **montrer le dos floqué et les photos portées sans attendre une reprise de
code**.

## Constat

L'admin ne propose que deux emplacements parce que le modèle n'en a que deux :
`ShopProduct.imageFront` et `ShopProduct.imageBack` sont des colonnes fixes. Une troisième,
`imageCard`, existe en base pour la vignette de liste mais n'est pas exposée dans la modale.

Ajouter une vue demande donc aujourd'hui une migration, un DTO, un champ de formulaire et une
entrée dans le rail de la fiche produit. C'est ce qui bloque les visuels déjà livrés :
`maillot-2026-*-back-name.webp` (dos floqué) et les photos portées Mystic sont dans les assets
mais n'ont aucune colonne où se ranger.

## Réalisation

Table `shop_product_images` : `productId`, `url`, `label`, `position`, `isBack`, `isCard`.
Le rail de la fiche produit, la vignette de la liste boutique et la vignette du catalogue
admin se construisent à partir de cette collection. Les trois colonnes sont supprimées.

## Critères d'acceptation

- [x] Un produit accepte un nombre libre de visuels, réordonnés depuis la modale
- [x] Chaque visuel porte un libellé, affiché sous la vignette du rail
- [x] La vue d'ouverture de la fiche est la première de la liste, et se change
- [x] La vignette de la liste boutique se désigne explicitement, et reste unique
- [x] `isBack` reste identifiable : l'aperçu du flocage sait sur quelle vue se poser
- [x] Un produit sans aucun visuel ne peut toujours pas être publié
- [x] La migration reprend `imageFront`, `imageBack` et `imageCard` sans perte, y compris quand la vignette reprenait déjà la face ou le dos
- [x] Les commandes passées ne sont pas affectées : leurs lignes figent déjà leur libellé
- [x] Une galerie qui rétrécit ne laisse pas la fiche sur un rang orphelin

## Notes

**Pourquoi une table plutôt qu'une quatrième colonne.** Chaque nouvelle vue coûtait une
migration. La collection 2026 en demande trois par maillot, plus deux photos portées sur une
seule déclinaison — un modèle par colonnes obligerait à créer des champs vides sur les produits
qui ne les utilisent pas.

**`isBack` n'est pas décoratif.** L'aperçu du flocage se positionne en pourcentage sur la vue
de dos ; sans marqueur, il faudrait deviner laquelle c'est parmi N visuels. Le dos qui porte
déjà un nom floqué ne doit surtout pas être marqué : l'aperçu se superposerait au nom imprimé.

**La suppression d'un visuel ne touche pas au fichier.** Un même téléversement peut servir sur
un autre produit, et les visuels livrés avec le site appartiennent au dépôt, pas à
l'administration : les effacer du disque casserait le seed et les autres environnements.

**Deux vignettes de vitrine ne sont pas une erreur à rejeter.** C'est une ambiguïté à trancher :
la première l'emporte, et l'écran montre le résultat plutôt qu'un message de refus.

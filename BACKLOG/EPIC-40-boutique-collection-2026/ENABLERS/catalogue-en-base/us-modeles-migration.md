# US — Modèles de données et migration

**Statut Claude** : Fait

En tant que **développeur**, je veux **un catalogue et des réglages en base** afin que
**les prix et l'ouverture de la boutique changent sans redéploiement**.

## Critères d'acceptation

- [x] Tables `shop_products`, `shop_product_sizes`, `shop_settings` (singleton)
- [x] Table `order_items`, `orders` allégée de ses champs mono-produit
- [x] Statut `PENDING` ajouté à l'énumération `OrderStatus`
- [x] Permissions `boutique:read` / `boutique:write` ajoutées au rôle Admin
- [x] La migration reprend les commandes mono-produit existantes avant de retirer les colonnes
- [x] `prisma migrate diff` ne détecte aucun écart entre migrations et schéma
- [x] Seed des 3 maillots, actifs uniquement s'ils disposent d'un visuel de face

## Notes

`active` vaut `false` par défaut : un produit créé sans visuel ne doit pas atterrir en
vitrine par accident.

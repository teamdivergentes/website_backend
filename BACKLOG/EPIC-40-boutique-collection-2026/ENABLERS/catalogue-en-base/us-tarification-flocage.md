# US — Tarification serveur et flocage

**Statut Claude** : Fait

En tant que **responsable de la structure**, je veux **que les montants soient calculés par
le serveur** afin qu'**un panier forgé ne permette pas d'acheter un maillot à 0,01 €**.

## Critères d'acceptation

- [x] Le client ne transmet que `productId`, `size`, `quantity`, `flockingText`
- [x] Un montant injecté dans la requête est ignoré
- [x] Le surcoût de flocage n'est facturé que si un flocage non vide est fourni
- [x] Un flocage sur un produit qui ne l'autorise pas est rejeté
- [x] Charset restreint : ni HTML, ni injection de formule CSV
- [x] Les frais de port ne sont comptés qu'une fois, quel que soit le nombre d'articles
- [x] Boutique fermée : catalogue vide et checkout refusé
- [x] Webhook idempotent : un rejeu ne produit ni doublon ni seconde notification
- [x] Un échec de notification n'annule jamais une commande payée

## Notes

Le charset du flocage exclut `<`, `>`, `=`, `+`, `@` et le point-virgule : ce texte est
réinjecté dans un mail HTML et dans un export CSV. L'export neutralise en plus l'injection
de formule, le tiret restant autorisé.

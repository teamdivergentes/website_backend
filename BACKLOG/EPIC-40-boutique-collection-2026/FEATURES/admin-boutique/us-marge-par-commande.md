# US — Marge affichée sur chaque commande

**Statut Claude** : Fait

En tant que **responsable de la structure**, je veux **voir la marge de chaque commande dans
l'admin** afin de **savoir ce que la boutique rapporte sans reprendre les calculs à la main
dans un tableur**.

## Critères d'acceptation

- [x] Chaque commande affiche son chiffre d'affaires, son coût total et sa marge
- [x] La marge est aussi donnée en pourcentage du chiffre d'affaires
- [x] Le détail distingue le coût des maillots (par pièce) du coût du colis (une fois)
- [x] Le mode de livraison retenu est visible sur la commande
- [x] Une commande dont le port est vendu à perte le signale
- [x] Une marge négative est affichée telle quelle, jamais masquée ni ramenée à zéro
- [x] Les montants sont calculés à partir des coûts figés sur la commande
- [x] Aucun de ces montants n'apparaît dans une réponse publique

## Notes

**Les coûts ne sortent pas de l'administration.** Le coût de production négocié, la commission
partenaire et le coût réel du port renseignent sur nos accords fournisseurs. Ils vivent dans
`orders-admin`, jamais dans le contrôleur public de la boutique.

**Une marge négative est le cas le plus intéressant à voir.** Un maillot seul avec commission
partenaire active et port offert perd de l'argent. Masquer ce cas priverait l'indicateur de
son seul usage réel : décider s'il faut relever le seuil de franchise ou le prix.

**Le taux est nul, pas zéro, sur une commande à montant nul.** Diviser par le chiffre
d'affaires n'a pas de sens à zéro ; afficher « 0 % » laisserait croire à une marge nulle
alors qu'il n'y a rien à mesurer.

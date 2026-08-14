# US — Panier et paiement

**Statut Claude** : Fait

En tant que **client**, je veux **commander plusieurs maillots en une fois** afin de
**ne payer qu'une seule fois les frais de port**.

## Critères d'acceptation

- [x] Panier persistant entre les visites (`localStorage`)
- [x] Articles identiques fusionnés ; flocages différents = lignes distinctes
- [x] Modification de quantité et retrait d'une ligne
- [x] Frais de port comptés une seule fois, aucun port sur panier vide
- [x] Acceptation des CGV obligatoire avant paiement
- [x] Redirection vers Stripe Checkout, adresse collectée par Stripe (France)
- [x] Les erreurs de validation serveur sont affichées telles quelles

## Notes

Le panier ne stocke **aucun montant** : les prix sont recalculés depuis le catalogue à
chaque affichage. Un panier laissé ouvert une semaine ne facture donc pas un tarif périmé,
et le contenu du `localStorage` — modifiable par l'utilisateur — ne porte rien de sensible.

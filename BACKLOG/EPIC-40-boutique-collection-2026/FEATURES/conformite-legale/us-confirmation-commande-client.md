# US — Confirmation de commande au client

**Statut Claude** : Fait

En tant que **client**, je veux **recevoir une confirmation écrite de ma commande**
afin de **garder une trace de ce que j'ai acheté et de mes droits**.

## Critères d'acceptation

- [x] Un mail part vers le client dès le passage de la commande en `PAID`
- [x] Référence, articles avec taille et flocage, quantités, sous-total, port, total payé
- [x] Adresse de livraison et délai annoncé
- [x] Information sur la rétractation adaptée à **cette** commande : 14 jours si aucun
      article n'est floqué, exception des biens personnalisés si un article l'est
- [x] Liens vers les CGV, la page rétractation et la politique de confidentialité
- [x] Rappel des garanties légales
- [x] Versions texte et HTML, le texte de flocage échappé dans la version HTML
- [x] L'échec d'un canal de notification ne fait jamais échouer une commande déjà payée
- [x] L'embed Discord ne porte plus ni nom, ni e-mail, ni adresse de livraison

## Notes

Le client ne recevait jusqu'ici que le reçu Stripe, qui ne contient ni conditions de
vente ni information sur la rétractation. L'art. L221-13 impose une confirmation sur
support durable reprenant les informations précontractuelles.

Le retrait des coordonnées de l'embed Discord relève de la minimisation : l'équipe a
besoin du flocage et du contenu de la commande pour relancer l'atelier, pas de l'adresse
du client, qui reste consultable dans le back-office.

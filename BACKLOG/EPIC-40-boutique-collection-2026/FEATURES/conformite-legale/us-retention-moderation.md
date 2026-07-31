# US — Rétention des données et modération du flocage

**Statut Claude** : Fait

En tant que **responsable de l'association**, je veux **ne conserver les données client
que le temps nécessaire et ne pas faire produire n'importe quel flocage** afin de
**tenir mes obligations RGPD et ne pas engager la structure sur un texte illicite**.

## Critères d'acceptation

- [x] Anonymisation des coordonnées client 5 ans après la commande : e-mail, nom,
      adresse de livraison et texte de flocage
- [x] Référence, montants, lignes et dates conservés, la commande reste lisible en comptabilité
- [x] Commandes restées en `PENDING` au delà de 7 jours traitées selon le verdict de Stripe :
      suppression si la session n'a pas abouti, `CANCELLED` en cas de doute, conservation
      intacte et alerte si Stripe a encaissé sans que le webhook l'ait vu
- [x] Traitement idempotent, journalisé, et réellement déclenchable et non seulement écrit
- [x] Refus serveur d'un flocage injurieux ou haineux, y compris tentatives de contournement
      par répétition, séparateurs ou substitutions leetspeak
- [x] Les pseudos gaming légitimes passent : un filtre qui refuse un pseudo valide est un bug
- [x] Message de refus en français, clair et non insultant

## Notes

Le modèle `Order` stockait e-mail, nom et adresse sans aucune limite de durée et rien
ne les effaçait. La durée retenue distingue deux régimes : 5 ans pour la preuve du
contrat (art. L110-4 C. com.), 10 ans pour les pièces comptables. D'où une anonymisation
plutôt qu'une suppression.

La purge des `PENDING` ne se fie jamais à l'âge seul. Une commande peut rester `PENDING`
alors que le client a payé, si le webhook ne parvient jamais : Stripe n'insiste que trois
jours environ, la fenêtre est donc réelle. Or c'est précisément là que vivent le détail du
panier et le texte de flocage, trop volumineux pour les métadonnées Stripe. Supprimer sur
la date reviendrait à effacer la seule trace de ce qu'un client a payé. Stripe est donc
interrogé commande par commande, et un paiement orphelin est conservé et signalé en
`error` pour rapprochement manuel, jamais promu en `PAID` automatiquement : cela
court-circuiterait la notification et l'enregistrement des coordonnées.

Le filtre de flocage est une première barrière, pas une garantie. Le contrôle humain
avant envoi à l'atelier reste nécessaire, et les CGV réservent au vendeur le droit de
refuser un flocage : voir [CGV et rétractation](us-cgv-retractation.md).

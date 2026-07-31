# US — Commandes multi-articles

**Statut Claude** : Fait

En tant que **membre de l'équipe**, je veux **voir le détail des articles et leur flocage**
afin de **transmettre la commande au fournisseur sans erreur**.

## Critères d'acceptation

- [x] Une ligne par article dans la liste et le détail
- [x] Flocage mis en évidence, « sans flocage » affiché explicitement
- [x] Sous-total, port et total distincts
- [x] Récapitulatif texte et CSV du lot en attente
- [x] Une ligne CSV par article, injection de formule neutralisée
- [x] Les commandes `PENDING` (paiement abandonné) sont exclues de la liste par défaut

## Notes

Générer le récapitulatif et marquer le lot comme transmis restent deux actions séparées :
un bouton unique basculerait des commandes en « transmises » alors que l'envoi du mail a
pu échouer.

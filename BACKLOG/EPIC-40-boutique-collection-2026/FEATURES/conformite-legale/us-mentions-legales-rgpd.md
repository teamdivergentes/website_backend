# US — Mentions légales et RGPD boutique

**Statut Claude** : Fait

En tant que **visiteur**, je veux **savoir qui vend, comment le joindre et ce que devient
ce que je confie** afin de **commander en confiance et exercer mes droits**.

## Critères d'acceptation

- [x] Mentions légales alimentées par `legal-info.ts`, plus de valeurs en dur dans le HTML
- [x] Téléphone de l'éditeur affiché (art. L221-5)
- [x] Statut TVA affiché : n° intracommunautaire, ou mention de franchise en base
- [x] Article sur l'activité de vente en ligne, avec renvoi vers les CGV
- [x] Identifiant unique ADEME au titre de la filière REP Textiles
- [x] Politique de confidentialité : traitement « Gestion des commandes » décrit
- [x] Base légale explicite : exécution du contrat, et obligation légale pour la comptabilité
- [x] Destinataires nommés : Stripe, le fabricant, l'équipe de l'association
- [x] Durées de conservation : 5 ans pour la preuve du contrat, 10 ans pour les pièces comptables
- [x] Droits RGPD rappelés avec le canal d'exercice

## Notes

L'absence totale de la boutique dans la politique de confidentialité est un manquement
direct à l'art. 13 du RGPD : le traitement existe déjà en base, il n'est simplement
déclaré nulle part.

Discord n'est volontairement pas cité comme destinataire : l'US
[Rétention et modération](us-retention-moderation.md) retire les données personnelles
du webhook. La page décrit l'état cible, pas l'état transitoire.

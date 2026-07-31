# US — Vue des états des commandes

**Statut Claude** : A faire

En tant que **membre de l'équipe**, je veux **voir d'un coup d'œil où en sont les commandes**
afin de **repérer ce qui bloque avant que le client ne s'en plaigne**.

## Panneau 2 — Entonnoir des états

Une barre horizontale par statut, largeur proportionnelle au nombre de commandes, dans
l'ordre du parcours réel :

```
PAID              ████████████████████  24
SENT_TO_MERCHANT  ███████████████       18
IN_PRODUCTION     ██████████            12
SHIPPED           ██████                 7
DELIVERED         ████                   5
```

À part, sous un filet séparateur, les voies de sortie :

```
PENDING     ██        3 paniers abandonnés
CANCELLED   ▌         1
REFUNDED    ▌         1
```

Chaque barre porte le nombre de commandes et le montant correspondant. Un clic ouvre la liste
des commandes filtrée sur ce statut.

## Critères d'acceptation

- [ ] Les six statuts du parcours nominal sont affichés dans l'ordre, même à zéro
- [ ] `PENDING`, `CANCELLED` et `REFUNDED` sont visuellement séparés du parcours nominal
- [ ] Chaque barre indique le nombre de commandes et le montant
- [ ] Un clic sur une barre ouvre la liste des commandes filtrée sur ce statut
- [ ] L'âge de la plus ancienne commande de chaque statut est indiqué
- [ ] Une commande immobile depuis plus de 10 jours ouvrés est signalée
- [ ] Le panneau reste lisible au clavier et au lecteur d'écran : un tableau sous-jacent porte les mêmes chiffres
- [ ] Aucun rayon d'angle, chanfrein et filets conformes à la boutique

## Notes

**Un statut à zéro reste affiché.** Une case vide dans l'entonnoir dit quelque chose — « rien
n'est encore parti en production » n'est pas la même information qu'une ligne absente.

**L'âge est l'indicateur utile, pas le compte.** Douze commandes en production n'est pas
inquiétant ; une commande en production depuis trois semaines l'est. C'est ce que l'écran doit
faire remonter.

**Accessibilité.** Un graphique en SVG n'est pas lisible au lecteur d'écran. Le tableau
équivalent n'est pas une concession, c'est la source : le SVG le décore.

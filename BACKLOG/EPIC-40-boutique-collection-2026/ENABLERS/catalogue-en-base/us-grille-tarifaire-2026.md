# US — Grille tarifaire 2026 et coûts internes

**Statut Claude** : Fait

En tant que **responsable de la structure**, je veux **une grille de prix et de coûts pilotée
depuis l'admin** afin de **savoir ce que rapporte réellement chaque commande sans redéployer
quand un tarif fournisseur bouge**.

## Grille retenue

Prix affichés au client :

| Élément | Montant |
|---|---|
| Maillot | 40,00 € |
| Flocage au pseudo | + 5,00 € |
| Livraison standard | 5,00 € — 5 à 10 jours ouvrés après production |
| Livraison rapide | 10,00 € — 2 à 3 jours ouvrés après production |
| Franchise de port | à partir de 120,00 € de panier, soit 3 maillots |

Coûts internes, jamais exposés publiquement :

| Poste | Montant | Assiette |
|---|---|---|
| Production du maillot | 16,00 € | par maillot |
| Commission partenaire | 7,00 € | par maillot, **désactivée au lancement** |
| Frais e-commerce | 3,00 € | par maillot |
| Flocage | 0,00 € | par maillot, coût fournisseur encore inconnu |
| Port standard | 9,00 € | par colis |
| Port rapide | 12,00 € | par colis |

Coût unitaire au lancement : **19,00 €** hors port. **26,00 €** une fois la commission
partenaire activée.

## Critères d'acceptation

- [x] Les deux modes de livraison sont choisis au panier et tarifés par le serveur
- [x] La franchise s'applique aux deux modes dès que le sous-total atteint le seuil
- [x] Un seuil à zéro désactive la franchise au lieu d'offrir le port en permanence
- [x] Les frais de port ne sont comptés qu'une fois par commande, jamais par article
- [x] La commission partenaire s'active d'un interrupteur, sans migration ni déploiement
- [x] Tous les coûts sont éditables dans l'écran Réglages, avec le coût unitaire recalculé à l'écran
- [x] La commande fige `unitCostCents` et `shippingCostCents` à l'achat
- [x] La migration reprend l'ancien tarif unique comme tarif standard, sans perte

## Notes

**Pourquoi figer les coûts sur la commande.** Une marge est une photographie. Recalculer une
commande de mars avec les coûts de juin réécrirait l'histoire : la marge affichée cesserait
d'être celle réellement dégagée, et l'écart avec le compte bancaire deviendrait inexplicable.

**La livraison est vendue à perte, c'est assumé.** 5 € facturés contre 9 € de coût réel, 10 €
contre 12 €. Le port est un argument commercial financé par la marge du maillot, pas un
centre de profit. L'indicateur `shippingSoldAtLoss` le signale plutôt que de le laisser
découvrir en fin d'exercice.

**Le seuil de franchise à 120 € vaut exactement 3 maillots.** À ce panier, la commande
dégage 63 € de marge port compris — la gratuité reste largement couverte.

**La commission partenaire n'est pas active au lancement.** Elle change le coût unitaire de
19 € à 26 €, donc la marge d'un maillot seul port standard passe de 17,00 € à 10,00 €. Son
activation doit rester un geste d'administration, pas une reprise de code.

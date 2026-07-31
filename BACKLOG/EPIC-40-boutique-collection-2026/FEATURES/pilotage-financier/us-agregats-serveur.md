# US — Agrégats côté serveur

**Statut Claude** : A faire

En tant que **développeur de l'admin**, je veux **un endpoint qui renvoie les agrégats déjà
calculés** afin que **les chiffres affichés ne dépendent pas du filtre courant de la liste des
commandes**.

## Endpoint

`GET /admin/shop/stats?from=&to=` — permission `boutique:read`, jamais exposé publiquement.

Réponse :

```
{
  totals: {
    realisedCents, realisedMarginCents, realisedOrders,
    inFlightCents, inFlightMarginCents, inFlightOrders,
    pendingCents, pendingOrders,          // paniers abandonnés, comptés à part
    refundedCents, cancelledOrders,
    jerseyCount, averageBasketCents
  },
  byStatus: [{ status, orders, revenueCents, marginCents }],
  byWeek:   [{ weekStart, revenueCents, marginCents, orders }],
  byProduct:[{ productId, name, quantity, revenueCents, marginCents }],
  bySize:   [{ size, quantity }],
  shipping: {
    standard: { orders, billedCents, costCents },
    express:  { orders, billedCents, costCents },
    freeShippingOrders
  }
}
```

## Critères d'acceptation

- [ ] Les agrégats sont calculés en SQL, pas en chargeant toutes les commandes en mémoire
- [ ] `PENDING` est renvoyé dans son propre compteur, jamais additionné au chiffre d'affaires
- [ ] `CANCELLED` et `REFUNDED` sont exclus du réalisé comme de l'en-circulation
- [ ] La marge est calculée à partir des coûts figés sur chaque commande, pas des réglages du jour
- [ ] Les bornes `from` / `to` sont optionnelles ; sans elles, tout l'historique
- [ ] Une boutique sans aucune commande renvoie des zéros, pas une erreur ni des tableaux absents
- [ ] Aucun montant de coût n'est atteignable depuis le contrôleur public de la boutique
- [ ] Tests unitaires sur les quatre familles de statuts et sur le cas base vide

## Notes

**Pourquoi pas d'agrégation dans le navigateur.** La liste des commandes est paginée et
filtrable. Sommer ce qu'elle affiche donnerait un « chiffre d'affaires » qui change quand on
change de page — un indicateur qui bouge sans que rien ne se passe est pire que pas
d'indicateur.

**Les semaines, pas les jours.** Le rythme de production est hebdomadaire (lot transmis au
fournisseur). Une courbe journalière montrerait surtout le bruit des jours sans commande.

**Réutiliser `orderMargin`.** Le calcul de marge existe déjà dans `src/shop/shop-costs.ts` et
est couvert par des tests. L'agrégat doit s'appuyer dessus ou reproduire exactement sa
formule, sinon deux définitions de la marge cohabiteront et divergeront.

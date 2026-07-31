# US — Afficher les jobs `release` et `notify` dans le commentaire PR frontend

## Rôle / Action / Bénéfice

> **En tant que** PO / Tech Lead,
> **je veux** voir les statuts `release` (semantic-release) et `notify` (Discord) dans le commentaire PR frontend,
> **afin de** suivre le cycle release/notification sans ouvrir l'onglet Actions.

## Critères d'acceptation

- [ ] Le job `pr-report` ajoute `release` et `notify` à son `needs:`
- [ ] Variables `RELEASE_STATUS` et `NOTIFY_STATUS` exposées (fallback `skipped`)
- [ ] Deux nouvelles lignes dans la table principale :
  - `**Release (semantic-release)** | $RELEASE_STATUS | Tag automatique sur push main`
  - `**Notification Discord** | $NOTIFY_STATUS | Webhook deploy (PREPROD/PROD)`
- [ ] Sur PR classique : statut `skipped`, pas d'erreur, pas d'alerte
- [ ] Statut global non dégradé par ces deux jobs

## Effort estimé

XS (~20 min)

## Dépendances

- Aucune

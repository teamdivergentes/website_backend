# US — Afficher les jobs `release` et `notify` dans le commentaire PR backend

## Rôle / Action / Bénéfice

> **En tant que** PO / Tech Lead,
> **je veux** voir si semantic-release a tagué une nouvelle version et si la notification Discord a été envoyée,
> **afin de** suivre le cycle de release sans aller chercher l'info dans les logs Actions.

## Critères d'acceptation

- [ ] `pr-report` ajoute `release` et `notify` à son `needs:`
- [ ] Variables `RELEASE_STATUS` et `NOTIFY_STATUS` exposées (avec fallback `skipped` — normal sur PR car ces jobs ne tournent que sur push main / tag)
- [ ] La table principale du commentaire ajoute deux lignes :
  - `**Release (semantic-release)** | $RELEASE_STATUS | Tag automatique sur push main`
  - `**Notification Discord** | $NOTIFY_STATUS | Webhook deploy (PREPROD/PROD)`
- [ ] Sur une PR classique, ces deux lignes affichent `skipped` (statut neutre, pas d'erreur)
- [ ] Sur le commit de release `chore(release): vX.Y.Z`, un commentaire dédié n'est pas attendu (le job `pr-report` ne tourne que sur PR / issue_comment)
- [ ] Pas de régression : la PR d'une release manuelle (titre `[DEPLOY]`) continue d'afficher la section Déploiement comme avant

## Effort estimé

S (~30 min)

## Dépendances

- Aucune

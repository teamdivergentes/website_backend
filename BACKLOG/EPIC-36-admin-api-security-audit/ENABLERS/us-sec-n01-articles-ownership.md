# SEC-N01 — Ownership des articles (IDOR inter-CM)

**Sévérité** : 🟡 MOYENNE — **OWASP** : A01 (Broken Access Control / IDOR)
**Statut Claude** : A faire

## User Story

> **En tant que** Community Manager,
> **je veux** ne pouvoir modifier, dépublier ou mettre en avant **que les articles dont je suis l'auteur**,
> **afin que** le contenu d'un autre rédacteur ne puisse pas être altéré sans autorisation.

## Contexte technique

- `backend/src/articles/articles.controller.ts:73-101` : `update`, `togglePublished`, `toggleFeatured` accessibles au rôle `CM`.
- `articles.service.ts` (update/toggle) **ne filtre pas** sur `userId`.
- La création trace bien `userId` (auteur), mais la modification ne vérifie aucun ownership.
- Exploitation : un CM appelle `PATCH /api/articles/:id` / `.../toggle` / `.../featured` sur n'importe quel article (y compris ceux d'un autre CM ou d'un admin) et peut le dépublier/altérer.
- `DELETE` est réservé `admin` (moins exposé).

## Critères d'acceptation

- [ ] Un CM ne peut `update`/`togglePublished`/`toggleFeatured` que ses propres articles (`article.userId === req.user.id`).
- [ ] Un admin conserve le droit de modifier/toggle **tous** les articles.
- [ ] Une tentative de modification d'un article d'autrui par un CM renvoie **403 Forbidden** (pas 404, pour ne pas masquer un autre comportement — à valider PO).
- [ ] La logique d'ownership est testée (TU service + controller).
- [ ] E2E : un CM ne voit pas / ne peut pas modifier un article d'un autre auteur.

## Décision PO requise

Si le modèle métier est « contenu partagé » (tout CM gère tout le contenu), SEC-N01 devient un choix **documenté** plutôt qu'une faille → fermer l'US avec justification. Sinon, implémenter l'ownership.

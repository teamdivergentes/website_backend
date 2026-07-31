# US — Widget HelloAsso embarqué (iframe) sur `/adherer/helloasso`

## Role / Action / Benefice

> **En tant que** visiteur ayant choisi d'adhérer,
> **je veux** remplir le formulaire d'adhésion HelloAsso sur la page de souscription,
> **afin de** payer mon adhésion sans quitter le site.

## Criteres d'acceptation

- [ ] Formulaire d'adhésion HelloAsso intégré via **iframe** sur la sous-route **`/adherer/helloasso`**.
- [ ] Lien retour clair vers `/adherer` (fil d'ariane ou bouton).
- [ ] NB : le widget HelloAsso présente lui-même toutes les formules (la présélection d'un palier depuis la carte cliquée sur `/adherer` n'est pas garantie côté HelloAsso — l'utilisateur re-sélectionne dans le widget).
- [ ] L'URL d'embed HelloAsso est **externalisée** : éditable depuis l'admin via la table `Config` (clé ex. `helloasso_membership_url`) si possible, sinon variable de build documentée — **jamais hardcodée en dur** dans le composant.
- [ ] L'iframe porte un attribut `title` explicite (ex. « Formulaire d'adhésion HelloAsso ») — accessibilité.
- [ ] Dimensionnement responsive (hauteur adaptée mobile/desktop, pas de double scrollbar disgracieuse).
- [ ] État de chargement (skeleton/spinner) pendant le chargement de l'iframe.
- [ ] **Fallback** : si l'URL n'est pas configurée ou le widget indisponible, afficher un bouton/lien externe vers la campagne HelloAsso (dégradation gracieuse).
- [ ] Aucune erreur CSP en console (dépend de l'enabler CSP livré).

## Ressource HelloAsso (fournie PO 2026-05-27)

- **Embed iframe** : `https://www.helloasso.com/associations/team-divergentes/adhesions/adhesion-team-divergentes-1/widget`
- **Fallback** lien externe : `https://www.helloasso.com/associations/team-divergentes/adhesions/adhesion-team-divergentes-1`
- À stocker dans `Config` clé `helloasso_membership_url`.

## Notes techniques

- **Dépend de l'enabler `csp-helloasso`** : sans l'ajout de `helloasso.com` (et le cas échéant `*.helloasso.com`) à `frame-src` (et `script-src` si HelloAsso fournit un script d'embed plutôt qu'une iframe pure), l'iframe sera bloquée par la CSP.
- Vérifier le mode d'embed fourni par HelloAsso (iframe directe `haWidget` vs script loader) → adapte la CSP en conséquence.
- Pattern Config dynamique déjà utilisé sur le projet (liens sociaux, flags de visibilité) — réutiliser.

## Suivi

| Volet | Claude | PO | E2E | Livre |
|-------|--------|----|----|-------|
| Frontend | A faire | A faire | A faire | A faire |
| Backend (Config) | A faire | A faire | A faire | A faire |

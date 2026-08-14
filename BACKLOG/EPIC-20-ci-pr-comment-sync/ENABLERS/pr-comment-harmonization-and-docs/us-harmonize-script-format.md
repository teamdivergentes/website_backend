# US — Harmoniser le format des deux scripts `generate-pr-report.sh`

## Rôle / Action / Bénéfice

> **En tant que** mainteneur CI,
> **je veux** que les commentaires PR backend et frontend partagent la même structure visuelle,
> **afin que** les reviewers retrouvent les mêmes repères dans les deux dépôts et que les évolutions futures soient répliquées symétriquement.

## Critères d'acceptation

- [x] Les deux scripts utilisent les mêmes emojis pour les mêmes sections :
  - `🔧 Détails du build` (table principale)
  - `🐳 Image Docker`
  - `📋 Informations sur le build`
  - `🚀 Déploiement`
  - `🔍 Sécurité image (Trivy)`
  - `🎭 Tests E2E` (frontend uniquement, backend a `Tests E2E` dans la table principale)
  - `🗄️ Migrations Prisma` (backend uniquement)
  - `🗄️ Base de données` (backend uniquement)
  - `⚡ Lighthouse` (frontend uniquement)
  - `🔁 E2E Full-Stack` (frontend uniquement)
- [x] L'ordre des sections est identique dans les deux scripts (sauf sections spécifiques à un dépôt)
- [x] Le titre du commentaire suit le pattern `## ${STATUS_EMOJI} Rapport de Build - {Backend NestJS|Frontend Angular}`
- [x] Le pied de page identique : `*Ce rapport a été généré automatiquement par le pipeline CI/CD.*`
- [x] La logique de calcul `OVERALL_STATUS` est documentée par un commentaire en tête de la section, identique dans les deux scripts
- [x] Pas de duplication inutile : si une fonction shell peut être factorisée (ex: rendu d'une ligne de table avec emoji selon statut), la mettre en haut du script sous forme de fonction réutilisable

## Effort estimé

S (~1 h)

## Dépendances

- Tous les enablers `backend-pr-comment-sync` et `frontend-pr-comment-sync` livrés

## Note

Pas de partage de code entre dépôts (3 repos Git distincts, pas de sous-modules). Chaque script reste autonome dans son dépôt.

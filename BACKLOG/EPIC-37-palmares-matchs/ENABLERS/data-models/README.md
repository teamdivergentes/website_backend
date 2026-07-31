# ENABLER — Modèles de données Trophy & Match

**EPIC** : EPIC-37 — Palmarès & Matchs
**Contexte technique** : aucun modèle palmarès/match n'existe. Cet enabler crée la couche données + permissions, prérequis des 2 features.

## Contenu

- Migration Prisma : modèles `Trophy` (table `trophies`) et `Match` (table `matches`) — schéma détaillé dans la spec design
- FK : `Trophy.teamId` nullable (`SetNull`) + `teamLabel` fallback ; `Match.teamId` (`Cascade`) ; `Match.articleId` nullable (`SetNull`)
- Index : `trophies(teamId)`, `matches(teamId)`, `matches(scheduledAt)`
- Permissions `trophies:read|write|delete` + `matches:read|write|delete` ajoutées aux rôles système Admin et CM (migration de seed)
- Config seed : `page_palmares_visible`

## Suivi

| US | Claude | PO | E2E | Livré |
|----|--------|----|----|-------|
| [us-trophy-match-models](us-trophy-match-models.md) | Fait | A faire | N/A | A faire |

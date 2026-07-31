# ENABLER — Catalogue en base

**Branche** : `feat/boutique-commandes` (backend)

## Contexte technique

Le catalogue vivait dans une constante TypeScript (`src/shop/shop-catalog.ts`), modifiable
uniquement par déploiement. Les prix, les frais de port et le surcoût de flocage doivent
pouvoir changer à chaud : le catalogue passe donc en base.

Les commandes deviennent multi-articles. Les lignes figent libellé, prix et surcoût à
l'achat — le catalogue étant désormais éditable, une commande de mars doit rester lisible
avec le prix de mars.

## Suivi

| US | Claude | PO | E2E | Livré |
|----|--------|----|----|-------|
| [Modèles et migration](us-modeles-migration.md) | Fait | A faire | A faire | A faire |
| [Tarification serveur et flocage](us-tarification-flocage.md) | Fait | A faire | A faire | A faire |
| [Grille tarifaire 2026 et coûts internes](us-grille-tarifaire-2026.md) | Fait | A faire | A faire | A faire |

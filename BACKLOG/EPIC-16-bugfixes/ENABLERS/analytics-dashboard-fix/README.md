# Enabler — Analytics dashboard UX fix

## Contexte technique

Le dashboard `/admin/analytics` (composant `analytics-dashboard.component.*`) affiche des donnees Google Analytics 4 via le backend (`backend/src/analytics/`). Bugs UX constates :

1. **Chargement initial vide** : a l'ouverture de la page, aucun retour. L'utilisateur doit changer manuellement la duree dans le date-range-picker pour voir des donnees.
2. **Metriques vides persistantes** : meme apres changement de duree, certaines KPI/sections restent vides sans explication (probable absence de donnees pour la periode ou metrique non disponible).
3. **Sous-estimation due au consent cookie** : seuls les visiteurs ayant accepte les cookies sont traques (fraction non negligeable refuse → stats sous-evaluees). L'admin n'a pas conscience de ce biais en lisant les chiffres.

## Direction technique

- Charger automatiquement la periode par defaut (7 derniers jours) au `ngOnInit` sans attendre une action utilisateur.
- Pour chaque KPI / section, en cas de donnee absente → afficher un placeholder explicite (`--` + tooltip "Donnee non disponible sur cette periode") plutot qu'un blanc.
- Ajouter en haut du dashboard un bandeau d'information non bloquant (style `mat-card` discret) : "Statistiques basees uniquement sur les visiteurs ayant consenti aux cookies. Pour une vue exhaustive, voir le futur EPIC-18 (Analytics CNIL-friendly)."

## US

| US | Claude | PO | E2E | Livre |
|----|--------|----|----|-------|
| [us-fix-default-range-loading.md](us-fix-default-range-loading.md) | Fait | A faire | A faire | A faire |
| [us-empty-metrics-placeholder.md](us-empty-metrics-placeholder.md) | Fait | A faire | A faire | A faire |
| [us-consent-info-banner.md](us-consent-info-banner.md) | Fait | A faire | A faire | A faire |

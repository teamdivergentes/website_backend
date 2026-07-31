# US — Bandeau matchs sur la page d'accueil

**Statut Claude** : Fait (2026-06-04)

**En tant que** fan,
**je veux** voir le prochain match et les derniers résultats dès la page d'accueil,
**afin de** ne jamais rater un match de la structure.

## Critères d'acceptation

- [x] Bandeau compact horizontal (mockup A validé PO) : prochain match à gauche (DVG vs adversaire, compétition, date/heure locale, équipe), 2 derniers résultats à droite (V/D coloré vert `#32D299` / rouge + score)
- [x] Bouton « ▶ Regarder » si `streamUrl` renseignée (lien externe `rel="noopener"`)
- [x] Données : `GET /api/matches?status=upcoming&limit=1` + `GET /api/matches?status=past&limit=2`
- [x] Le bandeau ne s'affiche pas du tout s'il n'y a ni match à venir ni résultat (pas de bloc vide)
- [x] Responsive : empilement propre sur mobile
- [x] Pas de CLS : hauteur réservée pendant le chargement
- [ ] TU composant ; E2E : bandeau visible sur la home avec données seedées, absent sans données

# US — Admin matchs (CRUD CM + saisie rapide de résultat)

**Statut Claude** : Fait (2026-06-04)

**En tant que** Community Manager,
**je veux** gérer les matchs et saisir les scores rapidement depuis le panel admin,
**afin de** tenir l'agenda et les résultats à jour sans friction.

## Critères d'acceptation

- [x] Page admin Material : table triée par date (à venir en haut), colonnes équipe, adversaire, date, compétition, score, statut dérivé (À venir / Résultat / En attente de score), actif
- [x] Dialog création/édition : équipe (sélecteur requis), adversaire, logo adversaire (upload existant), date/heure, compétition, lien stream, lien article Match Report (sélecteur d'articles), actif
- [x] **Action rapide « Saisir le résultat »** sur un match passé : mini-dialog 2 champs (score DVG / score adversaire) sans repasser par le formulaire complet
- [x] Visible uniquement avec la permission `matches:read`
- [ ] TU composants ; E2E : un CM crée un match futur → visible sur la home ; saisit le score après coup → le résultat apparaît dans les derniers résultats

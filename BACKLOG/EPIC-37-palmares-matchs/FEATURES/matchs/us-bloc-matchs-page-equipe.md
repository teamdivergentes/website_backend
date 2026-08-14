# US — Bloc matchs sur la page équipe

**Statut Claude** : Fait (2026-06-04)

**En tant que** fan d'une équipe DVG,
**je veux** voir l'agenda et les derniers résultats de cette équipe sur sa page,
**afin de** suivre spécifiquement mon équipe favorite.

## Critères d'acceptation

- [x] Bloc compact sur la page équipe : prochain match de l'équipe + ses 3 derniers résultats (même style que le bandeau home)
- [x] Données : `GET /api/matches?teamId=X&status=upcoming&limit=1` + `?teamId=X&status=past&limit=3`
- [x] Lien vers l'article Match Report si `articleId` renseigné sur un résultat
- [x] Section absente si l'équipe n'a aucun match
- [ ] TU composant ; E2E : bloc visible sur une équipe seedée avec matchs

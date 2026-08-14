# FEATURE — Matchs

**EPIC** : EPIC-37 — Palmarès & Matchs
**Branche** : `feat/epic-37-matchs`
**Routes** : bandeau home `/`, bloc page équipe, page admin matchs, `GET|POST|PATCH|DELETE /api/matches`
**Dépend de** : ENABLER data-models

## Description

Agenda des matchs (à venir + résultats passés) saisi manuellement par les CM. Statut dérivé (pas de machine à états) : à venir = date future ; résultat = date passée + scores remplis ; date passée sans score = non affiché en public. Bandeau compact sur la home (prochain match + 2 derniers résultats — choix PO mockup A), bloc par équipe sur sa page.

## Suivi

| US | Claude | PO | E2E | Livré |
|----|--------|----|----|-------|
| [us-api-matches](us-api-matches.md) | Fait | A faire | A faire | A faire |
| [us-bandeau-home](us-bandeau-home.md) | Fait | A faire | A faire | A faire |
| [us-bloc-matchs-page-equipe](us-bloc-matchs-page-equipe.md) | Fait | A faire | A faire | A faire |
| [us-admin-matchs](us-admin-matchs.md) | Fait | A faire | A faire | A faire |

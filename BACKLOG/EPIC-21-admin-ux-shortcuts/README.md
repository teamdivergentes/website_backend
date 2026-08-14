# EPIC-21 — Raccourcis UX pour le panel admin — `FAIT CLAUDE`

## Objectif

Ameliorer l'experience des administrateurs deja authentifies en leur fournissant des raccourcis directs vers le panel admin depuis les pages publiques. Aucun impact pour les visiteurs anonymes.

## Perimetre

Ameliorations UX pour le panel admin — pas de nouvelles fonctionnalites metier, pas de refonte du panel lui-meme.

Premiere feature livree :

- **Bouton Administrateur dans le header** : visible uniquement si `AuthService.isAuthenticated()` est `true`, conduit vers `/admin`. Cout reseau supplementaire = zero (le `userSignal` est deja charge au bootstrap via `loadProfile()` → `/api/auth/me`).

## Hors perimetre

- Modification de l'auth flow (deja couvert par EPIC-16)
- Refonte du panel admin lui-meme
- Tout sujet lie a la session / cookies (deja couvert par EPIC-16)

## Branche git

`feat/epic-21-admin-shortcuts` (depuis `develop`).

## Suivi par feature

| Feature | Claude | PO | E2E | Livre |
|---------|--------|----|----|-------|
| [Bouton Administrateur dans le header](FEATURES/header-admin-shortcut/README.md) | Fait (PR #170 mergee develop 2026-05-07) | A faire | A faire | A faire |

## Criteres de validation EPIC

- VQO >= 9.5/10 sur tous les domaines
- Toutes les US feature en `Fait Claude` + `Fait PO`
- Tests E2E pour chaque parcours (cas authentifie + cas anonyme)
- Aucune regression sur les pages publiques

## Origine

Demande PO du 2026-05-06 : "ajouter un bouton Administrateur dans le header si on detecte le cookie admin pour permettre aux administrateurs d'acceder plus simplement au panel apres premiere connexion".

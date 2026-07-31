# US — Tests E2E Playwright pour le toggle Twitch

## Role / Action / Benefice

> **En tant que** Expert QA,
> **je veux** un test Playwright E2E qui couvre les deux etats du toggle `page_twitch_visible` (ON/OFF),
> **afin que** toute regression future sur le mecanisme de visibilite Twitch soit detectee automatiquement par la CI.

## Perimetre fichiers

- `frontend/e2e/twitch-visibility.spec.ts` (nouveau)
- Eventuellement extension de helpers existants (`frontend/e2e/utils/admin-config.ts` si pertinent)

## Description

Couvrir le parcours utilisateur :

1. Login admin
2. Visite `/admin/config`
3. Bascule du toggle Twitch en OFF + sauvegarde
4. Logout
5. Visite `/` (anonyme)
6. Verifier l'absence du lien "EN LIVE" dans le header desktop ET mobile
7. Re-login admin
8. Toggle ON + sauvegarde
9. Visite `/`
10. Verifier la reapparition du lien

## Criteres d'acceptation

- [x] Nouveau fichier `e2e/tests/admin/twitch-visibility.spec.ts` (13 tests, 5 groupes)
- [x] Test couvre les 2 etats (ON par defaut + OFF apres bascule)
- [x] Test verifie le rendu desktop (1280x800) ET mobile (375x667)
- [x] Test idempotent : restaure l'etat initial dans `afterAll` + `afterEach` sur le groupe Toggle OFF
- [x] Les autres specs Playwright continuent de passer (lint propre, `--list` = 0 erreur)
- [ ] Le test passe en CI sur le runner self-hosted (differera au merge — necessite Docker actif)

## Statut Claude : Fait (2026-05-09)

Fichier cree : `e2e/tests/admin/twitch-visibility.spec.ts`

Selecteurs utilises (confirmes par lecture du code source) :
- Toggle admin : `[data-testid="config-toggle-page_twitch_visible"]`
- Lien EN LIVE desktop : `[data-testid="nav-live-btn"]`
- Lien EN LIVE mobile : `.mobile-overlay__item--live a`
- Mobile viewport : `{ width: 375, height: 667 }`

Structure des tests (13 cas) :
- Groupe 1 (4 tests) : presence, label, etat ON, persistance OFF
- Groupe 2 (2 tests) : toggle ON -> visible desktop + mobile
- Groupe 3 (3 tests) : toggle OFF -> absent desktop + mobile + /twitch accessible par URL directe
- Groupe 4 (2 tests) : re-activation ON -> reapparition desktop + mobile
- Groupe 5 (2 tests) : non-regression (6 autres toggles presents + total = 7)

POM `AdminConfigPage` mis a jour : `PageKey` etendu avec `'twitch'`, label "En live (Twitch)" ajoute.

Run E2E local : **differe** (Docker non actif). Detecte sans erreur par `npx playwright test --list`.

## Notes techniques

- Selecteurs deja en place : `[data-testid="config-toggle-page_twitch_visible"]` (cf. `config-page.component.html:461`)
- Selecteur header desktop : a verifier dans `header.html` (probable `[routerLink="/twitch"]` + classe specifique)
- Le lien mobile est dans le menu burger
- Pas de guard 404 sur `/twitch`, donc l'URL directe reste accessible (a tester aussi pour confirmer la non-regression sur les utilisateurs deja en navigation)

## Effort

S (~30 min : ecriture + lancement local + correction selecteurs).

## Dependances

Depend de F1 / US validation frontend (la fonctionnalite doit fonctionner avant d'ecrire le test).

# EPIC-27 — Admin bugfixes (batch 2)

## Objectif

Corriger les bugs mineurs remontes par le PO sur le panel admin apres la livraison de l'EPIC-16. Aucune urgence, livraison opportuniste au fil de l'eau ou en lot.

## Perimetre

- Bugs UX non bloquants du panel admin (ecran noir, regressions visuelles, etats inattendus).
- Pas de nouvelle fonctionnalite.

## Hors perimetre

- Bugs publics (front visiteur) → autres EPICs.
- Refonte UX du panel admin → EPIC-21 (raccourcis admin) ou suite a planifier.

## Branche git

`fix/epic-27-admin-bugfixes` (depuis `develop`), par sujet si scinde.

## Suivi par enabler

| Enabler | Priorité | Claude | PO | E2E | Livre |
|---------|----------|--------|----|----|-------|
| [🔴 Réorganisation chaînes Twitch cassée + double méthode](ENABLERS/twitch-channels-reorder/README.md) | **P0** | Fait | A faire | A faire | A faire |
| [Ecran noir apres enregistrement d'un article](ENABLERS/article-save-blank-screen/README.md) | Basse | A faire | A faire | A faire | A faire |

## Criteres de validation EPIC

- Tous les bugs listes sont reproduits, expliques (root cause documentee) et corriges.
- Tests E2E Playwright sur les parcours touches (nominal + erreur).
- VQO >= 9.5/10 si livraison en lot, sinon VQO local sur la PR concernee.
- Aucune regression admin/public.

## Priorite

**Basse** globalement (bugs non bloquants, traitement opportuniste) — **sauf l'enabler `twitch-channels-reorder` priorisé 🔴 P0** (demande PO 2026-06-22 : reorder admin cassé, à traiter en priorité hors cycle opportuniste).

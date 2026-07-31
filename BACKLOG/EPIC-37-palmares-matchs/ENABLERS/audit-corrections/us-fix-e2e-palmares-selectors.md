# US — Réaligner les sélecteurs E2E palmarès sur le DOM actuel

**Sévérité** : 🔴 Bloquant (CI rouge garanti)
**Domaine** : Frontend (E2E Playwright)
**ID audit** : FRONT-B2

## Rôle / Action / Bénéfice

**En tant qu'** équipe QA,
**je veux** que les specs E2E du palmarès ciblent le DOM réellement rendu,
**afin de** ne pas bloquer la CI avec des tests qui échouent en timeout.

## Contexte technique

Le redesign « salle des trophées » (hero monument + mosaïque + timeline) a été introduit **après** l'écriture initiale du spec E2E, sans mise à jour des sélecteurs. `e2e/tests/admin/palmares.spec.ts` utilise encore :
- `.featured-rail .featured-card` (n'existe plus → `.mosaic-section .mosaic-grid .mosaic-card`)
- `.history .year-heading` (n'existe plus → `.history .year-group .year-label`)

## Critères d'acceptation

- [ ] Les sélecteurs du parcours public dans `palmares.spec.ts` (lignes ~481-484 et ~495-496) sont alignés sur le DOM actuel (`.hero-monument`, `.mosaic-card .mosaic-competition`, `.year-label`).
- [ ] La légende des sélecteurs en tête de fichier (lignes ~35-41) est mise à jour.
- [ ] `npx playwright test palmares` passe au vert sur l'instance Docker.
- [ ] Aucun autre spec impacté par le renommage.

# US — Gérer les scores partiels/manquants dans le bandeau matchs

**Sévérité** : 🔴 Bloquant (comportement visible utilisateur)
**Domaine** : Frontend (`match-strip`)
**ID audit** : FRONT-B3

## Rôle / Action / Bénéfice

**En tant que** visiteur,
**je veux** ne jamais voir de score aberrant (`null-null`, `NaN`) sur un match,
**afin d'** avoir un affichage fiable même si un résultat est incomplet en base.

## Contexte technique

`match-strip.html` interpole `{{ match.scoreDvg }}-{{ match.scoreOpponent }}` sans garde. Si un match « résultat » a des scores `null`, le badge affiche `null-null` (ou `NaN` via `matchOutcome`).

## Critères d'acceptation

- [ ] L'affichage du score/badge est conditionné à `matchOutcome(match) !== null` (les deux scores renseignés).
- [ ] Un match sans score valide n'affiche pas de badge de résultat (ou un état neutre défini).
- [ ] Test unitaire `match-strip.spec.ts` couvrant le cas « scores manquants ».

## Lien

Complète la protection back (`assertScoresPaired`, cf. [us-dettes-mineures-backend](us-dettes-mineures-backend.md)) qui empêche le stockage d'une paire asymétrique incluant `null`.

# US — Afficher les TU Karma dans le commentaire PR frontend (fix)

## Rôle / Action / Bénéfice

> **En tant que** reviewer frontend,
> **je veux** voir le statut des tests unitaires Karma dans la table du commentaire CI,
> **afin de** ne pas avoir à ouvrir l'onglet Actions pour vérifier que les TU sont passés.

## Critères d'acceptation

- [ ] `frontend/.github/scripts/generate-pr-report.sh` lit `TEST_STATUS` (déjà passé en env par le job `pr-report` mais jamais utilisé)
- [ ] La table « 🔧 Détails du build » contient une ligne `**Tests unitaires** | $TEST_STATUS | Tests unitaires Karma/Jasmine`, insérée entre `Linter` et `Sécurité`
- [ ] Le contrôle initial de variables (ligne 9) inclut `TEST_STATUS` parmi les obligatoires
- [ ] Le calcul `OVERALL_STATUS` (ligne 19) inclut `$TEST_STATUS == "success"` comme condition
- [ ] Sur une PR avec TU en échec, le statut global passe à `❌ FAILED`
- [ ] Aucun changement côté `cicd.yml` (le job `test` est déjà dans `needs:` du `pr-report` et la variable est déjà passée)

## Effort estimé

XS (~15 min)

## Dépendances

- Aucune (autonome)

## Note

C'est un bug existant. Probablement issu d'un copier-coller du script backend avant que le job `test` frontend existe.

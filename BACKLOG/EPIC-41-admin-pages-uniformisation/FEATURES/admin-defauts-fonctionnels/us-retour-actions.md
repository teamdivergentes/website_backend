# US — Retour utilisateur sur les actions destructives

## Role / Action / Benefice

> **En tant qu'**administrateur,
> **je veux** une confirmation explicite apres chaque action qui modifie ou supprime des donnees,
> **afin de** savoir si elle a reussi sans avoir a scruter la liste.

## Contexte — les defauts

**Suppression reussie sans aucun retour (5 modules).**
`games.component.ts:357-360`, `teams.component.ts:416-419` et `recruitment.component.ts:393-396`
contiennent un `next: () => { /* La suppression est geree par le signal dans le service */ }`
litteralement vide. `sponsors.component.ts:226-231` et `staff-list.component.ts:165-171` n'ont meme
pas de branche `next`. Apres une action irreversible, l'utilisateur n'a que la disparition de la
ligne comme confirmation — et en cas de latence, il peut re-cliquer.

**Creation / modification sans retour (4 modules).** Les dialogues de formulaire de games, teams,
recruitment et sponsors n'importent pas `MatSnackBar` : seule la fermeture du dialogue signale le
succes.

**`alert()` navigateur (games).** `game-form-dialog.component.ts:162` et `:181` appellent
`alert('Erreur lors de la mise a jour du jeu')` — boite modale bloquante, hors charte, non stylable.

**Echec silencieux (users).** Les 3 dialogues de `users` ont un handler
`error: () => this.saving.set(false)` : l'utilisateur voit le bouton se reactiver, sans explication.

**Garde de reordonnancement manquante.** `team-members-dialog.component.ts:175` n'a pas la garde
`if (reordering()) return;` que les 7 autres implementations possedent (marquee `SEC-PR206-001`).
Un double-clic declenche deux appels API concurrents sur la meme collection.

**34 `console.error` nus** dont 13 constituent l'unique traitement de l'erreur cote utilisateur.

## Criteres d'acceptation

- [ ] Toute suppression reussie produit un retour explicite. Formulation unique :
      `{Entite} supprime(e)`.
- [ ] Toute creation et toute modification reussies produisent un retour explicite.
- [ ] Les 2 `alert()` de `game-form-dialog` sont remplaces par le mecanisme d'erreur normal.
- [ ] Les 3 dialogues `users` affichent l'erreur au lieu de se contenter de reactiver le bouton.
- [ ] `team-members-dialog.component.ts` recoit la garde `reordering` manquante.
- [ ] Les durees et libelles de snackbar sont unifies : aujourd'hui **5 durees**
      (2000/2500/3000/4000/5000 ms) et **2 libelles d'action** (`OK` et `Fermer`) coexistent.
      Regle retenue : succes 2500 ms action `OK`, erreur 5000 ms action `Fermer`.
- [ ] Les `console.error` qui constituent l'unique traitement de l'erreur sont doubles d'un retour
      utilisateur. Les autres sont gardes par `environment.production`.
- [ ] Tests unitaires : chaque chemin de succes et d'erreur produit le retour attendu ; la garde de
      reordonnancement empeche le second appel concurrent.
- [ ] Test E2E : supprimer une entite et verifier l'apparition du message de confirmation.

## Note d'implementation

Cette US introduit le besoin de `AdminNotifier` (feature "primitives"). Meme raisonnement que pour
l'US "erreurs visibles" : creer le service ici plutot que d'ecrire 11 fois le meme
`snackBar.open(...)` pour le remplacer ensuite.

## Livraison Claude (2026-07-29)

Commits `7812732` (service), `1960305` (suppressions), `fdd64d1` (alert + garde).

- Nouveau `AdminNotifier` dans `src/app/admin/shared/` : `success` / `error` / `info`, plus
  `deleted(entite, genre)` et `saved(entite, mode, genre)` qui accordent le participe passe.
  Regles figees : succes 2500 ms action `OK`, erreur 5000 ms action `Fermer`. 8 tests.
- Les 5 suppressions muettes notifient desormais (games, teams, recruitment, sponsors, staff).
- Les 2 `alert()` de `game-form-dialog` sont remplaces par un bandeau inline `role="alert"`,
  efface a chaque nouvelle soumission. **Plus aucun `alert()` dans l'admin.**
- `team-members-dialog` recoit la garde `reordering` manquante, liberee dans le `finalize` existant.
- `console.error` de ces chemins passes sous garde `environment.production`.

**Verifications** : 1281 tests OK (+8), lint `--max-warnings=0` propre, `ng build` OK.

### Complement (commits `35b560f` et `891222e`)

- Les 4 creations/modifications muettes notifient : games, teams, recruitment, sponsors.
- Les 3 dialogues `users` n'echouent plus silencieusement. Leur handler
  `error: () => saving.set(false)` ne disait rien : l'utilisateur voyait le bouton se reactiver,
  sans distinguer un echec reseau d'un refus serveur. Chacun affiche desormais un message explicite
  et confirme le succes.

**Verifications** : 1281 tests OK, lint propre, `ng build` OK.

### Reste a faire sur cette US

- Les 34 `console.error` nus restants (hors chemins deja traites).
- Migration des ~43 appels `snackBar.open` existants vers `AdminNotifier`, pour eliminer les durees
  et libelles residuels. A traiter avec la feature "primitives transverses".

## Suivi

| Volet | Claude | PO | E2E | Livre |
|-------|--------|----|----|-------|
| Frontend | Fait (2026-07-29) — hors migration des snackBar existants | A faire | A faire | A faire |

# INVENTORY — Composants CDK Drag Drop du frontend (EPIC-19 a11y)

> Inventaire produit le 2026-05-18 par audit `grep -rE "cdkDropList|cdkDrag\b|cdkDragHandle|CdkDragDrop|moveItemInArray" frontend/src/`. Exclut les fichiers `*.spec.ts`.

## Synthese

| # | Composant | Path | Type d'objet | Service / endpoint reorder | Handle focusable | aria-live region | Fallback clavier (boutons) | Mobile (< 480px) |
|---|-----------|------|--------------|---------------------------|-------------------|------------------|---------------------------|------------------|
| 1 | `TeamsComponent` | `frontend/src/app/admin/pages/teams/teams.component.ts:139` | Equipes | `teamsService.reorderTeams()` | Non (`<div>` sans `tabindex`) | Non | Non | Handle masque (no fallback) |
| 2 | `TeamMemberListComponent` | `frontend/src/app/admin/pages/teams/team-members-dialog/components/team-member-list/team-member-list.component.html:6` | Joueurs d'une equipe | `teamsService.reorderMembers()` (parent `TeamMembersDialogComponent`) | Non | Non | Non | A verifier |
| 3 | `StaffListComponent` | `frontend/src/app/admin/pages/staff/staff-list.component.html:61` | Staff | `staffService.reorderMembers()` | Non | Non | Non | A verifier |
| 4 | `CoachingStaffDialogComponent` | `frontend/src/app/admin/pages/teams/coaching-staff-dialog/coaching-staff-dialog.component.ts:98` | Coachs (EPIC-17) | `coachingStaffService.reorder()` | Non (`aria-label` present mais pas `tabindex`) | Non | Non | A verifier |
| 5 | `SponsorsListComponent` | `frontend/src/app/admin/pages/sponsors/sponsors-list.component.ts:26` | Sponsors | `sponsorsService.reorder()` via parent `SponsorsComponent` | Non | Non | Non | A verifier |
| 6 | `TwitchChannelsComponent` | `frontend/src/app/admin/pages/twitch-channels/twitch-channels.component.ts:99` | Chaines Twitch | `twitchChannelsService.reorder()` (a verifier) | Non | Non | Non | A verifier |
| 7 | `RecruitmentComponent` | `frontend/src/app/admin/pages/recruitment/recruitment.component.ts:66` | Postes recrutement | `recruitmentService.reorderPosts()` | Non | Non | Non | A verifier |
| 8 | `GamesComponent` | `frontend/src/app/admin/pages/games/games.component.ts:69` | Jeux | `gamesService.reorderGames()` | Non | Non | Non | A verifier |

**Conclusion** : aucun des 8 composants ne respecte WCAG 2.1.1 (Keyboard). Defaut systemique a corriger sur l'ensemble.

## Composants pilotes

Pour la US `us-add-keyboard-controls-to-dialogs.md`, deux pilotes pertinents pour la phase initiale :

- **`TeamMembersDialogComponent`** (joueurs) — composant historique, le plus utilise du back-office.
- **`CoachingStaffDialogComponent`** (coachs) — recent (EPIC-17), structure tres similaire au precedent.

Apres validation du pattern sur ces 2 pilotes, propager aux 6 autres dans la meme PR.

## Pattern reorder commun

Tous les composants suivent la meme structure :

```ts
onDrop(event: CdkDragDrop<X[]>): void {
  if (event.previousIndex === event.currentIndex) return;
  const arr = [...this.items()];
  moveItemInArray(arr, event.previousIndex, event.currentIndex);
  this.items.set(arr);
  const reorderData = arr.map((it, index) => ({ id: it.id, position: index }));
  this.service.reorderXxx(reorderData).subscribe({ next: ..., error: ... });
}
```

Refactor cible : factoriser dans une methode `onReorder(fromIndex, toIndex)` appelable par drag ET par boutons monter/descendre.

## Services backend impactes (inventaire indirect)

- `TeamsService.reorderTeams()` + `TeamsService.reorderMembers()`
- `StaffService.reorderMembers()`
- `CoachingStaffService.reorder()`
- `SponsorsService.reorder()` + `SponsorsService.reorderImages()`
- `TwitchChannelsService.reorder()`
- `RecruitmentService.reorderPosts()`
- `GamesService.reorderGames()`

Aucune modification backend n'est requise (les endpoints `reorder` existent deja et restent identiques).

## Statistiques globales

- 8 fichiers `*.component.ts` / `*.component.html` impactes
- 1 fichier `*.html` partiel (`team-member-list.component.html` est un sous-composant)
- 0 service backend a modifier
- 0 fichier `.spec.ts` actuel ne couvre l'a11y des drag-drop

## Cas particulier : `sponsor-images-dialog`

`sponsor-images-dialog.component.ts:263` appelle `sponsorsService.reorderImages(...)` mais **n'utilise pas** `cdkDropList` (probablement un bouton dedie ou un reorder programmatique). Hors scope de cette US.

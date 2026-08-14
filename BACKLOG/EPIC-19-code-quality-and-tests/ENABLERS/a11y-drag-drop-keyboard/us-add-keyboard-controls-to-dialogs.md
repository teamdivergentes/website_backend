# US — Ajouter des controles clavier "Monter / Descendre" aux composants drag-drop

## Role / Action / Benefice

> **En tant qu**'utilisateur navigant au clavier ou via lecteur d'ecran,
> **je veux** pouvoir reordonner les elements dans les listes drag-drop sans souris,
> **afin que** la fonctionnalite respecte WCAG 2.1.1 (Keyboard, niveau A) et soit utilisable par tous.

## Contexte

L'audit VQO du 2026-05-07 a constate que le drag-drop CDK natif n'est pas opérable au clavier (handle non focusable, pas de fallback). Cette US vise a ajouter des **boutons "monter / descendre"** en parallele du drag-drop, pattern le plus simple et universellement compris.

Le `INVENTORY.md` produit par `us-audit-cdk-drag-drop-usage.md` liste les composants impactes.

## Criteres d'acceptation

### Fonctionnel

- [ ] Pour chaque composant identifie dans l'inventaire, ajouter dans la zone d'actions de chaque ligne :
  - Bouton "Monter" (`mat-icon-button` avec `arrow_upward`) — desactive si `i === 0`
  - Bouton "Descendre" (`mat-icon-button` avec `arrow_downward`) — desactive si `i === items.length - 1`
- [ ] `aria-label` dynamique : `"Deplacer {nom} vers le haut"` / `"... vers le bas"`
- [ ] Au clic, appeler la meme methode que celle declenchee par drag-drop (factoriser dans `onReorder(fromIndex, toIndex)`).
- [ ] Le drag-drop reste fonctionnel pour les utilisateurs souris (pas de regression).

### Couverture composants (depend de l'inventaire)

A minima les 3 dialogs suivants doivent recevoir le traitement :
- [ ] `team-members-dialog.component.ts` (joueurs)
- [ ] `coaching-staff-dialog.component.ts` (coachs)
- [ ] `teams.component.ts` (equipes)

Ajouter les autres composants identifies dans `INVENTORY.md`.

### Tests

- [ ] TU : pour chaque composant pilote, ajouter un test "should call onReorder when moveUp/moveDown is clicked".
- [ ] TU : `disabled` correctement en bordure de liste.
- [ ] E2E (1 spec par composant) : login admin → ouvrir dialog → focus sur la liste → presser `Tab` jusqu'a "Monter" sur la 2eme ligne → presser `Espace` → verifier que la ligne est passee en position 1.

### Mobile

- [ ] Si le drag handle est masque sous 480px (cas `teams.component.ts`), les boutons monter/descendre doivent rester visibles → l'utilisateur peut reordonner sans drag.

## Approche technique

```html
<div class="row" cdkDrag>
  <button mat-icon-button [disabled]="i === 0" 
          (click)="moveItem(i, i - 1)"
          [attr.aria-label]="'Deplacer ' + item.name + ' vers le haut'">
    <mat-icon>arrow_upward</mat-icon>
  </button>
  <button mat-icon-button [disabled]="i === items().length - 1"
          (click)="moveItem(i, i + 1)"
          [attr.aria-label]="'Deplacer ' + item.name + ' vers le bas'">
    <mat-icon>arrow_downward</mat-icon>
  </button>
  <div cdkDragHandle aria-hidden="true">⋮⋮</div>
  ...
</div>
```

```ts
moveItem(from: number, to: number): void {
  const arr = [...this.items()];
  const [moved] = arr.splice(from, 1);
  arr.splice(to, 0, moved);
  this.items.set(arr);
  this.persistOrder(arr);
  this.announceMove(moved.name, to + 1, arr.length);
}
```

`announceMove` met a jour le signal `liveMessage` (cf. `us-add-aria-live-region-on-reorder.md`).

## Effort

M (~1 j si l'inventaire fait 3-5 composants, plus si davantage)

## Dependances

- Bloque par : `us-audit-cdk-drag-drop-usage.md` (inventaire)
- A faire en parallele de : `us-add-aria-live-region-on-reorder.md` (memes composants)

## Statut Claude

Fait (2026-05-18) — PR #206 (frontend) `chore/epic-19-a11y-drag-drop`. 8 composants modifies, boutons Monter/Descendre + refactor `onReorder()` partage, +149 tests, 1191/1191 SUCCESS, coverage 72.9% lines.

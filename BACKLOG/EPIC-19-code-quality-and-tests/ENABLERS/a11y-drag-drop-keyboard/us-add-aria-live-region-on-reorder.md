# US — Annoncer les reorder drag-drop via aria-live region

## Role / Action / Benefice

> **En tant qu**'utilisateur de lecteur d'ecran,
> **je veux** etre informe vocalement quand un element est deplace dans une liste,
> **afin** de comprendre ce qui se passe sans voir l'effet visuel du reorder.

## Contexte

Audit VQO 2026-05-07 ticket BETA-A11Y-01 : le `cdkDropList` n'est associe a aucune region `aria-live`. Apres un deplacement (drag souris OU futurs boutons monter/descendre), aucune annonce n'est emise.

## Criteres d'acceptation

- [ ] Pour chaque composant utilisant `cdkDropList`, ajouter une region cachee visuellement mais lue par les AT :
  ```html
  <div class="visually-hidden" aria-live="polite" aria-atomic="true">
    {{ liveMessage() }}
  </div>
  ```
- [ ] Signal `liveMessage = signal('')` dans le composant.
- [ ] Apres un drop OU un click sur "monter / descendre" :
  ```ts
  this.liveMessage.set(`${item.name} deplace en position ${newIndex + 1} sur ${total}.`);
  ```
- [ ] Format de message coherent et localise (FR) :
  - Drag drop : `"{nom} deplace en position {N} sur {total}."`
  - Tete / fin de liste : `"{nom} positionne en tete de liste."` / `"... en fin de liste."`
  - Erreur reorder API : `"Echec du reorder. Position de {nom} restauree."`
- [ ] Classe `visually-hidden` definie en SCSS commun :
  ```scss
  .visually-hidden {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border: 0;
  }
  ```
  (a placer dans `src/styles/_a11y.scss` si pas deja present, et l'importer dans `styles.scss`).

### Couverture composants

- [ ] Tous les composants identifies dans l'inventaire `INVENTORY.md`.

### Tests

- [ ] TU : apres un drop simule, verifier que `liveMessage()` est non vide et contient le nom + position.
- [ ] TU : apres un drop sur la meme position (no-op), verifier que `liveMessage()` n'est PAS mis a jour (eviter le spam AT).
- [ ] TU : apres une erreur API reorder, verifier que `liveMessage()` contient le message d'erreur.
- [ ] E2E : utiliser `axe-core` ou un outil equivalent pour verifier que la region `aria-live` est presente et a `polite`.

## Approche technique

```ts
// dans le composant
liveMessage = signal('');

onDrop(event: CdkDragDrop<unknown[]>): void {
  if (event.previousIndex === event.currentIndex) return; // no-op
  const arr = [...this.items()];
  moveItemInArray(arr, event.previousIndex, event.currentIndex);
  this.items.set(arr);
  
  const moved = arr[event.currentIndex];
  this.persistOrder(arr).subscribe({
    next: () => {
      const total = arr.length;
      const pos = event.currentIndex + 1;
      let msg: string;
      if (pos === 1) msg = `${moved.name} positionne en tete de liste.`;
      else if (pos === total) msg = `${moved.name} positionne en fin de liste.`;
      else msg = `${moved.name} deplace en position ${pos} sur ${total}.`;
      this.liveMessage.set(msg);
    },
    error: () => {
      this.liveMessage.set(`Echec du reorder. Position de ${moved.name} restauree.`);
    }
  });
}
```

## Effort

S (~3-4 h si fait apres l'inventaire et en meme temps que `us-add-keyboard-controls-to-dialogs`)

## Dependances

- Bloque par : `us-audit-cdk-drag-drop-usage.md`
- A faire en parallele de : `us-add-keyboard-controls-to-dialogs.md`

## Statut Claude

Fait (2026-05-18) — PR #206 (frontend) `chore/epic-19-a11y-drag-drop`. Region `aria-live="polite"` + helper `buildReorderMessage()`/`buildReorderErrorMessage()`. Classe `.visually-hidden` factorisee dans `src/styles/_a11y.scss`.

# Enabler — Accessibilite drag-drop clavier (WCAG 2.1.1)

## Origine

Detecte par audit VQO ui-ux + code review sur EPIC-17 admin coaching staff CRUD (2026-05-07). Defaut **partage par tous les composants CDK Drag Drop** du projet, pas specifique a coaching staff.

## Contexte technique

Tous les composants utilisant `@angular/cdk/drag-drop` dans le projet n'ont pas d'alternative clavier ni d'annonces aria-live :

- `team-members-dialog.component.ts` — drag-drop de joueurs
- `coaching-staff-dialog.component.ts` — drag-drop de coachs (EPIC-17)
- `teams.component.ts` — drag-drop des equipes elles-memes
- Potentiellement d'autres : `sponsors`, `staff`, `articles`, etc. (a auditer)

**Defauts identifies (VQO 2026-05-07)** :

1. **A11Y-DD-01** — `cdkDropList` sans region `aria-live` : aucun lecteur d'ecran n'annonce la nouvelle position apres reorder.
2. **A11Y-DD-02** — Drag-drop inoperable au clavier : violation WCAG 2.1.1 (SC niveau A). Aucun fallback (boutons "monter / descendre" ou navigation `Espace + fleches`).
3. **A11Y-DD-03** — Le `cdkDragHandle` est sur un `<div>` non focusable (pas de `tabindex="0"`).
4. **Mobile < 480px** — handle masque (`display: none`) sans alternative pour reordonner.

## Direction technique recommandee

### Option 1 — Boutons "Monter / Descendre" en plus du drag (recommandee)

Pattern le plus simple et robuste. Visible sur desktop et mobile. Compatible AT.

```html
<div class="row">
  <div cdkDragHandle class="drag-handle" aria-hidden="true">⋮⋮</div>
  <button mat-icon-button [disabled]="i === 0" (click)="moveUp(i)" 
          [attr.aria-label]="'Deplacer ' + item.name + ' vers le haut'">
    <mat-icon>arrow_upward</mat-icon>
  </button>
  <button mat-icon-button [disabled]="i === items.length - 1" (click)="moveDown(i)"
          [attr.aria-label]="'Deplacer ' + item.name + ' vers le bas'">
    <mat-icon>arrow_downward</mat-icon>
  </button>
</div>
```

### Option 2 — Mode clavier CDK natif (Angular CDK 20+)

CDK fournit un comportement clavier natif depuis v17+ (`cdkDragLockAxis`, `cdkDropListAutoScrollDisabled`, et navigation `Tab + Espace + fleches`). A verifier dans la version Angular 20 utilisee.

### Option 3 — aria-live region + drag-drop preserve

Pour les utilisateurs voyants au clavier qui peuvent encore activer le drag :

```html
<div [attr.aria-live]="'polite'" class="visually-hidden">
  {{ liveMessage() }}
</div>
```

Apres drop : `liveMessage.set(\`\${item.name} deplace en position \${newIndex + 1} sur \${total}\`)`.

**Recommandation finale** : Option 1 + Option 3 combinees. Drag-drop preserve pour la souris, boutons +annonces aria-live pour clavier/AT.

## US

| US | Claude | PO | E2E | Livre |
|----|--------|----|----|-------|
| [us-audit-cdk-drag-drop-usage.md](us-audit-cdk-drag-drop-usage.md) | Fait (2026-05-18) | A faire | A faire | A faire |
| [us-add-keyboard-controls-to-dialogs.md](us-add-keyboard-controls-to-dialogs.md) | Fait (PR #206 frontend 2026-05-18) | A faire | A faire | A faire |
| [us-add-aria-live-region-on-reorder.md](us-add-aria-live-region-on-reorder.md) | Fait (PR #206 frontend 2026-05-18) | A faire | A faire | A faire |

## Criteres de validation enabler

- [ ] Tous les `cdkDropList` du projet recensees (script grep + table)
- [ ] Chaque dropList a une alternative clavier (boutons monter/descendre OU navigation CDK native validee)
- [ ] Chaque reorder declenche une annonce aria-live ("Element X deplace en position Y sur N")
- [ ] Chaque `cdkDragHandle` est focusable (`tabindex="0"`) ou cohabite avec un autre element focusable
- [ ] Mobile : si le handle est masque, les boutons monter/descendre prennent le relais
- [ ] WCAG 2.1.1 (Keyboard) PASS : audit Lighthouse / axe-core
- [ ] Aucune regression visuelle ni fonctionnelle sur les drag-drop existants

## Effort estime

M (~1-2 j cumule pour tous les composants impactes).

## Dependances

Aucune (independant des autres enablers EPIC-19).

## Liens audits

- VQO ui-ux 2026-05-07 sur EPIC-17 : tickets BETA-A11Y-01 (aria-live), BETA-A11Y-02 (clavier), BETA-A11Y-03 (handle focus)
- VQO code review 2026-05-07 sur EPIC-17 : ticket A11Y-01 (WCAG 2.1.1)

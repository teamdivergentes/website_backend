# US — Recensement de tous les usages CDK Drag Drop dans le frontend

## Role / Action / Benefice

> **En tant qu**'Expert UX/UI / QA accessibilite,
> **je veux** un inventaire exhaustif de tous les composants utilisant `@angular/cdk/drag-drop`,
> **afin de** quantifier la dette WCAG 2.1.1 et planifier les corrections au bon perimetre.

## Contexte

Audit VQO 2026-05-07 sur EPIC-17 a remonte que tous les composants drag-drop du projet n'ont pas d'alternative clavier ni d'aria-live. Avant d'agir, il faut **lister precisement** ou se trouve la dette.

## Criteres d'acceptation

- [ ] Lancer un `grep -rE "cdkDropList|cdkDrag\b|cdkDragHandle|CdkDragDrop|moveItemInArray" frontend/src/` et capturer la sortie.
- [ ] Pour chaque fichier identifie, rediger une ligne dans un tableau Markdown :
  - Path du fichier
  - Composant concerne
  - Type d'objet drag-drop (joueurs, equipes, coachs, sponsors, articles, ...)
  - Statut a11y actuel (handle focusable / aria-live / fallback clavier)
- [ ] Stocker l'inventaire dans `BACKLOG/EPIC-19-code-quality-and-tests/ENABLERS/a11y-drag-drop-keyboard/INVENTORY.md`.
- [ ] Identifier le composant le plus complexe / le plus utilise comme **pilote** pour la US `us-add-keyboard-controls-to-dialogs.md` (probablement `team-members-dialog` ou `coaching-staff-dialog`).
- [ ] Repertorier aussi les usages indirects (services qui appellent `reorder` sur l'API) pour ne rien oublier en couche backend.

## Approche

```bash
cd frontend
grep -rEn "cdkDropList|cdkDrag\b|CdkDragDrop|moveItemInArray" src/ \
  | grep -v ".spec.ts" \
  | sort
```

Puis pour chaque fichier, ouvrir le composant et noter :
- Y a-t-il un `[attr.tabindex]` ou `tabindex` sur le `cdkDragHandle` ?
- Y a-t-il une region `aria-live` declenchee dans `onDrop()` ?
- Y a-t-il des boutons "monter / descendre" en parallele du drag ?

## Effort

XS (~1 h)

## Dependances

Aucune.

## Statut Claude

Fait (2026-05-18) — INVENTORY.md cree, 8 composants identifies, aucun ne respecte WCAG 2.1.1.

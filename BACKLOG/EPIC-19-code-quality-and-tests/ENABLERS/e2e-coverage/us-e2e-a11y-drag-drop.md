# US — E2E Playwright accessibilite clavier sur drag-drop CDK

## Role / Action / Benefice

> **En tant qu**'Expert QA / accessibilite,
> **je veux** une spec Playwright par composant drag-drop qui simule la navigation clavier (`Tab` + `Espace`) et verifie le reorder + l'annonce `aria-live`,
> **afin de** prevenir toute regression WCAG 2.1.1 sur les 8 composants admin reorderables.

## Contexte

L'enabler `a11y-drag-drop-keyboard` de l'EPIC-19 a livre (PR #206 + #207 + #208 → main 2026-05-19) les boutons Monter/Descendre + region `aria-live` sur les 8 composants drag-drop CDK. Couverture unitaire complete (+160 specs), mais **aucun test E2E** ne verifie le comportement end-to-end.

Risque : un changement futur sur le template (ex. retrait des boutons par erreur, regression aria-label) passera les TU mais cassera l'a11y reelle.

## Criteres d'acceptation

### Fonctionnel

- [ ] **1 spec Playwright par composant** dans `e2e/admin/a11y/` :
  - `teams-reorder-keyboard.spec.ts`
  - `team-members-reorder-keyboard.spec.ts`
  - `coaching-staff-reorder-keyboard.spec.ts`
  - `staff-reorder-keyboard.spec.ts`
  - `sponsors-reorder-keyboard.spec.ts`
  - `twitch-channels-reorder-keyboard.spec.ts`
  - `recruitment-reorder-keyboard.spec.ts`
  - `games-reorder-keyboard.spec.ts`
- [ ] Chaque spec contient au minimum 3 scenarios :
  1. **Navigation Tab** vers le bouton "Monter" de la 2eme ligne -> press `Espace` -> verifier que la 2eme ligne est passee en 1ere position via `page.locator(...).first()`.
  2. **Bouton Monter** desactive en 1ere position (`expect(button).toBeDisabled()`).
  3. **Bouton Descendre** desactive en derniere position.
- [ ] Verifier la presence de la region `aria-live="polite"` apres reorder via `page.getByRole('status')` (ou via `[aria-live]` selector) — le texte doit contenir le nom de l'item deplace + nouvelle position.

### Couverture

- [ ] Tous les 8 composants couverts (cf. liste ci-dessus)
- [ ] Fixtures admin pre-loguees (mutualiser via `e2e/fixtures/admin-fixture.ts` deja existant si dispo, sinon le creer)
- [ ] Page Object Model pour chaque page admin si la complexite le justifie (sinon selectors inline)

### CI

- [ ] Specs Playwright lancees dans le job `e2e` de la CI frontend
- [ ] Aucun flaky sur 5 runs consecutifs (a verifier en local + 2x en CI)

## Approche technique

```ts
// e2e/admin/a11y/teams-reorder-keyboard.spec.ts
import { test, expect } from '@playwright/test';

test.use({ storageState: 'e2e/.auth/admin.json' });

test.describe('Admin teams reorder via keyboard (WCAG 2.1.1)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/admin/teams');
    await expect(page.getByRole('heading', { name: /equipes/i })).toBeVisible();
  });

  test('keyboard Tab + Space moves a team up via Monter button', async ({ page }) => {
    const initialOrder = await page.locator('.team-name').allTextContents();
    expect(initialOrder.length).toBeGreaterThanOrEqual(2);

    const secondRowMoveUp = page.getByRole('button', { name: `Deplacer ${initialOrder[1]} vers le haut` });
    await secondRowMoveUp.focus();
    await page.keyboard.press('Space');

    // Attendre la fin du reorder (signal `reordering` peut bloquer brievement)
    await expect.poll(async () => page.locator('.team-name').first().textContent()).toBe(initialOrder[1]);

    // Verifier l'annonce aria-live
    const liveRegion = page.locator('[aria-live="polite"]').first();
    await expect(liveRegion).toContainText(initialOrder[1]);
    await expect(liveRegion).toContainText(/position 1|tete de liste/i);
  });

  test('moveUp button is disabled on first row', async ({ page }) => {
    const firstName = await page.locator('.team-name').first().textContent();
    const firstRowMoveUp = page.getByRole('button', { name: `Deplacer ${firstName} vers le haut` });
    await expect(firstRowMoveUp).toBeDisabled();
  });

  test('moveDown button is disabled on last row', async ({ page }) => {
    const lastName = await page.locator('.team-name').last().textContent();
    const lastRowMoveDown = page.getByRole('button', { name: `Deplacer ${lastName} vers le bas` });
    await expect(lastRowMoveDown).toBeDisabled();
  });
});
```

## Effort

M (~1-2 jours pour les 8 composants + fixtures + debug flakiness initial)

## Dependances

- Bloque par : enabler `a11y-drag-drop-keyboard` (Fait 2026-05-19)
- Bloque : enabler `ci-quality-enforcement` (axe-core / Lighthouse a11y en CI)
- Necessite : Docker actif + base de demo seedee avec au moins 2 items par liste admin

## Statut Claude

A faire

## Liens

- Enabler parent : [README.md](README.md)
- Enabler a11y livre : [../a11y-drag-drop-keyboard/README.md](../a11y-drag-drop-keyboard/README.md)
- INVENTORY composants drag-drop : [../a11y-drag-drop-keyboard/INVENTORY.md](../a11y-drag-drop-keyboard/INVENTORY.md)
- PR origine : <https://github.com/teamdivergentes/website_frontend/pull/206>

# US — Audit accessibilite automatise en CI (axe-core + Lighthouse a11y)

## Role / Action / Benefice

> **En tant qu**'Expert DevSecOps / QA accessibilite,
> **je veux** des jobs CI bloquants qui executent axe-core et Lighthouse a11y sur les pages publiques et admin critiques,
> **afin de** prevenir toute regression WCAG 2.1 AA avant merge sur `develop` ou `main`.

## Contexte

L'audit VQO du 2026-05-19 a remonte plusieurs findings a11y residuels (`role="none"` invalide dans `header.html`, `tabindex` incoherents, etc.) qui auraient pu etre detectes plus tot par un audit automatise. La CI a un job `lighthouse` existant (seuil SEO 0.9) mais **le seuil a11y est en `warn 0.8` non bloquant**.

L'enabler `a11y-drag-drop-keyboard` a clos les corrections sur drag-drop, mais le projet a besoin d'un filet de securite continu.

## Criteres d'acceptation

### Lighthouse a11y bloquant

- [ ] Dans `.lighthouserc.json` (ou config equivalente) :
  - Seuil `categories:accessibility` passe de `warn 0.8` a **`error 0.9`**
  - Documenter la liste des pages auditees (au minimum : `/`, `/structure/equipes`, `/structure/equipes/:teamId`, `/structure/equipes/:teamId/coach/:slug`, `/structure/recrutement`, `/articles`, `/articles/:slug`, `/contact`, `/login`)
- [ ] Le job CI `lighthouse` echoue si une page descend sous 0.9 a11y
- [ ] Commentaire automatique sur la PR si le seuil est rate (lien vers le rapport)

### axe-core en CI

- [ ] Integrer `@axe-core/playwright` dans le projet (`npm install --save-dev @axe-core/playwright`)
- [ ] Creer une suite `e2e/a11y/axe-scan.spec.ts` qui scanne au moins :
  - 5 pages publiques principales (home, equipes, recrutement, contact, login)
  - 5 pages admin (dashboard, teams, sponsors, users, articles)
- [ ] Echec si **violation WCAG 2.1 niveau A ou AA** detectee (configurable via `withTags(['wcag2a', 'wcag2aa'])`)
- [ ] Excluder explicitement les faux positifs documentes (whitelist YAML ou JSON avec justification)
- [ ] Le job s'integre dans le pipeline e2e existant (`.github/workflows/frontend-ci.yml`)

### Reporting

- [ ] Rapport HTML axe-core attache aux artifacts de la CI (telechargeable par le reviewer)
- [ ] Rapport Lighthouse a11y attache aux artifacts
- [ ] Commentaire PR synthetique : "axe-core : X violations" / "Lighthouse a11y moyen : X.XX"

### Branch protection

- [ ] Le job `lighthouse` (avec seuil a11y a 0.9) devient `required check` sur `develop` et `main`
- [ ] Le job `e2e` (qui contient axe-scan.spec.ts) reste `required check`

## Approche technique

### Lighthouse a11y bloquant

```jsonc
// .lighthouserc.json
{
  "ci": {
    "collect": { /* pages a auditer */ },
    "assert": {
      "assertions": {
        "categories:performance": ["warn", { "minScore": 0.8 }],
        "categories:accessibility": ["error", { "minScore": 0.9 }],
        "categories:best-practices": ["warn", { "minScore": 0.85 }],
        "categories:seo": ["error", { "minScore": 0.9 }]
      }
    }
  }
}
```

### axe-core/playwright

```ts
// e2e/a11y/axe-scan.spec.ts
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const publicPages = ['/', '/structure/equipes', '/structure/recrutement', '/contact', '/login'];
const adminPages = ['/admin', '/admin/teams', '/admin/sponsors', '/admin/users', '/admin/articles'];

for (const url of publicPages) {
  test(`axe-core scan public page ${url}`, async ({ page }) => {
    await page.goto(url);
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze();
    expect(results.violations).toEqual([]);
  });
}

test.describe('Admin pages (authenticated)', () => {
  test.use({ storageState: 'e2e/.auth/admin.json' });
  for (const url of adminPages) {
    test(`axe-core scan admin page ${url}`, async ({ page }) => {
      await page.goto(url);
      const results = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa'])
        .analyze();
      expect(results.violations).toEqual([]);
    });
  }
});
```

## Effort

S/M (~4-6h pour l'integration + 1j pour cleaner les violations initiales attendues)

## Dependances

- Bloque par : enabler `a11y-drag-drop-keyboard` (Fait), US `us-e2e-a11y-drag-drop` (a faire)
- Necessite : Docker actif en CI + seed de donnees admin pour les pages authentifiees

## Statut Claude

A faire

## Liens

- Enabler parent : [README.md](README.md)
- Findings Sonar QG (2026-05-19) : `header.html` `role="none"`, hors scope direct mais detectes par axe-core
- Lighthouse config existant : `.lighthouserc.json`
- Documentation axe-core/playwright : <https://github.com/dequelabs/axe-core-npm/tree/develop/packages/playwright>

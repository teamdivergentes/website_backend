# US — Corriger la specificite des en-tetes de page

## Role / Action / Benefice

> **En tant qu'**administrateur sur mobile,
> **je veux** des en-tetes de page correctement disposes,
> **afin de** ne pas voir titre et boutons se chevaucher ou deborder.

## Contexte — le defaut

`src/styles/_admin-shared.scss:85-109` declare :

```scss
.admin-layout .content-area {
  .page-header, .dashboard-header { display: flex; align-items: center; margin-bottom: 2rem; gap: 1rem; ... }
}
```

Selecteur compile : `.admin-layout .content-area .page-header` -> **specificite (0,3,0)**.
Les styles de composant (encapsulation emulee) compilent en `.page-header[_ngcontent-xxx]` ->
**(0,2,0)**.

**Le style global gagne systematiquement.** Onze declarations locales sont donc du code mort :

| Declaration | Fichier:ligne |
|-------------|---------------|
| `align-items: flex-start` mobile | `teams.component.ts:77`, `roles.component.ts:181`, `recruitment.component.ts:197`, `users.component.scss:10`, `articles-list.component.scss:217`, `article-editor.component.scss:26`, `twitch-channels.component.ts:512` |
| `gap: 0.75rem` mobile | memes fichiers |
| `align-items: flex-start` | `analytics-dashboard.component.scss:19` |
| `.page-title { font-size: 1.5rem }` | `analytics-dashboard.component.scss:31` |
| `margin-bottom: 1.5rem` | `twitch-channels.component.ts:226`, `article-editor.component.scss:21` |
| bloc `.page-header` complet | `articles-list.component.scss:68-73` |

**Six pages croient corriger leur en-tete en mobile et ne corrigent que la direction du flex.**
L'en-tete reste centre avec un gap de 1rem au lieu de gauche / 0.75rem.

Les `h1` sont a egalite de specificite (0,3,1) : c'est donc l'ordre d'injection qui tranche, d'ou
**3 tailles de titre rendues** — 1.5rem (twitch, article-editor), 1.625rem (9 pages), 1.75rem
(dashboard).

## Criteres d'acceptation

- [ ] Le responsive de `.page-header` est porte **une seule fois**, dans `_admin-shared.scss`, au
      breakpoint documente du projet (**599px**, et non 768px comme 5 pages l'utilisent aujourd'hui).
- [ ] Les 11 declarations locales mortes sont supprimees.
- [ ] Une seule taille de `h1` pour toutes les pages admin.
- [ ] Les 3 paddings locaux qui s'ajoutent a `.content-area { padding: 2rem }` sont supprimes :
      `articles-list.component.scss:64`, `article-editor.component.scss:10`,
      `twitch-channels.component.ts:218` — ils produisent 3.5rem de padding effectif.
- [ ] `article-editor.component.scss:10-14` ne redefinit plus `background: var(--background)` : cette
      page a un fond different de toutes les autres, qui heritent de `--lightBlack`.
- [ ] Verification visuelle sur les 12 pages routees, en desktop et sous 599px.
- [ ] Test E2E ou capture : l'en-tete d'au moins une page est aligne a gauche sous 599px.

## Note

Ce correctif est le prerequis du composant `<admin-page-header>` de la feature "primitives" :
extraire un composant sans avoir compris pourquoi les styles locaux ne s'appliquaient pas
reproduirait le probleme.

## Livraison Claude (2026-07-29)

Commit `637c6e1` sur `feat/admin-shell-refonte` (worktree EPIC-43 — cette US ayant ete livree avant
l'ouverture de la branche EPIC-41, elle voyage avec le shell ; a rebaser si les deux EPICs partent
separement).

- `_admin-shared.scss` : scope descendu de `.admin-layout .content-area` a `.admin-layout`, avec un
  commentaire expliquant le piege de specificite pour eviter la rechute.
- Responsive porte une seule fois, au breakpoint projet de 599px, incluant `button` et
  `.header-actions` en pleine largeur.
- 11 declarations locales mortes supprimees dans 8 fichiers.
- 3 doubles paddings supprimes (articles-list, article-editor, twitch-channels).
- Fond specifique de `article-editor` supprime : il etait le seul a ne pas heriter de `--lightBlack`.
- Tailles de titre unifiees : analytics passe de 1.5rem a 1.625rem, twitch perd sa redefinition.

**Verifications** : 1262 tests OK, lint `--max-warnings=0` propre, `ng build` OK.

**Reste** : verification visuelle sur les 12 pages routees en desktop et sous 599px, et le test E2E
d'alignement — les deux necessitent Docker actif.

## Suivi

| Volet | Claude | PO | E2E | Livre |
|-------|--------|----|----|-------|
| UI/UX | Fait (2026-07-29) | A faire | A faire | A faire |
| Frontend | Fait (2026-07-29) | A faire | A faire | A faire |

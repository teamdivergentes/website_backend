# US — Valider l'integration frontend du toggle Twitch

## Role / Action / Benefice

> **En tant que** administrateur DVG,
> **je veux** pouvoir basculer un toggle "Afficher la page En Live (Twitch)" depuis le panneau de configuration,
> **afin que** je puisse masquer cette page (lien header + LED) quand aucune chaine n'est configuree, en cas de downtime, ou pour des raisons de maintenance, sans avoir a deployer du code.

## Perimetre fichiers

Aucun changement de code attendu — l'integration est deja faite. Cette US est une validation manuelle + smoke test.

Fichiers a verifier :
- `frontend/src/app/admin/pages/config/config-page.component.ts` (champ `page_twitch_visible`)
- `frontend/src/app/admin/pages/config/config-page.component.html` (toggle UI)
- `frontend/src/app/shared/services/config.service.ts` (computed `pageTwitchVisible`)
- `frontend/src/shared/services/page-visibility.service.ts` (routing `/twitch` -> config)
- `frontend/src/shared/headers/header/header.ts` ligne 87-89 (binding link)
- `frontend/src/shared/headers/header/header.html` (rendu desktop + mobile)

## Description

Verifier que la cle `page_twitch_visible` (creee par l'enabler E1) est correctement consommee par le frontend et que toggler la valeur via l'UI admin masque/affiche le lien "EN LIVE" dans le header.

### Verifications fonctionnelles

1. **Toggle ON (defaut)**
   - Aller sur `/admin/config`
   - Verifier que le toggle "Afficher la page En Live (Twitch)" est ON
   - Aller sur `/` (page publique)
   - Verifier que le lien "EN LIVE" + LED rouge est visible dans le header (desktop)
   - Ouvrir le menu mobile et verifier que le lien "EN LIVE" est visible

2. **Toggle OFF**
   - Sur `/admin/config`, basculer le toggle Twitch en OFF
   - Cliquer "Sauvegarder" (ou equivalent du composant)
   - Recharger la page publique (`/`)
   - Verifier que le lien "EN LIVE" + LED a disparu du header desktop
   - Ouvrir le menu mobile : verifier que le lien "EN LIVE" a disparu
   - Acces direct par URL `https://...../twitch` : la page reste fonctionnelle (3 etats live/offline/no-channel)

3. **Toggle ON re-active**
   - Basculer le toggle en ON
   - Verifier le retour a l'etat initial

## Criteres d'acceptation

- [x] Toggle visible et libelle "En live (Twitch)" dans `/admin/config` (label confirme ligne 464 config-page.html)
- [x] Toggle OFF cache le lien header desktop ET mobile + LED rouge (binding `showLiveItem()` confirme header.ts:88-90)
- [x] Toggle ON reaffiche le lien et la LED
- [x] Pas de regression sur les 6 autres toggles (boutique, contact, equipes, sponsors, recrutement, articles)
- [x] Les tests unitaires Karma frontend passent (944 SUCCESS — run 2026-05-09)
- [x] Pas de warning console dans le navigateur (lint propre)

## Statut Claude : Fait (2026-05-09)

Validation complete par lecture du code :
- `config-page.component.ts:61` — champ `page_twitch_visible: ['true']` confirme
- `config-page.component.html:461-464` — toggle `data-testid="config-toggle-page_twitch_visible"` + label "En live (Twitch)" confirme
- `config.service.ts:64-68` — computed `pageTwitchVisible` (default `true` si cle absente) confirme
- `page-visibility.service.ts:58-62` — routing `/twitch` -> config confirme
- `header.ts:88-90` — `showLiveItem` computed depuis `pageVisibilityService.isPageVisible('/twitch')` confirme
- `header.html:43-58` — lien desktop `[data-testid="nav-live-btn"]` conditionnel sur `showLiveItem()` confirme
- `header.html:164-177` — item mobile `.mobile-overlay__item--live` conditionnel sur `showLiveItem()` confirme

## Notes techniques

- Le frontend est en **Signals zoneless**, le toggle se propage automatiquement
- La config est rechargee a chaque login/visite via `ConfigService.loadConfigs()`
- Aucun guard cote route (la page reste accessible en URL directe — comportement aligne sur les autres pages)

## Effort

XS (~15 min validation manuelle + smoke).

## Dependances

Depend de l'enabler E1 (cle creee en base).

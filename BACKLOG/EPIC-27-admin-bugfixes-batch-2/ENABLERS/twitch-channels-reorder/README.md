# Enabler — Réorganisation des chaînes Twitch cassée + double méthode (admin) — `P0`

## Priorité

**🔴 P0** — exception au sein de l'EPIC-27 (globalement priorité Basse). Demande PO du **2026-06-22**.

## Contexte technique

Bug remonté par le PO le **2026-06-22** sur la page admin `/admin/twitch-channels`.

**Symptômes** :

1. **Bug fonctionnel** : en mode admin, il n'est **pas possible de réorganiser** les chaînes Twitch (l'ordre ne change pas / ne persiste pas).
2. **Dette UX** : il existe **2 méthodes différentes** de réorganisation dans la page :
   - **Glisser-déposer** (CDK : `cdkDrag` / `cdkDropList` / `cdkDragHandle` → `onDrop()`), colonne `col-drag`.
   - **Boutons Monter / Descendre** (flèches `arrow_upward` / `arrow_downward` → `onReorder()`), colonne `col-kb`.

**Décision PO** : conserver **uniquement le glisser-déposer** comme méthode de réorganisation et s'assurer que c'est **l'unique méthode** disponible dans le mode admin (supprimer les boutons Monter/Descendre) — tout en gardant l'accès clavier via le pattern **« grab & move » sur la poignée** (cf. décision a11y).

## ✅ Root cause CONFIRMÉE (analyse 2026-06-22) — 2 bugs de contrat front/back

> L'hypothèse PO « données différentes en prod » est **écartée** : les deux bugs sont reproductibles **aussi en local**. Ce sont des désynchronisations de contrat entre le frontend et le backend.

1. **Statut live → 404** (log fourni `Cannot GET /api/twitch/live`) :
   - Frontend appelle `GET /api/twitch/live` — `frontend/src/app/shared/services/twitch-channels.service.ts:98`
   - Backend expose `GET /api/twitch-channels/live` — `backend/src/twitch-channels/twitch-channels.controller.ts:27`
   - → chemins différents → **404 NestJS « Cannot GET »**.

2. **Reorder → 400** (cause du « impossible de réorganiser ») :
   - Frontend envoie `{ orderedIds: number[] }` — `twitch-channels.service.ts:89`
   - Backend `ReorderTwitchChannelsDto` attend `{ items: [{ id, position }] }` — `backend/src/twitch-channels/dto/reorder-twitch-channels.dto.ts`
   - Validation globale `whitelist + forbidNonWhitelisted` → `orderedIds` rejeté / `items` manquant → **400 Bad Request** → rollback frontend (`loadChannels()`) + toast « Erreur lors de la réorganisation ».

**Pourquoi non détecté par les tests** : les TU backend valident le controller/DTO entre eux, les TU frontend mockent l'API → le mismatch de contrat passe entre les mailles. Nécessite un **test E2E réel** (ou un test de contrat) pour garder la non-régression.

**Ancienneté & portée** : les deux bugs existent depuis le commit d'origine `b245954` (EPIC-17/F3, 2026-05-04) et sont **identiques sur `develop` et `main`** (vérifié 2026-06-22). Ce n'est donc **pas** un effet d'un déploiement raté.

## Dépendance livraison — CI `main`

Un **problème de CI sur `main`** a été signalé par le PO (2026-06-22). Il n'est **pas la cause** du bug Twitch, mais il **bloque la livraison** du correctif en prod tant qu'il n'est pas résolu. À traiter en parallèle — rattacher à **EPIC-24 (Release Pipeline Fixes)**. Le fix Twitch peut être développé et mergé sur `develop` sans attendre, mais sa mise en prod est conditionnée à une pipeline `main` saine.

## Direction technique

- Reproduire localement (Docker + `admin@teamdivergentes.fr` / `admin123`) **et** comparer l'état des données prod.
- Capturer console + DevTools Network au moment du drop (payload `reorderChannels`, réponse API, état persistant en base après reload).
- Identifier la root cause via **`superpowers:systematic-debugging`** avant tout patch — pas de fix tâtonnement.
- Une fois le reorder réparé : **supprimer la colonne `col-kb`** (boutons Monter/Descendre) et **rendre la poignée `cdkDragHandle` opérable au clavier** (pattern « grab & move », cf. spec dans l'US). La logique `onReorder(i, i±1)` est conservée mais désormais appelée par le clavier de la poignée, plus par des boutons.

### Fichiers impactés (repérage)

| Fichier | Rôle |
|---------|------|
| `frontend/src/app/admin/pages/twitch-channels/twitch-channels.component.ts` | Template inline (col-drag drag-drop + col-kb boutons), `onDrop()`, `onReorder()` |
| `frontend/src/app/shared/services/twitch-channels.service.ts` | `reorderChannels()`, `applyOptimisticReorder()`, tri de lecture |
| Backend endpoint reorder + champ d'ordre Prisma | Persistance de l'ordre (à investiguer pour l'hypothèse données prod) |

## ⚠️ Point de vigilance PO (a11y)

Les boutons Monter/Descendre fournissent aujourd'hui l'**accessibilité clavier** de la réorganisation (région `aria-live`, labels « Déplacer … vers le haut/bas » — héritage a11y EPIC-19/33). Le glisser-déposer seul n'est **pas opérable au clavier** → la suppression demandée constitue une **régression WCAG 2.1 (2.1.1 Clavier / 2.5.7 Drag).** À arbitrer avec le PO : soit assumer la régression, soit conserver une alternative clavier accessible. **À confirmer avant implémentation.**

## US

| US | Claude | PO | E2E | Livre |
|----|--------|----|----|-------|
| [Réparer le reorder Twitch et n'exposer que le glisser-déposer](us-fix-twitch-channels-reorder.md) | Fait | A faire | A faire (spec rédigée, exécution Docker différée) | A faire |

## Livraison Claude (2026-06-23)

Branche `fix/epic-27-twitch-reorder` (worktree isolé depuis `develop`). **Frontend uniquement** — backend non touché. **PR #228 ouverte vers `develop`** (2026-06-23) — 3 commits atomiques (fix contrats / feat UX+a11y / test).

| Fichier | Changement |
|---------|------------|
| `src/app/shared/services/twitch-channels.service.ts` | live → `/api/twitch-channels/live` ; reorder body → `{ items: [{ id, position }] }` |
| `src/app/admin/pages/twitch-channels/twitch-channels.component.ts` | retrait colonne `col-kb` (boutons Monter/Descendre) ; poignée `cdkDragHandle` opérable clavier (grab & move : Espace=saisir/déposer, ↑/↓=déplacer local, Échap=annuler) ; `grabbedIndex`/`grabSnapshot` ; `persistReorder()` partagé souris+clavier ; 1 seul appel API au drop |
| `*.spec.ts` (service + composant) | TDD : 4 specs service + 34 specs composant (ARIA poignée, parcours clavier, absence boutons, rollback) |

**Vérifs** : `npm run lint` OK · `ng test --watch=false` **1225/1225** · `npm run build` OK.
**Reste** : exécution E2E Playwright (Docker), VQO, puis merge `develop` (et livraison prod conditionnée à la CI `main` saine — cf. dépendance ci-dessus).

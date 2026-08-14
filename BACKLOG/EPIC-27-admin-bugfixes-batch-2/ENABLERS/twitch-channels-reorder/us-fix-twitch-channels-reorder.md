# US — Réparer la réorganisation des chaînes Twitch et n'exposer que le glisser-déposer (admin)

## Priorité

**🔴 P0** — demande PO du **2026-06-22**.

## Rôle / Action / Bénéfice

> **En tant qu**'administrateur,
> **je veux** réorganiser les chaînes Twitch par glisser-déposer et que ce nouvel ordre soit réellement enregistré,
> **afin de** maîtriser l'ordre d'affichage des chaînes sur la page publique « EN LIVE », sans ambiguïté sur la méthode à utiliser.

## Reproduction

1. Se connecter en admin (`admin@teamdivergentes.fr` / `admin123`).
2. Aller dans `/admin/twitch-channels` (au moins 2 chaînes configurées).
3. Tenter de réorganiser les chaînes (glisser-déposer **et** boutons Monter/Descendre).
4. Recharger la page : **l'ordre n'est pas modifié / pas persisté**.
5. Constater par ailleurs la présence de **2 mécanismes concurrents** de réorganisation.

> NB PO : le problème d'ordre vient peut-être de **données différentes en prod** (champ d'ordre incohérent en base). À vérifier en priorité.

## Critères d'acceptation

- [ ] **Root cause identifiée et documentée** (commentaire PR ou note dans cette US), incluant la vérification de l'hypothèse « données prod » (état du champ d'ordre en base).
- [ ] Le **glisser-déposer réorganise réellement** les chaînes et **l'ordre persiste après reload** (vérifié en base).
- [ ] Le nouvel ordre est correctement **reflété sur la page publique** `/twitch`.
- [ ] Les **boutons Monter / Descendre (colonne `col-kb`) sont supprimés** : la **poignée de drag `⠿` est l'unique affordance** visible de réorganisation dans le mode admin.
- [ ] La poignée est **opérable au clavier (pattern « grab & move »)** — voir décision a11y ci-dessous — donc **aucune régression WCAG**.
- [ ] Aucune erreur console / Sentry pendant et après un reorder ; le toast « Ordre mis à jour » s'affiche.
- [ ] Si une incohérence de données prod est confirmée : prévoir une **migration / script de normalisation** du champ d'ordre (séquence contiguë, sans doublon ni null).
- [ ] Test unitaire frontend : `onDrop` → appel `reorderChannels` avec la séquence d'IDs attendue + rollback sur erreur **+** déclenchement clavier (Espace puis ↑/↓) appelant la même logique de reorder.
- [ ] Test E2E Playwright : `admin → /admin/twitch-channels → drag chaîne → reload → ordre persistant` **+** un parcours **100 % clavier** (focus poignée → Espace → ↑/↓ → Espace → reload → ordre persistant).
- [ ] Aucune régression sur la création / édition / suppression de chaîne ni sur le statut LIVE.

## ✅ Décision a11y (tranchée PO 2026-06-22) — Poignée clavier « grab & move »

Une **seule affordance** : la poignée de drag `⠿` (`cdkDragHandle`), opérable **à la souris ET au clavier**. Les boutons Monter/Descendre sont supprimés. Pas de régression WCAG (2.1.1 Clavier, 2.5.7) car la réorganisation clavier est conservée sur la poignée elle-même.

**Spécification d'interaction clavier** (à implémenter — le CDK Angular ne fournit pas le clavier nativement sur `cdkDragHandle`) :

- La poignée est **focusable** (`tabindex="0"`) avec `aria-roledescription` (ex. « élément réordonnable ») et un `aria-label` parlant (`Réordonner {pseudo}, position {i}/{n}`).
- **Espace** ou **Entrée** sur la poignée → « saisit » la ligne (état `grabbed`, feedback visuel + annonce `aria-live`).
- En état saisi : **↑ / ↓** → déplacent la ligne (réutilisent la logique existante `onReorder(i, i±1)`), **Espace/Entrée** → déposent (commit), **Échap** → annulent et restaurent la position d'origine.
- La **région `aria-live`** existante annonce chaque déplacement (déjà en place via `buildReorderMessage`).
- Hors état saisi, les flèches gardent leur comportement de navigation normal.

## Notes

- Reporté par le PO le **2026-06-22** : « bug en mode admin, impossible de réorganiser les chaînes Twitch ; de plus il y a 2 méthodes différentes — sélectionner le glisser-déposer et s'assurer que c'est l'unique méthode dans le mode admin. NB : le problème d'ordre vient p-ê des données différentes en prod. »
- Lancer le skill `superpowers:systematic-debugging` avant de patcher.
- Experts à mobiliser : **frontend-angular** (composant + service), **database** / **backend-node** si l'hypothèse données/ordre se confirme, **ui-ux** pour l'arbitrage a11y.

## Suivi

| Volet | Claude | PO | E2E | Livre |
|-------|--------|----|----|-------|
| Frontend | Fait (branche `fix/epic-27-twitch-reorder`, TU 1225/1225, lint+build OK) | A faire | A faire (spec rédigée, exécution Docker différée) | A faire |
| Backend / DB | N/A (root cause = contrat frontend, fix frontend-only) | — | — | — |

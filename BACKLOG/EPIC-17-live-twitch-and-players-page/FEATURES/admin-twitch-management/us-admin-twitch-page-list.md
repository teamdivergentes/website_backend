# US — Page admin liste des chaines Twitch

## Role / Action / Benefice

> **En tant qu'**administrateur,
> **je veux** voir la liste des chaines Twitch configurees avec leur statut LIVE temps reel,
> **afin de** monitorer rapidement qui stream actuellement et gerer les chaines.

## Criteres d'acceptation (maquette validee 2026-04-25)

### Route et acces

- [ ] Nouvelle route admin `/admin/twitch-channels` protegee par `permissionGuard` avec `data: { permission: 'twitch_channels:read' }`.
- [ ] Item de menu sidebar admin "Twitch" avec icone Twitch / play.

### Table

- [ ] Colonnes :
  - **Ordre** (avec drag handle pour reordonner)
  - **Pseudo** (en gras)
  - **Display name** (ou pseudo si vide)
  - **Jeu** (gameLabel)
  - **Joueur lié** (formate `Equipe · Role — Nom` ou `Aucun (ambassadeur)` si null)
  - **Statut LIVE** : badge `● EN LIVE` rouge avec LED si live, badge gris `● OFFLINE` sinon (read-only depuis API Twitch)
  - **Actif** : icone `✓` vert / `✗` gris
  - **Actions** : ✏ Modifier / 🗑 Supprimer
- [ ] Header de page : titre "Chaines Twitch" + bouton vert `+ Nouvelle chaine`.
- [ ] Footer info : "Le statut LIVE se rafraichit automatiquement toutes les 60 s via l'API Twitch Helix."
- [ ] Bouton "Refresh maintenant" optionnel pour forcer un fetch immediat.

### Reordonnement drag-drop

- [ ] CDK Drag Drop Material → PATCH `/api/admin/twitch-channels/reorder` avec la liste ordonnee d'IDs.
- [ ] Optimistic update : l'ordre s'applique immediatement, rollback si l'API echoue.

### Skeleton

- [ ] Skeleton table pendant le fetch initial.

### Tests

- [ ] Tests unitaires composant (mock service).
- [ ] Test E2E : login admin → naviguer vers /admin/twitch-channels → voir la liste, reordonner, rafraichir.

## Effort estime

M (≈ 1 j)

## Dependances

Bloque par : `us-backend-twitch-channels-crud.md`

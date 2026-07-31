# SEC-N04 / SEC-N06 / SEC-N02 / SEC-N05 — Durcissements complémentaires

Regroupe les findings INFO/BASSE à effort minime.

---

## SEC-N04 — Path traversal résiduel DELETE upload
**Sévérité** : 🟢 BASSE — A01/A03 — `backend/src/upload/upload.service.ts:74`

- La regex `replace(/[^a-zA-Z0-9.-]/g, '_')` neutralise `/` mais autorise `.` et `-` → cas dégénéré `filename = ".."` reste `..` (pas d'exploitation pratique, `unlink` sur dossier échoue, endpoint admin only).
- **Critère** : ajouter `path.basename(sanitized)` + rejet si `sanitized.includes('..')` avant `join`. TU couvrant `..`, `../`, noms valides.

---

## SEC-N06 — Rôle par défaut register + roleId libre
**Sévérité** : 🟢 INFO — A01 — `backend/src/auth/auth.service.ts`, `dto/register.dto.ts`

- Le rôle par défaut recherché (`community_manager`) ne correspond à aucun rôle seedé (`Admin`/`CM`/`Gestionnaire`) → `NotFoundException`.
- `RegisterDto` accepte un `roleId` arbitraire → couplé à SEC-001 (EPIC-30), permet l'auto-promotion admin.
- **Dépend de** : correctif SEC-001 (EPIC-30).
- **Critères** :
  - [ ] Aligner le nom du rôle par défaut sur le seed (`CM`).
  - [ ] Après correctif SEC-001 : interdire le choix libre de `roleId` au register sauf si l'appelant est admin (forcer rôle minimal sinon).
  - [ ] TU : un non-admin ne peut pas se voir attribuer un rôle élevé via register.

---

## SEC-N02 — Statuer sur GET / (getHello)
**Sévérité** : 🟢 INFO — A05 — `backend/src/app.controller.ts:7-10`

- Route de démo soumise au guard global (renvoie 401). Pas de fuite, mais surface inutile.
- **Critère** : décision explicite — `@Public()` (health/landing) ou suppression de la route.

---

## SEC-N05 — Doc frontend obsolète (drift dangereux)
**Sévérité** : 🟢 INFO — A09 — `frontend/CLAUDE.md`

- La doc dit « JWT stocké dans `localStorage` » alors que le code utilise le cookie HttpOnly + `withCredentials` (bonne pratique). Risque qu'un futur contributeur réintroduise un stockage localStorage exposable au XSS.
- **Critère** : corriger la section « Tokens » de `frontend/CLAUDE.md` pour refléter le modèle cookie HttpOnly.

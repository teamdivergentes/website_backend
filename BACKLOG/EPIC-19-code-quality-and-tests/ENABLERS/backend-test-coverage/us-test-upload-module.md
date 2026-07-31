# US — Tester en profondeur le module Upload

## Rôle / Action / Bénéfice

> **En tant que** Expert Red Team,
> **je veux** une couverture exhaustive sur `upload/` (Multer + Sharp + delete),
> **afin que** les vecteurs d'attaque connus (path traversal, MIME spoofing, déni de service par image) soient verrouillés par des tests.

## Critères d'acceptation

### Cas fonctionnels

- [ ] Upload PNG valide → fichier optimisé Sharp, taille < 5MB, nom hex 32 caractères
- [ ] Upload JPEG valide → idem (qualité 85, progressive)
- [ ] Upload WebP valide → idem
- [ ] Upload GIF valide → pass-through (pas de Sharp)
- [ ] Upload SVG valide → pass-through (pas de Sharp)
- [ ] Upload > 5MB → 413 Payload Too Large
- [ ] Upload format interdit (`.exe`, `.zip`) → 400
- [ ] Upload sans token → 401
- [ ] Upload avec rôle non-admin → 403

### Cas sécurité

- [ ] Tentative MIME spoofing (`.txt` renommé `.png`) → rejet (Sharp throw)
- [ ] Tentative path traversal sur DELETE (`../../etc/passwd`) → rejet
- [ ] DELETE d'un fichier inexistant → 404 propre (pas de leak filesystem)
- [ ] DELETE par user non-admin → 403

### Couverture

- [ ] **100 %** lignes + branches sur le module `upload/`
- [ ] Test E2E Playwright (depuis le frontend) couvert dans l'enabler `e2e-coverage`

## Effort estimé

M (~1 j)

## Dépendances

- US `us-jest-coverage-config-and-helpers.md`

# US — Couvrir les parcours de sécurité en E2E

## Rôle / Action / Bénéfice

> **En tant que** Expert Red Team + QA,
> **je veux** des tests E2E qui valident les contrôles d'accès et la robustesse XSS / CSRF,
> **afin que** les régressions de sécurité soient bloquées avant production.

## Critères d'acceptation

### Authentification

- [ ] Accès `/admin` sans login → redirige `/auth/login`
- [ ] Accès `/admin/users` connecté en CM (sans permission `users:read`) → redirige ou 403
- [ ] Token expiré → auto-logout sur prochaine requête API
- [ ] Logout : cookie supprimé, redirection vers public + impossible de revenir sur `/admin`

### XSS

- [ ] Soumission d'un formulaire admin avec payload `<script>alert('xss')</script>` → texte échappé, pas d'alert
- [ ] Affichage d'une article (rendu HTML) avec `bypassSecurityTrustHtml` → seul l'HTML attendu rend, pas de script

### CSRF

- [ ] Tentative de POST cross-origin sur `/api/auth/logout` (cookie `SameSite=Strict`) → rejeté

### Upload

- [ ] Upload d'un `.exe` renommé `.png` → 400, pas de fichier créé
- [ ] Upload d'un fichier > 5MB → 413
- [ ] DELETE avec path traversal (`../../etc/passwd`) → 400/404 propre

## Effort estimé

M (~1.5 j)

## Dépendances

- US `us-e2e-fixtures-and-page-objects.md`
- EPIC-16 `admin-auth-persistence` (cookie HttpOnly) doit être livré pour les tests CSRF

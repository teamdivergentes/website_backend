# US — Ajouter HelloAsso à la CSP (frame-src + script-src widget)

## Role / Action / Benefice

> **En tant qu**'intégrateur de la page d'adhésion,
> **je veux** que la CSP autorise le domaine HelloAsso,
> **afin que** le widget d'adhésion embarqué s'affiche sans être bloqué.

## Criteres d'acceptation

- [ ] `frame-src` complété avec `https://www.helloasso.com` (et `https://*.helloasso.com` si nécessaire selon le mode d'embed).
- [ ] Si HelloAsso fournit un **script loader** (et non une iframe pure) : ajouter le domaine du script à `script-src` ; sinon ne pas élargir `script-src` inutilement.
- [ ] CSP **synchronisée** entre `frontend/nginx.conf` et `ansible_vps/roles/traefik/templates/dynamic.yml.j2`.
- [ ] Vérifier en environnement de test que le widget se charge **sans erreur CSP** en console.
- [ ] Aucune autre directive élargie au-delà du strict nécessaire (principe de moindre privilège).
- [ ] Headers de sécurité des autres `location` Nginx non régressés (rappel pitfall : `add_header` dans un `location` écrase ceux du `server`).

## Notes techniques

- Confirmer le domaine exact d'embed HelloAsso avant d'élargir (éviter un wildcard trop large).
- Coordination **DevSecOps** (Traefik/Nginx) + **Red Team** (revue de l'élargissement CSP).
- Lié à EPIC-32 ENABLER-9 (synchronisation des deux CSP) et EPIC-30 SEC-004 (durcissement CSP) — cohérence à maintenir.

## Suivi

| Volet | Claude | PO | E2E | Livre |
|-------|--------|----|----|-------|
| DevSecOps (CSP) | A faire | A faire | N/A | A faire |
| Sécurité (revue) | A faire | A faire | N/A | A faire |

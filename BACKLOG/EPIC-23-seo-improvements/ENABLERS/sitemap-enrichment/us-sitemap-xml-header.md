# US — Verifier et fixer le Content-Type du sitemap

## Role / Action / Benefice

> **En tant que** crawler de moteur de recherche,
> **je veux** recevoir le sitemap avec le bon Content-Type `application/xml; charset=UTF-8`,
> **afin que** je puisse parser correctement les caracteres accentues francais.

## Contexte

`backend/src/sitemap/sitemap.controller.ts` retourne le XML via NestJS. Verifier que le decorateur `@Header('Content-Type', 'application/xml; charset=UTF-8')` est bien applique. Sans cela, Express peut envoyer `text/plain` ou `application/octet-stream` selon les cas.

## Criteres d'acceptation

- [x] `@Header('Content-Type', 'application/xml; charset=UTF-8')` present sur la methode du controller
- [x] Test E2E supertest verifiant l'header de reponse (test/sitemap.e2e-spec.ts)
- [ ] `curl -I https://teamdivergentes.fr/sitemap.xml` retourne le bon Content-Type (validation post-deploiement)
- [x] Nginx ne reecrit pas l'header : le bloc `/sitemap.xml` utilise proxy_pass pur sans add_header ni proxy_set_header Content-Type — header backend preserve

## Effort estime

XS (≈ 0.25 j)

## Dependances

Aucune.

# US — Corriger la CSP `frame-src` pour l'iframe d'opt-out Matomo

**Statut** : Fait (Claude) — en attente de deploiement pour verification prod
**Type** : Bug production
**Priorite** : Haute — obligation CNIL (le droit d'opposition doit etre effectif)
**Branche** : `fix/epic-18-csp-frame-src-optout` (frontend, poussee sur `develop` le 2026-08-01)

## Role / Action / Benefice

**En tant que** visiteur du site DVG,
**je veux** pouvoir utiliser le formulaire d'opt-out sur `/privacy-optout`,
**afin de** refuser effectivement le suivi d'audience Matomo.

## Constat (2026-08-01)

La page https://teamdivergentes.fr/privacy-optout affiche son titre et son texte, mais l'iframe Matomo reste vide : le navigateur la bloque au titre de la Content-Security-Policy.

Headers renvoyes par la prod :

```
script-src  'self' 'unsafe-inline' ... https://matomo.tellebma.fr   ← OK
connect-src 'self' ... https://matomo.tellebma.fr                   ← OK
frame-src   'self' https://www.youtube.com ... https://platform.twitter.com   ← matomo absent
```

L'iframe pointe vers `https://matomo.tellebma.fr/index.php?module=CoreAdminHome&action=optOut&...`
(`frontend/src/app/pages/privacy-optout/privacy-optout.html`).

Cote Matomo, l'embarquement est autorise : la reponse ne pose ni `X-Frame-Options` ni `frame-ancestors` restrictif (verifie par `curl`). Le blocage vient uniquement de notre CSP.

## Cause

`frontend/nginx.conf` ligne 88 — la variable `$csp_frame` n'a jamais ete etendue avec le domaine Matomo lors de la livraison de l'US `us-frontend-csp-update`, qui n'a couvert que `script-src` et `connect-src`.

## Solution attendue

Ajouter `https://matomo.tellebma.fr` a `$csp_frame` dans `frontend/nginx.conf`. Le header est reconstruit a partir des memes variables aux lignes 90, 252 et 265 : une seule modification suffit, mais verifier que les trois emissions restent coherentes.

## Criteres d'acceptation

- [x] `https://matomo.tellebma.fr` ajoute a `$csp_frame` dans `frontend/nginx.conf`
- [x] Test E2E Playwright : la page charge, l'iframe est presente et n'est pas bloquee (`e2e/tests/public/privacy-optout.e2e.spec.ts`)
- [x] Test unitaire verrouillant l'origine de l'iframe sur le domaine autorise par la CSP
- [ ] `curl -sI https://teamdivergentes.fr/privacy-optout` renvoie un `frame-src` contenant `https://matomo.tellebma.fr` (apres deploiement)
- [ ] La page `/privacy-optout` affiche la case a cocher d'opt-out Matomo, sans erreur CSP en console
- [ ] Cocher la case desactive effectivement le suivi (verification sur une seconde visite)
- [ ] Meme comportement verifie en preprod (site Matomo ID 5)

## Solution appliquee

`frontend/nginx.conf` : ajout de `https://matomo.tellebma.fr` a la variable `$csp_frame`. Les trois emissions du header CSP (niveau `server`, `location ^~ /admin/`, `location ^~ /auth/`) reconstruisent le header a partir de cette variable : la modification les couvre toutes. La quatrieme emission (`location ^~ /uploads/`) porte une CSP en dur volontairement plus stricte et n'a pas ete touchee (aucune iframe n'y est servie).

Verifie egalement : aucune autre source de CSP dans le depot frontend (pas de `<meta http-equiv>` dans `index.html`, `entrypoint.sh` fait un `envsubst` sur une liste explicite qui laisse les variables `$csp_*` intactes).

## Notes

- Cette US est un correctif de l'US `us-frontend-csp-update`, marquee prematurement comme livree.
- Aucune autre page n'est impactee : Matomo n'est embarque en iframe que sur `/privacy-optout`.

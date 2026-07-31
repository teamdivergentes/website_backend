# US — Checklist validateurs sociaux pre-release

**En tant que** Product Owner / Scrum Master
**Je veux** une checklist d'outils a passer avant toute release majeure
**Afin de** garantir manuellement que les previews sont fonctionnelles avant promotion en prod

## Acceptance criteria

- [ ] Fichier `BACKLOG/EPIC-29-social-preview-ssr/ENABLERS/social-preview-validation/validators-checklist.md` cree
- [ ] Contient la liste des outils a passer + URLs preprod a tester :
  - Facebook Sharing Debugger : https://developers.facebook.com/tools/debug/ -> tester 3 URLs (home, article, joueur)
  - LinkedIn Post Inspector : https://www.linkedin.com/post-inspector/ -> idem
  - Twitter Card Validator : https://cards-dev.twitter.com/validator -> idem (note : public deprecated 2023, peut etre remplace par X Card preview)
  - Discord : envoyer un lien dans canal interne et screenshot la card
  - WhatsApp : envoyer un lien sur conv test et screenshot la card
- [ ] Pour chaque outil, capture d'ecran de reference de l'etat attendu (image stockee dans `docs/social-previews/` ou equivalent)
- [ ] Checklist integree au workflow release : ajouter une mention dans `BACKLOG/README.md` (section "Avant release prod, valider les previews sociales via EPIC-29 checklist")
- [ ] Tracage : un commentaire dans la PR `[DEPLOY] release: develop → main` doit cocher la checklist avant merge

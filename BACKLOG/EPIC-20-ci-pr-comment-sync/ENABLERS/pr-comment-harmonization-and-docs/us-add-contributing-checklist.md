# US — Ajouter une checklist « ajout de job CI » dans `CONTRIBUTING.md`

## Rôle / Action / Bénéfice

> **En tant que** mainteneur du projet,
> **je veux** que toute PR ajoutant un job dans `cicd.yml` soit forcée de cocher une checklist « commentaire PR mis à jour »,
> **afin que** la dérive constatée (jobs ajoutés sans report dans le commentaire) ne puisse plus se reproduire.

## Critères d'acceptation

- [x] `backend/CONTRIBUTING.md` créé (minimal avec lien vers docs/devsecops/pr-comment.md)
- [x] `frontend/CONTRIBUTING.md` créé (minimal avec lien vers docs/devsecops/pr-comment.md)
- [x] Section « Lors de l'ajout d'un nouveau job CI » avec checklist Markdown à recopier dans la description de PR (9 items incluant doc + test)
- [ ] La checklist est référencée depuis le template de PR si présent (`.github/pull_request_template.md`) — à vérifier lors du merge
- [ ] Mention dans `CLAUDE.md` racine (section « Known Pitfalls ») — à ajouter lors du merge

## Effort estimé

XS (~30 min)

## Dépendances

- US `us-create-pr-comment-doc.md`

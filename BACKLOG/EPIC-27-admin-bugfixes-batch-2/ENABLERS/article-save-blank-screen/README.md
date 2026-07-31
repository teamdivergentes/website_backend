# Enabler — Ecran noir apres enregistrement d'un article (admin)

## Contexte technique

Bug remonte par le PO le **2026-05-17**.

**Symptome** :
- Aller dans `/admin/articles/:id/edit` (edition d'un article existant).
- Modifier un champ quelconque.
- Cliquer sur **Enregistrer**.
- Apres la requete (sans erreur apparente cote API), l'ecran admin devient **noir** (vraisemblablement un layout casse, une erreur de routing, ou un composant qui crash silencieusement apres la mise a jour).

**Severite** : **Basse** — non bloquant (un refresh manuel restaure l'affichage), pas de perte de donnees rapportee.

## Hypotheses a verifier

1. Apres l'enregistrement, un `router.navigate(...)` echoue (slug change → URL obsolete ?).
2. Un Signal/Observable se met dans un etat invalide apres la reponse API (ex : `article()` remis a `null`).
3. Une exception non geree dans le composant editor (HMR ou subscription mort).
4. Bug CSS lie au layout admin (`mat-app` + dark theme) declenche par un re-render.

## Direction technique

- Reproduire localement (Docker + admin@teamdivergentes.fr / admin123).
- Capturer la console + le devtools network au moment du save.
- Identifier la root cause via le **systematic-debugging** (skill superpowers) avant de patcher.
- Ajouter un test de regression (TU composant editor + E2E parcours edition + save).

## US

| US | Claude | PO | E2E | Livre |
|----|--------|----|----|-------|
| [Reproduire et corriger l'ecran noir apres save article](us-fix-article-save-blank-screen.md) | A faire | A faire | A faire | A faire |

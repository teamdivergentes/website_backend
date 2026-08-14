# US — Corriger l'ecran noir apres enregistrement d'un article (admin)

## Role / Action / Benefice

> **En tant qu**'editeur de contenu admin,
> **je veux** que la page reste fonctionnelle apres avoir clique sur "Enregistrer" lors de l'edition d'un article,
> **afin de** continuer mon travail sans devoir refresh manuellement.

## Reproduction

1. Se connecter en admin (`admin@teamdivergentes.fr` / `admin123`).
2. Aller dans `/admin/articles`, ouvrir un article existant en edition.
3. Modifier un champ (titre, contenu, etc.).
4. Cliquer sur **Enregistrer**.
5. Constater l'ecran noir cote admin (parfois un simple flash, parfois persistant jusqu'au refresh).

## Criteres d'acceptation

- [ ] La root cause est identifiee et documentee (commentaire dans la PR ou note dans cette US).
- [ ] Apres `Enregistrer` :
  - L'admin reste sur la page d'edition avec les valeurs a jour, **ou** est redirige proprement vers la liste / la fiche article — selon le comportement specifie par le PO.
  - Aucun ecran noir, aucune erreur console.
  - Un toast de confirmation s'affiche (parite avec les autres CRUD admin).
- [ ] Test unitaire frontend sur le composant editor : flux "save success" verifie le comportement attendu (etat composant + navigation).
- [ ] Test E2E Playwright : `admin → edit article → save → toast OK + page utilisable`.
- [ ] Aucun warning Sentry ou console error apres save.
- [ ] Aucune regression sur la creation d'un nouvel article.

## Notes

- Reporte par le PO le **2026-05-17** : "bug lorsque l'on met a jour un article apres avoir clique sur enregistre on a un ecran noir cote admin. ce n'est pas derangeant ni urgent mais c'est un bug qu'il faut remonter."
- Lancer le skill `superpowers:systematic-debugging` avant de patcher : pas de fix tatonnement.

## Suivi

| Volet | Claude | PO | E2E | Livre |
|-------|--------|----|----|-------|
| Frontend | A faire | A faire | A faire | A faire |

# US — Couvrir les parcours publics en E2E

## Rôle / Action / Bénéfice

> **En tant que** Expert QA,
> **je veux** un test E2E par parcours public critique,
> **afin que** toute régression visible des visiteurs soit détectée avant déploiement.

## Critères d'acceptation

### Parcours nominal + 1 erreur

- [ ] **Home** : navigation, carousel se charge, footer présent, liens header fonctionnels
- [ ] **Contact** :
  - Soumission OK → message de confirmation
  - Soumission champs manquants → erreurs de validation visibles
- [ ] **Login** :
  - Login admin valide → redirection `/admin`
  - Login invalide → message d'erreur + reste sur `/auth/login`
- [ ] **Équipes** :
  - Liste s'affiche
  - Clic sur une équipe → page détail avec membres
  - Page détail d'une équipe inexistante → 404
- [ ] **Recrutement** :
  - Liste des offres
  - Clic sur offre → page détail
  - Soumission de candidature → confirmation + email envoyé (mock SMTP)
  - Candidature champs manquants → erreurs de validation
- [ ] **Sponsors** : liste s'affiche, liens externes ouvrent en nouvel onglet avec `rel="noopener"`
- [ ] **Profile** : utilisateur connecté voit ses infos, modification persistée
- [ ] **404** : route inexistante affiche la page 404

### Stabilité

- [ ] Chaque test passe **5 fois consécutives** sans flaky
- [ ] Temps total < 5 min (en parallèle)
- [ ] Captures sur échec activées dans `playwright.config.ts`

## Effort estimé

L (~2-3 j)

## Dépendances

- US `us-e2e-fixtures-and-page-objects.md`

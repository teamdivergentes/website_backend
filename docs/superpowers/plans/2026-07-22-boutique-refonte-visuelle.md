# Refonte visuelle boutique (reprise PR #56) — Plan d'implémentation

> **Pour les agents :** SOUS-SKILL REQUIS — utiliser superpowers:subagent-driven-development ou superpowers:executing-plans pour exécuter ce plan tâche par tâche. Les étapes utilisent des cases à cocher (`- [ ]`).

**Objectif :** récupérer sur `develop` la refonte visuelle de la page boutique portée par la PR #56, sans embarquer les 269 commits de retard de sa branche.

**Architecture :** cherry-pick du commit unique `212136d` sur une branche neuve issue de `develop`, résolution manuelle des conflits, vérification visuelle. Aucun changement fonctionnel.

**Tech Stack :** Angular 20 (standalone, zoneless), SCSS, Jasmine + Karma.

**Repo :** `website_frontend` — `/home/tellebma/DEV/DVG/WEB/frontend`

## Contraintes globales

- Aucun changement de comportement : la page reste alimentée par `src/app/data/shopping-list.ts` et les liens « Acheter » continuent de pointer vers `eliminate.fr`. Le branchement API est hors périmètre (voir le plan `2026-07-22-boutique-flux-commande.md`).
- Templates en control flow natif (`@if`, `@for (x of y; track x.id)`), jamais `*ngIf`/`*ngFor`.
- Libellés en français en dur — le projet n'a aucun système i18n.
- Prettier : `printWidth: 100`, `singleQuote: true`.
- `npm run lint` doit passer avec `--max-warnings=0`.
- Seuils de couverture Karma bloquants : statements 65, branches 55, functions 60, lines 65.

---

### Task 1 : Récupérer le commit de la PR #56 sur une branche neuve

**Fichiers :**
- Créer : branche `feat/boutique-redesign-v2`
- Modifier (par cherry-pick) : `src/app/pages/boutique/boutique.html`, `src/app/pages/boutique/boutique.scss`, `src/app/data/shopping-list.ts`, `src/shared/components/shop-item/shop-item.component.{ts,html,scss}`
- Assets : ajout `src/assets/img/shop/banner-lifestyle.jpg`, `src/assets/img/shop/maillot-jersey-2026.jpg`, `src/assets/videos/hero-boutique.mp4` ; suppression des PNG `*_hight.png` et `*_max_size.png`

**Interfaces :**
- Consomme : rien
- Produit : une branche `feat/boutique-redesign-v2` à jour sur `develop`, contenant le redesign

- [ ] **Étape 1 : Créer la branche depuis develop à jour**

```bash
cd /home/tellebma/DEV/DVG/WEB/frontend
git fetch origin
git checkout -b feat/boutique-redesign-v2 origin/develop
```

- [ ] **Étape 2 : Tenter le cherry-pick**

```bash
git cherry-pick 212136d
```

Attendu : **échec** avec des conflits. Les fichiers en conflit probables sont `boutique.scss` (~1100 lignes ajoutées côté PR, modifié depuis sur develop) et `shop-item.component.scss`. Vérifier la liste exacte :

```bash
git status --short | grep '^UU\|^AA\|^DU\|^UD'
```

Si le cherry-pick réussit sans conflit, passer directement à l'étape 5.

- [ ] **Étape 3 : Résoudre les conflits**

Règle de résolution, à appliquer fichier par fichier :

- **`boutique.html` / `shop-item.component.html`** — garder la version de la PR (`--theirs`) pour la structure, puis réintroduire à la main tout attribut d'accessibilité présent sur `develop` et absent de la PR (`[attr.aria-label]`, `[attr.aria-expanded]`, `role`, `aria-hidden`). Ces attributs ont été ajoutés par l'EPIC-33 après la PR #56 et ne doivent pas être perdus.
- **`boutique.scss` / `shop-item.component.scss`** — garder la version de la PR, puis vérifier que les variables CSS de thème utilisées existent toujours (`var(--darkBackground)`, `var(--darkGreen)`). Toute variable renommée depuis doit être mise à jour.
- **`shopping-list.ts`** — garder la version de `develop` et n'appliquer que le delta de la PR (1 ajout, 2 suppressions). Ce fichier a pu recevoir des corrections de chemins d'images entretemps.
- **`shop-item.component.ts`** — garder la version de la PR (elle apporte la lightbox), puis vérifier que le `scrollLockEffect`, le `@HostListener('document:keydown.escape')` et le `ngOnDestroy` de `develop` sont toujours présents. Ils gèrent le verrouillage du scroll et la fermeture clavier.

Pour chaque fichier résolu :

```bash
git add <fichier>
```

- [ ] **Étape 4 : Finaliser le cherry-pick**

```bash
git cherry-pick --continue
```

- [ ] **Étape 5 : Vérifier que les assets référencés existent**

Extraire tous les chemins d'assets référencés et vérifier leur présence sur disque :

```bash
cd /home/tellebma/DEV/DVG/WEB/frontend
grep -oh "assets/[a-zA-Z0-9/_.-]*" src/app/pages/boutique/boutique.html src/app/pages/boutique/boutique.scss src/app/data/shopping-list.ts \
  | sort -u | while read -r p; do [ -f "src/$p" ] || echo "MANQUANT: $p"; done
```

Attendu : aucune ligne `MANQUANT`. Si un asset manque, c'est que la suppression des PNG a emporté un fichier encore référencé — restaurer ce fichier depuis `develop` (`git checkout origin/develop -- src/<chemin>`) ou corriger la référence.

- [ ] **Étape 6 : Lancer le lint**

```bash
npm run lint
```

Attendu : `0 problems`. Corriger toute erreur avant de continuer.

- [ ] **Étape 7 : Lancer les tests**

```bash
npm run test:coverage
```

Attendu : tous les specs passent, dont `src/app/pages/boutique/boutique.spec.ts` (11 specs) et `src/shared/components/shop-item/shop-item.component.spec.ts`.

Si `shop-item.component.spec.ts` échoue, c'est attendu : le composant a gagné des entrées (lightbox) dans la PR. Adapter le spec aux nouveaux inputs/outputs — ne pas supprimer d'assertion existante, seulement en ajouter.

- [ ] **Étape 8 : Commit de la résolution**

Si des corrections ont été nécessaires après le cherry-pick :

```bash
git add -A
git commit -m "fix(boutique): adapter le redesign aux evolutions de develop"
```

---

### Task 2 : Vérification visuelle et ouverture de la PR

**Fichiers :** aucun (vérification et publication)

**Interfaces :**
- Consomme : la branche `feat/boutique-redesign-v2` de la Task 1
- Produit : une PR ouverte sur `develop`, la PR #56 fermée

- [ ] **Étape 1 : Démarrer le serveur de dev**

```bash
cd /home/tellebma/DEV/DVG/WEB/frontend
npm start
```

Ouvrir `http://localhost:4200/boutique`.

- [ ] **Étape 2 : Vérifier le rendu desktop**

Checklist à valider à 1440px de large :

- la vidéo hero se lit et occupe toute la largeur, avec l'image poster en fallback avant chargement
- la section produit mis en avant (maillot 2026) s'affiche
- la bannière lifestyle apparaît entre les sections
- la grille « nouveautés » affiche les cartes avec overlay au survol
- la section « ancienne collection » affiche un prix visible sur chaque article
- aucune image cassée (vérifier l'onglet Réseau : aucun 404 sur `/assets/`)

- [ ] **Étape 3 : Vérifier le rendu mobile**

Dans les devtools, émuler une largeur de 390px (iPhone 14) :

- les boutons d'action des cartes produit sont visibles sans survol
- chaque cible tactile fait au moins 44×44px
- aucun effet de survol ne reste « collé » après un tap
- la page ne défile pas horizontalement

- [ ] **Étape 4 : Vérifier l'accessibilité au clavier**

- `Tab` atteint tous les boutons « Détails » et « Acheter »
- le focus est visible sur chaque élément
- ouvrir une modale produit, vérifier que `Échap` la ferme et que le focus part bien dans la modale à l'ouverture

- [ ] **Étape 5 : Pousser et ouvrir la PR**

```bash
git push -u origin feat/boutique-redesign-v2
gh pr create --base develop --title "feat(boutique): refonte visuelle de la page boutique (reprise #56)" --body "$(cat <<'EOF'
Reprend le contenu de la PR #56, qui accusait 269 commits de retard sur `develop` et
n'etait plus mergeable. Le commit `212136d` a ete cherry-picke sur une branche neuve issue
de `develop`, avec resolution manuelle des conflits.

## Contenu

- Hero video pleine largeur avec image poster en fallback
- Mise en avant du maillot jersey 2026 en section dediee
- Banniere lifestyle entre les sections
- Grille produits : cartes avec overlay desktop, boutons visibles sur mobile
- Composant `shop-item` avec lightbox modale
- Ancienne collection : prix visible
- Corrections tactiles mobile : cibles 44px, survol desactive
- Remplacement des images haute resolution par des versions optimisees

## Hors perimetre

Aucun changement fonctionnel : la page reste alimentee par `shopping-list.ts` et les liens
« Acheter » pointent toujours vers eliminate.fr. Le flux de commande est traite separement.

Closes #56

https://claude.ai/code/session_016wgAvfhXFiX7HFnnhnUMw1
EOF
)"
```

- [ ] **Étape 6 : Fermer la PR #56**

```bash
gh pr close 56 --comment "Remplacee par la PR ci-dessus : branche trop en retard sur develop (269 commits) pour etre rebasee. Contenu identique, cherry-picke sur une branche neuve."
```

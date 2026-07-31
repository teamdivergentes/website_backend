# US — Aperçu du flocage directement sur le visuel de dos

**Statut Claude** : A faire — **non planifiée**, mise en pause par Maxime le 2026-07-29

En tant que **client**, je veux **voir mon pseudo à sa place sur le dos du maillot** afin de
**savoir à quoi ressemblera la pièce avant de payer**.

Remplace l'aperçu typographique actuel, présenté dans une bande séparée sous le champ de
saisie. Cet aperçu reste le repli quand un produit n'a pas de visuel de dos exploitable.

## Ce qui est déjà là

| Élément | État |
|---|---|
| `flockingTopPct` (32) / `flockingLeftPct` (50) | En base (`schema.prisma:350`), dans les DTO et les modèles front. **Jamais lus par le rendu, non éditables dans l'admin** |
| Visuels de dos avec et sans nom, alignés | ✅ livrés le 2026-07-29 (voir ci-dessous) |
| Longueur max du flocage (12 caractères) + charset restreint | Validé côté serveur et côté client |
| Police du flocage | ✅ **Bebas Neue**, déjà chargée sur le site (`@font-face` local + Google Fonts) |

## Assets livrés

À la racine du dépôt DVG, tous en 5000 × 5000 RGBA :

| Fichier | Contenu |
|---|---|
| `DVG_DVGxJOKER_Jersey_Mockup_Back_Alpha.png` | Dos **sans nom**, fond transparent |
| `DVG_DVGxJOKER_Jersey_Mockup_Back_Name_Alpha.png` | Dos **avec nom**, fond transparent |
| `DVG_DVGxJOKER_Jersey_Mockup_Back.png` / `_Back_Name.png` | Mêmes rendus, fond opaque |
| `DVG_DVGxJOKER_Jersey_Mockup_Front_Alpha.png` | Face, fond transparent |

Les deux versions du dos sont **strictement alignées** : une différence pixel à pixel entre
`Back_Alpha` et `Back_Name_Alpha` ne fait apparaître que la zone du nom. La calibration est
donc mesurable, pas à tâtonner.

## Calibration mesurée

Différence des deux images, ramenée à la **boîte du vêtement** (alpha non nul :
`823, 257 → 4250, 4611`, soit 3427 × 4354 px), c'est-à-dire au cadrage de l'asset publié :

| Mesure | Valeur |
|---|---|
| Centre horizontal | **49,89 %** (défaut en base : 50) |
| Centre vertical | **30,99 %** (défaut en base : 32) |
| Largeur de la zone | **43,0 %** |
| Hauteur de la zone | **7,05 %** |

⚠️ Ces valeurs correspondent au mot « Nickname » (8 caractères), pas à la largeur maximale
autorisée. Le corps de référence doit être déduit de la hauteur (7,05 %), et la largeur sert
de borne pour la réduction automatique.

## Traitement typographique

Précisé par Maxime le 2026-07-29 : **Bebas Neue** sur les deux couches.

| Couche | Traitement |
|---|---|
| Arrière | Bebas Neue, **italique**, **contours seuls** (pas de remplissage), vert |
| Avant | Bebas Neue, blanc plein |

⚠️ **Écart constaté avec le mockup fabricant.** Sur `Back_Name_Alpha.png`, la couche arrière
correspond bien à du Bebas Neue en contours verts — mais la couche avant est une grotesque
géométrique grasse italique **avec de vraies minuscules** (« Nickname »), ce que Bebas Neue
ne possède pas : la police est exclusivement capitale. Passer l'avant en Bebas Neue donnera
donc « NICKNAME » en capitales condensées, sensiblement différent du mockup.

À trancher avant de développer : est-ce un choix assumé de DVG, ou le mockup fait-il foi ?
Dans le second cas, il faut la police réelle du fabricant.

## Critères d'acceptation

- [ ] Le dos affiché est la version **sans nom** ; le pseudo est superposé en HTML
- [ ] Position et corps pilotés par les champs produit, pas en dur
- [ ] Les deux couches typographiques sont reproduites (filigrane + nom)
- [ ] Le corps se réduit automatiquement quand le pseudo dépasse la largeur de zone
- [ ] Le pseudo reste calé quelle que soit la largeur d'écran (`container-type: inline-size`)
- [ ] Repli sur l'aperçu typographique actuel si le produit n'a pas de visuel de dos propre
- [ ] La mention « aperçu indicatif, le rendu final est celui du fabricant » est conservée
- [ ] Le pseudo reste du texte dans le DOM (interpolation Angular, jamais d'`innerHTML`)
- [ ] TU sur le calcul de position et de corps, E2E sur saisie → aperçu

## Travaux

### Données (migration Prisma + admin)

| Champ | Action |
|---|---|
| `flockingTopPct`, `flockingLeftPct` | Câbler au rendu, rendre éditables |
| `imageBackClean` | Créer — ou basculer `imageBack` sur la version sans nom et garder celle avec nom comme visuel d'exemple |
| `flockingWidthPct` | Créer (défaut 43) |
| `flockingFontSizePct` | Créer (défaut déduit de 7,05) |

Prévoir un **écran de calibration dans l'admin** : poser un pseudo test et déplacer la zone
en direct. Régler quatre pourcentages à l'aveugle sur trois maillots aux dos différents n'est
pas tenable.

### Assets

Les visuels publiés (`assets/img/shop/maillot-2026-joker-{front,back}.png`) font 940 × 1200 et
944 × 1200 **en mode palette 8 bits**, dérivés du `_V1_Alpha_Light` en 1920 px. Cadrages
légèrement différents entre face et dos. À réexporter depuis les 5000 × 5000, en RGB 24 bits,
avec un cadrage identique sur la boîte alpha, à une résolution qui tienne le cadre agrandi
(≥ 1600 px de large).

## Points bloquants

| Sujet | Nature | Statut |
|---|---|---|
| Bebas Neue en avant : capitales imposées vs minuscules du mockup | Design | **A trancher** |
| Casse : le fabricant respecte-t-il la saisie ou passe-t-il tout en capitales ? | Fabricant | A confirmer |
| Largeur maximale du flocage sur le vêtement | Fabricant | A confirmer |
| Visuels de dos pour Mystic et le maillot structure | Design | En attente |

L'aperçu doit montrer ce qui sera livré. Sur un produit personnalisé, donc non remboursable,
un écart entre l'aperçu et le maillot reçu est une source de réclamation directe.

**Sujet non planifié.** Décision de Maxime le 2026-07-29 : la boutique part sans cet aperçu,
avec l'aperçu typographique actuel en bande séparée.

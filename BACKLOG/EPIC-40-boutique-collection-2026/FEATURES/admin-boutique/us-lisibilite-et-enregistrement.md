# US — Lisibilité de l'écran admin et clarté de l'enregistrement

**Statut Claude** : Fait
**Source** : retour de recette de Maxime, 2026-07-29.

En tant qu'**administrateur**, je veux **voir ce que je modifie et savoir ce qui est déjà
enregistré** afin de **ne pas craindre de perdre une saisie ni de cliquer sur un bouton au
hasard**.

## Retours

1. « Si on fait des modifications sur le Catalogue il faut cliquer sur le bouton enregistrer
   des réglages. Je ne trouve pas cela très ergonomique. »
2. « Pourquoi le fond est blanc ? »

## Diagnostic

**Le fond blanc était un bug, et il expliquait probablement le premier retour.** Les classes
locales `card`, `table` et `grid` sont aussi des classes **Bootstrap**, importé globalement
dans `styles.scss`. Bootstrap gagnait donc sur le panneau d'administration et imposait
notamment `background-color: #fff` à `.card`. Sur un admin en thème sombre au texte blanc,
cela donnait **du blanc sur blanc** : l'écran était illisible, seul le bouton « Enregistrer »
ressortait vraiment. Le reste du SCSS était par ailleurs écrit pour un fond clair
(`rgb(0 0 0 / 25%)` sur les bordures et les champs), invisible sur fond sombre.

**Le catalogue, lui, s'enregistrait déjà tout seul** : `toggleActive` envoie un PATCH
immédiat, le dialogue produit appelle l'API avant de se fermer, la suppression est directe.
Le bouton ne concernait que les frais de port et l'e-mail de notification, mais rien ne
l'indiquait, et il côtoyait un interrupteur (« Boutique ouverte ») à enregistrement immédiat.

## Critères d'acceptation

- [x] Classes locales renommées pour ne plus entrer en collision avec Bootstrap :
      `card` → `panel`, `table` → `catalog`, `grid` → `form-grid`
- [x] Surfaces alignées sur le reste de l'admin : fond `--lightBlack`, filet `--darkGreen`
- [x] Bordures, champs et textes atténués repassés en valeurs claires sur fond sombre
- [x] Le dialogue produit est lisible : champs sombres, texte clair, sections délimitées
- [x] Chaque panneau annonce son mode d'enregistrement : les Réglages précisent que le bouton
      ne couvre que deux champs, le Catalogue précise que tout y est immédiat
- [x] Le bouton « Enregistrer » reste inactif tant qu'aucun des deux champs n'a changé
- [x] Un message signale « Frais de port ou e-mail modifiés : pensez à enregistrer », et
      disparaît si la valeur revient à celle d'origine

## Notes

Le choix de garder un bouton plutôt qu'un enregistrement automatique est délibéré : un montant
et une adresse e-mail se saisissent caractère par caractère, et un envoi à chaque frappe
enregistrerait des valeurs intermédiaires invalides. L'indicateur d'état lève l'ambiguïté sans
prendre ce risque.

Si Maxime préfère malgré tout un enregistrement automatique, la piste est un envoi au `blur`
avec validation préalable, ce qui supprimerait le bouton et alignerait les deux champs sur le
comportement des interrupteurs.

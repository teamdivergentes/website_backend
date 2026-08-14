# US — Audit + brainstorming de la nouvelle organisation de la navbar admin

## Role / Action / Benefice

> **En tant que** PO,
> **je veux** valider une nouvelle structure de navbar admin avant qu'elle ne soit implementee,
> **afin de** garantir une UX coherente et eviter des regressions de navigation pour les utilisateurs admin existants.

## Criteres d'acceptation

- [x] Audit ecrit (dans cette US ou dans un fichier dedie) listant **tous** les liens admin actuels avec :
  - libelle visible
  - route cible
  - permission requise
  - frequence d'utilisation estimee (impression d'usage cote PO)
- [x] Brainstorming avec le PO via le skill `superpowers:brainstorming` : 3 options minimum de regroupement (par exemple : par domaine / par cycle de publication / par frequence).
- [x] Option retenue documentee : sections, ordre, items, regles d'affichage en fonction des perms.
- [x] Maquette legere (ASCII / Figma rapide / capture annotee) jointe a l'US.
- [x] Validation PO explicite avant de demarrer l'US d'implementation.

## Livraison (2026-07-29)

**Spec** : `frontend/docs/superpowers/specs/2026-07-29-admin-shell-refonte-design.md` (commit `ff83dec`)

Brainstorming mene avec le PO via `superpowers:brainstorming`, avec consultation d'un expert UX/UI.

**Audit** — les 14 entrees listees avec libelle, route, permission et section actuelle. Constat
principal : le nombre d'entrees reellement visibles depend du role (Admin 14, Gestionnaire 8, CM 4),
et la taxonomie `section` existante est inexploitable — `content` absorbe la moitie des entrees,
`analytics` et `tools` sont des groupes a 1 item. Pour un Gestionnaire, elle produirait 3 groupes
dont 2 orphelins.

**Frequence d'usage PO** : le quotidien est le flux editorial (Articles, Matchs, Palmares, Twitch).
Tout le reste est occasionnel.

**4 patterns compares** : sections a en-tetes non cliquables, accordeon avec persistance d'etat,
rail d'icones + panneau contextuel, navigation allegee + palette de commandes.

**Option retenue** : sections a en-tetes non cliquables, avec palette Cmd+K en complement.
L'accordeon est ecarte — le plus gros groupe fait 4 items, il couterait un clic sur la moitie des
navigations pour resoudre un probleme inexistant, et entre en conflit avec le mode replie. Le rail
+ panneau est ecarte — 3 a 5 jours, reecrit la mecanique collapsed/mobile aujourd'hui stable, et
donne 288px de chrome pour les 4 destinations d'un CM.

**Decoupage retenu** : zone epinglee (Dashboard, Statistiques) + 4 groupes — Competition (4),
Contenu (3), Structure (2), Administration (3). Regle de degradation : groupe a 0 item -> rien ;
groupe a 1 item -> l'item sans en-tete.

**Maquettes ASCII** : etat deploye, replie, mobile, plus les rendus CM et Gestionnaire — dans le spec.

## Suite

L'implementation est portee par **EPIC-43** (`BACKLOG/EPIC-43-admin-shell-refonte/`), l'EPIC-28
excluant explicitement la "refonte visuelle complete du panel admin -> autre EPIC si besoin".

## Suivi

| Volet | Claude | PO | E2E | Livre |
|-------|--------|----|----|-------|
| Product / UX | Fait (2026-07-29) | Fait (2026-07-29) | Sans objet | Sans objet |

# EPIC-39 — Résilience de la chaîne CI/CD

**Statut** : EN COURS
**Priorité** : Haute
**Créé le** : 2026-07-22

## Contexte — double incident du 2026-07-22

Deux pannes indépendantes se sont déclarées le même jour et ont révélé des faiblesses structurelles communes.

### Incident 1 — CI gelée ~9h sans alerte
Les 2 conteneurs runners self-hosted étaient absents du VPS. Après remise en service, la cause racine est apparue : **GitHub avait déprécié la version du runner (v2.333.1)**. Le runner s'authentifie, s'enregistre, affiche « Listening for Jobs »… mais GitHub refuse de lui router des jobs :

```
An error occurred: Runner version v2.333.1 is deprecated and cannot receive messages.
```

Aucune erreur visible dans l'UI GitHub Actions : les runs restent simplement `queued` indéfiniment. Dernière CI réussie : 2026-07-19 20:31. **Personne n'a rien vu pendant ~9h.**

→ Corrigé : bump `2.336.0` + whitelist du tag Ansible ([vps#36](https://github.com/teamdivergentes/vps/pull/36), mergée).

### Incident 2 — Production non redéployable
L'image `:RELEASE` de production avait disparu de GHCR → `docker pull` en 404 → **tout déploiement Ansible échouait**, et la prod ne tournait plus que sur une image locale mise en cache sur le VPS.

Cause racine : `ghcr-cleanup.yml` utilisait `ignore-versions: '^(RELEASE|PREPROD)$'` en croyant protéger les images de prod. Or la doc précise que `ignore-versions` prend **une regex sur le _nom de version_** — pour un package container, c'est le **digest `sha256:`**, jamais le tag. La protection était **inopérante depuis le début** ; le workflow tournant à chaque PR fermée en ne gardant que 5 versions, l'image de prod est sortie du top-5 et a été supprimée.

→ Corrigé : cleanup conscient des tags + garde-fou ([backend#165](https://github.com/teamdivergentes/website_backend/pull/165), [frontend#234](https://github.com/teamdivergentes/website_frontend/pull/234), mergées). Images `:RELEASE` restaurées à l'identique depuis le VPS et déploiement Ansible validé `success`.

## Objectif

Traiter les **causes structurelles** que ces incidents ont mises en évidence, pour qu'une panne d'infrastructure CI soit détectée en minutes plutôt qu'en heures, et n'ait plus d'effet bloquant total.

## Périmètre

Workflows GitHub Actions des repos `website_backend` et `website_frontend` (symétriques).

**Hors scope** : refonte de l'architecture des runners (passage à des runners éphémères / autoscaling), à évaluer séparément.

## Suivi

| Élément | Claude | PO | E2E | Livré |
|---------|--------|----|----|-------|
| [ENABLER — Résilience CI](ENABLERS/resilience-ci/README.md) | En cours | A faire | - | A faire |

## Dépendances

Aucune. Les 3 US sont indépendantes, mais les US 2 et 3 touchent toutes deux `cicd.yml` (à séquencer).

# US — Superviser réellement les runners self-hosted

**Priorité** : 🔴 1
**Fichier** : `.github/workflows/runner-check.yml` (backend + frontend)

## Rôle / Action / Bénéfice

**En tant qu'** équipe technique,
**je veux** être alerté automatiquement quand les runners CI sont indisponibles ou obsolètes,
**afin de** ne plus découvrir une CI gelée après 9 heures.

## Problème constaté

`runner-check.yml` est structurellement incapable de détecter une panne :

```yaml
on:
  workflow_dispatch:          # aucun schedule -> ne se déclenche jamais seul
runs-on: [self-hosted, ...]   # ...et ne peut pas tourner quand ils sont morts
```

Le seul outil de diagnostic est indisponible précisément quand on en a besoin. C'est ce qui a rendu l'incident 1 invisible pendant ~9h.

S'ajoute un mode de panne silencieux : un runner de version dépréciée s'enregistre et affiche « Listening for Jobs », mais GitHub ne lui route aucun job — les runs restent `queued` sans aucune erreur dans l'UI.

## Critères d'acceptation

- [ ] `runs-on: ubuntu-latest` (le check ne doit dépendre d'aucun runner self-hosted).
- [ ] Ajout d'un `schedule` (~toutes les 15 min) en plus du `workflow_dispatch`.
- [ ] **Vérification de disponibilité** : au moins 1 runner `online` via l'API `/orgs/{org}/actions/runners`. Sinon → alerte.
- [ ] **Vérification d'engorgement** : alerte si des runs sont `queued` depuis plus de N minutes (seuil paramétrable, ex. 30 min) — détecte le cas « runner online mais ne consomme rien ».
- [ ] **Vérification de version** : comparaison de la version des runners avec la dernière release `actions/runner` ; alerte si l'écart dépasse un seuil (ex. 3 versions), avant que GitHub ne la déprécie.
- [ ] **Alerte Discord** via le workflow réutilisable existant `discord-notify.yml` (`workflow_call`).
- [ ] Le workflow ne doit jamais faire échouer une autre CI (job isolé, pas de dépendance).
- [ ] Appliqué de façon symétrique dans les 2 repos.

## Note

Éviter le doublon d'alertes : les 2 repos surveillant les mêmes runners d'org, prévoir soit un seul repo « propriétaire » du check, soit une fréquence décalée. À trancher à l'implémentation et documenter en commentaire.

---

## Décisions prises à l'implémentation (2026-07-22)

- **Doublon d'alertes** → repo **propriétaire** (`website_backend`) pour le `schedule`, avec `WATCHED_REPOS` couvrant les deux files. Garantit *1 alerte par panne* (un décalage horaire n'aurait fait qu'étaler le doublon). `workflow_dispatch` reste actif dans les 2 repos.
- **Seuil de version** → comparaison `gap >= seuil` et non `>`. Justification factuelle : l'incident réel était 2.333.1 vs 2.336.0, soit un écart de **tout juste 3** ; un `>` strict au seuil 3 aurait **laissé passer l'incident réel**.
- **Validation par rejeu** : le script de sonde a été testé contre un `curl` mocké rejouant l'incident du 2026-07-22 (2 runners online, run `queued` depuis 9h, version 2.333.1) → détecté sur les deux axes.

## Suites identifiées (à arbitrer)

- [ ] 🟠 **`discord-notify.yml` tourne sur `runs-on: [self-hosted, linux, vps, docker]`** — le workflow d'alerte réutilisable dépend donc de la flotte qu'il sert à surveiller : l'employer pour annoncer une panne de runners produirait une alerte bloquée en `queued` indéfiniment (le mode de panne même de l'incident 1). Contournement en place (webhook direct si flotte KO, workflow réutilisable sinon, conditions mutuellement exclusives). **Correctif de fond** : rendre son `runs-on` paramétrable pour router 100 % des alertes via le workflow réutilisable.
- [ ] 🔴 **Vérifier la portée du secret `DEPLOY_TOKEN`** (action admin org) — lister les runners d'org exige `admin:org` (classic) ou `Administration: read` (fine-grained). Non vérifiable depuis le code. **Si la portée manque** : les contrôles *disponibilité* et *version* sont inopérants et seul le contrôle *engorgement* subsiste. Une alerte de configuration est émise (max 1×/jour) pour éviter un angle mort silencieux — la cause profonde même de cet EPIC.
- [ ] 🟡 **Duplication d'état sur la version du runner** : `PINNED_RUNNER_VERSION` (repli si l'API ne renvoie pas le champ `version`) doit rester synchronisé manuellement avec `github_runner_tag` du repo `vps`.
- [ ] 🟡 L'embed Discord affichera « Deploy SUPERVISION RUNNERS — … » (le titre est en dur dans `discord-notify.yml`). Cosmétique, corrigé en même temps que le point 1.

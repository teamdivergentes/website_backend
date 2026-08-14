# EPIC-35 — Hotfix sécurité : exposition de secrets via `/api/config`

> **Priorité : 🔴 CRITIQUE — hotfix immédiat hors cycle.**
> Créé le 2026-05-27 suite à la découverte d'une fuite de credentials live en production.

## Contexte

L'endpoint **`GET /api/config`** (et `GET /api/config/:key`) est marqué `@Public()` et renvoie **toutes** les entrées de la table `Config` sans aucun filtrage. En production, cela expose publiquement, **sans authentification** :

| Clé exposée | Nature du secret | Impact |
|-------------|------------------|--------|
| `contact_smtp_pass` | Mot de passe SMTP Gmail (`contact@teamdivergentes.fr`) | Prise de contrôle de la boîte mail, envoi de mails au nom de DVG |
| `contact_discord_webhook` | Webhook Discord complet | Injection de messages dans le serveur Discord |
| `recruitment_discord_webhook` | Webhook Discord complet | Idem (canal recrutement) |
| `contact_smtp_user` / `_host` / `_port` | Paramètres SMTP | Surface d'attaque facilitée |

**Vérifié en prod le 2026-05-27** : `curl https://teamdivergentes.fr/api/config` retourne ces valeurs en clair.

- **OWASP** : A01 (Broken Access Control) + A02 (Cryptographic Failures / secrets exposés)
- **Sévérité** : CRITIQUE (secrets en clair, exploitables immédiatement)

## Objectif

1. **Stopper la fuite** : l'endpoint public ne doit exposer qu'une **allow-list** de clés non sensibles (fail-safe : toute nouvelle clé est privée par défaut).
2. **Préserver l'admin** : le panel admin doit continuer à lire/éditer **toutes** les clés via un endpoint **authentifié** (`@Roles('admin')`).
3. **Rotation des secrets compromis** : les valeurs exposées sont à considérer comme **compromises** → rotation obligatoire (action humaine/infra).

## Décision d'architecture

**Allow-list publique** (et non deny-list) : sécurité par défaut. Une constante `PUBLIC_CONFIG_KEYS` liste les clés exposables au public. Tout le reste exige le rôle admin.

Clés publiques connues (à valider par Backend/Red Team) : `site_name`, `og_title`, `og_description`, `og_image`, `youtube_link`, `youtube_url`, `twitch_url`, `twitter_url`, `instagram_url`, `discord_url`, `mail_url`, `social_urls`, `contact_email`, `contact_phone`, et toutes les `page_*_visible`.

Clés **interdites au public** : `contact_smtp_*`, `*_webhook`, et toute future clé non whitelistée.

## Suivi

| Enabler / US | Sévérité | Claude | PO | E2E | Livré |
|--------------|----------|--------|----|----|-------|
| [ENABLER-1 — Filtrage allow-list endpoint public + endpoint admin protégé](ENABLERS/config-public-allowlist/README.md) | 🔴 CRITIQUE | Fait (back + front, branche `fix/epic-35-config-secrets-leak`) | A faire | A faire | A faire |
| [ENABLER-2 — Rotation des secrets compromis (SMTP + webhooks)](ENABLERS/secrets-rotation/README.md) | 🔴 CRITIQUE | A faire | A faire | N/A | A faire |
| ENABLER-3 — Audit des autres endpoints `@Public()` (Red Team) | 🟠 HAUTE | A faire | A faire | N/A | A faire |

## Plan de livraison

1. ✅ Backend : filtrage allow-list (TDD, 654 tests verts) — branche `fix/epic-35-config-secrets-leak`, **PR #153** ouverte vers develop.
2. ✅ Frontend : panel admin pointe vers endpoint admin (1208 tests verts) — **PR #221** ouverte vers develop.
3. ✅ Red Team : audit des routes publiques réalisé (findings annexes → EPIC-30/36).
4. ✅ VQO ≥ 9.5 validé (lint + tests verts des 2 côtés, 2026-05-27).
5. ✅ EPIC-24 (#152 back / #220 front) mergé sur develop le 2026-05-27 pour fiabiliser le deploy-prod (inclus dans la même release).
6. ✅ CI verte (re-run frontend, test flaky authInterceptor hors scope) → EPIC-35 #153/#221 mergé sur develop le 2026-05-27.
7. ⏳ **PR develop→main ouvertes** (back #154 / front #222) — EPIC-35 + EPIC-24. En attente validation PO pour merge = déclenchement déploiement prod.
8. ⚠️ **Rotation des secrets** par l'équipe APRÈS déploiement (mot de passe Gmail + 2 webhooks Discord).

## États
`Fait` / `En cours` / `A faire` / `Bloque`

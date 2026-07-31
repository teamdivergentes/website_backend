# US — Filtrer les clés sensibles de l'endpoint config public

**En tant que** responsable sécurité de Team Divergentes,
**je veux** que l'endpoint public `/api/config` n'expose que des clés non sensibles,
**afin que** les secrets (mot de passe SMTP, webhooks Discord) ne soient plus accessibles publiquement.

## Critères d'acceptation

- [ ] `GET /api/config` (public, sans token) ne retourne **aucune** des clés : `contact_smtp_pass`, `contact_smtp_user`, `contact_smtp_host`, `contact_smtp_port`, `contact_discord_webhook`, `recruitment_discord_webhook`.
- [ ] `GET /api/config` retourne bien les clés publiques nécessaires au site (`page_*_visible`, `og_*`, liens sociaux, `site_name`, `youtube_link`, etc.).
- [ ] `GET /api/config/contact_smtp_pass` (public) → **404** (comportement identique à une clé inexistante, pas de fuite d'information).
- [ ] La whitelist est centralisée dans une constante unique (`PUBLIC_CONFIG_KEYS`), fail-safe : une nouvelle clé non listée est **privée par défaut**.
- [ ] Le module Contact (envoi mail + webhook) fonctionne toujours (il lit via `getValue()` en interne, hors endpoint public).
- [ ] **Tests TDD** : spec qui échoue d'abord (RED) prouvant la fuite, puis passe (GREEN) ; couvre clé publique OK, clé sensible filtrée, clé sensible en `:key` → 404.
- [ ] Aucune régression : suite de tests backend 100 % verte.

## Statut
`A faire`

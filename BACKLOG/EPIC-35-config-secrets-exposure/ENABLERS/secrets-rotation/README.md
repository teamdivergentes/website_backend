# ENABLER-2 — Rotation des secrets compromis

> 🔴 CRITIQUE — action humaine / infra. Le correctif code ne suffit pas : les secrets sont **déjà exposés** publiquement et doivent être considérés comme **compromis**.

## Secrets à faire tourner (URGENT)

| Secret | Action | Responsable |
|--------|--------|-------------|
| `contact_smtp_pass` (mot de passe applicatif Gmail `contact@teamdivergentes.fr`) | Révoquer le mot de passe d'application Google + en générer un nouveau, puis mettre à jour la clé en base | PO / DevSecOps |
| `contact_discord_webhook` | Supprimer le webhook dans Discord + en recréer un, mettre à jour la clé | PO / DevSecOps |
| `recruitment_discord_webhook` | Idem | PO / DevSecOps |

## Critères d'acceptation

- [ ] L'ancien mot de passe d'application Gmail est **révoqué** (ne fonctionne plus).
- [ ] Les 2 anciens webhooks Discord sont **supprimés** côté Discord (les URLs exposées renvoient 404).
- [ ] Les nouvelles valeurs sont en base et le formulaire de contact + notifications recrutement fonctionnent.
- [ ] Vérifier dans les logs Gmail/Discord qu'aucun usage malveillant n'a eu lieu pendant la fenêtre d'exposition.

## Note

Le seul correctif de l'endpoint **ne referme pas** le risque : tant que la rotation n'est pas faite, les credentials captés restent utilisables. Cet enabler est aussi prioritaire que le fix code.

## Statut
`A faire`

# US — Flag de maintenance persistant et permission de bypass

## User Story

**En tant que** PO de Team Divergentes,
**je veux** activer et désactiver un mode maintenance depuis l'administration,
**afin que** je puisse fermer le site pendant une refonte ou un incident sans solliciter le DevSecOps ni attendre un redéploiement.

## Critères d'acceptation

- [ ] **AC1** — Une clé `MAINTENANCE_MODE` existe dans la table `configs`, valeur `'true'` ou `'false'`, avec une `description` renseignée
- [ ] **AC2** — Le parsing de la valeur est strict : seule la chaîne `'true'` active le mode. `'false'`, `''`, `null` et toute autre valeur laissent le site ouvert
- [ ] **AC3** — La clé est ajoutée à l'allowlist `public-config-keys.ts`, donc lisible par le frontend via `GET /api/config` sans authentification
- [ ] **AC4** — `GET /api/config` répond avec `Cache-Control: no-store` (au minimum quand la clé de maintenance est présente dans la réponse)
- [ ] **AC5** — Une permission `maintenance.bypass` est définie et attribuée au rôle `admin` par migration ou seed
- [ ] **AC6** — Le flag est modifiable via l'endpoint d'écriture de config existant, réservé aux comptes autorisés
- [ ] **AC7** — Le service de lecture du flag met en cache la valeur au maximum 60 s, et le cache est invalidé à l'écriture
- [ ] **AC8** — Si la lecture en base échoue, le service retourne « site ouvert » et journalise l'erreur, sans lever d'exception

## Notes d'implémentation

Aucun changement de schéma Prisma n'est nécessaire : `model Config` accueille la clé telle quelle. La migration se limite à l'insertion de la ligne et à l'ajout de la permission sur le rôle `admin`.

L'AC8 est le garde-fou décrit au point 5 des vigilances de l'EPIC. Un test unitaire doit couvrir explicitement le cas « Prisma lève », pas seulement le chemin nominal.

## Statut

| Claude | PO | E2E | Livré |
|--------|----|----|-------|
| A faire | A faire | A faire | A faire |

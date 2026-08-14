# US — Ajouter `page_twitch_visible` au seed backend

## Role / Action / Benefice

> **En tant que** developpeur backend,
> **je veux** que la cle de configuration `page_twitch_visible` soit creee automatiquement par le seed Prisma,
> **afin que** toute nouvelle installation (dev local, staging, CI test) dispose de la cle avec sa valeur par defaut `true`, et que le toggle admin Twitch soit fonctionnel des le premier demarrage.

## Perimetre fichiers

- `backend/prisma/seed.ts`
- `backend/prisma/seed.sql` (alignement)

## Description

Suite a la livraison d'EPIC-17 (page `/twitch`), le frontend reference la cle `page_twitch_visible` pour masquer/afficher le lien "EN LIVE" dans le header. La cle est absente du seed backend, ce qui peut creer une incoherence avec les autres pages toggleables (boutique, contact, equipes, sponsors, recrutement, articles).

### Etat actuel

`backend/prisma/seed.ts` contient :

```ts
{ key: 'page_shop_visible', value: 'true', description: 'Afficher la page Boutique' },
{ key: 'page_contact_visible', value: 'true', description: 'Afficher la page Contact' },
{ key: 'page_equipes_visible', value: 'true', description: 'Afficher la page Equipes/Ambassadeurs' },
{ key: 'page_sponsors_visible', value: 'true', description: 'Afficher la page Sponsors' },
{ key: 'page_recrutement_visible', value: 'true', description: 'Afficher la page Recrutement' },
{ key: 'page_articles_visible', value: 'true', description: 'Afficher la page Articles/Annonces' },
// ← MANQUE : page_twitch_visible
```

`backend/prisma/seed.sql` contient les 5 premiers toggles mais **pas** `page_articles_visible` ni `page_twitch_visible`.

### Cible

Ajouter dans `seed.ts` :

```ts
{ key: 'page_twitch_visible', value: 'true', description: 'Afficher la page En Live (Twitch)' },
```

Aligner `seed.sql` :

```sql
INSERT INTO "Config" (key, value, description, "createdAt", "updatedAt") VALUES
  ('page_articles_visible', 'true', 'Afficher la page Articles/Annonces', NOW(), NOW()),
  ('page_twitch_visible', 'true', 'Afficher la page En Live (Twitch)', NOW(), NOW())
ON CONFLICT (key) DO NOTHING;
```

## Criteres d'acceptation

- [ ] `prisma/seed.ts` ajoute l'entree `page_twitch_visible` (description francaise courte)
- [ ] `prisma/seed.sql` ajoute `page_twitch_visible` ET `page_articles_visible`
- [ ] Apres `npx prisma db seed` sur DB vierge, `SELECT * FROM "Config" WHERE key = 'page_twitch_visible'` retourne `value = 'true'`
- [ ] Tests unitaires backend continuent de passer
- [ ] Description du toggle est explicite et coherente avec les autres (`Afficher la page <Nom>`)

## Notes techniques

- La table `Config` utilise `key` comme cle primaire/unique (a confirmer dans le schema Prisma)
- La description est affichee dans le panneau admin a cote du toggle (verifier le rendu HTML)
- Ne PAS modifier les valeurs existantes des autres toggles : on ajoute uniquement, jamais on modifie

## Effort

XS (~15 min).

## Dependances

Aucune.

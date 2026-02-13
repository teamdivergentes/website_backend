# Backend Scripts

## cleanup-orphan-images.ts

Script pour nettoyer les fichiers images orphelins du filesystem (images qui ne sont plus référencées dans la base de données).

### Usage

**Mode Dry Run (recommandé d'abord):**
```bash
npx ts-node scripts/cleanup-orphan-images.ts
```
Ce mode analyse et liste les fichiers orphelins sans les supprimer.

**Mode Suppression:**
```bash
npx ts-node scripts/cleanup-orphan-images.ts --delete
```
Ce mode supprime réellement les fichiers orphelins après un délai de sécurité de 5 secondes.

### Ce que le script fait

1. Récupère toutes les références d'images depuis la base de données:
   - Staff members (champ `image`)
   - Teams (champs `image` et `banner`)
   - Team members (champ `image`)
   - Games (champ `image`)
   - Sponsor images (table `SponsorImage`)

2. Scanne le répertoire `./uploads/` pour lister tous les fichiers

3. Identifie les fichiers orphelins (présents dans `./uploads/` mais non référencés en BDD)

4. En mode `--delete`, supprime les fichiers orphelins avec un délai de sécurité de 5 secondes

### Exemple de sortie

```
=== Cleanup Orphan Images Script ===

Mode: DRY RUN (no files will be deleted)

Fetching all image references from database...

[Staff] John Doe: staff-john-1234.jpg
[Team] Team A (image): team-a-5678.jpg
[Team] Team A (banner): team-a-banner-9012.jpg
[TeamMember] Player 1: player1-3456.jpg
[Game] League of Legends: lol-logo-7890.jpg
[SponsorImage] sponsor-logo-1234.jpg

Total referenced images: 6

Scanning uploads directory...

Total files in uploads: 10

=== ORPHAN FILES (4) ===

[DRY RUN] old-image-1.jpg
[DRY RUN] old-image-2.jpg
[DRY RUN] temp-upload-3.jpg
[DRY RUN] deleted-team-banner.jpg

=== SUMMARY ===
Referenced images: 6
Total files: 10
Orphan files: 4
```

### Sécurité

- Le mode dry run est le mode par défaut
- En mode suppression, un délai de 5 secondes permet d'annuler avec Ctrl+C
- Les erreurs de suppression sont catchées et loggées
- Aucune modification de la base de données

### Quand l'utiliser

- Après avoir migré vers le système de suppression automatique des images
- Périodiquement pour nettoyer les anciens fichiers
- Avant un déploiement pour optimiser l'espace disque
- Après avoir supprimé manuellement des entités en BDD

### Note

Ce script est utile pour nettoyer les fichiers orphelins **existants**. Avec le système de suppression automatique des images maintenant en place, les nouveaux fichiers seront automatiquement supprimés lors des mises à jour et suppressions d'entités.

import { PrismaClient } from '../../generated/prisma';
import * as bcrypt from 'bcrypt';

/**
 * Socle indispensable, applique a TOUS les environnements, production comprise.
 *
 * Regle absolue : **aucun champ metier n'est mis a jour**. Tout est cree si
 * absent, jamais reecrit. Un seed rejoue en production ne doit pas defaire ce
 * qu'un administrateur a saisi entre-temps — c'est exactement ce qui est arrive
 * le 2026-07-31, ou les permissions des roles systeme ont ete ramenees a la
 * liste du fichier.
 *
 * Corollaire : faire evoluer une donnee de ce socle (ajouter une permission a
 * un role, changer un libelle) passe par une **migration SQL**, qui s'execute
 * une fois et reste tracee, et non par ce fichier.
 */
export async function seedBootstrap(prisma: PrismaClient): Promise<void> {
  // Create roles
  const adminPermissions = [
    'users:read',
    'users:write',
    'users:delete',
    'roles:read',
    'roles:write',
    'roles:delete',
    'teams:read',
    'teams:write',
    'teams:delete',
    'games:read',
    'games:write',
    'games:delete',
    'sponsors:read',
    'sponsors:write',
    'sponsors:delete',
    'staff:read',
    'staff:write',
    'staff:delete',
    'config:read',
    'config:write',
    'annonces:read',
    'annonces:write',
    'annonces:delete',
    'articles:read',
    'articles:write',
    'articles:delete',
    'recrutement:read',
    'recrutement:write',
    'recrutement:delete',
    'analytics:read',
    'twitch_channels:read',
    'twitch_channels:write',
    'twitch_channels:delete',
    'coaching_staff:read',
    'coaching_staff:write',
    'coaching_staff:delete',
    'trophies:read',
    'trophies:write',
    'trophies:delete',
    'matches:read',
    'matches:write',
    'matches:delete',
    // Boutique. Les migrations 20260722120000 et 20260728120000 ajoutent ces
    // permissions au role Admin existant, mais sur une base neuve elles
    // s'appliquent AVANT que le seed ne cree le role : le seed ecrasait ensuite
    // le tableau et l'admin se retrouvait sans acces aux ecrans boutique.
    'commandes:read',
    'commandes:write',
    'boutique:read',
    'boutique:write',
  ];

  const cmPermissions = [
    'annonces:read',
    'annonces:write',
    'annonces:delete',
    'articles:read',
    'articles:write',
    'trophies:read',
    'trophies:write',
    'trophies:delete',
    'matches:read',
    'matches:write',
    'matches:delete',
  ];

  // Rôle Gestionnaire : gère l'organisation (équipes, jeux, sponsors, staff, recrutement,
  // twitch, coaching) mais N'A PAS accès à l'éditorial matchs/palmarès.
  // Exclusion volontaire de `matches:*` et `trophies:*` (réservés à Admin et CM).
  // Ne PAS élargir ces permissions sans validation explicite du Product Owner.
  const gestionnairePermissions = [
    'teams:read',
    'teams:write',
    'teams:delete',
    'games:read',
    'games:write',
    'games:delete',
    'sponsors:read',
    'sponsors:write',
    'sponsors:delete',
    'staff:read',
    'staff:write',
    'staff:delete',
    'annonces:read',
    'annonces:write',
    'annonces:delete',
    'articles:read',
    'recrutement:read',
    'recrutement:write',
    'recrutement:delete',
    'twitch_channels:read',
    'twitch_channels:write',
    'twitch_channels:delete',
    'coaching_staff:read',
    'coaching_staff:write',
    'coaching_staff:delete',
  ];

  const adminRole = await prisma.role.upsert({
    where: { name: 'Admin' },
    // Aucune reecriture : les permissions se modifient depuis l'admin, et un
    // ajout structurel passe par une migration SQL.
    update: {},
    create: {
      name: 'Admin',
      permissions: adminPermissions,
      isSystem: true,
    },
  });

  console.log('Admin role created:', adminRole);

  const cmRole = await prisma.role.upsert({
    where: { name: 'CM' },
    // Aucune reecriture : les permissions se modifient depuis l'admin, et un
    // ajout structurel passe par une migration SQL.
    update: {},
    create: {
      name: 'CM',
      permissions: cmPermissions,
      isSystem: true,
    },
  });

  console.log('CM role created:', cmRole);

  const gestionnaireRole = await prisma.role.upsert({
    where: { name: 'Gestionnaire' },
    // Aucune reecriture : les permissions se modifient depuis l'admin, et un
    // ajout structurel passe par une migration SQL.
    update: {},
    create: {
      name: 'Gestionnaire',
      permissions: gestionnairePermissions,
      isSystem: true,
    },
  });

  console.log('Gestionnaire role created:', gestionnaireRole);

  // Create admin user
  const hashedPassword = await bcrypt.hash('admin123', 10);
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@teamdivergentes.fr' },
    update: {},
    create: {
      email: 'admin@teamdivergentes.fr',
      password: hashedPassword,
      roleId: adminRole.id,
      actif: true,
    },
  });

  console.log('Admin user created:', { email: adminUser.email });

  // Create initial config entries
  const configs = [
    {
      key: 'youtube_link',
      value: 'https://www.youtube.com/embed/IqoIktEIeU0',
      description: 'Lien de la video YouTube de presentation',
    },
    {
      key: 'site_name',
      value: 'TeamDivergentes - Structure Esportive Francaise',
      description: 'Nom du site',
    },
    {
      key: 'contact_email',
      value: 'contact@teamdivergentes.fr',
      description: 'Email de contact',
    },
    {
      key: 'contact_phone',
      value: '',
      description:
        'Numéro de téléphone de contact (optionnel, affiché sur la page contact si renseigné)',
    },
    {
      key: 'twitter_url',
      value: 'https://x.com/teamdivergentes',
      description: 'Lien Twitter/X',
    },
    {
      key: 'instagram_url',
      value: 'https://www.instagram.com/teamdivergentes/',
      description: 'Lien Instagram',
    },
    {
      key: 'discord_url',
      value: 'https://discord.com/invite/mF67YZKnU3',
      description: 'Lien Discord',
    },
    {
      key: 'youtube_url',
      value: 'https://www.youtube.com/channel/UC5laAdDfyTTUSdK0t2wYx2g',
      description: 'Lien YouTube (chaine, affiche dans le footer)',
    },
    {
      key: 'twitch_url',
      value: 'https://www.twitch.tv/teamdivergentes',
      description: 'Lien Twitch',
    },
    {
      key: 'tiktok_url',
      value: 'http://tiktok.com/@teamdivergentes',
      description: 'Lien TikTok',
    },
    {
      key: 'mail_url',
      value: 'mailto:contact@teamdivergentes.fr',
      description: 'Lien email (affiche dans le footer)',
    },
    {
      key: 'social_urls',
      value:
        'https://www.youtube.com/channel/UC5laAdDfyTTUSdK0t2wYx2g\nhttps://www.twitch.tv/teamdivergentes\nhttps://www.facebook.com/teamdivergentes/\nhttps://www.linkedin.com/company/team-divergentes/\nhttps://www.helloasso.com/associations/team-divergentes',
      description:
        'Liens supplementaires pour le referencement SEO (un lien par ligne, les liens Twitter/Instagram/Discord/TikTok sont deja inclus)',
    },
    {
      key: 'og_title',
      value: 'Team Divergentes | Organisation Esportive',
      description: 'Titre Open Graph pour les aperçus Discord/réseaux sociaux',
    },
    {
      key: 'og_description',
      value:
        "Team Divergentes, organisation e-sportive créée en 2017. Découvrez nos joueurs, nos équipes et rejoignez l'aventure !",
      description: 'Description Open Graph pour les aperçus Discord/réseaux sociaux',
    },
    {
      key: 'og_image',
      value: '',
      description:
        'Image Open Graph pour les aperçus Discord/réseaux sociaux (URL absolue ou chemin /uploads/...)',
    },
    // Pages visibility
    {
      key: 'page_shop_visible',
      value: 'true',
      description: 'Afficher la page Boutique',
    },
    {
      key: 'page_contact_visible',
      value: 'true',
      description: 'Afficher la page Contact',
    },
    {
      key: 'page_equipes_visible',
      value: 'true',
      description: 'Afficher la page Équipes/Ambassadeurs',
    },
    {
      key: 'page_sponsors_visible',
      value: 'true',
      description: 'Afficher la page Sponsors',
    },
    {
      key: 'page_recrutement_visible',
      value: 'true',
      description: 'Afficher la page Recrutement',
    },
    {
      key: 'page_articles_visible',
      value: 'true',
      description: 'Afficher la page Articles/Annonces',
    },
    {
      key: 'page_twitch_visible',
      value: 'true',
      description: 'Afficher la page En Live (Twitch)',
    },
    {
      key: 'page_palmares_visible',
      value: 'false',
      description: 'Afficher la page Palmarès',
    },
  ];

  for (const config of configs) {
    await prisma.config.upsert({
      where: { key: config.key },
      update: {},
      create: config,
    });
  }

  console.log('Config entries created:', configs.length);

  // Create initial games
  const games = [
    { key: 'lol', name: 'League of Legends', position: 0, active: true },
    { key: 'valorant', name: 'Valorant', position: 1, active: true },
    { key: 'rl', name: 'Rocket League', position: 2, active: true },
    { key: 'cs', name: 'Counter-Strike', position: 3, active: true },
    { key: 'tft', name: 'Teamfight Tactics', position: 4, active: true },
  ];

  for (const game of games) {
    await prisma.game.upsert({
      where: { key: game.key },
      update: {},
      create: game,
    });
  }

  console.log('Games created:', games.length);

  // Seed article types (categories)
  const articleTypeNames = ['Actualité', 'Annonce', 'Match Report', 'eSport', 'Interview'];

  for (const name of articleTypeNames) {
    await prisma.articleType.upsert({
      where: { name },
      update: {},
      create: { name },
    });
  }

  console.log('✓ Catégories d\'articles seedées:', articleTypeNames.length);

  // ---------------------------------------------------------------------------
  // Boutique — collection 2026
  // Spec : docs/superpowers/specs/2026-07-28-boutique-collection-2026-design.md
  // ---------------------------------------------------------------------------

  await prisma.shopSettings.upsert({
    where: { id: 1 },
    update: {},
    // shopEnabled reste faux : la boutique ne s'ouvre qu'une fois les cles
    // Stripe de production en place et les prix reels saisis depuis l'admin.
    // Tarifs de la grille 2026 : port standard 5 €, rapide 10 €, offert des
    // 120 € de panier, ce qui correspond a trois maillots.
    create: {
      id: 1,
      shippingStandardCents: 500,
      shippingExpressCents: 1000,
      freeShippingThresholdCents: 12000,
      currency: 'eur',
      shopEnabled: false,
    },
  });

  const TEXTILE_SIZES = ['S', 'M', 'L', 'XL', 'XXL'];

  // Les prix sont provisoires : ils sont editables depuis l'admin sans
  // redeploiement, le seed ne fait qu'amorcer le catalogue.
  const shopProductsSeed = [
    {
      slug: 'maillot-2026-dvg',
      name: 'Maillot 2026 — Team Divergentes',
      shortDescription: 'Le maillot officiel de la structure, saison 2026.',
      description:
        'Le maillot de toute la structure, sans distinction de section ni de jeu. ' +
        'Il reprend les codes posés en 2017 : noir profond, vert Divergentes, logo ' +
        "sublimé dans la maille plutôt qu'imprimé dessus. Celui qu'on met quand on " +
        'vient représenter DVG en entier.',
      priceCents: 4000,
      images: [
        { url: 'assets/img/shop/maillot-2026-dvg-front.webp', label: 'face' },
        // Dos SANS flocage : c'est le fond sur lequel composer l'apercu du
        // pseudo, d'ou `isBack`. La variante `-back-name` montre un exemple
        // floque et ne doit surtout pas servir de fond a l'apercu.
        { url: 'assets/img/shop/maillot-2026-dvg-back.webp', label: 'dos', isBack: true },
        {
          url: 'assets/img/shop/maillot-2026-dvg-back-name.webp',
          label: 'dos floqué',
        },
      ],
      teamSlug: null,
      active: false,
      position: 0,
    },
    {
      slug: 'maillot-2026-joker',
      name: 'Maillot 2026 — DVG × Joker',
      shortDescription: "Aux couleurs de l'équipe EVA Joker.",
      description:
        "La déclinaison d'EVA Joker. Même patron, même maille, même finition que le " +
        "maillot de structure : seuls les liserés, l'habillage des manches et le blason " +
        'de la section changent. Le vert monte sur les épaules, le motif reprend ' +
        "l'univers de l'équipe.",
      priceCents: 4000,
      images: [
        { url: 'assets/img/shop/maillot-2026-joker-front.webp', label: 'face' },
        { url: 'assets/img/shop/maillot-2026-joker-back.webp', label: 'dos', isBack: true },
        {
          url: 'assets/img/shop/maillot-2026-joker-back-name.webp',
          label: 'dos floqué',
        },
      ],
      teamSlug: 'eva-joker',
      active: true,
      position: 1,
    },
    {
      slug: 'maillot-2026-mystic',
      name: 'Maillot 2026 — DVG × Mystic',
      shortDescription: "Aux couleurs de l'équipe EVA Mystic.",
      description:
        "La déclinaison d'EVA Mystic. Les deux titres de champion de France, 2022 et " +
        "2023, sont inscrits sur le vêtement : ce n'est pas un ornement, c'est ce que la " +
        "section est allée chercher. Un maillot d'esport ne sert pas à courir, il sert à " +
        'dire de quel côté on est assis.',
      priceCents: 4000,
      images: [
        { url: 'assets/img/shop/maillot-2026-mystic-front.webp', label: 'face' },
        { url: 'assets/img/shop/maillot-2026-mystic-back.webp', label: 'dos', isBack: true },
        {
          url: 'assets/img/shop/maillot-2026-mystic-back-name.webp',
          label: 'dos floqué',
        },
        // Seule Mystic a ete shootee portee. La vue portee fait la vignette :
        // un maillot sur des epaules se lit mieux qu'un maillot a plat.
        {
          url: 'assets/img/shop/maillot-2026-mystic-porte-face.jpg',
          label: 'porté',
          isCard: true,
        },
        { url: 'assets/img/shop/maillot-2026-mystic-porte-dos.jpg', label: 'porté dos' },
      ],
      teamSlug: 'eva-mystic',
      active: false,
      position: 2,
    },
  ];

  for (const p of shopProductsSeed) {
    // Les equipes EVA n'existent qu'en production : en local le lien reste nul
    // plutot que de faire echouer le seed.
    const team = p.teamSlug ? await prisma.team.findUnique({ where: { slug: p.teamSlug } }) : null;

    const product = await prisma.shopProduct.upsert({
      where: { slug: p.slug },
      // Pas de mise a jour du prix ni de l'activation : ils sont pilotes depuis
      // l'admin, un re-seed ne doit pas ecraser un reglage metier.
      // Ni les textes ni les prix : le catalogue s'edite depuis l'admin.
      update: {},
      create: {
        slug: p.slug,
        name: p.name,
        shortDescription: p.shortDescription,
        description: p.description,
        priceCents: p.priceCents,
        teamId: team?.id ?? null,
        allowFlocking: true,
        flockingFeeCents: 500,
        active: p.active,
        position: p.position,
      },
    });

    // Les visuels sont repris a chaque seed : ils vivent dans le depot, pas dans
    // l'admin, et un renommage de fichier doit se propager. La galerie editee
    // depuis l'admin n'est ecrasee que si elle porte encore les visuels du seed.
    const existingImages = await prisma.shopProductImage.count({ where: { productId: product.id } });
    if (existingImages === 0) {
      await prisma.shopProductImage.createMany({
        data: p.images.map((image, index) => ({
          productId: product.id,
          url: image.url,
          label: image.label,
          position: index,
          isBack: 'isBack' in image ? Boolean(image.isBack) : false,
          isCard: 'isCard' in image ? Boolean(image.isCard) : index === 0,
        })),
      });
    }

    for (const [index, label] of TEXTILE_SIZES.entries()) {
      await prisma.shopProductSize.upsert({
        where: { productId_label: { productId: product.id, label } },
        update: {},
        create: { productId: product.id, label, position: index },
      });
    }
  }

  console.log('✓ Boutique seedée:', shopProductsSeed.length, 'maillots');
}

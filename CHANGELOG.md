# [1.6.0](https://github.com/teamdivergentes/website_backend/compare/v1.5.2...v1.6.0) (2026-08-14)


### Bug Fixes

* **articles:** findBySlug filtre published:true (SEC-EPIC37-01) ([8f64cfa](https://github.com/teamdivergentes/website_backend/commit/8f64cfa4d3b57cc35820ee67d9035127f13b704b))
* **articles:** revalidate redirects + cover IPv6 ULA/mapped in SSRF guard (SEC-003) ([2825b48](https://github.com/teamdivergentes/website_backend/commit/2825b4882316a07cb5be18cc7a0c2a7a9a4aacda))
* **articles:** strip author identity from public article responses (SEC-006) ([eb5eabd](https://github.com/teamdivergentes/website_backend/commit/eb5eabdfc892173b285bae081320c9fa1ad663c7))
* **articles:** validate resolved IP to prevent SSRF in link-meta (SEC-003) ([f036177](https://github.com/teamdivergentes/website_backend/commit/f0361772a92a0ca240b87415270ff8bd055b6723))
* **auth:** cap password length to 72 chars (SEC-005) ([0c2158f](https://github.com/teamdivergentes/website_backend/commit/0c2158f54d23e22ebf88144df45384ce0f2494cf))
* **auth:** enforce password complexity policy (SEC-014) ([3d4fc76](https://github.com/teamdivergentes/website_backend/commit/3d4fc7633a6d7ee0c21e783e1eb70f1865b6a010))
* **auth:** enforce RolesGuard on POST /api/auth/register (SEC-001) ([3261800](https://github.com/teamdivergentes/website_backend/commit/32618006ef271b644e87dd5839981a9a728139ce))
* **auth:** fail-fast on missing JWT_SECRET (SEC-002) ([942e94e](https://github.com/teamdivergentes/website_backend/commit/942e94e71c1aad1857743f01c90d7f95a586a6a3))
* **auth:** log authentication failures and successes (SEC-013) ([1137910](https://github.com/teamdivergentes/website_backend/commit/11379109edd0404c40cab2e2ec8cb06f5672719f))
* **backend:** clamp negative limit and restrict stream protocols (EPIC-37 review) ([af21a4d](https://github.com/teamdivergentes/website_backend/commit/af21a4d38ed8d93f6c42d5ce1365442ef29c37bb))
* **backend:** handle invalid teamId and harden trophy validation (EPIC-37 review) ([73cb9f2](https://github.com/teamdivergentes/website_backend/commit/73cb9f2cb40f157c0a7b80031f476640c74d747d))
* **backend:** throttle public trophies and split public/admin DTOs (VQO) ([6494da2](https://github.com/teamdivergentes/website_backend/commit/6494da21a6fdb60d6cb752a6acba1bd0e358ef33))
* **ci:** le cleanup GHCR supprimait l'image :RELEASE de production ([123dd2c](https://github.com/teamdivergentes/website_backend/commit/123dd2c4505ec2c2994ec4526ccf5d7bae62aa68))
* **db:** backfiller teamNameSnapshot sur les matchs anterieurs ([62837bd](https://github.com/teamdivergentes/website_backend/commit/62837bd7c0dcdd31f1d1cc690225bd253d70acd5))
* **db:** libelles de vues plus courts ([b0cca87](https://github.com/teamdivergentes/website_backend/commit/b0cca87a0010f4527e496cd12cd25373d5e4e9b9))
* **db:** retirer la mention du shooting du laius Mystic ([e43a9ed](https://github.com/teamdivergentes/website_backend/commit/e43a9ed67ce064970864eb2bb8ff126ef35ea70b))
* **docker:** rendre le seed executable dans l'image de production ([a742a13](https://github.com/teamdivergentes/website_backend/commit/a742a136e9a89dbd5adc96e611e55a5d202428d7))
* **matches:** corrections audit EPIC-37 (sécu, historique, validations) ([9526602](https://github.com/teamdivergentes/website_backend/commit/9526602cce5b09c7ea7bc9ab15caec4cfee78a24))
* **metrics:** restrict GET /metrics to IP allowlist (SEC-009) ([85c7af6](https://github.com/teamdivergentes/website_backend/commit/85c7af6916cec9ddc8c80053b927b54be0cf9336))
* **recruitment:** rate-limit public apply endpoint against multer DoS (SEC-01) ([eda5800](https://github.com/teamdivergentes/website_backend/commit/eda5800068e6bca198ffd6ce6295ffdffd0249f0))
* **seed:** donner les permissions boutique et commandes au role Admin ([fc760d9](https://github.com/teamdivergentes/website_backend/commit/fc760d917416600af47c42913c04d68591ef2d3e))
* **seed:** enrichir le seed avec équipes, trophées et matchs de démonstration ([2e3f117](https://github.com/teamdivergentes/website_backend/commit/2e3f117bd75b8e2de62c6d1edb01d0eb753035bd))
* **shop:** corriger les 2 violations SonarQube de l'API admin ([b60da2d](https://github.com/teamdivergentes/website_backend/commit/b60da2db2b8ef8faf7acb757c21c1b802c819b53))
* **shop:** corriger les violations SonarQube du notifier ([c5cbfaa](https://github.com/teamdivergentes/website_backend/commit/c5cbfaa7e58fd577f380e24e4da6881388dc2cb0))
* **shop:** couts reels — TVA lettone, frais par commande, commission Stripe ([#196](https://github.com/teamdivergentes/website_backend/issues/196)) ([1338ae5](https://github.com/teamdivergentes/website_backend/commit/1338ae5f33856447de5f31db705bf9c5dabe41c3))
* **shop:** typer shippingAddress en Prisma.InputJsonValue pour le build ([ed23dd7](https://github.com/teamdivergentes/website_backend/commit/ed23dd7afa2bde4527e43c19108b55ba2a97249e))
* **sonar:** document reviewed link metadata fetch ([c5ff729](https://github.com/teamdivergentes/website_backend/commit/c5ff729e2d103f7fff1aba834c903e99514a65ae))
* **sonar:** normalize metrics allowlist IPs ([8df5df7](https://github.com/teamdivergentes/website_backend/commit/8df5df7bf95e1e1b0fafea40d0c99bf48f6fccff))
* **sonar:** reduce backend new code duplication ([4c54c76](https://github.com/teamdivergentes/website_backend/commit/4c54c766bd93c954bb41a60510ea0798c06e0a49))
* **sonar:** resolve backend new code issues ([4f92ef5](https://github.com/teamdivergentes/website_backend/commit/4f92ef5e574cc34d366e25aac0d39960905c8ae5))
* **test:** lire les metadonnees de permission via getOwnPropertyDescriptor ([981e326](https://github.com/teamdivergentes/website_backend/commit/981e326fb29fa3843c2ec9a3c2acf86dfbbb621d)), closes [#171](https://github.com/teamdivergentes/website_backend/issues/171)
* **upload:** block SVG uploads to prevent stored XSS (SEC-03) ([598c3d3](https://github.com/teamdivergentes/website_backend/commit/598c3d3972799f688aeffb4518f57fcddb9cffc2))


### Features

* **articles:** accepter un tri serveur sur la liste ([baa15fa](https://github.com/teamdivergentes/website_backend/commit/baa15fa41a21321030cfece0c2cc4f6688b44684))
* **backend:** add match DTOs with paired score validation (EPIC-37) ([dfcd1f5](https://github.com/teamdivergentes/website_backend/commit/dfcd1f59ee10a6fe928b1dc7b58021eb38ccda04))
* **backend:** add matches endpoints with PermissionsGuard (EPIC-37) ([57de35b](https://github.com/teamdivergentes/website_backend/commit/57de35b15513f6c4b862f1d4f732f89ce55f36ca))
* **backend:** add MatchesService with derived status filters (EPIC-37) ([ce1ffc1](https://github.com/teamdivergentes/website_backend/commit/ce1ffc19270c162b0c73f50eb9ef1657943871da))
* **backend:** add trophies endpoints with PermissionsGuard (EPIC-37) ([30625fb](https://github.com/teamdivergentes/website_backend/commit/30625fb5f4b433fdb149225cdf59c6eaee903491))
* **backend:** add TrophiesService with public filters and DTO mapping (EPIC-37) ([7e6b136](https://github.com/teamdivergentes/website_backend/commit/7e6b1366ed9be2bf41b97f00039b849cea2ba48e))
* **backend:** add trophy DTOs with validation (EPIC-37) ([4e7415a](https://github.com/teamdivergentes/website_backend/commit/4e7415a7d3a1e6eba2872ec4fd60113bf190db2c))
* **backend:** expose team game key in trophy DTOs (EPIC-37 redesign) ([06d6ad6](https://github.com/teamdivergentes/website_backend/commit/06d6ad6e0a4d592943eb2684e079acd621af8284))
* **ci:** reduire la dependance aux runners + reprise :RELEASE (EPIC-39 US2+US3) ([c3cb032](https://github.com/teamdivergentes/website_backend/commit/c3cb032d4e11a8f2dd7baabd6f643292681e9cb5)), closes [#hosted](https://github.com/teamdivergentes/website_backend/issues/hosted)
* **ci:** superviser reellement les runners self-hosted (EPIC-39 US1) ([757fe4a](https://github.com/teamdivergentes/website_backend/commit/757fe4a582ffc408eb52f2ae93d69ee614b75a61))
* **config:** add TikTok social link ([41c9e2a](https://github.com/teamdivergentes/website_backend/commit/41c9e2a023f69de197441cfee691f798b365f10f))
* **dashboard:** exposer les brouillons en cours et les anomalies ([a55292c](https://github.com/teamdivergentes/website_backend/commit/a55292c1d34bcac28b6bcb709914ec8cff8d6f3d))
* **db:** brancher les dos floques et les photos portees ([81296a1](https://github.com/teamdivergentes/website_backend/commit/81296a1663b1240baa4596c3056f56c8d46bf8c5))
* **db:** brancher les visuels du shooting Mystic ([b7339a5](https://github.com/teamdivergentes/website_backend/commit/b7339a590002a0cf6ff21e301fd28210d8f4d558))
* **db:** catalogue boutique en base, flocage et commandes multi-articles ([0f273bc](https://github.com/teamdivergentes/website_backend/commit/0f273bc3350c87bf030b9559d703a1b709c6a2ba))
* **seo:** add /structure/palmares to sitemap when visible (EPIC-37) ([88b1eef](https://github.com/teamdivergentes/website_backend/commit/88b1eefd49844693a976450c16c97ca347034689))
* **shop:** ajouter le modele Order et la sequence de reference ([a818245](https://github.com/teamdivergentes/website_backend/commit/a8182457c388a8aa6fe1a1933be660e6250beb56))
* **shop:** ajouter les permissions commandes:read et commandes:write ([c80bb30](https://github.com/teamdivergentes/website_backend/commit/c80bb30a32f14b15bd341804a54c31e517c899ea))
* **shop:** bons de reduction et prix promotionnels (EPIC-48) ([#197](https://github.com/teamdivergentes/website_backend/issues/197)) ([b1b59ee](https://github.com/teamdivergentes/website_backend/commit/b1b59eeadddd8703cdc34eab8ec7fd552d1772e8))
* **shop:** calculer la marge de chaque commande pour l'admin ([5cdb6c6](https://github.com/teamdivergentes/website_backend/commit/5cdb6c69b665a8639fb303a2919085a5bd0d7b0a))
* **shop:** confirmer la commande au client et annoncer le delai de livraison ([8d2d809](https://github.com/teamdivergentes/website_backend/commit/8d2d809525c0e3f96a35fd1df1e3e49a5106106f))
* **shop:** creer la commande depuis le webhook Stripe signe et idempotent ([d8ae18b](https://github.com/teamdivergentes/website_backend/commit/d8ae18b0b42899ba2ee1688601e095f2ab70893d))
* **shop:** creer la session de paiement Stripe avec prix recalcule serveur ([b96123b](https://github.com/teamdivergentes/website_backend/commit/b96123b7c96eafbc105d48361b568a88fa4a61ba))
* **shop:** exposer l'API admin des commandes et du lot hebdomadaire ([8e64d3e](https://github.com/teamdivergentes/website_backend/commit/8e64d3e7ff2ee1ac427e9dc97b210173d573e656))
* **shop:** exposer le catalogue produits sur GET /api/shop/products ([b489388](https://github.com/teamdivergentes/website_backend/commit/b48938877e76fef71258447874157bb41b35cb0e))
* **shop:** habille les mails client de la boutique (EPIC-47) ([#199](https://github.com/teamdivergentes/website_backend/issues/199)) ([0c72a97](https://github.com/teamdivergentes/website_backend/commit/0c72a97a803dc0788b7d0a715d383ccac0fa821d))
* **shop:** livrer dans toute l'Europe, plus seulement en France ([#192](https://github.com/teamdivergentes/website_backend/issues/192)) ([609cee3](https://github.com/teamdivergentes/website_backend/commit/609cee399fcf434147627e8f1f4b89e3116dcbc1))
* **shop:** mails de suivi de commande et compteurs (EPIC-47) ([#194](https://github.com/teamdivergentes/website_backend/issues/194)) ([1c62d22](https://github.com/teamdivergentes/website_backend/commit/1c62d22a89b608ae8c8123d9ea69145f1c158981))
* **shop:** moderer le flocage et durcir sa validation ([278b2e8](https://github.com/teamdivergentes/website_backend/commit/278b2e8ed0bc83824f268e5774df65ac58eaebcc))
* **shop:** notifier l'equipe par mail et Discord a chaque commande payee ([524cf71](https://github.com/teamdivergentes/website_backend/commit/524cf71214eae5d7d61bd2a515fbe82f327c5be5))
* **shop:** purger les donnees client des commandes echues ([a8f6187](https://github.com/teamdivergentes/website_backend/commit/a8f61879cbf5a1c0f89ea0f342379cac8aa0fce9))
* **shop:** rapporter la session Stripe et exposer un recapitulatif de commande ([#193](https://github.com/teamdivergentes/website_backend/issues/193)) ([c0f2cda](https://github.com/teamdivergentes/website_backend/commit/c0f2cdabf0cc31b263a20650abb56df7ad10c99a))
* **shop:** recalibrer l'apercu du flocage sur les visuels 4/5 ([#191](https://github.com/teamdivergentes/website_backend/issues/191)) ([7301665](https://github.com/teamdivergentes/website_backend/commit/730166546add7659ae3629aa3219b667aa1d8384)), closes [website_frontend#280](https://github.com/website_frontend/issues/280)
* **shop:** servir la galerie de visuels et sa vignette ([70afc72](https://github.com/teamdivergentes/website_backend/commit/70afc720b4f5aa7c1271b8a484d90e74f9d44f1a))
* **shop:** tarif reserve aux administrateurs, et deux correctifs de securite ([#190](https://github.com/teamdivergentes/website_backend/issues/190)) ([2e95c3d](https://github.com/teamdivergentes/website_backend/commit/2e95c3dff14527d0aae409c9e50e979e9531683c))
* **shop:** tarifer les deux modes de livraison et la franchise de port ([4746e34](https://github.com/teamdivergentes/website_backend/commit/4746e342924df711768b931966d0e6e29dd1ae9f))
* **shop:** tarification serveur, flocage et catalogue administrable ([9ddb50b](https://github.com/teamdivergentes/website_backend/commit/9ddb50bd16dbf52b3196e3dd1c0ef4f491218ee9))

## [1.5.2](https://github.com/teamdivergentes/website_backend/compare/v1.5.1...v1.5.2) (2026-05-28)


### Bug Fixes

* **ci:** add DISPATCH_DEPLOY_TAG release mode to determine-tags ([bea5c44](https://github.com/teamdivergentes/website_backend/commit/bea5c4403a0dd46b3a71952bc1f44f0c8dfa2348))
* **config:** restrict public /api/config to allow-list, add admin-only endpoint ([05b5355](https://github.com/teamdivergentes/website_backend/commit/05b5355b96cc1759c90e22a2eead10324edd7bb7))

# [1.5.0](https://github.com/teamdivergentes/website_backend/compare/v1.4.0...v1.5.0) (2026-05-22)


### Bug Fixes

* **db:** seed default article types via idempotent migration ([f55a82a](https://github.com/teamdivergentes/website_backend/commit/f55a82ac51ec7b393952bc247046065dec303603))


### Features

* **coaching-staff:** add public findBySlug endpoint for coach detail page ([d4ed1c7](https://github.com/teamdivergentes/website_backend/commit/d4ed1c785c6b33d27f730c2caf66680f83ad65ae))
* **coaching-staff:** expose new editorial fields in DTOs and service ([60622d7](https://github.com/teamdivergentes/website_backend/commit/60622d77388c9bb4097c4918338b191116899d83))
* **prisma:** add nationality/birthDate/customFields to coaching_staff for editorial parity with team_members ([87733c9](https://github.com/teamdivergentes/website_backend/commit/87733c918a6c540308f9f44b3fad106bcf5fc92b))

# [1.4.0](https://github.com/teamdivergentes/website_backend/compare/v1.3.2...v1.4.0) (2026-05-11)


### Bug Fixes

* **auth:** sameSite=lax + HttpOnly cookie finalization (EPIC-16 — dépendance frontend [#134](https://github.com/teamdivergentes/website_backend/issues/134)) ([#94](https://github.com/teamdivergentes/website_backend/issues/94)) ([f07b2cf](https://github.com/teamdivergentes/website_backend/commit/f07b2cf83493bb4846629e78b119d7669c70db00))
* **ci:** add !cancelled() to override implicit success() in needs ([#83](https://github.com/teamdivergentes/website_backend/issues/83)) ([88bceb2](https://github.com/teamdivergentes/website_backend/commit/88bceb27649a16e4d594b43c78bc7376bf688f26))
* **ci:** bypass DNS resolver by using direct postgres container IP ([#93](https://github.com/teamdivergentes/website_backend/issues/93)) ([8c2a1a7](https://github.com/teamdivergentes/website_backend/commit/8c2a1a7ffb695acea77f90e4ab90cd50ad3dc864)), closes [#91](https://github.com/teamdivergentes/website_backend/issues/91) [#92](https://github.com/teamdivergentes/website_backend/issues/92)
* **ci:** classify Dependabot PRs by branch prefix only, not github.actor ([#91](https://github.com/teamdivergentes/website_backend/issues/91)) ([78ec801](https://github.com/teamdivergentes/website_backend/commit/78ec8019cd06ff42e002bc3fa1c2d620ed87408d))
* **ci:** correct SHA for actions/delete-package-versions v5.0.0 ([67abfa2](https://github.com/teamdivergentes/website_backend/commit/67abfa210cf1d5894ddcc15ebbb72a41e421c99b))
* **ci:** protect RELEASE and PREPROD tags from GHCR cleanup ([#79](https://github.com/teamdivergentes/website_backend/issues/79)) ([073d84b](https://github.com/teamdivergentes/website_backend/commit/073d84b2f9effad7551d9bf64e82e0ff4b93a396))
* **ci:** tolerate empty workflow-tag and tag-suffix in update-dockerfile-labels.sh ([#130](https://github.com/teamdivergentes/website_backend/issues/130)) ([d04bb99](https://github.com/teamdivergentes/website_backend/commit/d04bb998e6b188f3de5df0d17d1a4a8c945580a0)), closes [#188](https://github.com/teamdivergentes/website_backend/issues/188)
* **ci:** tolerate skipped semgrep/sonarqube on downstream jobs ([#82](https://github.com/teamdivergentes/website_backend/issues/82)) ([45dc0fc](https://github.com/teamdivergentes/website_backend/commit/45dc0fcf1bfa203b4889ee6207ee569b1fa35252))
* **ci:** use random host port for postgres services to avoid port conflicts ([#89](https://github.com/teamdivergentes/website_backend/issues/89)) ([f7171d3](https://github.com/teamdivergentes/website_backend/commit/f7171d3ea6cc1e5fe016e001ba4a86728d12791f))
* **coaching-staff:** SEC-002, SEC-003, DB-01, DB-02 + pre-push hook (audit 2026-05-07) ([#121](https://github.com/teamdivergentes/website_backend/issues/121)) ([6b93940](https://github.com/teamdivergentes/website_backend/commit/6b93940c60208bbed86a011f76d34cb5b0090761))
* **deps:** pin prisma to 6.16.2 to avoid engines-version 7.x leak ([9c9a5b7](https://github.com/teamdivergentes/website_backend/commit/9c9a5b7318a7eb58e01e27a384506189ba07c7ca))
* **lint:** remove unnecessary type assertions on null in contact spec ([06eb7ac](https://github.com/teamdivergentes/website_backend/commit/06eb7acf26d564168eba6fd061c4a792b30e87bd))
* **seed:** ajouter twitch_channels:read/write/delete au rôle Admin ([fc00325](https://github.com/teamdivergentes/website_backend/commit/fc003251e4e91f65e44cfd5672196f979fd4c484))
* **seed:** mettre à jour le pseudo Twitch de démonstration ([7a969c5](https://github.com/teamdivergentes/website_backend/commit/7a969c5f7c9a3974465a76f361fc7c58e2ba4991))
* **sonar:** resolve 5 new_violations on coaching-staff + twitch DTO ([088bf4a](https://github.com/teamdivergentes/website_backend/commit/088bf4ad88a445da0f7cd2093d83ed6de31ca6fc))
* **sonar:** use replaceAll on the last slug regex too (S7781) ([775f317](https://github.com/teamdivergentes/website_backend/commit/775f3175289b0656ee4573db1f9d14acd6536a91))
* **teams:** inclure coachingStaff dans findBySlug pour la page detail equipe publique ([#118](https://github.com/teamdivergentes/website_backend/issues/118)) ([bab9774](https://github.com/teamdivergentes/website_backend/commit/bab9774de6af480cb556dc8a5273cec4a2683206))
* **twitch-channels:** aligner DTO et service sur contrat frontend ([3dc72e1](https://github.com/teamdivergentes/website_backend/commit/3dc72e1ea0bd16834e53b09ddaab946c29688674))


### Features

* **auth:** HttpOnly cookie + 7d refresh token (backend) ([#56](https://github.com/teamdivergentes/website_backend/issues/56)) ([d2068ac](https://github.com/teamdivergentes/website_backend/commit/d2068ac9b5e464687254dc4d35ab9830757517ab))
* **ci:** EPIC-20 [#3](https://github.com/teamdivergentes/website_backend/issues/3) — harmonize PR comment + add docs ([f9abc55](https://github.com/teamdivergentes/website_backend/commit/f9abc55c5aca706bce78f551fc8b42f65aa3b0ee)), closes [#2](https://github.com/teamdivergentes/website_backend/issues/2)
* **config:** add page_twitch_visible config key (EPIC-22 E1) ([#127](https://github.com/teamdivergentes/website_backend/issues/127)) ([8646b0f](https://github.com/teamdivergentes/website_backend/commit/8646b0f3ae0dd2ea195af85977a2688b1f0805f8))
* **db:** add TwitchChannel + CoachingStaff models for EPIC-17 ([#57](https://github.com/teamdivergentes/website_backend/issues/57)) ([55ed324](https://github.com/teamdivergentes/website_backend/commit/55ed324a3a74ff0516f0f236462ea8aae58b7851))
* **db:** data migration permissions Twitch & Coaching sur roles systeme ([#117](https://github.com/teamdivergentes/website_backend/issues/117)) ([25856a6](https://github.com/teamdivergentes/website_backend/commit/25856a683047496e5a39f8b137a2c2d284ee21a9))
* **EPIC-17/E1:** backend services Twitch + coaching staff CRUD ([b904ea3](https://github.com/teamdivergentes/website_backend/commit/b904ea3d084389c46222f60fa65b4fccc1234297))
* **EPIC-19:** code quality backend — 8 spec files + 512 tests + violations SonarQube ([7fe4744](https://github.com/teamdivergentes/website_backend/commit/7fe474467aea0c923cdd0a39efac62c9e5a5dbbb))
* **sitemap:** add /twitch to static pages with visibility config check ([5aab076](https://github.com/teamdivergentes/website_backend/commit/5aab0767dc40542d867ffc5d29fda31b487d7dca))
* **sitemap:** add /twitch to static pages with visibility config check ([9e3f03f](https://github.com/teamdivergentes/website_backend/commit/9e3f03fa3de8ebc11a5e7e72a201e557e4625e34))
* **sitemap:** add Google Images namespace and image:image tags for articles ([6a46a37](https://github.com/teamdivergentes/website_backend/commit/6a46a378a8bcc01ef4fa85d0b9bf7d52c3fc2c70))


### Performance Improvements

* **ci:** skip semgrep + docker on PR pushes to save CI minutes ([7289d03](https://github.com/teamdivergentes/website_backend/commit/7289d03fe47bf5f6371ddd0a0626f9e28c3d61c2))

## [1.3.2](https://github.com/teamdivergentes/website_backend/compare/v1.3.1...v1.3.2) (2026-04-12)


### Bug Fixes

* **sitemap:** utiliser team.slug au lieu de team.id dans les URLs ([6756d18](https://github.com/teamdivergentes/website_backend/commit/6756d18b769c9437b0701a20d34455b35e7be984))

## [1.3.1](https://github.com/teamdivergentes/website_backend/compare/v1.3.0...v1.3.1) (2026-04-06)


### Bug Fixes

* **ci:** use frontend proxy URL for deploy smoke test ([6995756](https://github.com/teamdivergentes/website_backend/commit/699575637250f8a39a0c54115a47b01bc475a647))
* **ci:** use PAT for semantic-release tag push + fix smoke test URL ([becea7d](https://github.com/teamdivergentes/website_backend/commit/becea7deb413e240293a01be4c6a42bf758ef27d))

# [1.3.0](https://github.com/teamdivergentes/website_backend/compare/v1.2.0...v1.3.0) (2026-04-05)


### Bug Fixes

* **auth:** protect register endpoint with admin role guard ([4f64f53](https://github.com/teamdivergentes/website_backend/commit/4f64f531d157aa09c40570cfa7fe3fed6743ff22))
* **ci:** corriger lint, tests et migrations du module articles ([3582fa3](https://github.com/teamdivergentes/website_backend/commit/3582fa36661a5d1abb6d8df73f7258acdae21d19))
* **ci:** ignore unfixed CVEs in Trivy scan-image ([6d04133](https://github.com/teamdivergentes/website_backend/commit/6d041335e12de264c3fd7b18498fd431aadfbd72))
* **ci:** make Trivy scan informational with table + SARIF output ([cf9fd24](https://github.com/teamdivergentes/website_backend/commit/cf9fd241f7ad867100fe2fa647e9c111ae5ba75d))
* **ci:** scoper le rollback par environnement et ajouter le suivi ([4b7962f](https://github.com/teamdivergentes/website_backend/commit/4b7962f00ba78bd36e8f03d794242159ff477030))
* **ci:** securiser et durcir le pipeline CI/CD ([8dd6696](https://github.com/teamdivergentes/website_backend/commit/8dd669609aa8b3fd374b2ba5a877e64ab8a79953))
* **ci:** toujours pousser l'image Docker vers GHCR pour permettre le scan Trivy ([c1f4c81](https://github.com/teamdivergentes/website_backend/commit/c1f4c819f1339131b6ba92343e7d969856a2f62e))
* **ci:** Trivy scan, cache node_modules, environments GitHub, CODEOWNERS ([9326579](https://github.com/teamdivergentes/website_backend/commit/93265799249753000fbbfc6b7aec31b5cd37f019))
* correct CI workflow failures (test + validate-migrations) ([83fc5aa](https://github.com/teamdivergentes/website_backend/commit/83fc5aa0f23da6e02a586895523a5cc168e76b26))
* correct E2E test failures (rate limiting + validation) ([acec1a2](https://github.com/teamdivergentes/website_backend/commit/acec1a2e9cb7bcfa928a9dd941e5116e43ce9fc3))
* correct E2E test failures (throttle + upload + delete) ([163f887](https://github.com/teamdivergentes/website_backend/commit/163f8873f3d8544dd49094610e5084df3ac7945e))
* disable Docker cache-to on PR builds (docker driver limitation) ([9ef3113](https://github.com/teamdivergentes/website_backend/commit/9ef3113f978ea53509bc6753683dfdfe07df4eda))
* **docker:** apply Alpine security patches in production stage ([c2e318b](https://github.com/teamdivergentes/website_backend/commit/c2e318b3f0f949aabd88ef52a924199c96df0b07))
* invert cache-to condition (empty string is falsy in GHA expressions) ([c86be6d](https://github.com/teamdivergentes/website_backend/commit/c86be6d7f254a1935624e6a1adc61dafd6308fa4))
* **metrics:** resolve unsafe-any lint errors in interceptor ([ce3d80f](https://github.com/teamdivergentes/website_backend/commit/ce3d80fcd2a361c039c588b7d2d1277e3fddb8fa))
* resolve lint error (require-await) in E2E throttle mocks ([1c4b413](https://github.com/teamdivergentes/website_backend/commit/1c4b41387e5ca48615b11737e3cfdeb47538540b))
* **sitemap:** update tests for articles support ([#42](https://github.com/teamdivergentes/website_backend/issues/42)) ([2083f73](https://github.com/teamdivergentes/website_backend/commit/2083f73bcefd4bab182bd1f79d1db67010717f3e))
* **upload,recruitment:** type safety and error handling improvements ([ae7eed1](https://github.com/teamdivergentes/website_backend/commit/ae7eed1b91bdc8a2e13a2c5d0123ea726de7212a))
* **upload:** improve image quality on upload ([2e9e107](https://github.com/teamdivergentes/website_backend/commit/2e9e107f216f606d9db55605eb7df4c17859d6b8))
* use overrideProvider(ThrottlerStorage) to disable rate limiting in E2E tests ([f72d8a2](https://github.com/teamdivergentes/website_backend/commit/f72d8a222d80efab36008c1c4b6e766a7fed8551))


### Features

* Amélioration Devsecops ([#43](https://github.com/teamdivergentes/website_backend/issues/43)) ([1cf896b](https://github.com/teamdivergentes/website_backend/commit/1cf896b8c5af7a7c401668845c58c232b7ce2308))
* **ci:** add semantic-release for automated versioning ([66da15a](https://github.com/teamdivergentes/website_backend/commit/66da15a7b4d10403a341d77ce76a5fca680f00b9))
* **metrics:** add Prometheus metrics endpoint ([13c0239](https://github.com/teamdivergentes/website_backend/commit/13c0239bf45d87c9264d1f60431ded67eb52f440))
* **sitemap:** add published articles to sitemap ([#40](https://github.com/teamdivergentes/website_backend/issues/40)) ([b2a0254](https://github.com/teamdivergentes/website_backend/commit/b2a0254670a3ab1831e2f56bbcea1c1d571d1782))
* **sitemap:** add published articles to sitemap ([#41](https://github.com/teamdivergentes/website_backend/issues/41)) ([dce208d](https://github.com/teamdivergentes/website_backend/commit/dce208d74dcbfc84d5c83539bf321603c3148499))


### Performance Improvements

* optimize CI pipeline - split test-unit/test-e2e, path-ignore ([20f1fd0](https://github.com/teamdivergentes/website_backend/commit/20f1fd05584842b012e29816375b50868e291bc4))
* **teams:** use _count instead of loading all members in findAll ([6f2d8b2](https://github.com/teamdivergentes/website_backend/commit/6f2d8b25a16d43bb6a7449b276a74017f7b33848))

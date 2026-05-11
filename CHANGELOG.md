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

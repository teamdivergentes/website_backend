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

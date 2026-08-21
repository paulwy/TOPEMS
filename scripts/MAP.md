# TOPEMS Scripts Index

> Cleaned up V265+: removed 132 one-time scripts (L1/L2/T2/type-only batch outputs, V68/V73 era scripts, design-tokens/security/configs dirs).

## Root-level · Active scripts

| Script | Purpose |
|--------|---------|
| `topems.sh` | Main CLI entry (build/dev/test/start/clean/db) |
| `migrate.sh` | Database migration runner (run/status/revert/validate) |
| `services.conf` | Service port table (consumed by gen-service-config.py) |
| `gen-service-config.py` | Generate config/services.yaml + ports.env from services.conf |
| `generate-inventory.mjs` | Scan Cargo.toml + modules + migrations → docs/architecture/inventory.md |
| `generate-jwt-keys.sh` | Generate JWT_SECRET / JWT_REFRESH_SECRET key pairs |
| `patch-react-transition-group.js` | Fix ESM imports for react-transition-group (called by `npm prepare` + CI) |
| `sccache-setup.sh` | Configure sccache for faster Rust recompilation |
| `ci-cache-utils.sh` | CI cache restore/save helpers |
| `sync-ports.sh` | Sync service ports across .env / services.conf / config |
| `bundle-check.sh` | Vite bundle size checker (CI) |
| `blue-green-deploy.sh` | Blue-green deployment script |
| `check-design-tokens.mjs` | Design token usage checker (`npm run check:design-tokens`) |
| `check-migration-names.mjs` | Migration filename convention checker (CI + Makefile) |
| `check-migrations.mjs` | Migration file structure checker (CI + Makefile) |
| `verify_navigation.mjs` | Menu → route → permission three-way check (`npm run verify:nav`) |
| `analyze_nav_structure.mjs` | Navigation structure analyzer & validator |
| `p6-api-audit-v5.cjs` | API path audit (CI) |
| `p7-perm-audit-v5.cjs` | Permission matrix audit (CI) |

## audit/ · Reusable audit tools

| Script | Purpose |
|--------|---------|
| `detect-ts-unused-exports.cjs` | TS unused exports scanner (`npm run audit:unused`) |
| `type-only-scan.py` | Type-only dead code scanner (`npm run audit:unused:type-only`) |
| `t2-pages-gate-scan.py` | T2 pages gate scanner (R0+G1-G4, 永久保留) |
| `l1-conservative-remove-v2.cjs` | Conservative `export` keyword remover (reusable, spec-referenced) |

## ci/ · Quality Gates

| Script | Purpose |
|--------|---------|
| `apply_clippy_allow_style.cjs` | Apply clippy `allow` attributes for style lints |
| `auto-insert-utoipa-permission.cjs` | Auto-insert utoipa permission annotations |
| `check-a11y.cjs` | Accessibility checker |
| `check-api-audit.cjs` | API path audit gate |
| `check-api-coverage.cjs` | API coverage checker |
| `check-axum-layer-order.cjs` | Axum middleware layer order check (Gate M: R1/R2/R3) |
| `check-i18n-quality.cjs` | i18n R11 style guide quality check |
| `check-i18n.cjs` | i18n basic quality check |
| `check-icons.cjs` | Icon completeness check (V64) |
| `check-nav-route.cjs` | Nav → route registration check |
| `check-props-alignment.cjs` | Props field realness AST scan |
| `compare-api-modules.cjs` | Compare API module definitions |
| `coverage-baseline.sh` | Coverage baseline runner |
| `coverage-report.py` | Coverage report generator |
| `gen-r12-zp0-z4cover-report.cjs` | R12 Z-P0~Z4 coverage report |
| `lint-check.sh` | Lint check runner |
| `page-audit.cjs` | Page standardization check (V64) |
| `perm-matrix-toolkit.cjs` | Permission matrix scanner (R1~R7) |
| `sccache_stats.sh` | sccache statistics |
| `verify-glossary.cjs` | i18n glossary verifier |

## dev/ · Development tools

| Script | Purpose |
|--------|---------|
| `sqlx-prepare.sh` | Refresh .sqlx/ offline cache (multi-package) |
| `start-local.sh` | Start frontend + backend locally |
| `health-check.sh` | Service health check |
| `install-deps.sh` | Install all project dependencies |
| `update-admin-password.sh` | Update admin user password |
| `verify-route-matrix.sh` | Verify route registration matrix |
| `check-crm-contract.mjs` | CRM contract verification |
| `check-mes-contract.mjs` | MES contract verification |
| `ai-bench.sh` | AI model benchmark |
| `ai-models.sh` | AI model management |
| `Modelfile.coder-7b` | Ollama coder model file |

## deploy/ · Deployment

| Script | Purpose |
|--------|---------|
| `deploy.sh` | Main deployment script |
| `docker/topems-docker.sh` | Docker deployment helper |
| `domain-start.sh` | Domain-level service starter |
| `rollback.sh` | Rollback deployment |

## i18n/ · i18n tooling (only tracked files)

| Script | Purpose |
|--------|---------|
| `scan-hardcoded-precise.cjs` | Hardcoded CJK scanner (CI + lefthook, `--strict`) |
| `apply_glossary.js` | Apply glossary translations |
| `audit_fake_en.js` | Audit fake `en` values |
| `glossary.csv` | Translation glossary data |

## openapi/ · OpenAPI tooling

| Script | Purpose |
|--------|---------|
| `generate.sh` | OpenAPI spec generator (online/offline/extract) |
| `aggregate.py` | Aggregate multi-service OpenAPI specs |
| `gen-types.mjs` | Generate TS types from OpenAPI |

## performance/ · Performance testing

| Script | Purpose |
|--------|---------|
| `benchmark.sh` | Performance benchmark runner |
| `run_benchmark.sh` | Alternative benchmark runner |
| `run-all-tests.sh` | Run all performance tests |
| `run-e2e-performance.sh` | E2e performance test |
| `database-performance-test.js` | Database performance test |
| `scm-performance-test.js` | SCM service performance test |
| `baseline.md` | Performance baseline doc |

## test/ · Test runners

| Script | Purpose |
|--------|---------|
| `run-core-tests.sh` | Core service test runner |
| `run-iam-tests.sh` | IAM service test runner |
| `run-integration-tests.sh` | Integration test runner |
| `test-commands-flow.sh` | Command flow test |
| `test-frontend-lifecycle.sh` | Frontend lifecycle test |
| `test-topems-sh.sh` | topems.sh CLI test |
| `verify_system_config_fix.py` | System config verification |

## finance/ · Finance domain

| Script | Purpose |
|--------|---------|
| `consistency-check.sh` | Finance data consistency check |
| `README.md` | Finance scripts readme |

## migration/ · Migration helpers

| Script | Purpose |
|--------|---------|
| `validate.sh` | Migration validation helper |

## templates/ · SQL templates

| File | Purpose |
|------|---------|
| `add_tenant_id_template.sql` | Template for adding tenant_id column |

## tools/ · Standalone tools

| Path | Purpose |
|------|---------|
| `hash_password.rs` | Password hashing utility (Rust) |
| `migration-generator/` | AI migration generator (TS project with tests) |

## windows/ · Windows compatibility

| Script | Purpose |
|--------|---------|
| `topems.bat` | Windows entry point |
| `topems-standalone.ps1` | Standalone PowerShell runner |
| `check-env.ps1` | Environment checker |
| `ports.ps1` | Port configuration |
| `README_WINDOWS.md` | Windows setup guide |

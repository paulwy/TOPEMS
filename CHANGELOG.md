# CHANGELOG

## [Unreleased]

## [13.2.0] - 2026-07-21

### Cleanup

- Removed root-level debug scripts (`split_notification*.py`, 3 files)
- Removed `apps/web/FAIL` artifact
- Updated `.gitignore` to block `FAIL`, `*.bak`, debug scripts, and logs

### Security

- Fixed AI service `JWT_SECRET` hardcoded fallback to `expect()` panic on missing env var

### Infrastructure

- Fixed Git LFS `tmp` directory permission errors

## [13.1.0] - 2026-07-16

### Documentation

- Deleted 400+ redundant files (docs, configs, stale reports)
- Merged duplicate directories (`docs/user/` → `docs/user-guide/`, etc.)
- Cleaned expired reports in `docs/reports/`

## [13.0.0] - 2026-07-16

### Architecture

- Plugin registration security token validation (`PLUGIN_REGISTRATION_TOKEN`)
- Consul service discovery + fallback mechanism
- Frontend dynamic navigation via backend API
- Plugin heartbeat timeout detection
- Dependency check (forward + reverse)
- Centralized configuration management

## [12.0.0] - 2026-07-16

### Security

- Multi-tenant isolation coverage: **97.3%** (565 tables + RLS)

### Quality

- `unwrap()` cleanup in business code
- `console.log` cleanup
- `routes.rs` splitting across services

## [11.0.0] - 2026-07-16

### Quality

- `unwrap()` business code zeroed
- Vitest mobile tests all green
- PWA/offline acceptance passed

## [10.0.0] - 2026-07-15 ~ 2026-07-25

### Build

- Rust 0 compilation errors
- TypeScript 0 compilation errors
- `as any` zeroed
- `eslint` warnings reduced to 2
- Hardcoded values zeroed
- `unwrap()` reduced from 183 → 44
- 20 large files split
- `@ts-nocheck` zeroed
- 14 frontend components split
- 3 `main.rs` refactored

## [9.0.0] - 2026-07-15

### Architecture

- Unified routing: all 31 services aligned to `nest + bare path` pattern
- Removed `/v1` prefixes from API paths
- K8s Ingress 5-way alignment
- Legacy compatibility layers (`wrap_group2_router`, `wrap_group1_router`) fully removed

## [7.0.0] - 2026-07-14

### Frontend

- React Query full coverage migration
- `useAppStore` memoized optimization
- UI components unified to `shared-components`
- Responsive design enhancement

## [5.19.0] - 2026-07-14

### Verification

- DataTable virtual scroll runtime verification
- DatePicker/FormField runtime verification
- React Query configuration runtime verification (LCP: 1920ms, FCP: 980ms)

### Cleanup

- Cleared TODO/FIXME comments from 69 files (business pages, mobile, components, backend)

## [5.14.0] - 2026-07-13

### Frontend

- **Enhanced**: `batchOperation` utility function with error boundary handling, network retry mechanism, and data consistency check
- **Added**: Network retry support with configurable `maxRetries`, `retryDelay`, and `retryableErrors` options
- **Added**: Error boundary try-catch wrapper to prevent single operation failures from breaking the entire batch
- **Added**: Data consistency check callback (`consistencyCheck`) to validate data integrity after operations
- **Added**: Operation lifecycle hooks (`onBeforeOperation`, `onAfterOperation`) for custom pre/post processing
- **Enhanced**: Batch operation logging with detailed error logging for each failed item and retry tracking
- **Fixed**: `react-transition-group` module resolution issue by running patch script on install
- **Fixed**: Removed `pnpm.patchedDependencies` from `package.json` (deprecated in pnpm v11)
- **Fixed**: TypeScript error in `shared-types` package by adding missing `react` dependency

### Backend

- **Fixed**: All tenant middleware tests requiring Tokio context (CRM, SRM, WMS services)
- **Fixed**: `topems-rs` project repository tests by removing non-existent `tenant_id` column from SQL queries
- **Fixed**: ERP service private type warnings by making structs public (`ReconcileRequest`, `AutoReconcileRequest`, `AgingParams`, `MesProgressUpdate`, and others)

### Configuration

- **Fixed**: `apps/desktop/tauri.conf.json` schema compliance for Tauri v2
- **Fixed**: `Cargo.toml` workspace configuration to exclude `apps/desktop/src-tauri`
- **Fixed**: `lib/src/cors.rs` test assertions

### Cleanup

- **Removed**: Stale root-level files (`deploy.sh`, `REFACTOR-CHANGELOG.md`, `TOPEMS-OPTIMIZATION-PLAN.md`, `V2-NAV-CLEANUP-REPORT.md`)

### Build

- **Verified**: All frontend apps (web, mobile, desktop) compile successfully
- **Verified**: All backend Rust services compile successfully
- **Verified**: All backend unit tests pass (199+ tests)

## [Unreleased]

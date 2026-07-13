# CHANGELOG

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

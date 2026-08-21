/**
 * Web application unified constants entry
 *
 * Design principles:
 * 1. Cross-platform shared constants (web + desktop) belong in
 *    `@topems/tokens` and should not be redefined here.
 * 2. This directory only carries web-specific constants:
 *    - storage.ts  — localStorage / sessionStorage keys
 *    - api.ts      — web axios client retry strategy and public API paths
 *    - routes.ts   — default routes / public page whitelist
 *    - pagination.ts — pagination defaults (semantic aliases on top of shared)
 *    - validation.ts — validation regex and length limits
 *    - retry.ts   — lazy-load retry parameters
 * 3. Route-module-specific path sets (AUTH_PATHS / DASHBOARD_PATHS / *_PATHS)
 *    are still maintained by src/routes/{auth,dashboard,common}.ts and
 *    src/modules/<name>/config. This directory only carries global
 *    strategic route constants.
 */

export * from './storage';
export * from './api';
export * from './routes';
export * from './pagination';
export * from './validation';
export * from './retry';
export * from './time';

export { normalizePaginationParams } from './pagination'
export type {
  PageSizeField,
  PaginationParamsInput,
  PaginationParamsNormalized,
} from './pagination';

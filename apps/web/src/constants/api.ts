/**
 * Web application API client related constants
 *
 * Note: timeout configurations (API_TIMEOUT / PLUGIN_TIMEOUT / WS_TIMEOUT, etc.)
 * are provided by `@topems/shared-constants` and should not be redefined here.
 * This file only carries web-specific request retry strategy and public API
 * path whitelist.
 */

/**
 * API request retry configuration.
 * Extracted from the locally defined API_RETRY_CONFIG in api/client.ts.
 */
export const API_RETRY_CONFIG = {
  /** Maximum retry count */
  MAX_RETRIES: 2,
  /** Retry base delay (ms) */
  BASE_DELAY: 500,
  /** Maximum single retry delay (ms) */
  MAX_DELAY: 3000,
  /** Maximum total retry wait time (ms) */
  MAX_TOTAL_WAIT: 10000,
} as const;

/**
 * Public API path whitelist.
 * Requests matching these prefixes will not attach the Authorization header,
 * nor will they trigger 401 auto-logout.
 * Extracted from the locally defined PUBLIC_API_PATTERNS in api/client.ts.
 */
export const PUBLIC_API_PATTERNS = [
  '/health',
  '/auth/login',
  '/auth/register',
  '/auth/refresh',
  '/auth/forgot-password',
  '/auth/reset-password',
] as const;

/**
 * Event name dispatched when authentication fails.
 */
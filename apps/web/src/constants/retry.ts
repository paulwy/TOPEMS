/**
 * Web application lazy-load / network request retry constants
 *
 * Merged from MAX_RETRIES / RETRY_DELAY_MS separately defined in
 * routes/utils.ts and utils/lazyImport.ts (two identical definitions).
 */

/**
 * Maximum retry count for module lazy-loading.
 * Extracted from MAX_RETRIES redundantly defined in both
 * utils/lazyImport.ts and routes/utils.ts.
 *
 * Note: not marked `as const`; type remains `number` for consumers to
 * reassign into mutable `let` variables.
 */
export const MAX_RETRIES = 3;

/**
 * Base delay for module lazy-load retry (ms).
 * Actual delay increases linearly with attempt count:
 * delay = RETRY_DELAY_MS * attempt.
 */
export const RETRY_DELAY_MS = 1000;

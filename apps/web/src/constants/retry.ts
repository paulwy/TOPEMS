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

/**
 * API 客户端请求重试常量（与 api/client.ts L70 API_RETRY_CONFIG 去重对齐）。
 * 旧的内联 API_RETRY_CONFIG 已废弃，统一使用此处常量。
 *
 * 退避策略：exponential backoff + jitter
 *   delay = min(BASE_DELAY * 2^retries + jitter, MAX_DELAY)
 */
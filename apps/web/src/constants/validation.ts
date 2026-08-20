/**
 * Web application validation constants
 *
 * Common regex / length limits are provided by `@topems/shared-constants`.
 * This file re-exports them and supplements web form-specific semantic
 * validation rules.
 */

// Re-export from shared constants to avoid components depending directly on
// shared-constants internal paths
export { VALIDATION } from '@topems/shared-constants';

/** China mainland phone number regex */
/** Common email regex */
/** Username length limit */
/** Password length limit */
/** Max length for name-like fields (real name / department name, etc.) */
/** Max length for common remark / description fields */
/** Max length for URL fields */
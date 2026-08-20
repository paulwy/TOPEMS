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
const PHONE_REGEX = /^1[3-9]\d{9}$/;

/** Common email regex */
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Username length limit */
const USERNAME_MIN_LENGTH = 3 as const;
const USERNAME_MAX_LENGTH = 20 as const;

/** Password length limit */
const PASSWORD_MIN_LENGTH = 8 as const;
const PASSWORD_MAX_LENGTH = 32 as const;

/** Max length for name-like fields (real name / department name, etc.) */
const NAME_MAX_LENGTH = 50 as const;

/** Max length for common remark / description fields */
const DESCRIPTION_MAX_LENGTH = 500 as const;

/** Max length for URL fields */
const URL_MAX_LENGTH = 2048 as const;

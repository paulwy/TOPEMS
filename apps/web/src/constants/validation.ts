/**
 * Web application validation constants
 *
 * Web form-specific semantic validation rules (regex / length limits).
 */

/** China mainland phone number regex */
export const PHONE_REGEX = /^1[3-9]\d{9}$/;

/** Common email regex */
export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Username length limit */
export const USERNAME_MIN_LENGTH = 3 as const;
export const USERNAME_MAX_LENGTH = 20 as const;

/** Password length limit */
export const PASSWORD_MIN_LENGTH = 8 as const;
export const PASSWORD_MAX_LENGTH = 32 as const;

/** Max length for name-like fields (real name / department name, etc.) */
export const NAME_MAX_LENGTH = 50 as const;

/** Max length for common remark / description fields */
export const DESCRIPTION_MAX_LENGTH = 500 as const;

/** Max length for URL fields */
export const URL_MAX_LENGTH = 2048 as const;

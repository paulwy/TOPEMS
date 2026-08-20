/**
 * Web application page route constants
 *
 * Unlike *_PATHS in src/routes/{auth,dashboard,common}.ts which maintain
 * complete path mappings with lazy-loaded component bindings, this file only
 * carries "global strategy" route constants: default redirect targets,
 * whitelists, etc. consumed by auth guards, error boundaries and other
 * infrastructure to avoid hardcoded strings in multiple places.
 */

/** Default post-login redirect path */
/** Fallback path when not logged in */
/** 403 page path */
/** 404 page path */
/**
 * Public page whitelist: accessible without login.
 * Note: this is different from PUBLIC_API_PATTERNS in api.ts —
 * the latter is the backend API path whitelist, while this is the
 * frontend page path whitelist.
 */
/**
 * Platform root path set (used by sidebar / route metadata validation).
 * Extracted from PLATFORM_ROOT_PATHS locally defined in
 * src/components/layout/AppSidebar.tsx.
 */
export const PLATFORM_ROOT_PATHS = new Set<string>([
  'dashboard',
  'login',
  'register',
  'settings',
  'profile',
]);

/**
 * Check whether a given page path is in the public whitelist.
 */
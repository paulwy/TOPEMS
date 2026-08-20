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
const DEFAULT_ROUTE = '/dashboard' as const;

/** Fallback path when not logged in */
const LOGIN_ROUTE = '/login' as const;

/** 403 page path */
const FORBIDDEN_ROUTE = '/403' as const;

/** 404 page path */
const NOT_FOUND_ROUTE = '/404' as const;

/**
 * Public page whitelist: accessible without login.
 * Note: this is different from PUBLIC_API_PATTERNS in api.ts —
 * the latter is the backend API path whitelist, while this is the
 * frontend page path whitelist.
 */
const PUBLIC_ROUTES = [
  '/login',
  '/forgot-password',
  '/register',
  '/reset-password',
] as readonly string[];

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
function isPublicRoute(path: string): boolean {
  return PUBLIC_ROUTES.includes(path);
}

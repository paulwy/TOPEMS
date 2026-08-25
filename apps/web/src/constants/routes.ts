/**
 * Web application page route constants
 *
 * Unlike *_PATHS in src/routes/{auth,dashboard,common}.ts which maintain
 * complete path mappings with lazy-loaded component bindings, this file only
 * carries "global strategy" route constants: default redirect targets,
 * whitelists, etc. consumed by auth guards, error boundaries and other
 * infrastructure to avoid hardcoded strings in multiple places.
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

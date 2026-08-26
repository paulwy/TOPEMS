/**
 * Web application unified storage key constants
 *
 * Note: merged from STORAGE_KEYS separately defined in utils/storage.ts
 * and utils/session.ts. Any new storage key should be declared here to
 * avoid scattered definitions.
 */

/** Key for storing authentication token in localStorage */
const TOKEN_KEY = 'token' as const;

/** Key for storing tenant ID in localStorage */
/**
 * Unified storage key set.
 * Compatible with historical definitions in both utils/storage.ts
 * and utils/session.ts.
 */
export const STORAGE_KEYS = {
  // —— Auth related (from utils/session.ts) ——
  USER: 'topems_user',
  TOKEN: TOKEN_KEY,
  LAST_ACTIVITY: 'last_activity',

  // —— Preferences/cache (from utils/storage.ts) ——
  USER_INFO: 'user_info',
  USER_PERMISSIONS: 'user_permissions',
  THEME: 'theme',
  LANGUAGE: 'language',
  SIDEBAR_COLLAPSED: 'sidebar_collapsed',
  TABLE_COLUMNS: 'table_columns',
  FORM_DRAFT: 'form_draft',
  LAST_LOGIN: 'last_login',
  REMEMBER_ME: 'remember_me',

  // —— Roles and permissions (referenced by api/client.ts) ——
  ROLES: 'roles',
  PERMISSIONS: 'permissions',

  // —— Sidebar preferences (referenced by AppSidebar / CommandPalette) ——
  SIDEBAR_FAVORITES: 'sidebar-favorites',
  SIDEBAR_RECENT: 'sidebar-recent',
} as const;

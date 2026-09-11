import { describe, it, expect } from 'vitest';

import { STORAGE_KEYS } from '../storage';

describe('STORAGE_KEYS', () => {
  it('should have auth-related keys', () => {
    expect(STORAGE_KEYS.USER).toBe('topems_user');
    expect(STORAGE_KEYS.TOKEN).toBe('token');
    expect(STORAGE_KEYS.LAST_ACTIVITY).toBe('last_activity');
  });

  it('should have preference/cache keys', () => {
    expect(STORAGE_KEYS.USER_INFO).toBe('user_info');
    expect(STORAGE_KEYS.USER_PERMISSIONS).toBe('user_permissions');
    expect(STORAGE_KEYS.THEME).toBe('theme');
    expect(STORAGE_KEYS.LANGUAGE).toBe('language');
    expect(STORAGE_KEYS.SIDEBAR_COLLAPSED).toBe('sidebar_collapsed');
    expect(STORAGE_KEYS.TABLE_COLUMNS).toBe('table_columns');
    expect(STORAGE_KEYS.FORM_DRAFT).toBe('form_draft');
    expect(STORAGE_KEYS.LAST_LOGIN).toBe('last_login');
    expect(STORAGE_KEYS.REMEMBER_ME).toBe('remember_me');
  });

  it('should have role and permission keys', () => {
    expect(STORAGE_KEYS.ROLES).toBe('roles');
    expect(STORAGE_KEYS.PERMISSIONS).toBe('permissions');
  });

  it('should have sidebar preference keys', () => {
    expect(STORAGE_KEYS.SIDEBAR_FAVORITES).toBe('sidebar-favorites');
    expect(STORAGE_KEYS.SIDEBAR_RECENT).toBe('sidebar-recent');
  });

  it('should not have duplicate values across keys', () => {
    const values = Object.values(STORAGE_KEYS);
    const unique = new Set(values);
    expect(unique.size).toBe(values.length);
  });
});

import { describe, it, expect } from 'vitest';

import { PLATFORM_ROOT_PATHS } from '../routes';

describe('PLATFORM_ROOT_PATHS', () => {
  it('should be a Set', () => {
    expect(PLATFORM_ROOT_PATHS).toBeInstanceOf(Set);
  });

  it('should contain expected platform root paths', () => {
    expect(PLATFORM_ROOT_PATHS.has('dashboard')).toBe(true);
    expect(PLATFORM_ROOT_PATHS.has('login')).toBe(true);
    expect(PLATFORM_ROOT_PATHS.has('register')).toBe(true);
    expect(PLATFORM_ROOT_PATHS.has('settings')).toBe(true);
    expect(PLATFORM_ROOT_PATHS.has('profile')).toBe(true);
  });

  it('should have 5 entries', () => {
    expect(PLATFORM_ROOT_PATHS.size).toBe(5);
  });

  it('should not contain non-platform paths', () => {
    expect(PLATFORM_ROOT_PATHS.has('admin')).toBe(false);
    expect(PLATFORM_ROOT_PATHS.has('crm')).toBe(false);
    expect(PLATFORM_ROOT_PATHS.has('')).toBe(false);
  });
});

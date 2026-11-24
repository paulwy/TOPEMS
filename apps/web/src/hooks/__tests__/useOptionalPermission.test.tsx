import { describe, it, expect, beforeEach } from 'vitest';
import { useOptionalPermission } from '../useOptionalPermission';
import { renderHook } from '@testing-library/react';

const KEY = 'permission_cache';

function setCache(permissions: string[], inheritedPermissions: string[] = []) {
  localStorage.setItem(
    KEY,
    JSON.stringify({ permissions, inheritedPermissions, timestamp: Date.now() })
  );
}

describe('useOptionalPermission（批 14）', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('无权限缓存时放行（不误隐藏）', () => {
    const { result } = renderHook(() => useOptionalPermission());
    expect(result.current('mes:equipment:create')).toBe(true);
    expect(result.current()).toBe(true);
  });

  it('未传权限码恒放行', () => {
    setCache([]);
    const { result } = renderHook(() => useOptionalPermission());
    expect(result.current(undefined)).toBe(true);
    expect(result.current('')).toBe(true);
  });

  it('缓存为空权限列表时拒绝（已登录无权）', () => {
    setCache([]);
    const { result } = renderHook(() => useOptionalPermission());
    expect(result.current('mes:equipment:create')).toBe(false);
  });

  it('命中权限列表放行，未命中拒绝', () => {
    setCache(['scm:contract:create']);
    const { result } = renderHook(() => useOptionalPermission());
    expect(result.current('scm:contract:create')).toBe(true);
    expect(result.current('scm:contract:delete')).toBe(false);
  });

  it('all 通配放行全部', () => {
    setCache(['all']);
    const { result } = renderHook(() => useOptionalPermission());
    expect(result.current('mes:equipment:delete')).toBe(true);
  });

  it('* 通配放行全部（后端超管权限集）', () => {
    setCache(['*']);
    const { result } = renderHook(() => useOptionalPermission());
    expect(result.current('mes:equipment:create')).toBe(true);
    expect(result.current('mes:equipment:delete')).toBe(true);
    expect(result.current('hrm:company:update')).toBe(true);
    expect(result.current('finance:ledger:delete')).toBe(true);
  });

  it(':view 等价回退到 :read', () => {
    setCache(['mes:equipment:read']);
    const { result } = renderHook(() => useOptionalPermission());
    expect(result.current('mes:equipment:view')).toBe(true);
  });

  it('过期缓存视为无信息 → 放行', () => {
    localStorage.setItem(
      KEY,
      JSON.stringify({
        permissions: [],
        inheritedPermissions: [],
        timestamp: Date.now() - 10 * 60 * 1000,
      })
    );
    const { result } = renderHook(() => useOptionalPermission());
    expect(result.current('mes:equipment:create')).toBe(true);
  });
});

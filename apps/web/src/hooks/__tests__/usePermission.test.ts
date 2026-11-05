import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';

import usePermission from '../usePermission';

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    user: { id: 'u1', is_superuser: false, permissions: [] },
    permissions: mockPermissions,
    hasPermission: (code: string) => mockPermissions.includes(code),
    hasAnyPermission: (codes: string[]) => codes.some((c) => mockPermissions.includes(c)),
    hasAllPermissions: (codes: string[]) => codes.every((c) => mockPermissions.includes(c)),
  }),
}));

let mockPermissions: string[] = [];

vi.mock('@/config/permissions', () => ({
  getInheritedPermissions: (perms: string[]) => perms,
  hasPermissionWithInheritance: (perms: string[], code: string) => perms.includes(code),
  getPermissionsByGroup: () => [],
}));

describe('usePermission 权限码兼容层（P3）', () => {
  beforeEach(() => {
    mockPermissions = [];
    localStorage.clear();
  });

  it('拥有 :read 权限时，:view 引用可通过等价回退命中', () => {
    mockPermissions = ['crm:dashboard:read', 'finance:account:read'];
    const { result } = renderHook(() => usePermission());

    expect(result.current.checkPermission('crm:dashboard:read')).toBe(true);
    // 历史前端引用写法：:view 不存在于权限表，回退到 :read 判定
    expect(result.current.checkPermission('crm:dashboard:view')).toBe(true);
    expect(result.current.checkPermission('finance:account:view')).toBe(true);
  });

  it('没有对应 :read 权限时仍拒绝，不会放宽', () => {
    mockPermissions = ['crm:dashboard:read'];
    const { result } = renderHook(() => usePermission());

    expect(result.current.checkPermission('mes:dashboard:view')).toBe(false);
    expect(result.current.checkPermission('crm:work_order:view')).toBe(false);
  });

  it('非 :view 的权限码行为不变', () => {
    mockPermissions = ['crm:dashboard:read'];
    const { result } = renderHook(() => usePermission());

    expect(result.current.checkPermission('crm:dashboard:write')).toBe(false);
    expect(result.current.checkPermission('crm:dashboard:read')).toBe(true);
    expect(result.current.checkPermission('crm')).toBe(false);
  });

  it('checkAnyPermission / checkAllPermissions 同样支持 :view 回退', () => {
    mockPermissions = ['ai:dashboard:read', 'bi:dashboard:read'];
    const { result } = renderHook(() => usePermission());

    expect(result.current.checkAnyPermission(['ai:dashboard:view', 'erp:dashboard:view'])).toBe(
      true
    );
    expect(result.current.checkAllPermissions(['ai:dashboard:view', 'bi:dashboard:view'])).toBe(
      true
    );
    // all 中任一项无权限 → false
    expect(result.current.checkAllPermissions(['ai:dashboard:view', 'qms:dashboard:view'])).toBe(
      false
    );
  });

  it('无任何权限时不放行', () => {
    mockPermissions = [];
    const { result } = renderHook(() => usePermission());
    expect(result.current.checkPermission('crm:dashboard:view')).toBe(false);
  });
});

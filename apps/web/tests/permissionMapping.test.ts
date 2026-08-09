import { describe, it, expect } from 'vitest';
import {
  PERMISSION_MAPPING,
  mapPermissionIdToName,
  mapPermissionIdsToNames,
  mapPermissionNameToId,
  getPermissionByModule,
  getPermissionByAction,
  ALL_ADMIN_PERMISSIONS,
  IAM_ADMIN_PERMISSION_ID,
  DEFAULT_ROLE_PERMISSIONS,
} from '@/config/permissionMapping';
import { MODULES, ACTIONS } from '@/config/permissions';

describe('config/permissionMapping - PERMISSION_MAPPING 生成完备性', () => {
  it('应为每个 (module, action) 组合生成条目', () => {
    const moduleCount = Object.values(MODULES).length;
    const actionCount = ACTIONS.length;
    expect(Object.keys(PERMISSION_MAPPING).length).toBe(moduleCount * actionCount);
  });

  it('每个条目 id/name/resource/action/module 齐全', () => {
    const first = Object.values(PERMISSION_MAPPING)[0];
    expect(first).toHaveProperty('id');
    expect(first).toHaveProperty('name');
    expect(first).toHaveProperty('resource');
    expect(first).toHaveProperty('action');
    expect(first).toHaveProperty('module');
    expect(first.name).toContain(':');
  });
});

describe('config/permissionMapping - mapPermissionIdToName & reverse', () => {
  it('有效 id → name，含 module:action 格式', () => {
    const id = Object.keys(PERMISSION_MAPPING)[0];
    const name = mapPermissionIdToName(id);
    expect(typeof name).toBe('string');
    expect(name!.split(':')).toHaveLength(2);
  });

  it('无效 id → null', () => {
    expect(mapPermissionIdToName('nonexistent-id')).toBeNull();
  });

  it('mapPermissionNameToId 能反向查回', () => {
    const first = Object.values(PERMISSION_MAPPING)[0];
    const back = mapPermissionNameToId(first.name);
    expect(back).toBe(first.id);
  });

  it('无效 name → null', () => {
    expect(mapPermissionNameToId('iam:nonexistent')).toBeNull();
  });

  it('mapPermissionIdsToNames 跳过无效 id', () => {
    const valid = Object.keys(PERMISSION_MAPPING).slice(0, 2);
    const result = mapPermissionIdsToNames([...valid, 'bad-id']);
    expect(result.length).toBe(2);
    expect(result.every((n) => typeof n === 'string')).toBe(true);
  });
});

describe('config/permissionMapping - getPermissionByModule / ByAction', () => {
  it('按模块筛选（每个 IAM 有 5 个操作）', () => {
    const perms = getPermissionByModule(MODULES.IAM);
    expect(perms.length).toBe(ACTIONS.length);
    expect(perms.every((p) => p.module === MODULES.IAM)).toBe(true);
  });

  it('按 action 筛选（每个 admin 分布在所有模块）', () => {
    const perms = getPermissionByAction('admin');
    expect(perms.length).toBe(Object.values(MODULES).length);
    expect(perms.every((p) => p.action === 'admin')).toBe(true);
  });
});

describe('config/permissionMapping - 聚合常量', () => {
  it('ALL_ADMIN_PERMISSIONS 每个模块一个 admin 权限', () => {
    expect(ALL_ADMIN_PERMISSIONS.length).toBe(Object.values(MODULES).length);
  });

  it('IAM_ADMIN_PERMISSION_ID 对应 iam:admin', () => {
    expect(mapPermissionIdToName(IAM_ADMIN_PERMISSION_ID)).toBe('iam:admin');
  });

  it('DEFAULT_ROLE_PERMISSIONS 有 4 种角色 ADMIN/MANAGER/USER/GUEST', () => {
    expect(Array.isArray(DEFAULT_ROLE_PERMISSIONS.ADMIN)).toBe(true);
    expect(Array.isArray(DEFAULT_ROLE_PERMISSIONS.MANAGER)).toBe(true);
    expect(Array.isArray(DEFAULT_ROLE_PERMISSIONS.USER)).toBe(true);
    expect(Array.isArray(DEFAULT_ROLE_PERMISSIONS.GUEST)).toBe(true);
    expect(DEFAULT_ROLE_PERMISSIONS.ADMIN.length).toBeGreaterThan(DEFAULT_ROLE_PERMISSIONS.USER.length);
  });
});

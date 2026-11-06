import { describe, it, expect } from 'vitest';
import { resolveCrudPermissionCodes } from '../crudPermissions';

describe('resolveCrudPermissionCodes（批 16）', () => {
  it('未声明任何权限时返回空对象 → 调用方跳过过滤（存量行为不变）', () => {
    expect(resolveCrudPermissionCodes({})).toEqual({
      create: undefined,
      edit: undefined,
      delete: undefined,
    });
  });

  it('schema 声明 permissionResource 时展开为三个真实细粒度码', () => {
    const r = resolveCrudPermissionCodes({ permissionResource: 'scm:purchase_order' });
    expect(r.create).toBe('scm:purchase_order:create');
    expect(r.edit).toBe('scm:purchase_order:update');
    expect(r.delete).toBe('scm:purchase_order:delete');
  });

  it('显式 props 覆盖 schema 前缀（细粒度优先）', () => {
    const r = resolveCrudPermissionCodes({
      permissionResource: 'scm:purchase_order',
      createPermission: 'scm:purchase_requisition:create',
    });
    expect(r.create).toBe('scm:purchase_requisition:create');
    // 未显式覆盖的仍走 schema 前缀
    expect(r.edit).toBe('scm:purchase_order:update');
    expect(r.delete).toBe('scm:purchase_order:delete');
  });

  it('仅传 writePermission 总闸时三入口共用同一码（批 14 语义保持）', () => {
    const r = resolveCrudPermissionCodes({ writePermission: 'mes:work_order:write' });
    expect(r.create).toBe('mes:work_order:write');
    expect(r.edit).toBe('mes:work_order:write');
    expect(r.delete).toBe('mes:work_order:write');
  });

  it('writePermission 与 schema 前缀并存时，前缀展开优先于总闸', () => {
    const r = resolveCrudPermissionCodes({
      permissionResource: 'mes:work_order',
      writePermission: 'mes:write',
    });
    expect(r.create).toBe('mes:work_order:create');
    expect(r.delete).toBe('mes:work_order:delete');
  });

  it('细粒度 props 单独传时其余入口回落到 writePermission', () => {
    const r = resolveCrudPermissionCodes({
      writePermission: 'scm:write',
      deletePermission: 'scm:supplier:delete',
    });
    expect(r.create).toBe('scm:write');
    expect(r.edit).toBe('scm:write');
    expect(r.delete).toBe('scm:supplier:delete');
  });
});

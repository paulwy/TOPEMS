import { describe, it, expect } from 'vitest';
import { hasPermission } from '../permissions';

/**
 * 批 15：三段码判定专项用例
 *
 * 用例中的角色权限集取自 `public.core_role_permissions` 实测授权（20 角色 / 2760 条）：
 * - employee 在 mes 仅持有 1 个码（mes:dashboard:read），在 mes 共 93 个码中缺 92 个；
 * - mes_manager 持有 mes 91/93；
 * - admin 持 974 条 + 28 个 `*:admin`；superadmin 持 998 条 + `all` 语义。
 */
describe('hasPermission 三段码精确判定（批 15）', () => {
  it('同模块 create 不再放行 delete（原缺陷）', () => {
    expect(hasPermission(['scm:contract:create'], 'scm:contract:delete')).toBe(false);
    expect(hasPermission(['scm:contract:create'], 'scm:contract:create')).toBe(true);
  });

  it('employee 仅持 mes 读码时，看不到 mes 写入口', () => {
    const employee = ['mes:dashboard:read', 'wms:dashboard:read', 'hrm:self:read'];
    expect(hasPermission(employee, 'mes:work_order:create')).toBe(false);
    expect(hasPermission(employee, 'mes:equipment:delete')).toBe(false);
    expect(hasPermission(employee, 'mes:dashboard:read')).toBe(true);
  });

  it('write 聚合码覆盖 create/update/delete，反向不成立', () => {
    const manager = ['mes:work_order:write'];
    expect(hasPermission(manager, 'mes:work_order:create')).toBe(true);
    expect(hasPermission(manager, 'mes:work_order:update')).toBe(true);
    expect(hasPermission(manager, 'mes:work_order:delete')).toBe(true);
    // 反向：细粒度码不推出 write
    expect(hasPermission(['mes:work_order:create'], 'mes:work_order:write')).toBe(false);
  });

  it('资源级 admin 通配放行该资源下全部动作', () => {
    expect(hasPermission(['scm:contract:admin'], 'scm:contract:delete')).toBe(true);
    expect(hasPermission(['scm:contract:admin'], 'scm:contract:create')).toBe(true);
    // 不越资源
    expect(hasPermission(['scm:contract:admin'], 'scm:supplier:delete')).toBe(false);
  });

  it('模块级 admin 通配放行该模块全部动作', () => {
    expect(hasPermission(['mes:admin'], 'mes:equipment:delete')).toBe(true);
    expect(hasPermission(['mes:admin'], 'mes:work_order:write')).toBe(true);
    expect(hasPermission(['mes:admin'], 'wms:inbound:create')).toBe(false);
  });

  it('管理员不被误锁：superadmin(all) 与 admin 实测集', () => {
    expect(hasPermission(['all'], 'mes:work_order:delete')).toBe(true);
    // admin 角色实测：持有模块级 admin 码 + 大量细粒度码
    const admin = ['admin:dashboard:admin', 'mes:admin', 'iam:user:read', 'scm:contract:create'];
    expect(hasPermission(admin, 'mes:work_order:delete')).toBe(true);
    expect(hasPermission(admin, 'scm:contract:create')).toBe(true);
    expect(hasPermission(admin, 'scm:contract:delete')).toBe(false); // 未授予，正确收紧
  });

  it('admin ↔ iam 过渡期等价仍生效', () => {
    expect(hasPermission(['iam:user:read'], 'admin:user:read')).toBe(true);
    expect(hasPermission(['admin:user:read'], 'iam:user:read')).toBe(true);
  });

  it('基础设施模块与 iam 联动仍生效', () => {
    expect(hasPermission(['iam:notification:read'], 'notification:notification:read')).toBe(true);
    expect(hasPermission(['iam:dashboard:admin'], 'doc:document:delete')).toBe(true);
  });

  it('无任何相关权限时拒绝（不再 0>=0 恒真）', () => {
    expect(hasPermission([], 'scm:contract:delete')).toBe(false);
    expect(hasPermission(['crm:customer:read'], 'scm:contract:delete')).toBe(false);
  });

  it('四段码（admin:iam:tenant:write）按资源级路径判定，write 聚合同样生效', () => {
    expect(hasPermission(['admin:iam:tenant:write'], 'admin:iam:tenant:write')).toBe(true);
    // write = 全写，覆盖 delete（四段与三段同规则）
    expect(hasPermission(['admin:iam:tenant:write'], 'admin:iam:tenant:delete')).toBe(true);
    // 但不覆盖读，也不越模块
    expect(hasPermission(['admin:iam:tenant:write'], 'admin:iam:tenant:read')).toBe(false);
    expect(hasPermission(['admin:iam:tenant:write'], 'admin:tenant:delete')).toBe(false);
  });

  it('二段码仍保留等级继承语义（未受影响）', () => {
    expect(hasPermission(['mes:admin'], 'mes:read')).toBe(true);
    expect(hasPermission(['mes:read'], 'mes:delete')).toBe(false);
  });
});

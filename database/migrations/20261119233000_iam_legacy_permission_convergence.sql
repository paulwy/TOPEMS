-- IAM 权限码收敛：把 2026-06 初始导入遗留的 43 条扁平码清出库，并补种 2 条仍被运行期校验引用的字典码。
--
-- 背景（TODO §1.A A8）：
--   生产/本地 core_permissions 里有一批码从未出现在任何迁移中。溯源结论：
--   * 来源 = 2026-06-18 / 06-21 的初始数据库导入（现存于
--     database/backup/p5_20261106/public_iam_core.sql），早于「迁移是唯一源」纪律；
--   * 不是运行期插入（scripts/ci/check-no-runtime-permission-insert.mjs 已在守）；
--   * 这批码是旧命名（attendance_read / doc:documents_read / pm:projects_read /
--     iam:users_read ...），已被 hrm:attendance:read 等新命名取代。
--
-- 处置分两类：
--   1) 仍被 Rust 运行期 has_permission 引用的：iam:dictionaries_read /
--      iam:dictionaries_update（svc/erp/src/modules/dict.rs:89/118/147）。
--      这两条在干净库上缺失会让非超管的字典接口直接 403 —— 补种进迁移；
--   2) 其余 43 条：svc 与 apps/web/src 全仓引用 = 0、core_role_permissions 授权 = 0，
--      属纯遗留噪声，删除（保留迁移可重放的一致性）。
--
-- 幂等：补种按 code 去重；删除前二次确认无角色授权引用（FK 仅 core_role_permissions）。

INSERT INTO public.core_permissions (code, name, description, resource, action, level)
SELECT v.code, v.name, v.description, v.resource, v.action, 1
FROM (
    VALUES
        ('iam:dictionaries_read', '字典读取', 'IAM 字典表读取（ERP 字典接口校验用）', 'iam', 'dictionaries_read'),
        ('iam:dictionaries_update', '字典更新', 'IAM 字典表维护（ERP 字典接口校验用）', 'iam', 'dictionaries_update')
) AS v(code, name, description, resource, action)
WHERE NOT EXISTS (
    SELECT 1 FROM public.core_permissions p WHERE p.code = v.code
);

-- 先解除角色授权引用（这些码在运行期没有任何 has_permission 判定，
-- 授权本身是空转；保留授权会让 core_role_permissions 指向即将删除的行）。

-- destructive-gate: allow
-- destructive-kind: DELETE
-- destructive-reason: 清理 44 条遗留权限码的空转角色授权（生产实测 0 行，出现非 0 即拒绝）
-- destructive-owner: iam
-- destructive-ticket: IAM-PERM-20261119
-- destructive-expires: 2027-05-10
-- destructive-max-rows: 0
-- destructive-backup: 窗口前超户 pg_dump -t public.core_permissions -t public.core_role_permissions
DELETE FROM public.core_role_permissions rp
USING public.core_permissions p
WHERE rp.permission_id = p.id
  AND p.code IN (
    'attendance_read',
    'attendance_write',
    'company_read',
    'company_write',
    'department_read',
    'department_write',
    'doc:documents_create',
    'doc:documents_delete',
    'doc:documents_read',
    'doc:documents_update',
    'employee_read',
    'employee_write',
    'iam:audit_read',
    'iam:permissions_read',
    'iam:permissions_update',
    'iam:plugins_read',
    'iam:plugins_update',
    'iam:roles_create',
    'iam:roles_delete',
    'iam:roles_read',
    'iam:roles_update',
    'iam:system_export',
    'iam:system_logs',
    'iam:system_monitor',
    'iam:system_read',
    'iam:system_settings',
    'iam:system_update',
    'iam:users_create',
    'iam:users_delete',
    'iam:users_update',
    'leave_read',
    'leave_write',
    'payroll_read',
    'payroll_write',
    'performance_read',
    'performance_write',
    'pm:projects_create',
    'pm:projects_delete',
    'pm:projects_read',
    'pm:projects_update',
    'workflow:workflows_create',
    'workflow:workflows_delete',
    'workflow:workflows_read',
    'workflow:workflows_update'
);

-- destructive-gate: allow
-- destructive-kind: DELETE
-- destructive-reason: 删除 44 条 2026-06 初始导入遗留、全仓零引用的扁平权限码（生产实测 0 行，出现非 0 即拒绝）
-- destructive-owner: iam
-- destructive-ticket: IAM-PERM-20261119
-- destructive-expires: 2027-05-10
-- destructive-max-rows: 0
-- destructive-backup: 窗口前超户 pg_dump -t public.core_permissions -t public.core_role_permissions
DELETE FROM public.core_permissions p
WHERE p.code IN (
    'attendance_read',
    'attendance_write',
    'company_read',
    'company_write',
    'department_read',
    'department_write',
    'doc:documents_create',
    'doc:documents_delete',
    'doc:documents_read',
    'doc:documents_update',
    'employee_read',
    'employee_write',
    'iam:audit_read',
    'iam:permissions_read',
    'iam:permissions_update',
    'iam:plugins_read',
    'iam:plugins_update',
    'iam:roles_create',
    'iam:roles_delete',
    'iam:roles_read',
    'iam:roles_update',
    'iam:system_export',
    'iam:system_logs',
    'iam:system_monitor',
    'iam:system_read',
    'iam:system_settings',
    'iam:system_update',
    'iam:users_create',
    'iam:users_delete',
    'iam:users_update',
    'leave_read',
    'leave_write',
    'payroll_read',
    'payroll_write',
    'performance_read',
    'performance_write',
    'pm:projects_create',
    'pm:projects_delete',
    'pm:projects_read',
    'pm:projects_update',
    'workflow:workflows_create',
    'workflow:workflows_delete',
    'workflow:workflows_read',
    'workflow:workflows_update'
);

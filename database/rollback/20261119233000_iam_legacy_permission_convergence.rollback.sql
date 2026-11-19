-- 回滚：20261119233000_iam_legacy_permission_convergence.sql
--
-- 性质：本迁移删除了 44 条 2026-06 初始导入遗留的扁平权限码及其角色授权。
--   这些码在 svc / apps/web/src 中没有任何 has_permission 判定（空转授权），
--   删除属数据清理，不影响任何鉴权路径。
--
-- 回滚能力边界（如实声明）：
--   * 权限码行：可完整恢复（下方按迁移前实测值重放，幂等）；
--   * 角色授权行：不可自动恢复（原授权关系记录在
--     database/backup/p5_20261106/public_iam_core.sql 的历史快照里，
--     如需按原样恢复，应从该备份按 role_id 重建；本回滚不臆造授权）。
--
-- 用途：仅在确认需要恢复旧码（例如旧客户端仍按扁平码申请权限）时手工执行。

INSERT INTO public.core_permissions (code, name, resource, action, level)
SELECT v.code, v.name, v.resource, v.action, v.level
FROM (
    VALUES
    ('attendance_read', '读取考勤', 'attendance', 'read', 1),
    ('attendance_write', '写入考勤', 'attendance', 'write', 1),
    ('company_read', '读取公司', 'company', 'read', 1),
    ('company_write', '写入公司', 'company', 'write', 1),
    ('department_read', '读取部门', 'department', 'read', 1),
    ('department_write', '写入部门', 'department', 'write', 1),
    ('doc:documents_create', '创建文档', 'documents', 'create', 1),
    ('doc:documents_delete', '删除文档', 'documents', 'delete', 1),
    ('doc:documents_read', '读取文档', 'documents', 'read', 1),
    ('doc:documents_update', '更新文档', 'documents', 'update', 1),
    ('employee_read', '读取员工', 'employee', 'read', 1),
    ('employee_write', '写入员工', 'employee', 'write', 1),
    ('iam:audit_read', '读取审计日志', 'audit', 'read', 1),
    ('iam:permissions_read', '读取权限', 'permissions', 'read', 1),
    ('iam:permissions_update', '更新权限', 'permissions', 'update', 1),
    ('iam:plugins_read', '插件读取', 'plugins', 'read', 1),
    ('iam:plugins_update', '插件更新', 'plugins', 'update', 1),
    ('iam:roles_create', '创建角色', 'roles', 'create', 1),
    ('iam:roles_delete', '删除角色', 'roles', 'delete', 1),
    ('iam:roles_read', '读取角色', 'roles', 'read', 1),
    ('iam:roles_update', '更新角色', 'roles', 'update', 1),
    ('iam:system_export', '数据导出', 'system', 'export', 1),
    ('iam:system_logs', '查看日志', 'system', 'logs', 1),
    ('iam:system_monitor', '系统监控', 'system', 'monitor', 1),
    ('iam:system_read', '系统设置读取', 'system', 'read', 1),
    ('iam:system_settings', '系统设置', 'system', 'settings', 1),
    ('iam:system_update', '系统设置更新', 'system', 'update', 1),
    ('iam:users_create', '创建用户', 'users', 'create', 1),
    ('iam:users_delete', '删除用户', 'users', 'delete', 1),
    ('iam:users_update', '更新用户', 'users', 'update', 1),
    ('leave_read', '读取请假', 'leave', 'read', 1),
    ('leave_write', '写入请假', 'leave', 'write', 1),
    ('payroll_read', '读取薪资', 'payroll', 'read', 1),
    ('payroll_write', '写入薪资', 'payroll', 'write', 1),
    ('performance_read', '读取绩效', 'performance', 'read', 1),
    ('performance_write', '写入绩效', 'performance', 'write', 1),
    ('pm:projects_create', '创建项目', 'projects', 'create', 1),
    ('pm:projects_delete', '删除项目', 'projects', 'delete', 1),
    ('pm:projects_read', '读取项目', 'projects', 'read', 1),
    ('pm:projects_update', '更新项目', 'projects', 'update', 1),
    ('workflow:workflows_create', '创建工作流', 'workflows', 'create', 1),
    ('workflow:workflows_delete', '删除工作流', 'workflows', 'delete', 1),
    ('workflow:workflows_read', '读取工作流', 'workflows', 'read', 1),
    ('workflow:workflows_update', '更新工作流', 'workflows', 'update', 1)
) AS v(code, name, resource, action, level)
WHERE NOT EXISTS (
    SELECT 1 FROM public.core_permissions p WHERE p.code = v.code
);

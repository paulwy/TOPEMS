-- ============================================================================
-- database/seeds/default_roles.sql
--
-- 默认角色 seed（3 个系统内置角色）
--
-- 角色说明：
--   super_admin  超级管理员 - 所有权限（is_system=true）
--   dept_manager 部门经理   - 本部门数据管理权限
--   employee     普通员工   - 基础查看权限
--
-- 幂等性：
--   按 code 做 UPSERT。历史版本曾把 employee / dept_manager 写成无模块前缀的
--   旧权限码（如 self:read / attendance:apply / payroll:read），重复执行本文件
--   会以当前已定义的三段码覆盖，修正历史行，不再产生空引用。
--
-- employee 旧码处置结论（历史命名漂移，非漏定义）：
--   self:read            -> 自助端点本身 auth-only，不再使用伪码；保留 hrm:read
--   self:write           -> 同上，自助写操作 auth-only
--   attendance:read      -> hrm:attendance:read（补 hrm 模块前缀）
--   attendance:apply     -> 自助打卡/申请为 auth-only；保留 hrm:attendance:read 查看
--   attendance:approve   -> 审批属管理动作，普通员工不授予（dept_manager 侧管理）
--   leave:apply          -> 自助请假为 auth-only；保留 hrm:leave:read 查看
--   payroll:read         -> hrm:payroll:read（补 hrm 模块前缀）
--   recruitment:read     -> hrm:recruitment:read（普通员工不自助招聘，故不授予）
--   recruitment:write    -> 同上，普通员工不授予
--
-- 用法：
--   psql -U topems_prod -d topems_prod -f database/seeds/default_roles.sql
-- ============================================================================

-- ── 超级管理员 ──
INSERT INTO iam.roles (id, code, name, description, permissions, is_system, status, created_at, updated_at) VALUES
('33333333-3333-3333-3333-333333333001', 'super_admin', '超级管理员', '拥有系统全部权限，可管理所有模块和用户',
 '["*"]'::jsonb,
 true, 'active', NOW(), NOW())
ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    permissions = EXCLUDED.permissions,
    is_system = EXCLUDED.is_system,
    status = EXCLUDED.status,
    updated_at = NOW();

-- ── 部门经理 ──
-- 旧版无模块前缀码（attendance:read / recruitment:write 等）在 core_permissions 中不存在，
-- 统一改为已定义的三段码；自助端点本身 auth-only，不再使用 self:* 伪码。
-- 注意：hrm:attendance:create/update/delete 已在批 25 权限收敛中删除，
-- 审批动作以 hrm:leave:update 表达，避免再次产生空引用。
INSERT INTO iam.roles (id, code, name, description, permissions, is_system, status, created_at, updated_at) VALUES
('33333333-3333-3333-3333-333333333002', 'dept_manager', '部门经理', '管理本部门员工、审批本部门业务流程',
 '["hrm:read", "hrm:write", "hrm:attendance:read", "hrm:leave:read", "hrm:leave:update", "hrm:recruitment:read", "hrm:recruitment:create", "hrm:recruitment:update"]'::jsonb,
 true, 'active', NOW(), NOW())
ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    permissions = EXCLUDED.permissions,
    is_system = EXCLUDED.is_system,
    status = EXCLUDED.status,
    updated_at = NOW();

-- ── 普通员工 ──
INSERT INTO iam.roles (id, code, name, description, permissions, is_system, status, created_at, updated_at) VALUES
('33333333-3333-3333-3333-333333333003', 'employee', '普通员工', '基础自助权限：查看个人信息、申请请假、查看工资条',
 '["hrm:read", "hrm:dashboard:read", "hrm:employee:read", "hrm:attendance:read", "hrm:leave:read", "hrm:payroll:read"]'::jsonb,
 true, 'active', NOW(), NOW())
ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    permissions = EXCLUDED.permissions,
    is_system = EXCLUDED.is_system,
    status = EXCLUDED.status,
    updated_at = NOW();

-- ── 把 admin 用户关联到超级管理员角色 ──
UPDATE iam.users
SET role_id = '33333333-3333-3333-3333-333333333001',
    updated_at = NOW()
WHERE username = 'admin';

-- ── 空引用校验：系统角色的权限码必须全部存在于 core_permissions ──
-- 仅校验非通配码；core_permissions 不存在时（纯初始化早期阶段）跳过。
DO $$
DECLARE
    missing TEXT;
BEGIN
    IF to_regclass('public.core_permissions') IS NULL THEN
        RAISE NOTICE 'core_permissions 不存在，跳过角色权限码校验';
        RETURN;
    END IF;

    SELECT string_agg(DISTINCT t.code, ', ' ORDER BY t.code)
    INTO missing
    FROM (
        SELECT jsonb_array_elements_text(permissions) AS code
        FROM iam.roles
        WHERE code IN ('dept_manager', 'employee')
          AND deleted_at IS NULL
    ) AS t
    WHERE t.code <> '*'
      AND NOT EXISTS (
          SELECT 1 FROM public.core_permissions p WHERE p.code = t.code
      );

    IF missing IS NOT NULL THEN
        RAISE EXCEPTION '默认角色引用了未定义的权限码: %', missing;
    END IF;

    RAISE NOTICE '默认角色权限码校验通过';
END $$;

-- 验证
SELECT code, name, is_system, jsonb_array_length(permissions) AS perm_count
FROM iam.roles
WHERE deleted_at IS NULL
ORDER BY created_at;

SELECT username, role_id, is_superuser
FROM iam.users
WHERE username = 'admin';

-- ============================================================================
-- 20261108091000_iam_fix_employee_role_permission_codes.sql
--
-- 背景：iam.roles.employee 的 jsonb 权限码中，以下 9 个码在 public.core_permissions
--   中不存在（历史默认角色 seed 使用无模块前缀的旧命名）：
--     self:read / self:write / attendance:read / attendance:apply /
--     attendance:approve / leave:apply / payroll:read /
--     recruitment:read / recruitment:write
--
-- 结论：历史命名漂移 + 自助伪码，不存在"漏定义"，因此不新增任何权限码。
--   attendance:read        -> hrm:attendance:read（补模块前缀）
--   payroll:read           -> hrm:payroll:read（补模块前缀）
--   recruitment:read       -> hrm:recruitment:read（补模块前缀；普通员工不授予）
--   recruitment:write      -> hrm:recruitment:create / hrm:recruitment:update（无 write 伞码；普通员工不授予）
--   self:read / self:write -> 自助端点（个人信息/工资条等）本身 auth-only，无对应码
--   attendance:apply       -> 自助打卡 auth-only；hrm:attendance:create 已在批 25 删除，不可映射
--   attendance:approve     -> 无独立考勤审批码，普通员工不授予
--   leave:apply            -> 自助请假 auth-only；hrm:leave:create 属管理侧代录，不用于自助申请
--
-- 处置：employee 收敛为 6 个已存在的只读码，保证无空引用：
--   hrm:read / hrm:dashboard:read / hrm:employee:read /
--   hrm:attendance:read / hrm:leave:read / hrm:payroll:read
--
-- 幂等：仅当 employee 仍持有旧码时才 UPDATE；二次执行为 0 行。
-- 边界：不改 core_permissions、不造码、不改历史迁移。
-- ============================================================================

DO $do$
DECLARE
    legacy_codes CONSTANT TEXT[] := ARRAY[
        'self:read', 'self:write',
        'attendance:read', 'attendance:apply', 'attendance:approve',
        'leave:apply', 'payroll:read',
        'recruitment:read', 'recruitment:write'
    ];
    canonical_perms CONSTANT JSONB := '[
        "hrm:read",
        "hrm:dashboard:read",
        "hrm:employee:read",
        "hrm:attendance:read",
        "hrm:leave:read",
        "hrm:payroll:read"
    ]'::jsonb;
    missing TEXT;
BEGIN
    -- 纯初始化早期阶段（iam.roles 或 core_permissions 尚不存在）跳过。
    IF to_regclass('iam.roles') IS NULL
       OR to_regclass('public.core_permissions') IS NULL THEN
        RAISE NOTICE 'iam.roles / core_permissions 不存在，跳过 employee 权限码修复';
        RETURN;
    END IF;

    -- 前置断言：目标 6 个码必须真实存在于 core_permissions，避免修完仍空引用。
    SELECT string_agg(DISTINCT c, ', ' ORDER BY c)
    INTO missing
    FROM jsonb_array_elements_text(canonical_perms) AS c
    WHERE NOT EXISTS (
        SELECT 1 FROM public.core_permissions p
        WHERE p.code = c AND p.deleted_at IS NULL
    );

    IF missing IS NOT NULL THEN
        RAISE EXCEPTION 'employee 目标权限码在 core_permissions 中缺失，拒绝修复: %', missing;
    END IF;

    -- 仅替换仍持有旧码的 employee 行，避免覆盖自定义配置。
    UPDATE iam.roles
    SET permissions = canonical_perms,
        updated_at = NOW()
    WHERE code = 'employee'
      AND deleted_at IS NULL
      AND permissions ?| legacy_codes;

    -- 后置断言：employee 行内不允许残留任何未定义的权限码。
    SELECT string_agg(DISTINCT c, ', ' ORDER BY c)
    INTO missing
    FROM iam.roles r
    CROSS JOIN LATERAL jsonb_array_elements_text(r.permissions) AS c
    WHERE r.code = 'employee'
      AND r.deleted_at IS NULL
      AND NOT EXISTS (
          SELECT 1 FROM public.core_permissions p
          WHERE p.code = c AND p.deleted_at IS NULL
      );

    IF missing IS NOT NULL THEN
        RAISE EXCEPTION 'employee 仍存在空引用权限码: %', missing;
    END IF;

    RAISE NOTICE 'employee 权限码修复完成（6 个已定义码，无空引用）';
END $do$;

-- P1 修正（2026-11-08）：core_user_company_scopes 表所有权归位
--
-- 背景：
--   20261108130000 以迁移执行账号（生产为 xingzhai）创建本表，表 owner 即执行账号；
--   服务运行账号 topems_prod 没有任何表级权限，导致
--   GET /iam/users/{id}/company-scopes 返回 500：
--     permission denied for table core_user_company_scopes
--   历史同类表（core_roles / core_role_permissions / core_tenant_users）
--   owner 均为 topems_prod，本迁移对齐该既有口径。
--
-- 为什么改 owner 而不是只 GRANT：
--   本表 ENABLE ROW LEVEL SECURITY（不 FORCE），与 core_roles 同口径；owner 绕过策略。
--   仅 GRANT 会让 topems_prod 成为非 owner，策略要求 app.tenant_id 与会话匹配，
--   服务端未设置该 GUC 时查询会被过滤为空，等于功能不可用。
--
-- 幂等：
--   - 表不存在（未应用 P1）→ NOTICE 跳过；
--   - 服务角色不存在 → NOTICE 跳过；
--   - 已归位后重复执行为 no-op（OWNER 设置幂等）。
--   生产环境执行账号为 superuser 且是 topems_prod 成员，具备改 owner 权限。
--
-- ROLLBACK（仅生产）：
--   ALTER TABLE public.core_user_company_scopes OWNER TO xingzhai;

DO $$
DECLARE
    svc_role text;
BEGIN
    IF to_regclass('public.core_user_company_scopes') IS NULL THEN
        RAISE NOTICE 'P1 修正：core_user_company_scopes 不存在，跳过 owner 归位';
        RETURN;
    END IF;

    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'topems_prod') THEN
        svc_role := 'topems_prod';
    ELSIF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'topems_app') THEN
        svc_role := 'topems_app';
    ELSE
        RAISE NOTICE 'P1 修正：未找到服务运行角色（topems_prod/topems_app），跳过';
        RETURN;
    END IF;

    EXECUTE format('ALTER TABLE public.core_user_company_scopes OWNER TO %I', svc_role);
    RAISE NOTICE 'P1 修正：core_user_company_scopes owner -> %', svc_role;

    IF svc_role <> 'topems_app'
       AND EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'topems_app') THEN
        GRANT SELECT, INSERT, UPDATE, DELETE
            ON public.core_user_company_scopes TO topems_app;
    END IF;
END $$;

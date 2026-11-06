-- ============================================================
-- 认证表 RLS：兑现「全 0 = 系统上下文」分支（方案 B）
-- 版本：20261107000015
--
-- 背景：refresh / logout 请求无 JWT，中间件不设置连接租户上下文。原实现以
--   set_config('app.tenant_id', '00000000-0000-0000-0000-000000000000', true)
--   后直接查询 public.core_refresh_tokens。但这两张表的 tenant_isolation 策略
--   只有「真实租户 = tenant_id」一条分支（见 20261102210000 的最新定义）：
--     tenant_id = COALESCE((NULLIF(current_setting('app.tenant_id', true), ''))::uuid,
--                          '00000000-0000-0000-0000-000000000001'::uuid)
--   全 0 上下文因此恒为 0 行：refresh 每轮返回 401 触发前端自动登出；
--   logout 也从未写入 revoked_at。方案 C 用 SECURITY DEFINER 函数绕过 RLS，
--   现回退为直接查表，故本迁移补上「全 0 = 系统上下文」分支。
--
-- 策略语义（与代码 auth.rs 的全 0 set_config 对齐）：
--   tenant_id = COALESCE((NULLIF(current_setting('app.tenant_id', true), ''))::uuid,
--                        '00000000-0000-0000-0000-000000000001'::uuid)
--   OR (NULLIF(current_setting('app.tenant_id', true), ''))::uuid
--      = '00000000-0000-0000-0000-000000000000'::uuid
--   即：真实租户上下文行为不变（只看本租户行）；全 0 上下文可看全部租户行。
--
-- ⚠️ 影响范围与风险（仅限以下两张认证表，禁止扩散到任何业务表）：
--   1) public.core_refresh_tokens —— 会话令牌表，不含业务数据；全 0 仅由
--      refresh / logout 两条认证路径使用，用于按 token_hash 定位令牌归属。
--   2) public.core_sessions —— 同样只存会话令牌哈希与有效期；全 0 用于
--      logout 清理会话前的归属判定。
--   全 0 分支会让该表对全 0 上下文可见**全部租户的行**。业务表必须保持严格
--   租户隔离，不得复制本文件的 OR 分支。
--
-- 幂等：表 / 策略存在性守卫（to_regclass + pg_policies）+ DROP POLICY IF EXISTS
--   + CREATE POLICY；重复执行结果一致（表达式不变）。
-- down（手工执行，仅回退分支，不删策略）：
--   ALTER POLICY core_refresh_tokens_tenant_isolation ON public.core_refresh_tokens
--     USING (tenant_id = COALESCE((NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid,
--                                 '00000000-0000-0000-0000-000000000001'::uuid));
--   ALTER POLICY core_sessions_tenant_isolation ON public.core_sessions
--     USING (tenant_id = COALESCE((NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid,
--                                 '00000000-0000-0000-0000-000000000001'::uuid));
-- ============================================================

SET lock_timeout = '5s';

-- ------------------------------------------------------------
-- 1) public.core_refresh_tokens
-- ------------------------------------------------------------
DO $do$
BEGIN
    IF to_regclass('public.core_refresh_tokens') IS NULL THEN
        RAISE NOTICE 'public.core_refresh_tokens 不存在，跳过策略补丁';
        RETURN;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'core_refresh_tokens'
          AND policyname = 'core_refresh_tokens_tenant_isolation'
    ) THEN
        RAISE NOTICE 'core_refresh_tokens_tenant_isolation 不存在，跳过（不新建策略）';
        RETURN;
    END IF;

    EXECUTE $sql$
        DROP POLICY IF EXISTS core_refresh_tokens_tenant_isolation
            ON public.core_refresh_tokens
    $sql$;

    EXECUTE $sql$
        CREATE POLICY core_refresh_tokens_tenant_isolation
            ON public.core_refresh_tokens
        USING (
            tenant_id = COALESCE(
                (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid,
                '00000000-0000-0000-0000-000000000001'::uuid
            )
            OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid
               = '00000000-0000-0000-0000-000000000000'::uuid
        )
    $sql$;
END
$do$;

-- ------------------------------------------------------------
-- 2) public.core_sessions
-- ------------------------------------------------------------
DO $do$
BEGIN
    IF to_regclass('public.core_sessions') IS NULL THEN
        RAISE NOTICE 'public.core_sessions 不存在，跳过策略补丁';
        RETURN;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'core_sessions'
          AND policyname = 'core_sessions_tenant_isolation'
    ) THEN
        RAISE NOTICE 'core_sessions_tenant_isolation 不存在，跳过（不新建策略）';
        RETURN;
    END IF;

    EXECUTE $sql$
        DROP POLICY IF EXISTS core_sessions_tenant_isolation
            ON public.core_sessions
    $sql$;

    EXECUTE $sql$
        CREATE POLICY core_sessions_tenant_isolation
            ON public.core_sessions
        USING (
            tenant_id = COALESCE(
                (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid,
                '00000000-0000-0000-0000-000000000001'::uuid
            )
            OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid
               = '00000000-0000-0000-0000-000000000000'::uuid
        )
    $sql$;
END
$do$;

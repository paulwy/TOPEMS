-- ============================================================
-- IAM refresh / logout 特权读取与吊销（方案 C：基础设施层特权路径）
--
-- 缺陷来源：svc/unified-core/src/modules/iam/auth.rs 的 refresh_token() 与 logout()
--   在无 JWT 上下文的请求里，用 set_config('app.tenant_id',
--   '00000000-0000-0000-0000-000000000000') 后直接查询 public.core_refresh_tokens。
--
-- 实测（2026-11-05，只读核对 topems 库）：
--   public.core_refresh_tokens / public.core_sessions
--     owner = topems（rolsuper=t，rolbypassrls=f）
--     relrowsecurity = t，relforcerowsecurity = f（owner 执行时可绕过 RLS）
--     策略 core_refresh_tokens_tenant_isolation / core_sessions_tenant_isolation：
--       tenant_id = COALESCE((NULLIF(current_setting('app.tenant_id', true), ''))::uuid,
--                            '00000000-0000-0000-0000-000000000001'::uuid)
--   策略没有「全 0 = 管理分支」，因此全 0 上下文看不到任何行：
--     应用角色 topems_app（rolsuper=f，rolbypassrls=f）实测可见 0 行；
--     表 owner / superuser 可见 25 行（全部 revoked_at IS NULL 且未过期）。
--   → refresh 命中 0 行返回 401（前端清 token 跳登录）；logout 命中 0 行，
--     revoked_at 从未落库。
--
-- 处置：以表 owner（topems）为 owner 创建 SECURITY DEFINER 函数（固定 search_path），
--   只授予应用连接角色 topems_app 的 EXECUTE，函数内以 owner 权限运行，
--   天然绕过 RLS（relforcerowsecurity=false），不依赖请求侧的租户 GUC。
--
-- 影响面：仅新增两个函数与授权，不改表结构、不改数据、不动既有 RLS 策略。
-- 幂等：CREATE OR REPLACE + 重复 REVOKE/GRANT，可重复执行。
-- 回滚（down，手工执行，本目录不新增 .down.sql 以免与迁移版本号冲突）：
--   DROP FUNCTION IF EXISTS public.iam_refresh_token_lookup(text);
--   DROP FUNCTION IF EXISTS public.iam_refresh_token_revoke(text);
-- 说明：回滚为纯 DROP，无数据丢失；回滚后 refresh/logout 会退回旧语义
--   （无租户上下文时仍看不到 core_refresh_tokens，401 / 不吊销）。
-- ============================================================

SET lock_timeout = '5s';

-- ------------------------------------------------------------
-- 1) refresh：按 token_hash 读取令牌行 + 用户资料 + 角色/权限
--    - 输出列覆盖 refresh 流程所需字段（id 即原 rt.id / 旧代码的 refresh_token_id 读取位，
--      调用侧按 id 读取），并额外返回租户/有效期/吊销时间以便断言。
--    - 固定 search_path = pg_catalog, public；表名全部 schema 限定，无动态 SQL。
--    - 参数非空/长度校验：空或超长直接返回空结果集（调用侧维持 401 语义）。
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.iam_refresh_token_lookup(p_token_hash text)
RETURNS TABLE (
    id uuid,
    tenant_id uuid,
    user_id uuid,
    token_hash text,
    expires_at timestamptz,
    revoked_at timestamptz,
    username text,
    email text,
    is_active boolean,
    is_superuser boolean,
    must_change_password boolean,
    roles text[],
    permissions text[]
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
BEGIN
    -- 校验：NULL / 空白 / 超过 token_hash varchar(255) 的长度一律不命中
    IF p_token_hash IS NULL
       OR btrim(p_token_hash) = ''
       OR length(p_token_hash) > 255 THEN
        RETURN;
    END IF;

    RETURN QUERY
    SELECT
        rt.id,
        rt.tenant_id,
        rt.user_id,
        rt.token_hash::text,
        rt.expires_at,
        rt.revoked_at,
        u.username::text,
        u.email::text,
        (u.status = 'active') AS is_active,
        u.is_superuser,
        COALESCE(u.must_change_password, false) AS must_change_password,
        COALESCE((
            SELECT array_agg(DISTINCT r.name::text)
            FROM public.core_user_roles ur
            JOIN public.core_roles r ON r.id = ur.role_id
            WHERE ur.user_id = u.id
        ), '{}'::text[]) AS roles,
        COALESCE((
            SELECT array_agg(DISTINCT p.code::text)
            FROM public.core_user_roles ur
            JOIN public.core_role_permissions rp ON rp.role_id = ur.role_id
            JOIN public.core_permissions p ON p.id = rp.permission_id
            WHERE ur.user_id = u.id
        ), '{}'::text[]) AS permissions
    FROM public.core_refresh_tokens rt
    JOIN iam.users u ON rt.user_id = u.id
    WHERE rt.token_hash = p_token_hash
      AND rt.expires_at > NOW()
      AND rt.revoked_at IS NULL;
END;
$$;

COMMENT ON FUNCTION public.iam_refresh_token_lookup(text) IS
    'IAM refresh 令牌特权查询（SECURITY DEFINER，绕过 core_refresh_tokens RLS；仅授予服务端应用角色）';

-- ------------------------------------------------------------
-- 2) logout：按 token_hash 真正写入 revoked_at
--    - 返回 true = 本次确实吊销（原 revoked_at IS NULL 的行被更新）
--    - 返回 false = 参数非法 / 未命中（已吊销、已删除或 hash 不匹配），调用侧幂等处理
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.iam_refresh_token_revoke(p_token_hash text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
    v_rows integer;
BEGIN
    IF p_token_hash IS NULL
       OR btrim(p_token_hash) = ''
       OR length(p_token_hash) > 255 THEN
        RETURN false;
    END IF;

    UPDATE public.core_refresh_tokens
       SET revoked_at = NOW(),
           revoked_reason = 'logout'
     WHERE token_hash = p_token_hash
       AND revoked_at IS NULL;

    GET DIAGNOSTICS v_rows = ROW_COUNT;
    RETURN v_rows > 0;
END;
$$;

COMMENT ON FUNCTION public.iam_refresh_token_revoke(text) IS
    'IAM logout 令牌特权吊销（SECURITY DEFINER，绕过 core_refresh_tokens RLS；仅授予服务端应用角色）';

-- ------------------------------------------------------------
-- 3) owner 固定为表 owner（topems）：其 relforcerowsecurity=false + superuser，
--    函数体内查询/更新可绕过 RLS。迁移通常以 topems（MIGRATE_URL）执行，
--    此处显式 ALTER 保证换执行角色时 owner 仍正确。
-- ------------------------------------------------------------
ALTER FUNCTION public.iam_refresh_token_lookup(text) OWNER TO topems;
ALTER FUNCTION public.iam_refresh_token_revoke(text) OWNER TO topems;

-- ------------------------------------------------------------
-- 4) 最小授权：撤销 PUBLIC 默认 EXECUTE，仅授予应用连接角色 topems_app
--    （.env.example 的 DATABASE_URL 连接角色即 topems_app）
-- ------------------------------------------------------------
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'topems_app') THEN
        RAISE EXCEPTION '角色 topems_app 不存在：无法授予 iam_refresh_token_* 的 EXECUTE';
    END IF;
END $$;

REVOKE ALL ON FUNCTION public.iam_refresh_token_lookup(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.iam_refresh_token_revoke(text) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.iam_refresh_token_lookup(text) TO topems_app;
GRANT EXECUTE ON FUNCTION public.iam_refresh_token_revoke(text) TO topems_app;

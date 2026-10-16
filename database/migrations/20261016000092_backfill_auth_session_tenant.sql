-- 回填 public.core_sessions / core_refresh_tokens 历史 NULL tenant_id
-- 背景：追补 auth.rs 登录/刷新流程 INSERT 绑定 tenant_id 之前（commit 前），46 行 session + 1638 行
--       refresh_token 凭证数据 tenant_id IS NULL；两表均有 tenant_id 列 + RLS FORCE，nil 分支放行
--       导致凭证行对任意租户上下文可见（批2-C 登记「会话租户后续处理」遗留项实锤，2026-10-16 追补）。
-- 口径：优先按 core_tenant_users 活跃映射取用户租户；关联不上的归主租户 0001（与 88/90 同口径兜底，
--       0001 租户行仅对 0001 上下文可见，比 NULL 全上下文可见更安全）。
-- 注：两表均有 RLS FORCE；UPDATE 前 SET app.tenant_id=nil（policy nil 分支放行，供迁移路径使用）。

SET app.tenant_id = '00000000-0000-0000-0000-000000000000';

UPDATE public.core_refresh_tokens r
   SET tenant_id = COALESCE(
       (SELECT t.tenant_id FROM public.core_tenant_users t
         WHERE t.user_id = r.user_id AND t.status = 'active' LIMIT 1),
       '00000000-0000-0000-0000-000000000001')
 WHERE r.tenant_id IS NULL;

UPDATE public.core_sessions s
   SET tenant_id = COALESCE(
       (SELECT t.tenant_id FROM public.core_tenant_users t
         WHERE t.user_id = s.user_id AND t.status = 'active' LIMIT 1),
       '00000000-0000-0000-0000-000000000001')
 WHERE s.tenant_id IS NULL;

-- final assert: 两表无 NULL tenant_id 残留
DO $$
DECLARE n bigint;
BEGIN
    SELECT count(*) INTO n FROM public.core_refresh_tokens WHERE tenant_id IS NULL;
    IF n > 0 THEN RAISE EXCEPTION 'unbackfilled NULLs in core_refresh_tokens: %', n; END IF;
    SELECT count(*) INTO n FROM public.core_sessions WHERE tenant_id IS NULL;
    IF n > 0 THEN RAISE EXCEPTION 'unbackfilled NULLs in core_sessions: %', n; END IF;
END $$;

RESET app.tenant_id;

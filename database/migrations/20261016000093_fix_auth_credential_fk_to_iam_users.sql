-- 20261016000093_fix_auth_credential_fk_to_iam_users.sql
-- 修复：凭证表 core_sessions/core_refresh_tokens 的 user_id FK 指向历史表 public.core_users
-- （46 行历史测试/演示账号，与现行用户主数据 iam.users 零重叠、admin 同名不同 id），
-- 导致新注册用户（仅写 iam.users）登录时凭证 INSERT 被 FK 静默拦截、凭证永不落库。
-- 处置：存量凭证（46 sessions + 1638 refresh）全部属于 core_users 历史测试/演示账号
-- （employee/hr_admin/admin_admin/core_admin），删除；FK 改指向 iam.users。
-- 注：migration 92 回填的 tenant_id 随行删除，不影响租户化结论（存量凭证为测试数据）。

-- RLS FORCE：凭证表 policy 无租户上下文时经 nil 分支放行（与 88/89/90/92 同惯例）
SET app.tenant_id = '00000000-0000-0000-0000-000000000000';

BEGIN;

-- 1. 删除存量凭证（user_id 不在 iam.users 的历史测试账号凭证）
DELETE FROM public.core_sessions s
WHERE NOT EXISTS (SELECT 1 FROM iam.users u WHERE u.id = s.user_id);

DELETE FROM public.core_refresh_tokens r
WHERE NOT EXISTS (SELECT 1 FROM iam.users u WHERE u.id = r.user_id);

-- 2. 删除旧 FK
ALTER TABLE public.core_sessions DROP CONSTRAINT sessions_user_id_fkey;
ALTER TABLE public.core_refresh_tokens DROP CONSTRAINT refresh_tokens_user_id_fkey;

-- 3. 加新 FK 指向 iam.users（同名约束，级联语义保持）
ALTER TABLE public.core_sessions
  ADD CONSTRAINT sessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES iam.users(id) ON DELETE CASCADE;

ALTER TABLE public.core_refresh_tokens
  ADD CONSTRAINT refresh_tokens_user_id_fkey FOREIGN KEY (user_id) REFERENCES iam.users(id) ON DELETE CASCADE;

-- 4. 断言：凭证表 user_id 全部存在于 iam.users，且存量已清空
DO $$
DECLARE
  orphan_sessions int;
  orphan_refresh int;
  total_sessions int;
  total_refresh int;
BEGIN
  SELECT count(*) INTO orphan_sessions FROM public.core_sessions s
    WHERE NOT EXISTS (SELECT 1 FROM iam.users u WHERE u.id = s.user_id);
  SELECT count(*) INTO orphan_refresh FROM public.core_refresh_tokens r
    WHERE NOT EXISTS (SELECT 1 FROM iam.users u WHERE u.id = r.user_id);
  SELECT count(*) INTO total_sessions FROM public.core_sessions;
  SELECT count(*) INTO total_refresh FROM public.core_refresh_tokens;
  IF orphan_sessions > 0 OR orphan_refresh > 0 THEN
    RAISE EXCEPTION '孤儿凭证残留: sessions=%, refresh=%', orphan_sessions, orphan_refresh;
  END IF;
  IF total_sessions > 0 OR total_refresh > 0 THEN
    RAISE EXCEPTION '存量测试凭证未清空: sessions=%, refresh=%', total_sessions, total_refresh;
  END IF;
END $$;

COMMIT;

RESET app.tenant_id;

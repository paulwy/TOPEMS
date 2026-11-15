-- 20261115140900 family_tenant_users_to_public
-- 9 列同名，目标空表
-- 幂等：ON CONFLICT (id) DO NOTHING；事务由 apply-forward.sh 包裹（文件内禁止 BEGIN/COMMIT）。
INSERT INTO public.core_tenant_users (id,tenant_id,user_id,email,role,status,created_at,last_login,deleted_at)
SELECT id,
       tenant_id,
       user_id,
       email,
       role,
       status,
       created_at,
       last_login,
       deleted_at
FROM flow.core_tenant_users
ON CONFLICT (id) DO NOTHING;

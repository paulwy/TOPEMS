-- 双身份表收敛：iam.users 权威化，core_users 废弃
-- 背景：登录/注册/JWT/会话全走 iam.users（auth.rs login 只查 iam.users）；
--   core_users 仅 1 行测试数据（test_admin=e91e2228），实际业务只被 communication/search 用于取 email，
--   与 iam.users 割裂导致 email 查找失效（S13 同类根因）；"core_users 权威"注释为历史意图残留（注册实际写 iam.users）。
--   收敛：communication/search 改查 iam.users → DROP core_users；僵尸会话表（0 行无引用）一并清理。

-- 1) 僵尸会话/刷新令牌副本表（0 行、无代码引用）清理
DROP TABLE IF EXISTS iam.sessions;
DROP TABLE IF EXISTS iam.refresh_tokens;
DROP TABLE IF EXISTS public.refresh_tokens;

-- 2) core_user_roles 用户 FK 重指 iam.users（权威身份表）；role_id FK 保持指向 core_roles（角色系统权威）
ALTER TABLE public.core_user_roles DROP CONSTRAINT IF EXISTS core_user_roles_user_id_fkey;
ALTER TABLE public.core_user_roles
  ADD CONSTRAINT core_user_roles_user_id_fkey FOREIGN KEY (user_id) REFERENCES iam.users(id);

-- 3) 废弃 core_users（身份目录收敛到 iam.users）
DROP TABLE IF EXISTS public.core_users;

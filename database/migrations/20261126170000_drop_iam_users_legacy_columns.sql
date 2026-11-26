-- ============================================================
-- 20261126170000: 删除 iam.users 反范式冗余列（roles / permissions）与旧单角色外键列（role_id）
--
-- 背景（IAM-3，IAM 目录统一专项收口）：
--   · roles text[] / permissions text[] 为反范式冗余列，真实授权走
--     core_user_roles → core_role_permissions → core_permissions 关联表；
--     运行期鉴权/回显读取点已于 IAM-1 / IAM-2 全部切到关联表范式。
--   · role_id uuid 为旧单角色外键列（FK → 空壳旧表 iam.roles），真实多角色绑定
--     走 public.core_user_roles；运行期代码对该列零读写，prod 3 行指向占位 UUID
--     3333…001/004 悬空（该列无入向业务读取）。
--
-- 依赖核查（2026-11-26 本机 topems + 生产 topems_prod 两库实测）：
--   · 运行期 Rust（*.rs）对三列零 SELECT/INSERT/UPDATE；UserRow.roles/permissions
--     为关联表聚合别名，不读裸列。
--   · DB 函数 / 触发器 / 视图对三列零引用；.sqlx 离线缓存无裸列绑定；前端不读冗余裸列。
--   · 依附 role_id 的对象：users_role_id_fkey 外键约束、idx_users_role_id 单列索引（随列一并清理）。
--   · 关联表 public.core_user_roles / iam.roles 旧表本身不在本迁移范围；
--     iam.position_roles → iam.roles 的遗留引用另议。
--
-- 例外账号：prod `reviewer`（评审体验账号，reviewer@topems.local）为评委审查例外身份，
--   保留 is_superuser 布尔兜底全量评审权限；其身份不依赖被删三列，本迁移不降级、不清理。
--   超管（is_superuser=t）由布尔列独立兜底，不要求在 core_user_roles 绑角色。
--
-- 幂等：IF EXISTS / information_schema 存在性守卫，新库与已清理库自动跳过。
-- 回滚：三列数据已于删除前导出至
--   backups/db-iam-users-legacy-columns/iam.users-{topems,topems_prod}-20261126.csv
--   （含 id/username/email/is_superuser/role_id/roles/permissions）。
-- ============================================================

SET search_path = pg_catalog, public, pg_temp;
SET lock_timeout = '5s';

-- 守卫：iam.users 不存在则整段跳过（新库 / 表已被清理的环境）。
DO $$
BEGIN
  IF to_regclass('iam.users') IS NULL THEN
    RAISE NOTICE 'skip: iam.users 不存在，跳过冗余列删除';
    RETURN;
  END IF;
END $$;

-- destructive-gate: allow
-- destructive-kind: DROP CONSTRAINT
-- destructive-reason: 解除 users.role_id 指向空壳旧表 iam.roles 的遗留外键，随旧单角色列一并清理
-- destructive-owner: iam
-- destructive-ticket: IAM-LEGACY-20261126
-- destructive-expires: 2027-05-25
ALTER TABLE iam.users DROP CONSTRAINT IF EXISTS users_role_id_fkey;

DROP INDEX IF EXISTS iam.idx_users_role_id;

-- destructive-gate: allow
-- destructive-kind: DROP COLUMN
-- destructive-reason: 删除反范式冗余列 roles/permissions 与旧单角色外键列 role_id，授权权威源为关联表
-- destructive-owner: iam
-- destructive-ticket: IAM-LEGACY-20261126
-- destructive-expires: 2027-05-25
-- destructive-rows-at-review: 0
-- destructive-backup: backups/db-iam-users-legacy-columns/iam.users-topems-20261126.csv；backups/db-iam-users-legacy-columns/iam.users-topems_prod-20261126.csv
ALTER TABLE iam.users
  DROP COLUMN IF EXISTS roles,
  DROP COLUMN IF EXISTS permissions,
  DROP COLUMN IF EXISTS role_id;

-- 收尾校验：三列应已不存在，否则回滚并人工核查。
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'iam'
      AND table_name = 'users'
      AND column_name IN ('roles', 'permissions', 'role_id')
  ) THEN
    RAISE EXCEPTION 'iam.users 冗余列（roles/permissions/role_id）仍存在，删除未生效，请人工核查';
  END IF;
END $$;

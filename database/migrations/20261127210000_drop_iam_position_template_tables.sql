-- ============================================================
-- 20261127210000: 删除 iam.position_roles / iam.position_permissions 岗位模板默认授权预留表
--
-- 背景（L6 路径 B，岗位模板默认授权下线专项）：
--   · 两表为「岗位携带默认角色/权限、继承到任职用户」的未投产预留关联；
--     授权权威链为 core_user_roles → core_role_permissions → core_permissions，
--     令牌聚合从未 join 这两张表，岗位默认授权不进入任何用户令牌集。
--   · 后端全仓仅 unified-core/iam/position.rs 一处半截 CRUD；前端岗位页无角色/权限
--     选择字段、不提交 role_ids/permissions；DB 视图/函数/触发器/种子零引用。
--   · 现状决策（2026-11-27 拍板路径 B）：岗位模板默认授权本期不投建，下线预留关联；
--     iam.positions 主表与 iam.user_positions 用户-岗位归属线独立保留，不在本迁移范围。
--
-- 依赖核查（2026-11-27 本机 topems + 生产 topems_prod 两库实测）：
--   · 两表双库均 0 行；Rust/前端/.sqlx 缓存对两表零裸列绑定；无视图/函数/触发器依赖。
--   · 依附对象：两表自带主键/唯一约束/索引/RLS 策略随表一并删除；
--     position_roles_role_id_fkey 指向空壳旧表 iam.roles 的误指 FK 一并解除。
--
-- 幂等：to_regclass 守卫 + IF EXISTS，新库与已清理库自动跳过。
-- 回滚：两表为未投产预留结构、无业务数据；删除前已导出空表头快照至
--   backups/db-iam-position-template-tables/iam.position_roles-{topems,topems_prod}-20261127.csv
--   backups/db-iam-position-template-tables/iam.position_permissions-{topems,topems_prod}-20261127.csv
-- ============================================================

SET search_path = pg_catalog, public, pg_temp;
SET lock_timeout = '5s';

-- 守卫：两张表均不存在则整段跳过（新库 / 表已被清理的环境）。
DO $$
BEGIN
  IF to_regclass('iam.position_roles') IS NULL
     AND to_regclass('iam.position_permissions') IS NULL THEN
    RAISE NOTICE 'skip: iam.position_roles / iam.position_permissions 均不存在，跳过预留表删除';
    RETURN;
  END IF;
END $$;

-- destructive-gate: allow
-- destructive-kind: DROP TABLE
-- destructive-reason: 下线未投产的岗位模板默认授权预留表；授权权威源为 core_user_roles 关联表链，两表不参与令牌聚合
-- destructive-owner: iam
-- destructive-ticket: IAM-LEGACY-20261126
-- destructive-expires: 2027-05-25
-- destructive-rows-at-review: 0
-- destructive-backup: backups/db-iam-position-template-tables/iam.position_permissions-topems-20261127.csv；backups/db-iam-position-template-tables/iam.position_permissions-topems_prod-20261127.csv
DROP TABLE IF EXISTS iam.position_permissions;

-- destructive-gate: allow
-- destructive-kind: DROP TABLE
-- destructive-reason: 下线未投产的岗位模板默认授权预留表；授权权威源为 core_user_roles 关联表链，两表不参与令牌聚合
-- destructive-owner: iam
-- destructive-ticket: IAM-LEGACY-20261126
-- destructive-expires: 2027-05-25
-- destructive-rows-at-review: 0
-- destructive-backup: backups/db-iam-position-template-tables/iam.position_roles-topems-20261127.csv；backups/db-iam-position-template-tables/iam.position_roles-topems_prod-20261127.csv
DROP TABLE IF EXISTS iam.position_roles;

-- 收尾校验：两表应已不存在，否则回滚并人工核查。
DO $$
BEGIN
  IF to_regclass('iam.position_roles') IS NOT NULL
     OR to_regclass('iam.position_permissions') IS NOT NULL THEN
    RAISE EXCEPTION 'iam.position_roles / iam.position_permissions 仍存在，删除未生效，请人工核查';
  END IF;
END $$;

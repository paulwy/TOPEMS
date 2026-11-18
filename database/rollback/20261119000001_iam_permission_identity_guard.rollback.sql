-- 回滚 20261119000001：仅移除 identity 属性，不删除列、不动数据。
-- 生产改前 id 为 bigint NOT NULL 无默认值；回滚后恢复该状态。
ALTER TABLE IF EXISTS iam.tenant_permissions ALTER COLUMN id DROP IDENTITY IF EXISTS;
ALTER TABLE IF EXISTS iam.tool_permissions ALTER COLUMN id DROP IDENTITY IF EXISTS;

DELETE FROM public._sqlx_migrations WHERE version = 20261119000001;

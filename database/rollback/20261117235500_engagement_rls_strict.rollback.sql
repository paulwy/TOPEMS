-- 回滚 20261117235500_engagement_rls_strict.sql
--
-- 恢复两表迁移前形态：删除严格策略、关闭 RLS（迁移前 relrowsecurity=false、无策略）、
-- 恢复 tenant_id 可空（若迁移曾 SET NOT NULL）。两表迁移前后均 0 行，无数据影响。
--
-- 注意：回滚后两表重新失去库级租户隔离，只能依赖查询层谓词；
-- 生产窗口内正常路径是前向修复，不是回滚。

DROP POLICY IF EXISTS rls_tenant_isolation ON flow.core_comments;
DROP POLICY IF EXISTS rls_tenant_isolation ON flow.core_favorites;

ALTER TABLE flow.core_comments NO FORCE ROW LEVEL SECURITY;
ALTER TABLE flow.core_comments DISABLE ROW LEVEL SECURITY;
ALTER TABLE flow.core_favorites NO FORCE ROW LEVEL SECURITY;
ALTER TABLE flow.core_favorites DISABLE ROW LEVEL SECURITY;

ALTER TABLE flow.core_comments ALTER COLUMN tenant_id DROP NOT NULL;
ALTER TABLE flow.core_favorites ALTER COLUMN tenant_id DROP NOT NULL;

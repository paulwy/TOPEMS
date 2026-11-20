-- 回滚 20261120160000_plugin_registry_schema_canonical.sql
--
-- 接管型迁移：这 7 张表在迁移前已存在于 baseline 库，并承载运行时数据。
-- 自动回滚执行 DROP TABLE 会不可逆地删除插件目录、版本、评论、分类、实例、
-- 权限与导航数据，因此明确拒绝自动执行，只允许人工接管。
--
-- 人工接管前提：
--   1) 已确认当前库不再由任何 topems 服务读写这 7 张 core 表；
--   2) 已完成全量逻辑备份并校验可恢复；
--   3) 已在变更单记录负责人与回滚窗口。
-- 人工接管顺序：先 DROP POLICY，再按依赖逆序 DROP TABLE。

DO $$
BEGIN
    RAISE EXCEPTION '20261120160000 为接管型迁移，禁止自动回滚：plugin-registry 7 张 core 表承载运行时数据。请按 rollback 文件头部的人工接管步骤执行。';
END $$;

-- 以下为人工接管时使用的模板，默认不执行：
-- DROP POLICY IF EXISTS rls_tenant_isolation ON core.core_plugins;
-- DROP POLICY IF EXISTS rls_platform_read ON core.core_plugins;
-- ALTER TABLE core.core_plugins DISABLE ROW LEVEL SECURITY;
-- DROP TABLE IF EXISTS core.core_plugin_navigation;
-- DROP TABLE IF EXISTS core.core_plugin_permissions;
-- DROP TABLE IF EXISTS core.core_plugin_categories;
-- DROP TABLE IF EXISTS core.core_plugin_instances;
-- DROP TABLE IF EXISTS core.core_plugin_reviews;
-- DROP TABLE IF EXISTS core.core_plugin_versions;
-- DROP TABLE IF EXISTS core.core_plugins;

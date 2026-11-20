-- 回滚 20261120180000_portal_schema_canonical.sql
--
-- 接管型迁移：这 112 张 portal 表在迁移前已存在于 baseline 库，并承载门户
-- GraphQL 聚合、路由、服务负载、队列、审计、通知、配置、帮助中心等运行时数据。
-- 自动回滚执行 DROP TABLE 会不可逆删除门户数据，因此明确拒绝自动执行。
--
-- 人工接管前提：
--   1) 已确认当前库不再由任何 topems 服务读写这 112 张 portal 表；
--   2) 已完成全量逻辑备份并校验可恢复；
--   3) 已在变更单记录负责人与回滚窗口。
-- 人工接管顺序：先 DROP POLICY / DISABLE RLS，再按依赖逆序 DROP TABLE。

DO $$
BEGIN
    RAISE EXCEPTION '20261120180000 为接管型迁移，禁止自动回滚：portal 112 张表承载门户运行时数据。请按 rollback 文件头部的人工接管步骤执行。';
END $$;

-- 以下为人工接管模板，默认不执行：
-- 对 112 张表逐一执行：
--   ALTER TABLE portal.<table> DISABLE ROW LEVEL SECURITY;
-- 然后按外键依赖逆序 DROP TABLE IF EXISTS portal.<table> CASCADE;

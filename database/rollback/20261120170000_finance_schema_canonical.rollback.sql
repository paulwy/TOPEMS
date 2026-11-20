-- 回滚 20261120170000_finance_schema_canonical.sql
--
-- 接管型迁移：这 66 张 finance 表在迁移前已存在于 baseline 库，并承载财务总账、
-- 凭证、期间、对账、税务、结算、资金、风控、报表、决策等运行时数据。
-- 自动回滚执行 DROP TABLE 会不可逆删除财务账套数据，因此明确拒绝自动执行。
--
-- 人工接管前提：
--   1) 已确认当前库不再由任何 topems 服务读写这 66 张 finance 表；
--   2) 已完成全量逻辑备份（pg_dump）并校验可恢复；
--   3) 已在变更单记录负责人、回滚窗口与下游对账口径影响。
-- 人工接管顺序：先 DROP POLICY / DISABLE RLS，再按依赖逆序 DROP TABLE；
-- 共享枚举类型（public.account_type 等）不要随表删除。

DO $$
BEGIN
    RAISE EXCEPTION '20261120170000 为接管型迁移，禁止自动回滚：finance 66 张表承载财务账套运行时数据。请按 rollback 文件头部的人工接管步骤执行。';
END $$;

-- 以下为人工接管模板，默认不执行：
-- 对 66 张表逐一执行：
--   DROP POLICY IF EXISTS rls_tenant_isolation ON finance.<table>;
--   ALTER TABLE finance.<table> DISABLE ROW LEVEL SECURITY;
-- 然后按外键依赖逆序 DROP TABLE IF EXISTS finance.<table> CASCADE;
-- 最后人工确认 finance 专属枚举类型（diff_reason/item_source/match_status/
-- reconciliation_status/reconciliation_type）是否仍需保留。

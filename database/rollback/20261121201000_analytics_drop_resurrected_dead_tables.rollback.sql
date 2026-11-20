-- 回滚 20261121201000_analytics_drop_resurrected_dead_tables.sql
--
-- 该迁移删除的是已判死、0 行、全仓无读写的 bi.audit_logs。若确需恢复，
-- 应按原 live 结构重建并补 RLS，而不是自动回滚（自动回滚会重建一张死表）。
DO $$
BEGIN
    RAISE EXCEPTION '20261121201000 为死表清理迁移，禁止自动回滚：恢复 bi.audit_logs 需人工评审。';
END $$;

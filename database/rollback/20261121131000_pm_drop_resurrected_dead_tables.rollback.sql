-- 回滚 20261121131000_pm_drop_resurrected_dead_tables.sql
-- 批2 已归档的死表，明确拒绝自动重建。

DO $$
BEGIN
    RAISE EXCEPTION '20261121131000 删除的是 batch2 已归档死表，禁止自动重建。';
END $$;

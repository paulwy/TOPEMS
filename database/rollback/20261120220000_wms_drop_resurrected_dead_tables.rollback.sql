-- 回滚 20261120220000_wms_drop_resurrected_dead_tables.sql
--
-- 本迁移删除的是 20261119100000_drop_dead_tables_batch1 已判定为死表、
-- 又被启动期 DDL 复活的空表。回滚若重建它们，会恢复「死表复活」缺陷，
-- 且旧数据已在 archive.drop_20261119_b1__wms__* 中保留，无需重建。
-- 因此明确拒绝自动回滚；如确需恢复结构，请人工从 archive schema 复制。

DO $$
BEGIN
    RAISE EXCEPTION '20261120220000 为死表清理迁移，禁止自动回滚：重建会恢复死表复活缺陷。历史数据见 archive.drop_20261119_b1__wms__*。';
END $$;

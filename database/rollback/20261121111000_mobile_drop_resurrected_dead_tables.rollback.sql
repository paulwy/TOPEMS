-- 回滚 20261121111000_mobile_drop_resurrected_dead_tables.sql
--
-- 删除的是 batch1 已判定为死表、又被启动期 DDL 复活的空表。回滚重建会恢复
-- 死表复活缺陷，且历史数据已在 archive.drop_20261119_b1__mobile__mobile_leave_applications
-- 保留，无需重建；因此明确拒绝自动回滚。

DO $$
BEGIN
    RAISE EXCEPTION '20261121111000 为死表清理迁移，禁止自动回滚：重建会恢复死表复活缺陷。历史数据见 archive.drop_20261119_b1__mobile__mobile_leave_applications。';
END $$;

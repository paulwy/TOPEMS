-- 20261121111000: 清理 mobile 启动期复活的死表（W2-D2 配套）
--
-- 背景：20261119100000_drop_dead_tables_batch1 已归档并删除
--   mobile.mobile_leave_applications（归档表 archive.drop_20261119_b1__mobile__mobile_leave_applications）。
-- 该表 live 行数 0、全仓 Rust 零 SQL 引用；但 mobile 启动期 schema_defense
-- 仍会按旧 TABLE_DEFS 重建，形成「死表复活」。本迁移做幂等收尾，仅在确认
-- 行数为 0 时 DROP；非空即中止整条迁移，避免误删业务数据。
--
-- destructive-gate: allow
-- destructive-kind: DROP TABLE
-- destructive-reason: 清理 batch1 已归档且被启动期 DDL 复活的 0 行死表
-- destructive-owner: mobile
-- destructive-ticket: W2-D2-MOBILE-20261121
-- destructive-expires: 2027-05-19
-- destructive-rows-at-review: 0
-- destructive-backup: archive.drop_20261119_b1__mobile__mobile_leave_applications 已归档保留 180 天
DO $cleanup$
DECLARE
    n bigint;
BEGIN
    IF to_regclass('mobile.mobile_leave_applications') IS NULL THEN
        RAISE NOTICE 'mobile.mobile_leave_applications 不存在，跳过';
        RETURN;
    END IF;

    EXECUTE 'SELECT count(*) FROM mobile.mobile_leave_applications' INTO n;
    IF n <> 0 THEN
        RAISE EXCEPTION 'mobile.mobile_leave_applications 仍有 % 行数据，拒绝自动 DROP；请人工复核归档后处理', n;
    END IF;

    EXECUTE 'DROP TABLE mobile.mobile_leave_applications';
    RAISE NOTICE '已删除复活的死表 mobile.mobile_leave_applications';
END $cleanup$;

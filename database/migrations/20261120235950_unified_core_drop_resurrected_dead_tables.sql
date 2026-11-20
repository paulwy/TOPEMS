-- 20261120235950: 清理 unified-core 启动期复活的死表（W2-D2 配套）
--
-- 背景：20261119110000_drop_dead_tables_batch2 已归档并删除
--   public.core_file_folders（归档表 archive.drop_20261119_b2__public__core_file_folders）。
-- 但 unified-core 启动期 schema_defense 会按旧 TABLE_DEFS 重建该表，形成「死表复活」。
-- 全仓运行代码无对 core_file_folders 的引用，live 行数为 0；本迁移做一次幂等收尾，
-- 仅在确认行数为 0 时 DROP；非空即中止整条迁移，避免误删业务数据。
--
-- 注意：同批 batch2 清单中的 public.core_mdm_reconciliation_log 不在此清理。
-- 该表仍被 svc/unified-core/src/modules/master/handlers.rs 的 MasterDataService
-- 作为对账日志权威表使用（活跃功能依赖），已由 canonical 迁移固化，待业务确认后再评审。
--
-- destructive-gate: allow
-- destructive-kind: DROP TABLE
-- destructive-reason: 清理 batch2 已归档且被启动期 DDL 复活的 0 行死表
-- destructive-owner: unified-core
-- destructive-ticket: W2-D2-UC-20261120
-- destructive-expires: 2027-05-19
-- destructive-rows-at-review: 0
-- destructive-backup: archive.drop_20261119_b2__public__core_file_folders 已归档保留 180 天
DO $cleanup$
DECLARE
    n bigint;
BEGIN
    IF to_regclass('public.core_file_folders') IS NULL THEN
        RAISE NOTICE 'public.core_file_folders 不存在，跳过';
        RETURN;
    END IF;

    EXECUTE 'SELECT count(*) FROM public.core_file_folders' INTO n;
    IF n <> 0 THEN
        RAISE EXCEPTION 'public.core_file_folders 仍有 % 行数据，拒绝自动 DROP；请人工复核归档后处理', n;
    END IF;

    EXECUTE 'DROP TABLE public.core_file_folders';
    RAISE NOTICE '已删除复活的死表 public.core_file_folders';
END $cleanup$;

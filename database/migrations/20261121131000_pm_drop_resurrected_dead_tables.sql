-- 20261121131000: 清理 PM 启动期复活的死表（W2-D2 配套）
--
-- 背景：20261119110000_drop_dead_tables_batch2 已归档并删除 pm.pm_master_data_refs。
-- 但 server pm_real_module 的 default_init_db(with_master_data_refs=true)
-- 会重建该表，形成「死表复活」。本迁移在运行期 DDL 已删除后做一次幂等收尾：
-- 表若仍存在，仅在确认行数为 0 时 DROP；非空即中止整条迁移。
-- 历史数据已在 batch2 的 archive.drop_20261119_b2__pm__pm_master_data_refs 中保留 180 天。
--
-- destructive-gate: allow
-- destructive-kind: DROP TABLE
-- destructive-reason: 清理 batch2 已归档且被启动期 DDL 复活的 0 行死表
-- destructive-owner: pm
-- destructive-ticket: W2-D2-PM-20261121
-- destructive-expires: 2027-05-19
-- destructive-rows-at-review: 0
-- destructive-backup: archive.drop_20261119_b2__pm__pm_master_data_refs 已归档保留 180 天
DO $cleanup$
DECLARE
    n bigint;
BEGIN
    IF to_regclass('pm.pm_master_data_refs') IS NULL THEN
        RAISE NOTICE 'pm.pm_master_data_refs 不存在，跳过';
        RETURN;
    END IF;
    EXECUTE 'SELECT count(*) FROM pm.pm_master_data_refs' INTO n;
    IF n <> 0 THEN
        RAISE EXCEPTION 'pm.pm_master_data_refs 仍有 % 行数据，拒绝自动 DROP', n;
    END IF;
    EXECUTE 'DROP TABLE pm.pm_master_data_refs';
    RAISE NOTICE '已删除复活的死表 pm.pm_master_data_refs';
END $cleanup$;

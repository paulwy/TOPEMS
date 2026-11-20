-- 20261120220000: 清理 WMS 启动期复活的死表（W2-D2 配套）
--
-- 背景：20261119100000_drop_dead_tables_batch1 已归档并删除
--   wms.transfers / wms.transfer_items / wms.wms_master_data_refs。
-- 但 WMS 启动期 schema_defense 与 default_init_db(with_master_data_refs=true)
-- 会按旧定义把它们重新建出来（空表），形成「死表复活」。
-- 本迁移在运行期 DDL 已删除后做一次幂等收尾：三张表若仍存在，仅在确认
-- 行数为 0 时 DROP；任何一张非空即中止整条迁移，避免误删业务数据。
-- 历史数据已在 batch1 的 archive.drop_20261119_b1__wms__* 中保留 180 天。
--
-- 安全：逐表 count(*) 校验，非空 RAISE EXCEPTION；不触碰仍被代码使用的表。

-- destructive-gate: allow
-- destructive-kind: DROP TABLE
-- destructive-reason: 清理 batch1 已归档且被启动期 DDL 复活的 0 行死表
-- destructive-owner: wms
-- destructive-ticket: W2-D2-WMS-20261120
-- destructive-expires: 2027-05-19
-- destructive-rows-at-review: 0
-- destructive-backup: archive.drop_20261119_b1__wms__* 已归档保留 180 天
DO $cleanup$
DECLARE
    t text;
    n bigint;
BEGIN
    FOREACH t IN ARRAY ARRAY['transfers', 'transfer_items', 'wms_master_data_refs']
    LOOP
        IF to_regclass(format('wms.%I', t)) IS NULL THEN
            RAISE NOTICE 'wms.% 不存在，跳过', t;
            CONTINUE;
        END IF;

        EXECUTE format('SELECT count(*) FROM wms.%I', t) INTO n;
        IF n <> 0 THEN
            RAISE EXCEPTION 'wms.% 仍有 % 行数据，拒绝自动 DROP；请人工复核归档后处理', t, n;
        END IF;

        EXECUTE format('DROP TABLE wms.%I', t);
        RAISE NOTICE '已删除复活的死表 wms.%', t;
    END LOOP;
END $cleanup$;

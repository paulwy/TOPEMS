-- 20261120235930: 清理 HRM 启动期复活的死表（W2-D2 配套）
--
-- 背景：20261119110000_drop_dead_tables_batch2 已归档并删除
--   hrm.payroll_records / performance_records / recruitment_applications /
--   recruitment_records / training_participants / hrm_master_data_refs。
-- 但 HRM 启动期 schema_defense 会按旧 TABLE_DEFS 重建前 5 张，
-- server hrm_real_module 的 default_init_db(with_master_data_refs=true)
-- 会重建 hrm_master_data_refs，形成「死表复活」。
-- 本迁移在运行期 DDL 已删除后做一次幂等收尾：六张表若仍存在，仅在确认
-- 行数为 0 时 DROP；任何一张非空即中止整条迁移，避免误删业务数据。
-- 历史数据已在 batch2 的 archive.drop_20261119_b2__hrm__* 中保留 180 天。
--
-- destructive-gate: allow
-- destructive-kind: DROP TABLE
-- destructive-reason: 清理 batch2 已归档且被启动期 DDL 复活的 0 行死表
-- destructive-owner: hrm
-- destructive-ticket: W2-D2-HRM-20261120
-- destructive-expires: 2027-05-19
-- destructive-rows-at-review: 0
-- destructive-backup: archive.drop_20261119_b2__hrm__* 已归档保留 180 天
DO $cleanup$
DECLARE
    t text;
    n bigint;
BEGIN
    FOREACH t IN ARRAY ARRAY[
        'payroll_records', 'performance_records', 'recruitment_applications',
        'recruitment_records', 'training_participants', 'hrm_master_data_refs'
    ]
    LOOP
        IF to_regclass(format('hrm.%I', t)) IS NULL THEN
            RAISE NOTICE 'hrm.% 不存在，跳过', t;
            CONTINUE;
        END IF;

        EXECUTE format('SELECT count(*) FROM hrm.%I', t) INTO n;
        IF n <> 0 THEN
            RAISE EXCEPTION 'hrm.% 仍有 % 行数据，拒绝自动 DROP；请人工复核归档后处理', t, n;
        END IF;

        EXECUTE format('DROP TABLE hrm.%I', t);
        RAISE NOTICE '已删除复活的死表 hrm.%', t;
    END LOOP;
END $cleanup$;

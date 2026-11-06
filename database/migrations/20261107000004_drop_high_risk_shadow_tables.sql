-- 删除高危运行期影子表（权威表均在 public）。
--
-- 覆盖 4 张表：
--   master_data.core_dict_types / core_dict_items
--   communication.core_notification_templates / core_geofences
--
-- 背景：这些副本由迁移分叉与启动期 schema_defense 反复重建，裸名 SQL 命中后导致
-- 生产字典读空 / 模板软删写到空副本 / 围栏读写落到错误实体。权威表在 public。
-- 本轮同时移除了 svc/master-data、svc/communication 的 TABLE_DEFS 对应条目。
--
-- 守卫：
--   1) 权威表 public.<table> 必须存在，否则跳过；
--   2) 仅删除 0 行副本，非空则跳过并记录 NOTICE，留给人工处理；
--   3) 不使用 CASCADE，若存在依赖会显式失败（不会静默连带删除）。
-- 不修改任何历史迁移文件。

DO $$
DECLARE
    item text;
    tbl text;
    sch text;
    cnt bigint;
BEGIN
    FOREACH item IN ARRAY ARRAY[
        'master_data.core_dict_items',
        'master_data.core_dict_types',
        'communication.core_notification_templates',
        'communication.core_geofences'
    ]
    LOOP
        sch := split_part(item, '.', 1);
        tbl := split_part(item, '.', 2);

        IF to_regclass(format('public.%I', tbl)) IS NULL THEN
            RAISE NOTICE 'skip %.%: public 权威表不存在', sch, tbl;
            CONTINUE;
        END IF;

        IF to_regclass(format('%I.%I', sch, tbl)) IS NULL THEN
            RAISE NOTICE 'skip %.%: 副本不存在', sch, tbl;
            CONTINUE;
        END IF;

        EXECUTE format('SELECT count(*) FROM %I.%I', sch, tbl) INTO cnt;
        IF cnt > 0 THEN
            RAISE NOTICE 'skip %.%: % 行非空，保留待人工迁移', sch, tbl, cnt;
            CONTINUE;
        END IF;

        EXECUTE format('DROP TABLE %I.%I', sch, tbl);
        RAISE NOTICE 'dropped %.% (0 rows)', sch, tbl;
    END LOOP;
END $$;

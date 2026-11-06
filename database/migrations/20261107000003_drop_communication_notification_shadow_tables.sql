-- 删除 communication schema 下的通知/邮件影子表。
--
-- 背景：这些表的权威定义在 public（core_notifications 含 tenant_id + RLS；
-- core_emails / core_email_templates 同样以 public 为权威）。communication 副本由
-- 迁移分叉与启动期 schema_defense 反复重建，曾导致裸名 SQL 命中缺列副本。
--
-- 守卫：
--   1) 权威表 public.<table> 必须存在，否则跳过（不做无权威表的删除）；
--   2) 仅删除 0 行副本，非空则跳过并记录 NOTICE，留给人工处理；
--   3) 不使用 CASCADE，若存在依赖会显式失败（不会静默连带删除）。
-- 不修改任何历史迁移文件。

DO $$
DECLARE
    tbl text;
    cnt bigint;
BEGIN
    FOREACH tbl IN ARRAY ARRAY['core_notifications', 'core_emails', 'core_email_templates']
    LOOP
        IF to_regclass(format('public.%I', tbl)) IS NULL THEN
            RAISE NOTICE 'skip communication.%: public 权威表不存在', tbl;
            CONTINUE;
        END IF;

        IF to_regclass(format('communication.%I', tbl)) IS NULL THEN
            RAISE NOTICE 'skip communication.%: 副本不存在', tbl;
            CONTINUE;
        END IF;

        EXECUTE format('SELECT count(*) FROM communication.%I', tbl) INTO cnt;
        IF cnt > 0 THEN
            RAISE NOTICE 'skip communication.%: % 行非空，保留待人工迁移', tbl, cnt;
            CONTINUE;
        END IF;

        EXECUTE format('DROP TABLE communication.%I', tbl);
        RAISE NOTICE 'dropped communication.% (0 rows)', tbl;
    END LOOP;
END $$;

-- 回滚入口（B 类 7/7）· 对应 database/migrations/20261115141800_b_class_search_logs_query.sql
-- 口径：仅本次新增才删；列内一旦出现非空数据即保留并 RAISE NOTICE。
-- 本迁移未建索引/约束/策略，回滚只涉及列本身；不涉及 pg_policies。

-- 1. public.search_logs.query
-- destructive-gate: allow
-- destructive-kind: DROP COLUMN
-- destructive-reason: 回滚 B 类补列；仅当列内无任何非空 query 时删列，有数据则保留并 RAISE NOTICE
-- destructive-owner: platform-db
-- destructive-ticket: B-CLASS-20261115
-- destructive-expires: 2027-03-31
-- destructive-rows-at-review: 0
-- destructive-backup: database/rollback/20261115141800_b_class_search_logs_query.rollback.sql
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM public.search_logs WHERE query IS NOT NULL) THEN
        ALTER TABLE public.search_logs DROP COLUMN IF EXISTS query;
    ELSE
        RAISE NOTICE 'public.search_logs.query 存在非空值，保留列';
    END IF;
END $$;

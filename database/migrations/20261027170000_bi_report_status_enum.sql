-- 20261027170000_bi_report_status_enum.sql
-- 目的：analytics/report.rs 更新端点 SQL 使用 `$N::bi.report_status` 显式 CAST，
--   但 bi schema 从未创建 report_status 枚举类型，导致 PUT /api/bi/reports/{id} 500。
-- 幂等：DO 块内 IF NOT EXISTS 检查。
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_namespace n ON t.typnamespace = n.oid
                   WHERE n.nspname = 'bi' AND t.typname = 'report_status') THEN
        CREATE TYPE bi.report_status AS ENUM ('draft', 'published', 'archived', 'pending', 'scheduled', 'cancelled');
    END IF;
END $$;

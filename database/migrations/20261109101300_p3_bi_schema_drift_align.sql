-- P3 / 2026-11-09：BI 域生产结构漂移对齐（表/列）
--
-- 背景（生产复测 tenant_admin 时报错定位）：
--   1) POST /api/bi/report（自服务报表创建）→ 500：
--      column "tenant_id" of relation "analytics_self_service_reports" does not exist。
--      生产 bi.* 一批表为旧结构，缺 tenant_id；本地/声明链有该列，sqlx::query! 按本地编译。
--   2) 20261029200000_schema_defense_type_align.sql 曾把 bi.reports.created_by 改为 uuid，
--      而 handler（report.rs create_report）按 String 绑定 → 生产 POST /api/bi/reports 类型不匹配。
--      本地/声明链的终态为 text（见 20260918000054），本次把生产回正为 text。
--
-- 处理原则：
--   - 全部守卫式/幂等：列已存在、类型已正确均 no-op；ADD COLUMN 可空，不影响存量行。
--   - 仅补列/改类型，不删列、不改数据值（uuid→text 为无损文本化）。
--
-- ROLLBACK：
--   ALTER TABLE bi.reports ALTER COLUMN created_by TYPE uuid
--     USING created_by::uuid;                      -- 仅当存量均可解析为 uuid
--   ALTER TABLE bi.analytics_self_service_reports     DROP COLUMN IF EXISTS tenant_id;
--   ALTER TABLE bi.analytics_comparison_analyses      DROP COLUMN IF EXISTS tenant_id;
--   ALTER TABLE bi.analytics_comparison_results       DROP COLUMN IF EXISTS tenant_id;
--   ALTER TABLE bi.analytics_dashboard_shares         DROP COLUMN IF EXISTS tenant_id;
--   ALTER TABLE bi.analytics_dashboard_templates      DROP COLUMN IF EXISTS tenant_id;
--   ALTER TABLE bi.analytics_drilldown_history        DROP COLUMN IF EXISTS tenant_id;
--   ALTER TABLE bi.analytics_drilldown_paths          DROP COLUMN IF EXISTS tenant_id;
--   ALTER TABLE bi.analytics_row_level_permissions    DROP COLUMN IF EXISTS tenant_id;

BEGIN;

-- 1) 补齐 BI 子域缺失的 tenant_id（守卫式）
ALTER TABLE bi.analytics_self_service_reports  ADD COLUMN IF NOT EXISTS tenant_id uuid;
ALTER TABLE bi.analytics_comparison_analyses   ADD COLUMN IF NOT EXISTS tenant_id uuid;
ALTER TABLE bi.analytics_comparison_results    ADD COLUMN IF NOT EXISTS tenant_id uuid;
ALTER TABLE bi.analytics_dashboard_shares      ADD COLUMN IF NOT EXISTS tenant_id uuid;
ALTER TABLE bi.analytics_dashboard_templates   ADD COLUMN IF NOT EXISTS tenant_id uuid;
ALTER TABLE bi.analytics_drilldown_history     ADD COLUMN IF NOT EXISTS tenant_id uuid;
ALTER TABLE bi.analytics_drilldown_paths       ADD COLUMN IF NOT EXISTS tenant_id uuid;
ALTER TABLE bi.analytics_row_level_permissions ADD COLUMN IF NOT EXISTS tenant_id uuid;

-- 2) bi.reports.created_by：uuid → text（按 handler 的 String 绑定；守卫式）
DO $$
DECLARE
    col_type text;
BEGIN
    SELECT data_type INTO col_type
    FROM information_schema.columns
    WHERE table_schema = 'bi' AND table_name = 'reports' AND column_name = 'created_by';

    IF col_type IS NULL THEN
        ALTER TABLE bi.reports ADD COLUMN created_by text;
    ELSIF col_type = 'uuid' THEN
        ALTER TABLE bi.reports ALTER COLUMN created_by TYPE text USING created_by::text;
    END IF;
    -- 其余类型（text/varchar 等）保持不动
END $$;

COMMIT;

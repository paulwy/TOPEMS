-- B255 收口：financial_reports 双列（status / approval_status）合并为单列（2026-11-24）
--
-- 背景：两列取值完全同值，由 ck_financial_reports_status_pair 强制 status = approval_status，
--   所有写入口（generate / submit / approve / reject / lock / unlock）都双写同值，
--   读侧只用于 API 响应回填 approval_status 字段。双列是冗余：任何一次漏写都会让不变量失败，
--   且没有额外语义（没有“审批态 ≠ 报表态”的合法场景）。
--
-- 本次：删列 approval_status，API 仍返回 approval_status 字段（由 status 派生），前端契约不变。
--
-- 幂等：列不存在则跳过。
-- fail-closed：存在 status <> approval_status 的行则 RAISE EXCEPTION，先人工清洗再合并。
-- 破坏性：DROP COLUMN approval_status（该列依赖的 ck_financial_reports_approval_status_standard
--   随之自动删除），并 DROP 不变量约束 ck_financial_reports_status_pair；不改其他行/列。

-- destructive-gate: allow
-- destructive-kind: DROP COLUMN
-- destructive-reason: 删除与 status 完全同值的冗余列 approval_status，报表态收敛为单列
-- destructive-owner: finance
-- destructive-ticket: B255-FIN-REPORT-20261124
-- destructive-expires: 2027-05-20
-- destructive-rows-at-review: 0
-- destructive-backup: 窗口前 pg_dump -t finance.financial_reports
DO $$
DECLARE
    n_bad bigint;
    rel regclass := to_regclass('finance.financial_reports');
BEGIN
    IF rel IS NULL THEN
        RAISE NOTICE '跳过：finance.financial_reports 不存在';
        RETURN;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
         WHERE table_schema = 'finance' AND table_name = 'financial_reports'
           AND column_name = 'approval_status'
    ) THEN
        RAISE NOTICE '跳过：approval_status 列已不存在（已合并）';
        RETURN;
    END IF;

    EXECUTE 'SELECT count(*) FROM finance.financial_reports WHERE (status)::text <> (approval_status)::text'
       INTO n_bad;
    IF n_bad > 0 THEN
        RAISE EXCEPTION 'B255 前置断言失败：% 行 status <> approval_status，请先清洗', n_bad;
    END IF;

    -- 注：ck_financial_reports_status_pair 与 ck_financial_reports_approval_status_standard
    -- 都依赖 approval_status 列，DROP COLUMN 时会随之自动删除，无需单独 DROP CONSTRAINT。
    EXECUTE 'ALTER TABLE finance.financial_reports DROP COLUMN approval_status';

    IF EXISTS (
        SELECT 1 FROM information_schema.columns
         WHERE table_schema = 'finance' AND table_name = 'financial_reports'
           AND column_name = 'approval_status'
    ) THEN
        RAISE EXCEPTION 'B255 后置断言失败：approval_status 列仍存在';
    END IF;

    RAISE NOTICE 'B255 完成：approval_status 已删除，status 单列承载报表态';
END $$;

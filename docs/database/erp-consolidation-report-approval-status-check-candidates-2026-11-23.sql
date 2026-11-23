-- B223 · erp.consolidation_reports.approval_status 候选约束（NOT VALID）
--
-- 值集来源：
--   svc/erp/src/modules/consolidation_report_approval_status.rs
--     ConsolidationReportApprovalStatus::DB_VALUES =
--       draft / pending / approved / rejected / cancelled（默认 draft）
--   与前端 ConsolidationReportsPage 的 APPROVAL_STATUS_CONFIG 一致。
--
-- 本地 topems 已应用（0 行存量；bogus 被拒）。

ALTER TABLE erp.consolidation_reports
  ADD CONSTRAINT ck_consolidation_reports_approval_status_standard
  CHECK (approval_status IS NULL OR approval_status IN
    ('draft', 'pending', 'approved', 'rejected', 'cancelled'))
  NOT VALID;

-- 回滚：
-- ALTER TABLE erp.consolidation_reports DROP CONSTRAINT IF EXISTS ck_consolidation_reports_approval_status_standard;

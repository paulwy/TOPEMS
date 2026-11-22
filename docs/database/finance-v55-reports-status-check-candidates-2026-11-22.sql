-- B142 · 财务 0 行小表状态/匹配状态约束候选 DDL（四列）
-- 值集来源：
--   finance.finance_v55_invoices.status → settlement_v55::InvoiceStatus
--   finance.finance_v55_reconciliation_results.match_status → settlement_v55::MatchStatus
--   finance.financial_reports.status / approval_status → financial_report_status::FinancialReportStatus
-- 本地/生产快照均为 0 行；四列均 NOT NULL，无状态 CHECK。

-- 1) v55 发票：pending → recognized → verified → posted
ALTER TABLE finance.finance_v55_invoices
  DROP CONSTRAINT IF EXISTS ck_finance_v55_invoices_status_standard;
ALTER TABLE finance.finance_v55_invoices ALTER COLUMN status SET DEFAULT 'pending';
ALTER TABLE finance.finance_v55_invoices
  ADD CONSTRAINT ck_finance_v55_invoices_status_standard
  CHECK (status = ANY (ARRAY['pending','recognized','verified','posted']))
  NOT VALID;
COMMENT ON COLUMN finance.finance_v55_invoices.status IS '发票状态：pending, recognized, verified, posted';

-- 2) v55 对账结果：unmatched / matched / partial / discrepancy
ALTER TABLE finance.finance_v55_reconciliation_results
  DROP CONSTRAINT IF EXISTS ck_finance_v55_recon_results_match_status_standard;
ALTER TABLE finance.finance_v55_reconciliation_results ALTER COLUMN match_status SET DEFAULT 'unmatched';
ALTER TABLE finance.finance_v55_reconciliation_results
  ADD CONSTRAINT ck_finance_v55_recon_results_match_status_standard
  CHECK (match_status = ANY (ARRAY['matched','partial','unmatched','discrepancy']))
  NOT VALID;
COMMENT ON COLUMN finance.finance_v55_reconciliation_results.match_status IS '匹配状态：matched, partial, unmatched, discrepancy';

-- 3) 财务报表 status 与 approval_status 必须同值；draft → pending → approved/rejected → locked
ALTER TABLE finance.financial_reports
  DROP CONSTRAINT IF EXISTS ck_financial_reports_status_standard;
ALTER TABLE finance.financial_reports
  DROP CONSTRAINT IF EXISTS ck_financial_reports_approval_status_standard;
ALTER TABLE finance.financial_reports ALTER COLUMN status SET DEFAULT 'draft';
ALTER TABLE finance.financial_reports ALTER COLUMN approval_status SET DEFAULT 'draft';
ALTER TABLE finance.financial_reports
  ADD CONSTRAINT ck_financial_reports_status_standard
  CHECK (status = ANY (ARRAY['draft','pending','approved','rejected','locked']))
  NOT VALID;
ALTER TABLE finance.financial_reports
  ADD CONSTRAINT ck_financial_reports_approval_status_standard
  CHECK (approval_status = ANY (ARRAY['draft','pending','approved','rejected','locked']))
  NOT VALID;
ALTER TABLE finance.financial_reports
  ADD CONSTRAINT ck_financial_reports_status_pair
  CHECK (status = approval_status)
  NOT VALID;
COMMENT ON COLUMN finance.financial_reports.status IS '报表状态：draft, pending, approved, rejected, locked';
COMMENT ON COLUMN finance.financial_reports.approval_status IS '审批状态，必须与 status 同值';

-- 窗口内验证：
-- ALTER TABLE finance.finance_v55_invoices VALIDATE CONSTRAINT ck_finance_v55_invoices_status_standard;
-- ALTER TABLE finance.finance_v55_reconciliation_results VALIDATE CONSTRAINT ck_finance_v55_recon_results_match_status_standard;
-- ALTER TABLE finance.financial_reports VALIDATE CONSTRAINT ck_financial_reports_status_standard;
-- ALTER TABLE finance.financial_reports VALIDATE CONSTRAINT ck_financial_reports_approval_status_standard;
-- ALTER TABLE finance.financial_reports VALIDATE CONSTRAINT ck_financial_reports_status_pair;

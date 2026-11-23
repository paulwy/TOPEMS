-- B211：ERP 对账单 / 财务付款单状态值域收敛（候选约束，NOT VALID）
--
-- 权威值源：
--   erp.fin_reconciliations.status  -> svc/erp/src/modules/fin_reconciliation_status.rs
--     { pending, draft, matched, approved }，默认 pending
--   finance.core_finance_payments.status -> svc/finance/src/modules/ap_payment_status.rs
--     { draft, pending, processing, completed, failed, cancelled }，默认 draft
--
-- 关于付款单的历史别名：代码的读取侧把 approved/posted 归一为 processing、rejected 归一为 failed、
-- paid 归一为 completed；但所有写入侧（建单 + 提交/审批/执行工作流）都绑定 canonical 值，
-- 本地存量 1 行是 completed，故约束按 canonical 集收紧。
-- 两表在本地分别为 0 行 / 1 行，NOT VALID 应用无风险。
-- 禁止对生产库直接执行本文件。

BEGIN;

ALTER TABLE erp.fin_reconciliations
    ADD CONSTRAINT ck_erp_fin_reconciliations_status_standard
    CHECK (status IN ('pending', 'draft', 'matched', 'approved')) NOT VALID;

COMMENT ON CONSTRAINT ck_erp_fin_reconciliations_status_standard ON erp.fin_reconciliations
    IS '状态值域由 svc/erp/src/modules/fin_reconciliation_status.rs 定义（B211）';

ALTER TABLE finance.core_finance_payments
    ADD CONSTRAINT ck_finance_core_finance_payments_status_standard
    CHECK (status IN ('draft', 'pending', 'processing', 'completed', 'failed', 'cancelled')) NOT VALID;

COMMENT ON CONSTRAINT ck_finance_core_finance_payments_status_standard ON finance.core_finance_payments
    IS '状态值域由 svc/finance/src/modules/ap_payment_status.rs 定义（B211）';

COMMIT;

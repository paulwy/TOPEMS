-- B210：财务应收/应付状态值域收敛（候选约束，NOT VALID）
--
-- 权威值源：svc/finance/src/modules/receivable_payable_status.rs
--   ReceivablePayableStatus = { draft, approved, posted, cancelled }
-- 历史别名（代码已归一到 draft）：`unpaid`（旧创建默认值）、`pending`（DB 默认值）。
--
-- 注意：两列的 DB 默认值仍是 'pending'（遗留），而常量集里没有 pending。
-- 当前全仓只有 operational.rs 的创建接口写这两列，且每次都显式绑定 status，
-- 不存在"省略 status 走默认值"的路径，因此 canonical-only 约束不会阻断现有写入。
-- 长期应把列默认值改为 'draft'（需迁移，另行排期），本批只做值域护栏。
-- 两表本地 0 行，NOT VALID 应用无风险。
-- 禁止对生产库直接执行本文件。

BEGIN;

ALTER TABLE finance.receivables
    ADD CONSTRAINT ck_finance_receivables_status_standard
    CHECK (status IS NULL OR status IN ('draft', 'approved', 'posted', 'cancelled')) NOT VALID;

COMMENT ON CONSTRAINT ck_finance_receivables_status_standard ON finance.receivables
    IS '状态值域由 svc/finance/src/modules/receivable_payable_status.rs 定义（B210）';

ALTER TABLE finance.payables
    ADD CONSTRAINT ck_finance_payables_status_standard
    CHECK (status IS NULL OR status IN ('draft', 'approved', 'posted', 'cancelled')) NOT VALID;

COMMENT ON CONSTRAINT ck_finance_payables_status_standard ON finance.payables
    IS '状态值域由 svc/finance/src/modules/receivable_payable_status.rs 定义（B210）';

COMMIT;

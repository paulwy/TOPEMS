-- B212：ERP 应收/应付状态值域收敛（候选约束，NOT VALID）
--
-- 权威值源：
--   erp.receivables.status -> svc/erp/src/modules/receivable_status.rs （ReceivableStatus，pending/paid）
--   erp.payables.status    -> svc/erp/src/modules/payable_status.rs    （PayableStatus，pending/paid）
-- 两列均 varchar(20) NOT NULL DEFAULT 'pending'；本地应收 5 行全 pending，应付 0 行。
-- 值集依据：应收由销售订单/项目应收两个事件建单写 pending，收款核销转 paid；
-- 应付由采购订单/入职福利计提写 pending，付款核销转 paid。
-- 禁止对生产库直接执行本文件。

BEGIN;

ALTER TABLE erp.receivables
    ADD CONSTRAINT ck_erp_receivables_status_standard
    CHECK (status IN ('pending', 'paid')) NOT VALID;

COMMENT ON CONSTRAINT ck_erp_receivables_status_standard ON erp.receivables
    IS '状态值域由 svc/erp/src/modules/receivable_status.rs 定义（B212）';

ALTER TABLE erp.payables
    ADD CONSTRAINT ck_erp_payables_status_standard
    CHECK (status IN ('pending', 'paid')) NOT VALID;

COMMENT ON CONSTRAINT ck_erp_payables_status_standard ON erp.payables
    IS '状态值域由 svc/erp/src/modules/payable_status.rs 定义（B212）';

COMMIT;

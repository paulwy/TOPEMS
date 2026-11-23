-- B214：HRM 合同续签状态值域收敛（候选约束，NOT VALID）
--
-- 权威值源：svc/hrm/src/modules/contract_renewal_status.rs（ContractRenewalStatus）
-- 值集：pending / approved / rejected / executed
--   创建写 pending、审批 approved、驳回 rejected、执行 executed；
--   更新与取消用 pending 守卫，执行前置要求 approved。
-- 列：hrm.contract_renewals.status varchar(…) NOT NULL DEFAULT 'pending'，本地 0 行。
-- 禁止对生产库直接执行本文件。

BEGIN;

ALTER TABLE hrm.contract_renewals
    ADD CONSTRAINT ck_hrm_contract_renewals_status_standard
    CHECK (status IN ('pending', 'approved', 'rejected', 'executed')) NOT VALID;

COMMENT ON CONSTRAINT ck_hrm_contract_renewals_status_standard ON hrm.contract_renewals
    IS '状态值域由 svc/hrm/src/modules/contract_renewal_status.rs 定义（B214）';

COMMIT;

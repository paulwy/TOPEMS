-- B194 采购单据审批状态候选约束（2026-11-23）
--
-- 目标：把两列审批状态收敛到唯一枚举
--   `PurchaseRequisitionApprovalStatus` → scm.purchase_requisitions.approval_status
--   `PurchaseContractApprovalStatus`    → scm.purchase_contracts.approval_status
--
-- 两列均为 varchar、可空、无默认值；NULL 表示尚未审批，故条件保留 IS NULL。
-- 全部以 NOT VALID 应用，历史行不做回填校验，只约束后续写入；生产需按窗口单独 VALIDATE。

ALTER TABLE scm.purchase_requisitions
  ADD CONSTRAINT ck_scm_purchase_requisitions_approval_status_standard
  CHECK (approval_status IS NULL OR approval_status IN ('pending', 'approved', 'rejected'))
  NOT VALID;

ALTER TABLE scm.purchase_contracts
  ADD CONSTRAINT ck_scm_purchase_contracts_approval_status_standard
  CHECK (approval_status IS NULL OR approval_status IN ('pending', 'approved', 'rejected'))
  NOT VALID;

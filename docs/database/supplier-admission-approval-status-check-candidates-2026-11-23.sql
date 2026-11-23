-- B195 供应商准入审批状态候选约束（2026-11-23）
--
-- 目标：把 `scm.supplier_admissions.approval_status` 收敛到唯一枚举
--   `SupplierAdmissionApprovalStatus` → scm.supplier_admissions.approval_status
--
-- 列 varchar、可空、无默认值；NULL 表示尚未审批，故条件保留 IS NULL。
-- 以 NOT VALID 应用，历史行不做回填校验，只约束后续写入；生产需按窗口单独 VALIDATE。

ALTER TABLE scm.supplier_admissions
  ADD CONSTRAINT ck_scm_supplier_admissions_approval_status_standard
  CHECK (approval_status IS NULL OR approval_status IN ('pending', 'approved', 'rejected'))
  NOT VALID;

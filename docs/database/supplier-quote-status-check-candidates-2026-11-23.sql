-- B196 供应商报价单状态候选约束（2026-11-23）
--
-- 目标：把 `scm.supplier_quotes.status` 收敛到唯一枚举
--   `SupplierQuoteStatus` → scm.supplier_quotes.status
--
-- 列 varchar、NOT NULL、原 DB 默认 `submitted`。代码侧创建报价单固定写 `draft`，
-- 提交写 `submitted`，默认值与写入口不一致，本批一并把列默认对齐为 'draft'。
-- 约束以 NOT VALID 应用，历史行不做回填校验，只约束后续写入；生产需按窗口单独 VALIDATE。

ALTER TABLE scm.supplier_quotes
  ALTER COLUMN status SET DEFAULT 'draft';

ALTER TABLE scm.supplier_quotes
  ADD CONSTRAINT ck_scm_supplier_quotes_status_standard
  CHECK (status IN ('draft', 'submitted'))
  NOT VALID;

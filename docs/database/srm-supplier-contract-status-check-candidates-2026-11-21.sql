-- B60 · srm.supplier_contracts.status 状态唯一集合候选 DDL（NOT VALID）
-- 值集来源：svc/srm/src/modules/supplier_contract_status.rs（SupplierContractStatus）
-- 流转：draft → active → inactive / archived。
-- 本地 0 行；列非空，DB 默认 'draft'。
--
-- 背景：database/init/04_create_scm_wms_srm_tables.sql 里同名约束只允许
-- active/inactive/archived，与列默认 'draft' 自相矛盾；本地表没有该约束，
-- 生产若已建出该约束，任何走默认值的创建都会 23514。本候选替换为四值集合。

ALTER TABLE srm.supplier_contracts
  DROP CONSTRAINT IF EXISTS ck_supplier_contracts_status_standard;

ALTER TABLE srm.supplier_contracts
  ADD CONSTRAINT ck_supplier_contracts_status_standard
  CHECK (status = ANY (ARRAY['draft','active','inactive','archived']))
  NOT VALID;

-- 窗口内：
-- ALTER TABLE srm.supplier_contracts VALIDATE CONSTRAINT ck_supplier_contracts_status_standard;
-- 回滚：
-- ALTER TABLE srm.supplier_contracts DROP CONSTRAINT IF EXISTS ck_supplier_contracts_status_standard;
-- ALTER TABLE srm.supplier_contracts
--   ADD CONSTRAINT ck_supplier_contracts_status_standard
--   CHECK (status = ANY (ARRAY['active','inactive','archived'])) NOT VALID;

-- 本地演练（2026-11-21，事务内 ROLLBACK，残留 0）：
--   四值各插入 1 行；draft→active、active→inactive、inactive→archived 各 UPDATE 1；
--   'bogus' 插入 → 23514。

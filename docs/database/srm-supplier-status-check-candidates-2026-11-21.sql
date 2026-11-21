-- B61 · srm.suppliers.status 状态唯一集合候选 DDL（NOT VALID）
-- 值集来源：svc/srm/src/modules/supplier_record_status.rs（SupplierRecordStatus）
-- 本地 97 行全 active；列非空，DB 默认 'active'。
--
-- 背景：database/init/04_create_scm_wms_srm_tables.sql 里同名约束只允许
-- active/inactive/archived，与删除接口实际写入的 'deleted'、shared-core
-- SupplierStatus 的 pending/blacklisted 不一致；生产若已建出该约束，删除供应商会 23514。

ALTER TABLE srm.suppliers
  DROP CONSTRAINT IF EXISTS ck_suppliers_status_standard;

ALTER TABLE srm.suppliers
  ADD CONSTRAINT ck_suppliers_status_standard
  CHECK (status = ANY (ARRAY['active','inactive','pending','blacklisted','archived','deleted']))
  NOT VALID;

-- 窗口内：
-- ALTER TABLE srm.suppliers VALIDATE CONSTRAINT ck_suppliers_status_standard;
-- 回滚：
-- ALTER TABLE srm.suppliers DROP CONSTRAINT IF EXISTS ck_suppliers_status_standard;
-- ALTER TABLE srm.suppliers
--   ADD CONSTRAINT ck_suppliers_status_standard
--   CHECK (status = ANY (ARRAY['active','inactive','archived'])) NOT VALID;

-- 本地演练（2026-11-21，事务内 ROLLBACK，残留 0）：
--   六值各插入 1 行；active→pending→blacklisted→archived→deleted 各 UPDATE 1；
--   'bogus' 插入 → 23514。

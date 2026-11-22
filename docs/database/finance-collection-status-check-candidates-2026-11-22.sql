-- B144 · finance.erp_collection_records.status 状态收敛候选 DDL
-- 值集来源：svc/finance/src/modules/collection_status.rs（CollectionStatus）
-- pending → confirmed / written_off；confirmed → written_off；written_off 终态。
-- 历史 NULL 的读侧语义一直是 pending（代码用 COALESCE(status,'pending')），本候选按同一口径回填。
-- 本地：553 行（pending 202 / NULL 351），nullable 无默认，无 CHECK。
-- 生产快照：0 行，nullable 无默认，无 CHECK；本候选未应用生产。

ALTER TABLE finance.erp_collection_records
  DROP CONSTRAINT IF EXISTS ck_erp_collection_records_status_standard;

UPDATE finance.erp_collection_records SET status = 'pending' WHERE status IS NULL;
ALTER TABLE finance.erp_collection_records ALTER COLUMN status SET DEFAULT 'pending';
ALTER TABLE finance.erp_collection_records ALTER COLUMN status SET NOT NULL;

ALTER TABLE finance.erp_collection_records
  ADD CONSTRAINT ck_erp_collection_records_status_standard
  CHECK (status = ANY (ARRAY['pending','confirmed','written_off']))
  NOT VALID;

COMMENT ON COLUMN finance.erp_collection_records.status IS '收款状态：pending, confirmed, written_off';

-- 窗口内验证：
-- ALTER TABLE finance.erp_collection_records VALIDATE CONSTRAINT ck_erp_collection_records_status_standard;
-- 回滚需先恢复 nullable 并清理回填值（生产执行前留档原 NULL 行）：
-- ALTER TABLE finance.erp_collection_records DROP CONSTRAINT IF EXISTS ck_erp_collection_records_status_standard;
-- ALTER TABLE finance.erp_collection_records ALTER COLUMN status DROP NOT NULL;
-- ALTER TABLE finance.erp_collection_records ALTER COLUMN status DROP DEFAULT;

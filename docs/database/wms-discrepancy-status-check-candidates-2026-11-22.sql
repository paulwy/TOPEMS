-- WMS 盘点差异调整状态候选约束（B121）
-- 目标列：wms.discrepancy_records.adjustment_status
-- 规范集合：pending / approved / rejected / completed，默认 pending
-- 生产执行前先预检存量；本文件只加 NOT VALID 约束，不自动清理、不改默认值。
--
-- 预检：
--   SELECT adjustment_status, count(*)
--   FROM wms.discrepancy_records
--   GROUP BY adjustment_status;
--
-- 约束（NOT VALID，不阻塞存量；核销后再 VALIDATE）：
ALTER TABLE wms.discrepancy_records
  ADD CONSTRAINT ck_discrepancy_records_adjustment_status_standard
  CHECK (adjustment_status IN ('pending', 'approved', 'rejected', 'completed'))
  NOT VALID;

-- 核销存量后执行：
-- ALTER TABLE wms.discrepancy_records
--   VALIDATE CONSTRAINT ck_discrepancy_records_adjustment_status_standard;

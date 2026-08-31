-- 20260831191000: 清理 erp.accounting_subjects 空表残留（V321 已物理迁移至 finance）
-- 背景：accounting_subjects 已迁移 finance schema（V321 迁移 20260827000002），erp 服务已改走 finance API；
--   erp.accounting_subjects 为 0 行空表残留，仅 schema_defense 注释引用，可安全清理。
DROP TABLE IF EXISTS erp.accounting_subjects;

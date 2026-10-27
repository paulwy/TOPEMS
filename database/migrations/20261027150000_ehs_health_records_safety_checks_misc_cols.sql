-- 20261027150000_ehs_health_records_safety_checks_misc_cols.sql
-- 目的：health_records / safety_checks 余量列对齐（occupational_health / safety 模块查询引用）。
--   1) health_records.medical_history：occupational_health 列表 SELECT 引用
--   2) safety_checks.status / created_at / updated_at：safety 列表与 INSERT 引用
-- 幂等：ADD COLUMN IF NOT EXISTS；新列可空/带默认。
ALTER TABLE ehs.health_records
    ADD COLUMN IF NOT EXISTS medical_history TEXT;

ALTER TABLE ehs.safety_checks
    ADD COLUMN IF NOT EXISTS status VARCHAR(32) DEFAULT 'active',
    ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now(),
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

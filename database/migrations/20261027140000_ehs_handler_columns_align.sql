-- 20261027140000_ehs_handler_columns_align.sql
-- 目的：ehs 域若干表的结构落后于代码查询引用（全量迁移补跑后仍缺的列）。
--   1) health_records：occupational_health/health 模块查询引用 birth_date/check_type/blood_type
--   2) safety_checks：safety 模块查询引用 check_type/inspector
--   3) safety_hazards：hazard 模块 INSERT/SELECT 引用 12 列，建表迁移版本过旧
-- 幂等：全部 ADD COLUMN IF NOT EXISTS；新增列均为可空/带默认，存量行无破坏。
ALTER TABLE ehs.health_records
    ADD COLUMN IF NOT EXISTS birth_date DATE,
    ADD COLUMN IF NOT EXISTS check_type VARCHAR(64),
    ADD COLUMN IF NOT EXISTS blood_type VARCHAR(16);

ALTER TABLE ehs.safety_checks
    ADD COLUMN IF NOT EXISTS check_type VARCHAR(64),
    ADD COLUMN IF NOT EXISTS inspector VARCHAR(128);

ALTER TABLE ehs.safety_hazards
    ADD COLUMN IF NOT EXISTS hazard_no VARCHAR(64),
    ADD COLUMN IF NOT EXISTS name TEXT,
    ADD COLUMN IF NOT EXISTS category VARCHAR(64),
    ADD COLUMN IF NOT EXISTS level VARCHAR(32),
    ADD COLUMN IF NOT EXISTS description TEXT,
    ADD COLUMN IF NOT EXISTS location TEXT,
    ADD COLUMN IF NOT EXISTS risk_assessment TEXT,
    ADD COLUMN IF NOT EXISTS control_measures JSONB,
    ADD COLUMN IF NOT EXISTS status VARCHAR(32) DEFAULT 'active',
    ADD COLUMN IF NOT EXISTS created_by UUID,
    ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now(),
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

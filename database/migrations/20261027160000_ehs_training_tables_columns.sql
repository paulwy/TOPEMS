-- 20261027160000_ehs_training_tables_columns.sql
-- 目的：training 模块列表/详情查询引用的列在 training_programs / training_records 表中缺失。
--   1) training_programs：title/content/training_type/start_date/instructor/status/created_at
--   2) training_records：category/trainer/training_date/location/duration_hours/participants/content/materials/result/pass_rate/status/created_by/created_at/updated_at
-- 幂等：ADD COLUMN IF NOT EXISTS；新列可空/带默认。
ALTER TABLE ehs.training_programs
    ADD COLUMN IF NOT EXISTS title VARCHAR(256),
    ADD COLUMN IF NOT EXISTS content TEXT,
    ADD COLUMN IF NOT EXISTS training_type VARCHAR(64),
    ADD COLUMN IF NOT EXISTS start_date DATE,
    ADD COLUMN IF NOT EXISTS instructor VARCHAR(128),
    ADD COLUMN IF NOT EXISTS status VARCHAR(32) DEFAULT 'draft',
    ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();

ALTER TABLE ehs.training_records
    ADD COLUMN IF NOT EXISTS category VARCHAR(64),
    ADD COLUMN IF NOT EXISTS trainer VARCHAR(128),
    ADD COLUMN IF NOT EXISTS training_date DATE,
    ADD COLUMN IF NOT EXISTS location VARCHAR(256),
    ADD COLUMN IF NOT EXISTS duration_hours INTEGER,
    ADD COLUMN IF NOT EXISTS participants INTEGER,
    ADD COLUMN IF NOT EXISTS content TEXT,
    ADD COLUMN IF NOT EXISTS materials TEXT,
    ADD COLUMN IF NOT EXISTS result VARCHAR(64),
    ADD COLUMN IF NOT EXISTS pass_rate NUMERIC(5,2),
    ADD COLUMN IF NOT EXISTS status VARCHAR(32),
    ADD COLUMN IF NOT EXISTS created_by UUID,
    ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now(),
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

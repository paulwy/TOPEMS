-- 2026-10-17 ehs training 域批3：培训记录（records）域接真表——补列对齐前端契约
-- 背景：svc/ehs/src/modules/training.rs records 5 handler（前端 trainingApi.records 组，
--       apps/web/src/api/ehs/types/training.ts:24-44 TrainingRecord 20 字段）此前返回内存硬编码桩，
--       即"前端真实在调、后端假数据"的契约撒谎面。
-- 现状：ehs.training_records 16 列（id/program_id/employee_id/employee_name/enrollment_date/completion_date/
--       score/certificate_no/certificate_expiry/status/remarks/created_by/created_at/updated_at/deleted_at/tenant_id），
--       与前端契约差异：缺 record_no/title/training_type/category/trainer/training_date/location/
--       duration_hours/participants/content/materials/result/pass_rate 13 列；表当前 0 行（空表，零风险）。
-- 方案（后端宽容、零回归）：保留既有列（含 program_id FK → training_programs、RLS 策略
--       tenant_isolation_training_records 已就绪不动），仅 ALTER ADD COLUMN IF NOT EXISTS 补契约缺列；
--       前端 plan_id 由后端 handler 别名映射自 program_id。幂等可重复执行。
-- 幂等：ADD COLUMN IF NOT EXISTS 保护，可重复执行。

ALTER TABLE ehs.training_records
    ADD COLUMN IF NOT EXISTS record_no varchar(64),
    ADD COLUMN IF NOT EXISTS title varchar(200),
    ADD COLUMN IF NOT EXISTS training_type varchar(64),
    ADD COLUMN IF NOT EXISTS category varchar(64),
    ADD COLUMN IF NOT EXISTS trainer varchar(128),
    ADD COLUMN IF NOT EXISTS training_date timestamptz,
    ADD COLUMN IF NOT EXISTS location varchar(256),
    ADD COLUMN IF NOT EXISTS duration_hours numeric(5,1),
    ADD COLUMN IF NOT EXISTS participants jsonb DEFAULT '[]'::jsonb,
    ADD COLUMN IF NOT EXISTS content text,
    ADD COLUMN IF NOT EXISTS materials jsonb DEFAULT '[]'::jsonb,
    ADD COLUMN IF NOT EXISTS result varchar(32),
    ADD COLUMN IF NOT EXISTS pass_rate numeric(5,2);

-- 前端契约 plan_id 可空（string | null），既有 program_id NOT NULL 约束与之冲突：放开。
-- 既有 employee_id/employee_name/enrollment_date NOT NULL 约束亦非前端契约字段（前端 TrainingRecord
-- 20 字段不含这三者），且 create 请求可不携带：一并放开，保持"后端宽容、零回归"。
ALTER TABLE ehs.training_records
    ALTER COLUMN program_id DROP NOT NULL,
    ALTER COLUMN employee_id DROP NOT NULL,
    ALTER COLUMN employee_name DROP NOT NULL,
    ALTER COLUMN enrollment_date DROP NOT NULL;

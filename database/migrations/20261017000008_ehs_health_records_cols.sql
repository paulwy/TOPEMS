-- 2026-10-17 ehs occupational_health 域：health records 接真表补列
-- 背景：前端 HealthManagementPage 真实调用 ehsApi.listHealthRecords/createHealthRecord/updateHealthRecord/deleteHealthRecord
--       （apps/web/src/api/ehs/occupationalHealth.ts，路径 /occupational-health/records、/records/{id}，
--       契约 apps/web/src/api/ehs/types/health.ts HealthRecord：id/record_no/employee_id/employee_name/gender/birthday/
--       department/position/workplace/hazard_factors[]/blood_type/allergy_history/medical_history/contact_info/status），
--       后端 occupational_health.rs 对应 handler（list_exam_records 等）为内存桩 = 契约撒谎面。
-- 现状：ehs.health_records（17 列，RLS 策略 tenant_isolation_health_records 已就绪并强制，0 行）
--       缺 record_no/department/position/workplace/hazard_factors/allergy_history/contact_info 7 列对齐前端契约；
--       既有列别名映射（handler 层做）：birthday←birth_date、gender 直通、blood_type/medical_history/status 直通、
--       allergies jsonb（既有，保留）与新增 allergy_history text 并行（新写入走 allergy_history，读优先 allergy_history）。
-- 方案（后端宽容、零回归）：仅补缺列，既有列/RLS 不动。幂等：ADD COLUMN IF NOT EXISTS / CREATE INDEX IF NOT EXISTS 可重复执行。

ALTER TABLE ehs.health_records
    ADD COLUMN IF NOT EXISTS record_no varchar(64),
    ADD COLUMN IF NOT EXISTS department varchar(100),
    ADD COLUMN IF NOT EXISTS position varchar(100),
    ADD COLUMN IF NOT EXISTS workplace varchar(100),
    ADD COLUMN IF NOT EXISTS hazard_factors jsonb,
    ADD COLUMN IF NOT EXISTS allergy_history text,
    ADD COLUMN IF NOT EXISTS contact_info text;

CREATE UNIQUE INDEX IF NOT EXISTS idx_health_records_record_no ON ehs.health_records (record_no)
    WHERE record_no IS NOT NULL;

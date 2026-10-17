-- 2026-10-17 ehs occupational_disease 域：/occupational-diseases/cases 主 CRUD 接真补列
-- 背景：前端 EhsOccupationalDiseasePage 真实调用 listOccupationalDiseaseCases/createOccupationalDiseaseCase/
--       updateOccupationalDiseaseCase/deleteOccupationalDiseaseCase（apps/web/src/api/ehs/occupationalDisease.ts，
--       路径 /occupational-diseases/cases，契约 health.ts OccupationalDiseaseCase 22 字段：
--       case_no/employee_id/employee_name/gender/age/department/position/disease_type/disease_name/
--       hazard_factor/diagnosis_date/diagnosis_hospital/diagnosis_basis/work_related/severity/status/
--       treatment/compensation/attachments/reported_at），后端 occupational_disease.rs 对应 5 handler 全内存桩
--       （list 空 Vec/create 内存构造）= 撒谎面。
-- 现状：ehs.qa_ehs_disease_cases（23 列，case_no UNIQUE 索引，0 行）与后端 DiseaseCase struct 同源（diagnosed_at/
--       diagnosing_hospital/treatment_plan/compensation_status/outcome/closed_at 语义），但与前端契约缺 6 字段：
--       gender/age/hazard_factor/work_related/attachments/reported_at；且字段名错位（前端 diagnosis_date↔表
--       diagnosed_at、treatment↔treatment_plan、compensation↔compensation_status）。方案（后端宽容零回归）：
--       cases CRUD 接真 qa_ehs_disease_cases（struct 重写对齐前端 22 字段 + 双名兼容读出），补 6 列。
-- 幂等：ADD COLUMN IF NOT EXISTS 可重复执行。

ALTER TABLE ehs.qa_ehs_disease_cases
    ADD COLUMN IF NOT EXISTS gender varchar(16),
    ADD COLUMN IF NOT EXISTS age integer,
    ADD COLUMN IF NOT EXISTS hazard_factor varchar(128),
    ADD COLUMN IF NOT EXISTS work_related boolean NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS attachments jsonb,
    ADD COLUMN IF NOT EXISTS reported_at timestamptz;

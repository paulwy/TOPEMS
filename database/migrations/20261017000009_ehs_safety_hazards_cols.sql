-- 2026-10-17 ehs hazard 域：/issues 主 CRUD 接真 safety_hazards 表补列
-- 背景：前端 HazardPage（createCrudPageAdapter + hazardSchema）真实调用 ehsApi.listHazards/getHazard/createHazard/updateHazard/deleteHazard
--       （apps/web/src/api/ehs/hazard.ts，路径全部 /issues、/issues/{id}，契约 hazard.ts SafetyHazard：
--       hazard_no/name/category/level/description/location/risk_assessment/control_measures[]/status/
--       severity/exposure/likelihood/created_by），后端 /issues 原挂 list_hazards（读 ehs.qa_ehs_hazards 隐患表，
--       返回 title/source/reported_by 语义）= 字段深度错位 + 撒谎面（前端列表列 name/severity 等全空）。
-- 现状：ehs.safety_hazards（17 列，RLS 策略 tenant_isolation_safety_hazards 已强制，0 行）与前端 SafetyHazard
--       契约高度匹配（hazard_no/name/category/level/description/location/risk_assessment/control_measures jsonb/
--       status/created_by/created_at/updated_at），仅缺 severity/exposure/likelihood 3 列（前端表单 required）。
-- 方案（后端宽容、零回归）：/issues 主 CRUD 改挂新 handler（读 safety_hazards）；qa_ehs_hazards 隐患流程
--       （approval/close/rectification/verification）保留旧 handler（前端零消费或走审批面，冻结不动）。
-- 幂等：ADD COLUMN IF NOT EXISTS 可重复执行。

ALTER TABLE ehs.safety_hazards
    ADD COLUMN IF NOT EXISTS severity varchar(10),
    ADD COLUMN IF NOT EXISTS exposure varchar(10),
    ADD COLUMN IF NOT EXISTS likelihood varchar(10);

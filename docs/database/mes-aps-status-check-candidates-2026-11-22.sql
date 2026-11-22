-- B146 · MES APS 四列状态约束候选 DDL
-- 四表本地均 0 行；本地无状态 CHECK。值集来源：
--   capacity_status::CapacityStatus
--   demand_forecast_status::DemandForecastStatus
--   material_plan_status::MaterialPlanStatus
--   production_plan_status::ProductionPlanStatus
-- ConstraintStatus 是 APS 求解过程态，不落库。

-- 1) 产能：available ↔ maintenance；available → allocated → consumed/released
ALTER TABLE mes.capacities
  DROP CONSTRAINT IF EXISTS ck_capacities_status_standard;
ALTER TABLE mes.capacities ALTER COLUMN status SET DEFAULT 'available';
ALTER TABLE mes.capacities ALTER COLUMN status SET NOT NULL;
ALTER TABLE mes.capacities
  ADD CONSTRAINT ck_capacities_status_standard
  CHECK (status = ANY (ARRAY['available','allocated','consumed','maintenance','released']))
  NOT VALID;
COMMENT ON COLUMN mes.capacities.status IS '产能状态：available, allocated, consumed, maintenance, released';

-- 2) 需求预测：draft → calculated → validated → adopted；superseded/cancelled 终态
ALTER TABLE mes.demand_forecasts
  DROP CONSTRAINT IF EXISTS ck_demand_forecasts_status_standard;
ALTER TABLE mes.demand_forecasts ALTER COLUMN status SET DEFAULT 'draft';
ALTER TABLE mes.demand_forecasts ALTER COLUMN status SET NOT NULL;
ALTER TABLE mes.demand_forecasts
  ADD CONSTRAINT ck_demand_forecasts_status_standard
  CHECK (status = ANY (ARRAY['draft','calculated','validated','adopted','superseded','cancelled']))
  NOT VALID;
COMMENT ON COLUMN mes.demand_forecasts.status IS '需求预测状态：draft, calculated, validated, adopted, superseded, cancelled';

-- 3) 材料计划：pending → requisitioned → sourced → satisfied/shortage；cancelled 终态
ALTER TABLE mes.material_plans
  DROP CONSTRAINT IF EXISTS ck_material_plans_status_standard;
ALTER TABLE mes.material_plans ALTER COLUMN status SET DEFAULT 'pending';
ALTER TABLE mes.material_plans
  ADD CONSTRAINT ck_material_plans_status_standard
  CHECK (status = ANY (ARRAY['pending','requisitioned','sourced','satisfied','shortage','cancelled']))
  NOT VALID;
COMMENT ON COLUMN mes.material_plans.status IS '材料计划状态：pending, requisitioned, sourced, satisfied, shortage, cancelled';

-- 4) 生产计划：draft → pending_approval → approved → in_progress → completed；cancelled 终态
ALTER TABLE mes.production_plans
  DROP CONSTRAINT IF EXISTS ck_production_plans_status_standard;
ALTER TABLE mes.production_plans ALTER COLUMN status SET DEFAULT 'draft';
ALTER TABLE mes.production_plans ALTER COLUMN status SET NOT NULL;
ALTER TABLE mes.production_plans
  ADD CONSTRAINT ck_production_plans_status_standard
  CHECK (status = ANY (ARRAY['draft','pending_approval','approved','in_progress','completed','cancelled']))
  NOT VALID;
COMMENT ON COLUMN mes.production_plans.status IS '生产计划状态：draft, pending_approval, approved, in_progress, completed, cancelled';

-- 窗口内逐条 VALIDATE。

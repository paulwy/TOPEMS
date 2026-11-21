-- master-data 状态唯一集合候选 CHECK（W5-B B22）
-- 生成日期：2026-11-21
-- 状态：候选，未在生产执行；先跑第 0 节预检，确认 0 行违例后再进窗口。
--
-- 依据：svc/master-data 各枚举已带 serde snake_case，写入/读取均经 *_status_to_str/from_str；
-- 本地 12 列全部 text NOT NULL，存量值全部落在枚举集合内。

-- ============ 0. 预检（每条必须 0 行） ============
SELECT 'mdm_subscriptions', status, count(*) FROM master_data.mdm_subscriptions
 WHERE status NOT IN ('active','expired','cancelled','pending') GROUP BY 2;
SELECT 'mdm_billing_records', status, count(*) FROM master_data.mdm_billing_records
 WHERE status NOT IN ('pending','invoiced','paid','overdue') GROUP BY 2;
SELECT 'mdm_sla_incidents', status, count(*) FROM master_data.mdm_sla_incidents
 WHERE status NOT IN ('open','investigating','resolved','closed') GROUP BY 2;
SELECT 'mdm_recovery_plans', status, count(*) FROM master_data.mdm_recovery_plans
 WHERE status NOT IN ('draft','active','executing','completed','failed') GROUP BY 2;
SELECT 'mdm_continuity_plans', status, count(*) FROM master_data.mdm_continuity_plans
 WHERE status NOT IN ('draft','active','tested','expired') GROUP BY 2;
SELECT 'mdm_region_configs', status, count(*) FROM master_data.mdm_region_configs
 WHERE status NOT IN ('online','offline','degraded') GROUP BY 2;
SELECT 'mdm_replication_configs', status, count(*) FROM master_data.mdm_replication_configs
 WHERE status NOT IN ('stopped','running','paused','lagging') GROUP BY 2;
SELECT 'mdm_failover_records', status, count(*) FROM master_data.mdm_failover_records
 WHERE status NOT IN ('initiated','in_progress','completed','rolled_back') GROUP BY 2;
SELECT 'mdm_data_products', status, count(*) FROM master_data.mdm_data_products
 WHERE status NOT IN ('draft','published','deprecated','retired') GROUP BY 2;
SELECT 'mdm_quality_checks', status, count(*) FROM master_data.mdm_quality_checks
 WHERE status NOT IN ('passed','failed','warning') GROUP BY 2;
SELECT 'mdm_auto_fix_actions', status, count(*) FROM master_data.mdm_auto_fix_actions
 WHERE status NOT IN ('pending','applied','verified','failed') GROUP BY 2;
SELECT 'mdm_workflows', status, count(*) FROM master_data.mdm_workflows
 WHERE status NOT IN ('draft','running','paused','completed','cancelled') GROUP BY 2;

-- ============ 1. 约束（事务内执行） ============
ALTER TABLE master_data.mdm_subscriptions
  ADD CONSTRAINT mdm_subscriptions_status_check
  CHECK (status IN ('active','expired','cancelled','pending')) NOT VALID;

ALTER TABLE master_data.mdm_billing_records
  ADD CONSTRAINT mdm_billing_records_status_check
  CHECK (status IN ('pending','invoiced','paid','overdue')) NOT VALID;

ALTER TABLE master_data.mdm_sla_incidents
  ADD CONSTRAINT mdm_sla_incidents_status_check
  CHECK (status IN ('open','investigating','resolved','closed')) NOT VALID;

ALTER TABLE master_data.mdm_recovery_plans
  ADD CONSTRAINT mdm_recovery_plans_status_check
  CHECK (status IN ('draft','active','executing','completed','failed')) NOT VALID;

ALTER TABLE master_data.mdm_continuity_plans
  ADD CONSTRAINT mdm_continuity_plans_status_check
  CHECK (status IN ('draft','active','tested','expired')) NOT VALID;

ALTER TABLE master_data.mdm_region_configs
  ADD CONSTRAINT mdm_region_configs_status_check
  CHECK (status IN ('online','offline','degraded')) NOT VALID;

ALTER TABLE master_data.mdm_replication_configs
  ADD CONSTRAINT mdm_replication_configs_status_check
  CHECK (status IN ('stopped','running','paused','lagging')) NOT VALID;

ALTER TABLE master_data.mdm_failover_records
  ADD CONSTRAINT mdm_failover_records_status_check
  CHECK (status IN ('initiated','in_progress','completed','rolled_back')) NOT VALID;

ALTER TABLE master_data.mdm_data_products
  ADD CONSTRAINT mdm_data_products_status_check
  CHECK (status IN ('draft','published','deprecated','retired')) NOT VALID;

ALTER TABLE master_data.mdm_quality_checks
  ADD CONSTRAINT mdm_quality_checks_status_check
  CHECK (status IN ('passed','failed','warning')) NOT VALID;

ALTER TABLE master_data.mdm_auto_fix_actions
  ADD CONSTRAINT mdm_auto_fix_actions_status_check
  CHECK (status IN ('pending','applied','verified','failed')) NOT VALID;

ALTER TABLE master_data.mdm_workflows
  ADD CONSTRAINT mdm_workflows_status_check
  CHECK (status IN ('draft','running','paused','completed','cancelled')) NOT VALID;

-- ============ 2. 回滚（单独使用） ============
-- ALTER TABLE master_data.mdm_subscriptions DROP CONSTRAINT IF EXISTS mdm_subscriptions_status_check;
-- ALTER TABLE master_data.mdm_billing_records DROP CONSTRAINT IF EXISTS mdm_billing_records_status_check;
-- ALTER TABLE master_data.mdm_sla_incidents DROP CONSTRAINT IF EXISTS mdm_sla_incidents_status_check;
-- ALTER TABLE master_data.mdm_recovery_plans DROP CONSTRAINT IF EXISTS mdm_recovery_plans_status_check;
-- ALTER TABLE master_data.mdm_continuity_plans DROP CONSTRAINT IF EXISTS mdm_continuity_plans_status_check;
-- ALTER TABLE master_data.mdm_region_configs DROP CONSTRAINT IF EXISTS mdm_region_configs_status_check;
-- ALTER TABLE master_data.mdm_replication_configs DROP CONSTRAINT IF EXISTS mdm_replication_configs_status_check;
-- ALTER TABLE master_data.mdm_failover_records DROP CONSTRAINT IF EXISTS mdm_failover_records_status_check;
-- ALTER TABLE master_data.mdm_data_products DROP CONSTRAINT IF EXISTS mdm_data_products_status_check;
-- ALTER TABLE master_data.mdm_quality_checks DROP CONSTRAINT IF EXISTS mdm_quality_checks_status_check;
-- ALTER TABLE master_data.mdm_auto_fix_actions DROP CONSTRAINT IF EXISTS mdm_auto_fix_actions_status_check;
-- ALTER TABLE master_data.mdm_workflows DROP CONSTRAINT IF EXISTS mdm_workflows_status_check;

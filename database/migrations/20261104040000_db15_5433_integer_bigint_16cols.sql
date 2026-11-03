-- ============================================================
-- DB-15: 5433 integer/bigint 等 16 列对齐 test
--
-- 背景：类型批次——integer/bigint/数值类型零星差异。
-- 方向：对齐 test（基准）。
-- ============================================================

SET lock_timeout = '5s';

-- test=integer → cur=bigint → 改 integer（3 列）
ALTER TABLE crm.customer_segments ALTER COLUMN customer_count TYPE integer USING customer_count::integer;
ALTER TABLE mes.production_orders ALTER COLUMN quantity TYPE integer USING quantity::integer;
ALTER TABLE mes.production_orders ALTER COLUMN completed_quantity TYPE integer USING completed_quantity::integer;

-- test=numeric → cur=integer → 改 numeric（3 列）
ALTER TABLE crm.customer_scores ALTER COLUMN last_score TYPE numeric USING last_score::numeric;
ALTER TABLE crm.customer_scores ALTER COLUMN score TYPE numeric USING score::numeric;
ALTER TABLE erp.vehicles ALTER COLUMN mileage TYPE numeric USING mileage::numeric;

-- test=varchar → cur=integer → 改 varchar（4 列）
ALTER TABLE finance.budgets ALTER COLUMN fiscal_year TYPE character varying USING fiscal_year::character varying;
ALTER TABLE flow.core_workflow_versions ALTER COLUMN version TYPE character varying USING version::character varying;
ALTER TABLE public.core_workflow_versions ALTER COLUMN version TYPE character varying USING version::character varying;
ALTER TABLE rs.formulas ALTER COLUMN version TYPE character varying USING version::character varying;

-- test=double precision → cur=integer → 改 double precision（2 列）
ALTER TABLE mes.process_flow_steps ALTER COLUMN standard_time TYPE double precision USING standard_time::double precision;
ALTER TABLE mes.process_flow_steps ALTER COLUMN wait_time TYPE double precision USING wait_time::double precision;

-- test=text → cur=integer → 改 text（1 列）
ALTER TABLE mes.process_flow_steps ALTER COLUMN transfer_time TYPE text USING transfer_time::text;

-- test=integer → cur=text → 改 integer（2 列）
ALTER TABLE pm.contract_payment_schedule ALTER COLUMN payment_number TYPE integer USING payment_number::integer;
ALTER TABLE pm.project_risks ALTER COLUMN warning_threshold TYPE integer USING warning_threshold::integer;

-- test=integer → cur=varchar → 改 integer（1 列）
ALTER TABLE public._archive_core_workflow_versions ALTER COLUMN version TYPE integer USING version::integer;

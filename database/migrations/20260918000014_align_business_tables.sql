-- ================================================================================
-- 20260918000014_align_business_tables.sql — 双库业务表对齐（5432 活跃库 / 5433 重建库）
-- ================================================================================
-- 背景（2026-09-18 DB 治理收尾）：
--   1. mes 业务表（production_orders / production_processes / equipment 等 10 张）
--      仅由运行时 schema_defense 创建，迁移链中无完整建表/补列来源；
--      5432 活跃库 mes schema 完全缺失，5433 重建库仅有裸骨架。
--   2. finance.budgets（部门预算，svc/finance operational.rs 查询）不在任何
--      schema_defense TABLE_DEFS 中，5432 缺失、5433 仅有裸骨架 → /budgets API 500。
--   3. pm.budgets（项目预算，pm schema_defense 权威）在 5432 结构已完整，
--      5433 仅有裸骨架 → 补列对齐。
-- 权威来源：svc/mes/src/models/schema_defense.rs、svc/pm/src/schema_defense.rs、
--           svc/finance/src/modules/operational.rs（budgets 查询列）。
-- 幂等：CREATE TABLE IF NOT EXISTS + ADD COLUMN IF NOT EXISTS，双库可重复执行。
-- ================================================================================

CREATE SCHEMA IF NOT EXISTS mes;
CREATE SCHEMA IF NOT EXISTS finance;
-- ============ mes.audit_logs ============
CREATE TABLE IF NOT EXISTS "mes"."audit_logs" (id UUID PRIMARY KEY DEFAULT gen_random_uuid());
ALTER TABLE "mes"."audit_logs" ADD COLUMN IF NOT EXISTS "tenant_id" UUID;
ALTER TABLE "mes"."audit_logs" ADD COLUMN IF NOT EXISTS "action" VARCHAR(128) NOT NULL;
ALTER TABLE "mes"."audit_logs" ADD COLUMN IF NOT EXISTS "entity_type" VARCHAR(64) NOT NULL;
ALTER TABLE "mes"."audit_logs" ADD COLUMN IF NOT EXISTS "entity_id" UUID;
ALTER TABLE "mes"."audit_logs" ADD COLUMN IF NOT EXISTS "entity_ids" JSONB;
ALTER TABLE "mes"."audit_logs" ADD COLUMN IF NOT EXISTS "user_id" UUID;
ALTER TABLE "mes"."audit_logs" ADD COLUMN IF NOT EXISTS "user_name" VARCHAR(256);
ALTER TABLE "mes"."audit_logs" ADD COLUMN IF NOT EXISTS "request_details" JSONB;
ALTER TABLE "mes"."audit_logs" ADD COLUMN IF NOT EXISTS "response_details" JSONB;
ALTER TABLE "mes"."audit_logs" ADD COLUMN IF NOT EXISTS "status" VARCHAR(32) NOT NULL DEFAULT 'success';
ALTER TABLE "mes"."audit_logs" ADD COLUMN IF NOT EXISTS "error_message" TEXT;
ALTER TABLE "mes"."audit_logs" ADD COLUMN IF NOT EXISTS "ip_address" VARCHAR(64);
ALTER TABLE "mes"."audit_logs" ADD COLUMN IF NOT EXISTS "user_agent" TEXT;
ALTER TABLE "mes"."audit_logs" ADD COLUMN IF NOT EXISTS "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- ============ mes.equipment ============
CREATE TABLE IF NOT EXISTS "mes"."equipment" (id UUID PRIMARY KEY DEFAULT gen_random_uuid());
ALTER TABLE "mes"."equipment" ADD COLUMN IF NOT EXISTS "organization_id" UUID NOT NULL;
ALTER TABLE "mes"."equipment" ADD COLUMN IF NOT EXISTS "equipment_code" VARCHAR(100) NOT NULL;
ALTER TABLE "mes"."equipment" ADD COLUMN IF NOT EXISTS "equipment_name" VARCHAR(255) NOT NULL;
ALTER TABLE "mes"."equipment" ADD COLUMN IF NOT EXISTS "equipment_type" VARCHAR(50);
ALTER TABLE "mes"."equipment" ADD COLUMN IF NOT EXISTS "category" VARCHAR(50);
ALTER TABLE "mes"."equipment" ADD COLUMN IF NOT EXISTS "model" VARCHAR(100);
ALTER TABLE "mes"."equipment" ADD COLUMN IF NOT EXISTS "brand" VARCHAR(100);
ALTER TABLE "mes"."equipment" ADD COLUMN IF NOT EXISTS "serial_number" VARCHAR(100);
ALTER TABLE "mes"."equipment" ADD COLUMN IF NOT EXISTS "specification" TEXT;
ALTER TABLE "mes"."equipment" ADD COLUMN IF NOT EXISTS "manufacturer" VARCHAR(255);
ALTER TABLE "mes"."equipment" ADD COLUMN IF NOT EXISTS "manufacture_date" DATE;
ALTER TABLE "mes"."equipment" ADD COLUMN IF NOT EXISTS "purchase_date" DATE;
ALTER TABLE "mes"."equipment" ADD COLUMN IF NOT EXISTS "installation_date" DATE;
ALTER TABLE "mes"."equipment" ADD COLUMN IF NOT EXISTS "location" VARCHAR(255);
ALTER TABLE "mes"."equipment" ADD COLUMN IF NOT EXISTS "building" VARCHAR(100);
ALTER TABLE "mes"."equipment" ADD COLUMN IF NOT EXISTS "floor" VARCHAR(50);
ALTER TABLE "mes"."equipment" ADD COLUMN IF NOT EXISTS "area" VARCHAR(100);
ALTER TABLE "mes"."equipment" ADD COLUMN IF NOT EXISTS "work_station_id" UUID;
ALTER TABLE "mes"."equipment" ADD COLUMN IF NOT EXISTS "responsible_person" VARCHAR(255);
ALTER TABLE "mes"."equipment" ADD COLUMN IF NOT EXISTS "responsible_person_id" UUID;
ALTER TABLE "mes"."equipment" ADD COLUMN IF NOT EXISTS "department" VARCHAR(100);
ALTER TABLE "mes"."equipment" ADD COLUMN IF NOT EXISTS "purchase_price" DECIMAL(15,2);
ALTER TABLE "mes"."equipment" ADD COLUMN IF NOT EXISTS "current_value" DECIMAL(15,2);
ALTER TABLE "mes"."equipment" ADD COLUMN IF NOT EXISTS "depreciation_rate" DECIMAL(5,2);
ALTER TABLE "mes"."equipment" ADD COLUMN IF NOT EXISTS "warranty_expiry_date" DATE;
ALTER TABLE "mes"."equipment" ADD COLUMN IF NOT EXISTS "power_consumption" DECIMAL(10,2);
ALTER TABLE "mes"."equipment" ADD COLUMN IF NOT EXISTS "capacity" VARCHAR(100);
ALTER TABLE "mes"."equipment" ADD COLUMN IF NOT EXISTS "max_capacity" DECIMAL(10,2);
ALTER TABLE "mes"."equipment" ADD COLUMN IF NOT EXISTS "current_capacity" DECIMAL(10,2);
ALTER TABLE "mes"."equipment" ADD COLUMN IF NOT EXISTS "efficiency_percentage" DECIMAL(5,2);
ALTER TABLE "mes"."equipment" ADD COLUMN IF NOT EXISTS "availability_percentage" DECIMAL(5,2);
ALTER TABLE "mes"."equipment" ADD COLUMN IF NOT EXISTS "performance_percentage" DECIMAL(5,2);
ALTER TABLE "mes"."equipment" ADD COLUMN IF NOT EXISTS "quality_percentage" DECIMAL(5,2);
ALTER TABLE "mes"."equipment" ADD COLUMN IF NOT EXISTS "oee_percentage" DECIMAL(5,2);
ALTER TABLE "mes"."equipment" ADD COLUMN IF NOT EXISTS "status" VARCHAR(20) NOT NULL DEFAULT 'available';
ALTER TABLE "mes"."equipment" ADD COLUMN IF NOT EXISTS "operating_status" VARCHAR(20);
ALTER TABLE "mes"."equipment" ADD COLUMN IF NOT EXISTS "last_inspection_date" DATE;
ALTER TABLE "mes"."equipment" ADD COLUMN IF NOT EXISTS "next_inspection_date" DATE;
ALTER TABLE "mes"."equipment" ADD COLUMN IF NOT EXISTS "last_maintenance_date" DATE;
ALTER TABLE "mes"."equipment" ADD COLUMN IF NOT EXISTS "next_maintenance_date" DATE;
ALTER TABLE "mes"."equipment" ADD COLUMN IF NOT EXISTS "maintenance_frequency_days" INTEGER;
ALTER TABLE "mes"."equipment" ADD COLUMN IF NOT EXISTS "total_operating_hours" DECIMAL(10,2);
ALTER TABLE "mes"."equipment" ADD COLUMN IF NOT EXISTS "total_maintenance_count" INTEGER;
ALTER TABLE "mes"."equipment" ADD COLUMN IF NOT EXISTS "total_failure_count" INTEGER;
ALTER TABLE "mes"."equipment" ADD COLUMN IF NOT EXISTS "last_failure_date" DATE;
ALTER TABLE "mes"."equipment" ADD COLUMN IF NOT EXISTS "failure_description" TEXT;
ALTER TABLE "mes"."equipment" ADD COLUMN IF NOT EXISTS "operating_hours" JSONB;
ALTER TABLE "mes"."equipment" ADD COLUMN IF NOT EXISTS "maintenance_history" JSONB;
ALTER TABLE "mes"."equipment" ADD COLUMN IF NOT EXISTS "inspection_history" JSONB;
ALTER TABLE "mes"."equipment" ADD COLUMN IF NOT EXISTS "failure_history" JSONB;
ALTER TABLE "mes"."equipment" ADD COLUMN IF NOT EXISTS "notes" TEXT;
ALTER TABLE "mes"."equipment" ADD COLUMN IF NOT EXISTS "attachments" JSONB;
ALTER TABLE "mes"."equipment" ADD COLUMN IF NOT EXISTS "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE "mes"."equipment" ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE "mes"."equipment" ADD COLUMN IF NOT EXISTS "created_by" UUID;
ALTER TABLE "mes"."equipment" ADD COLUMN IF NOT EXISTS "updated_by" UUID;
ALTER TABLE "mes"."equipment" ADD COLUMN IF NOT EXISTS "deleted_at" TIMESTAMPTZ;
ALTER TABLE "mes"."equipment" ADD COLUMN IF NOT EXISTS "tenant_id" UUID;

-- ============ mes.equipment_inspection_records ============
CREATE TABLE IF NOT EXISTS "mes"."equipment_inspection_records" (id UUID PRIMARY KEY DEFAULT gen_random_uuid());
ALTER TABLE "mes"."equipment_inspection_records" ADD COLUMN IF NOT EXISTS "organization_id" UUID NOT NULL;
ALTER TABLE "mes"."equipment_inspection_records" ADD COLUMN IF NOT EXISTS "equipment_id" UUID NOT NULL;
ALTER TABLE "mes"."equipment_inspection_records" ADD COLUMN IF NOT EXISTS "equipment_code" VARCHAR(100);
ALTER TABLE "mes"."equipment_inspection_records" ADD COLUMN IF NOT EXISTS "equipment_name" VARCHAR(255);
ALTER TABLE "mes"."equipment_inspection_records" ADD COLUMN IF NOT EXISTS "inspection_type" VARCHAR(50);
ALTER TABLE "mes"."equipment_inspection_records" ADD COLUMN IF NOT EXISTS "inspector" VARCHAR(255) NOT NULL;
ALTER TABLE "mes"."equipment_inspection_records" ADD COLUMN IF NOT EXISTS "inspector_id" UUID;
ALTER TABLE "mes"."equipment_inspection_records" ADD COLUMN IF NOT EXISTS "inspection_date" DATE NOT NULL;
ALTER TABLE "mes"."equipment_inspection_records" ADD COLUMN IF NOT EXISTS "inspection_time" TIME;
ALTER TABLE "mes"."equipment_inspection_records" ADD COLUMN IF NOT EXISTS "location" VARCHAR(255);
ALTER TABLE "mes"."equipment_inspection_records" ADD COLUMN IF NOT EXISTS "temperature" DECIMAL(10,2);
ALTER TABLE "mes"."equipment_inspection_records" ADD COLUMN IF NOT EXISTS "vibration" DECIMAL(10,2);
ALTER TABLE "mes"."equipment_inspection_records" ADD COLUMN IF NOT EXISTS "noise_level" DECIMAL(10,2);
ALTER TABLE "mes"."equipment_inspection_records" ADD COLUMN IF NOT EXISTS "humidity" DECIMAL(5,2);
ALTER TABLE "mes"."equipment_inspection_records" ADD COLUMN IF NOT EXISTS "pressure" DECIMAL(10,2);
ALTER TABLE "mes"."equipment_inspection_records" ADD COLUMN IF NOT EXISTS "voltage" DECIMAL(10,2);
ALTER TABLE "mes"."equipment_inspection_records" ADD COLUMN IF NOT EXISTS "current" DECIMAL(10,2);
ALTER TABLE "mes"."equipment_inspection_records" ADD COLUMN IF NOT EXISTS "speed" DECIMAL(10,2);
ALTER TABLE "mes"."equipment_inspection_records" ADD COLUMN IF NOT EXISTS "inspection_items" JSONB;
ALTER TABLE "mes"."equipment_inspection_records" ADD COLUMN IF NOT EXISTS "overall_status" VARCHAR(20) NOT NULL;
ALTER TABLE "mes"."equipment_inspection_records" ADD COLUMN IF NOT EXISTS "abnormalities" TEXT;
ALTER TABLE "mes"."equipment_inspection_records" ADD COLUMN IF NOT EXISTS "recommendations" TEXT;
ALTER TABLE "mes"."equipment_inspection_records" ADD COLUMN IF NOT EXISTS "next_inspection_date" DATE;
ALTER TABLE "mes"."equipment_inspection_records" ADD COLUMN IF NOT EXISTS "status" VARCHAR(20) NOT NULL DEFAULT 'completed';
ALTER TABLE "mes"."equipment_inspection_records" ADD COLUMN IF NOT EXISTS "attachments" JSONB;
ALTER TABLE "mes"."equipment_inspection_records" ADD COLUMN IF NOT EXISTS "remarks" TEXT;
ALTER TABLE "mes"."equipment_inspection_records" ADD COLUMN IF NOT EXISTS "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE "mes"."equipment_inspection_records" ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE "mes"."equipment_inspection_records" ADD COLUMN IF NOT EXISTS "created_by" UUID;
ALTER TABLE "mes"."equipment_inspection_records" ADD COLUMN IF NOT EXISTS "updated_by" UUID;
ALTER TABLE "mes"."equipment_inspection_records" ADD COLUMN IF NOT EXISTS "deleted_at" TIMESTAMPTZ;
ALTER TABLE "mes"."equipment_inspection_records" ADD COLUMN IF NOT EXISTS "tenant_id" UUID;

-- ============ mes.equipment_maintenance_records ============
CREATE TABLE IF NOT EXISTS "mes"."equipment_maintenance_records" (id UUID PRIMARY KEY DEFAULT gen_random_uuid());
ALTER TABLE "mes"."equipment_maintenance_records" ADD COLUMN IF NOT EXISTS "organization_id" UUID NOT NULL;
ALTER TABLE "mes"."equipment_maintenance_records" ADD COLUMN IF NOT EXISTS "equipment_id" UUID NOT NULL;
ALTER TABLE "mes"."equipment_maintenance_records" ADD COLUMN IF NOT EXISTS "equipment_code" VARCHAR(100);
ALTER TABLE "mes"."equipment_maintenance_records" ADD COLUMN IF NOT EXISTS "equipment_name" VARCHAR(255);
ALTER TABLE "mes"."equipment_maintenance_records" ADD COLUMN IF NOT EXISTS "maintenance_type" VARCHAR(50) NOT NULL;
ALTER TABLE "mes"."equipment_maintenance_records" ADD COLUMN IF NOT EXISTS "maintenance_category" VARCHAR(50);
ALTER TABLE "mes"."equipment_maintenance_records" ADD COLUMN IF NOT EXISTS "description" TEXT NOT NULL;
ALTER TABLE "mes"."equipment_maintenance_records" ADD COLUMN IF NOT EXISTS "maintainer" VARCHAR(255) NOT NULL;
ALTER TABLE "mes"."equipment_maintenance_records" ADD COLUMN IF NOT EXISTS "maintainer_id" UUID;
ALTER TABLE "mes"."equipment_maintenance_records" ADD COLUMN IF NOT EXISTS "start_time" TIMESTAMPTZ NOT NULL;
ALTER TABLE "mes"."equipment_maintenance_records" ADD COLUMN IF NOT EXISTS "end_time" TIMESTAMPTZ;
ALTER TABLE "mes"."equipment_maintenance_records" ADD COLUMN IF NOT EXISTS "duration_minutes" DECIMAL(10,2);
ALTER TABLE "mes"."equipment_maintenance_records" ADD COLUMN IF NOT EXISTS "cost" DECIMAL(15,2);
ALTER TABLE "mes"."equipment_maintenance_records" ADD COLUMN IF NOT EXISTS "parts_replaced" JSONB;
ALTER TABLE "mes"."equipment_maintenance_records" ADD COLUMN IF NOT EXISTS "parts_cost" DECIMAL(15,2);
ALTER TABLE "mes"."equipment_maintenance_records" ADD COLUMN IF NOT EXISTS "labor_cost" DECIMAL(15,2);
ALTER TABLE "mes"."equipment_maintenance_records" ADD COLUMN IF NOT EXISTS "other_cost" DECIMAL(15,2);
ALTER TABLE "mes"."equipment_maintenance_records" ADD COLUMN IF NOT EXISTS "result" VARCHAR(20);
ALTER TABLE "mes"."equipment_maintenance_records" ADD COLUMN IF NOT EXISTS "effectiveness" VARCHAR(20);
ALTER TABLE "mes"."equipment_maintenance_records" ADD COLUMN IF NOT EXISTS "issues_found" TEXT;
ALTER TABLE "mes"."equipment_maintenance_records" ADD COLUMN IF NOT EXISTS "recommendations" TEXT;
ALTER TABLE "mes"."equipment_maintenance_records" ADD COLUMN IF NOT EXISTS "next_maintenance_date" DATE;
ALTER TABLE "mes"."equipment_maintenance_records" ADD COLUMN IF NOT EXISTS "status" VARCHAR(20) NOT NULL DEFAULT 'in_progress';
ALTER TABLE "mes"."equipment_maintenance_records" ADD COLUMN IF NOT EXISTS "approved_by" VARCHAR(255);
ALTER TABLE "mes"."equipment_maintenance_records" ADD COLUMN IF NOT EXISTS "approved_at" TIMESTAMPTZ;
ALTER TABLE "mes"."equipment_maintenance_records" ADD COLUMN IF NOT EXISTS "attachments" JSONB;
ALTER TABLE "mes"."equipment_maintenance_records" ADD COLUMN IF NOT EXISTS "remarks" TEXT;
ALTER TABLE "mes"."equipment_maintenance_records" ADD COLUMN IF NOT EXISTS "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE "mes"."equipment_maintenance_records" ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE "mes"."equipment_maintenance_records" ADD COLUMN IF NOT EXISTS "created_by" UUID;
ALTER TABLE "mes"."equipment_maintenance_records" ADD COLUMN IF NOT EXISTS "updated_by" UUID;
ALTER TABLE "mes"."equipment_maintenance_records" ADD COLUMN IF NOT EXISTS "deleted_at" TIMESTAMPTZ;
ALTER TABLE "mes"."equipment_maintenance_records" ADD COLUMN IF NOT EXISTS "tenant_id" UUID;

-- ============ mes.process_route_steps ============
CREATE TABLE IF NOT EXISTS "mes"."process_route_steps" (id UUID PRIMARY KEY DEFAULT gen_random_uuid());
ALTER TABLE "mes"."process_route_steps" ADD COLUMN IF NOT EXISTS "organization_id" UUID NOT NULL;
ALTER TABLE "mes"."process_route_steps" ADD COLUMN IF NOT EXISTS "route_id" UUID NOT NULL;
ALTER TABLE "mes"."process_route_steps" ADD COLUMN IF NOT EXISTS "process_id" UUID NOT NULL;
ALTER TABLE "mes"."process_route_steps" ADD COLUMN IF NOT EXISTS "sequence" INTEGER NOT NULL;
ALTER TABLE "mes"."process_route_steps" ADD COLUMN IF NOT EXISTS "is_parallel" BOOLEAN DEFAULT false;
ALTER TABLE "mes"."process_route_steps" ADD COLUMN IF NOT EXISTS "parallel_group" INTEGER;
ALTER TABLE "mes"."process_route_steps" ADD COLUMN IF NOT EXISTS "estimated_time_minutes" DECIMAL(10,2);
ALTER TABLE "mes"."process_route_steps" ADD COLUMN IF NOT EXISTS "estimated_cost" DECIMAL(15,2);
ALTER TABLE "mes"."process_route_steps" ADD COLUMN IF NOT EXISTS "status" VARCHAR(20) NOT NULL DEFAULT 'active';
ALTER TABLE "mes"."process_route_steps" ADD COLUMN IF NOT EXISTS "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE "mes"."process_route_steps" ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE "mes"."process_route_steps" ADD COLUMN IF NOT EXISTS "created_by" UUID;
ALTER TABLE "mes"."process_route_steps" ADD COLUMN IF NOT EXISTS "updated_by" UUID;
ALTER TABLE "mes"."process_route_steps" ADD COLUMN IF NOT EXISTS "deleted_at" TIMESTAMPTZ;
ALTER TABLE "mes"."process_route_steps" ADD COLUMN IF NOT EXISTS "tenant_id" UUID;

-- ============ mes.process_routes ============
CREATE TABLE IF NOT EXISTS "mes"."process_routes" (id UUID PRIMARY KEY DEFAULT gen_random_uuid());
ALTER TABLE "mes"."process_routes" ADD COLUMN IF NOT EXISTS "organization_id" UUID NOT NULL;
ALTER TABLE "mes"."process_routes" ADD COLUMN IF NOT EXISTS "route_code" VARCHAR(100) NOT NULL;
ALTER TABLE "mes"."process_routes" ADD COLUMN IF NOT EXISTS "route_name" VARCHAR(255) NOT NULL;
ALTER TABLE "mes"."process_routes" ADD COLUMN IF NOT EXISTS "product_code" VARCHAR(100);
ALTER TABLE "mes"."process_routes" ADD COLUMN IF NOT EXISTS "product_name" VARCHAR(255);
ALTER TABLE "mes"."process_routes" ADD COLUMN IF NOT EXISTS "description" TEXT;
ALTER TABLE "mes"."process_routes" ADD COLUMN IF NOT EXISTS "version" VARCHAR(20) DEFAULT '1.0';
ALTER TABLE "mes"."process_routes" ADD COLUMN IF NOT EXISTS "is_default" BOOLEAN DEFAULT false;
ALTER TABLE "mes"."process_routes" ADD COLUMN IF NOT EXISTS "is_active" BOOLEAN DEFAULT true;
ALTER TABLE "mes"."process_routes" ADD COLUMN IF NOT EXISTS "total_time_minutes" DECIMAL(10,2);
ALTER TABLE "mes"."process_routes" ADD COLUMN IF NOT EXISTS "total_cost" DECIMAL(15,2);
ALTER TABLE "mes"."process_routes" ADD COLUMN IF NOT EXISTS "status" VARCHAR(20) NOT NULL DEFAULT 'active';
ALTER TABLE "mes"."process_routes" ADD COLUMN IF NOT EXISTS "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE "mes"."process_routes" ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE "mes"."process_routes" ADD COLUMN IF NOT EXISTS "created_by" UUID;
ALTER TABLE "mes"."process_routes" ADD COLUMN IF NOT EXISTS "updated_by" UUID;
ALTER TABLE "mes"."process_routes" ADD COLUMN IF NOT EXISTS "deleted_at" TIMESTAMPTZ;
ALTER TABLE "mes"."process_routes" ADD COLUMN IF NOT EXISTS "tenant_id" UUID;

-- ============ mes.production_orders ============
CREATE TABLE IF NOT EXISTS "mes"."production_orders" (id UUID PRIMARY KEY DEFAULT gen_random_uuid());
ALTER TABLE "mes"."production_orders" ADD COLUMN IF NOT EXISTS "organization_id" UUID;
ALTER TABLE "mes"."production_orders" ADD COLUMN IF NOT EXISTS "order_number" VARCHAR(100) NOT NULL;
ALTER TABLE "mes"."production_orders" ADD COLUMN IF NOT EXISTS "order_type" VARCHAR(50);
ALTER TABLE "mes"."production_orders" ADD COLUMN IF NOT EXISTS "product_name" VARCHAR(255) NOT NULL;
ALTER TABLE "mes"."production_orders" ADD COLUMN IF NOT EXISTS "product_code" VARCHAR(100);
ALTER TABLE "mes"."production_orders" ADD COLUMN IF NOT EXISTS "product_specification" TEXT;
ALTER TABLE "mes"."production_orders" ADD COLUMN IF NOT EXISTS "batch_number" VARCHAR(100);
ALTER TABLE "mes"."production_orders" ADD COLUMN IF NOT EXISTS "quantity" INTEGER NOT NULL;
ALTER TABLE "mes"."production_orders" ADD COLUMN IF NOT EXISTS "unit" VARCHAR(20) DEFAULT 'piece';
ALTER TABLE "mes"."production_orders" ADD COLUMN IF NOT EXISTS "planned_quantity" INTEGER;
ALTER TABLE "mes"."production_orders" ADD COLUMN IF NOT EXISTS "completed_quantity" INTEGER DEFAULT 0;
ALTER TABLE "mes"."production_orders" ADD COLUMN IF NOT EXISTS "rejected_quantity" INTEGER DEFAULT 0;
ALTER TABLE "mes"."production_orders" ADD COLUMN IF NOT EXISTS "scrapped_quantity" INTEGER DEFAULT 0;
ALTER TABLE "mes"."production_orders" ADD COLUMN IF NOT EXISTS "priority" VARCHAR(20) DEFAULT 'normal';
ALTER TABLE "mes"."production_orders" ADD COLUMN IF NOT EXISTS "status" VARCHAR(20) NOT NULL DEFAULT 'created';
ALTER TABLE "mes"."production_orders" ADD COLUMN IF NOT EXISTS "progress_percentage" INTEGER DEFAULT 0;
ALTER TABLE "mes"."production_orders" ADD COLUMN IF NOT EXISTS "planned_start_date" DATE;
ALTER TABLE "mes"."production_orders" ADD COLUMN IF NOT EXISTS "planned_end_date" DATE;
ALTER TABLE "mes"."production_orders" ADD COLUMN IF NOT EXISTS "actual_start_date" DATE;
ALTER TABLE "mes"."production_orders" ADD COLUMN IF NOT EXISTS "actual_end_date" DATE;
ALTER TABLE "mes"."production_orders" ADD COLUMN IF NOT EXISTS "estimated_duration_hours" DECIMAL(10,2);
ALTER TABLE "mes"."production_orders" ADD COLUMN IF NOT EXISTS "actual_duration_hours" DECIMAL(10,2);
ALTER TABLE "mes"."production_orders" ADD COLUMN IF NOT EXISTS "customer_id" UUID;
ALTER TABLE "mes"."production_orders" ADD COLUMN IF NOT EXISTS "customer_name" VARCHAR(255);
ALTER TABLE "mes"."production_orders" ADD COLUMN IF NOT EXISTS "customer_order_number" VARCHAR(100);
ALTER TABLE "mes"."production_orders" ADD COLUMN IF NOT EXISTS "sales_order_id" UUID;
ALTER TABLE "mes"."production_orders" ADD COLUMN IF NOT EXISTS "process_route_id" UUID;
ALTER TABLE "mes"."production_orders" ADD COLUMN IF NOT EXISTS "process_route_name" VARCHAR(255);
ALTER TABLE "mes"."production_orders" ADD COLUMN IF NOT EXISTS "work_station_id" UUID;
ALTER TABLE "mes"."production_orders" ADD COLUMN IF NOT EXISTS "work_station_name" VARCHAR(255);
ALTER TABLE "mes"."production_orders" ADD COLUMN IF NOT EXISTS "assigned_to" VARCHAR(255);
ALTER TABLE "mes"."production_orders" ADD COLUMN IF NOT EXISTS "assigned_to_id" UUID;
ALTER TABLE "mes"."production_orders" ADD COLUMN IF NOT EXISTS "team" VARCHAR(100);
ALTER TABLE "mes"."production_orders" ADD COLUMN IF NOT EXISTS "material_requirements" JSONB;
ALTER TABLE "mes"."production_orders" ADD COLUMN IF NOT EXISTS "tool_requirements" JSONB;
ALTER TABLE "mes"."production_orders" ADD COLUMN IF NOT EXISTS "quality_requirements" JSONB;
ALTER TABLE "mes"."production_orders" ADD COLUMN IF NOT EXISTS "special_instructions" TEXT;
ALTER TABLE "mes"."production_orders" ADD COLUMN IF NOT EXISTS "notes" TEXT;
ALTER TABLE "mes"."production_orders" ADD COLUMN IF NOT EXISTS "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE "mes"."production_orders" ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE "mes"."production_orders" ADD COLUMN IF NOT EXISTS "created_by" UUID;
ALTER TABLE "mes"."production_orders" ADD COLUMN IF NOT EXISTS "updated_by" UUID;
ALTER TABLE "mes"."production_orders" ADD COLUMN IF NOT EXISTS "deleted_at" TIMESTAMPTZ;
ALTER TABLE "mes"."production_orders" ADD COLUMN IF NOT EXISTS "tenant_id" UUID;

-- ============ mes.production_processes ============
CREATE TABLE IF NOT EXISTS "mes"."production_processes" (id UUID PRIMARY KEY DEFAULT gen_random_uuid());
ALTER TABLE "mes"."production_processes" ADD COLUMN IF NOT EXISTS "organization_id" UUID NOT NULL;
ALTER TABLE "mes"."production_processes" ADD COLUMN IF NOT EXISTS "process_code" VARCHAR(100);
ALTER TABLE "mes"."production_processes" ADD COLUMN IF NOT EXISTS "process_name" VARCHAR(255) NOT NULL;
ALTER TABLE "mes"."production_processes" ADD COLUMN IF NOT EXISTS "process_type" VARCHAR(50);
ALTER TABLE "mes"."production_processes" ADD COLUMN IF NOT EXISTS "description" TEXT;
ALTER TABLE "mes"."production_processes" ADD COLUMN IF NOT EXISTS "sequence" INTEGER NOT NULL;
ALTER TABLE "mes"."production_processes" ADD COLUMN IF NOT EXISTS "version" VARCHAR(20) DEFAULT '1.0';
ALTER TABLE "mes"."production_processes" ADD COLUMN IF NOT EXISTS "is_active" BOOLEAN DEFAULT true;
ALTER TABLE "mes"."production_processes" ADD COLUMN IF NOT EXISTS "standard_time_minutes" DECIMAL(10,2);
ALTER TABLE "mes"."production_processes" ADD COLUMN IF NOT EXISTS "setup_time_minutes" DECIMAL(10,2);
ALTER TABLE "mes"."production_processes" ADD COLUMN IF NOT EXISTS "cycle_time_minutes" DECIMAL(10,2);
ALTER TABLE "mes"."production_processes" ADD COLUMN IF NOT EXISTS "wait_time_minutes" DECIMAL(10,2);
ALTER TABLE "mes"."production_processes" ADD COLUMN IF NOT EXISTS "work_station_id" UUID;
ALTER TABLE "mes"."production_processes" ADD COLUMN IF NOT EXISTS "work_station_name" VARCHAR(255);
ALTER TABLE "mes"."production_processes" ADD COLUMN IF NOT EXISTS "required_skills" JSONB;
ALTER TABLE "mes"."production_processes" ADD COLUMN IF NOT EXISTS "required_tools" JSONB;
ALTER TABLE "mes"."production_processes" ADD COLUMN IF NOT EXISTS "required_materials" JSONB;
ALTER TABLE "mes"."production_processes" ADD COLUMN IF NOT EXISTS "quality_check_points" JSONB;
ALTER TABLE "mes"."production_processes" ADD COLUMN IF NOT EXISTS "safety_requirements" TEXT;
ALTER TABLE "mes"."production_processes" ADD COLUMN IF NOT EXISTS "environmental_requirements" TEXT;
ALTER TABLE "mes"."production_processes" ADD COLUMN IF NOT EXISTS "operation_instructions" TEXT;
ALTER TABLE "mes"."production_processes" ADD COLUMN IF NOT EXISTS "parameters" JSONB;
ALTER TABLE "mes"."production_processes" ADD COLUMN IF NOT EXISTS "predecessor_process_id" UUID;
ALTER TABLE "mes"."production_processes" ADD COLUMN IF NOT EXISTS "successor_process_id" UUID;
ALTER TABLE "mes"."production_processes" ADD COLUMN IF NOT EXISTS "status" VARCHAR(20) NOT NULL DEFAULT 'active';
ALTER TABLE "mes"."production_processes" ADD COLUMN IF NOT EXISTS "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE "mes"."production_processes" ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE "mes"."production_processes" ADD COLUMN IF NOT EXISTS "created_by" UUID;
ALTER TABLE "mes"."production_processes" ADD COLUMN IF NOT EXISTS "updated_by" UUID;
ALTER TABLE "mes"."production_processes" ADD COLUMN IF NOT EXISTS "deleted_at" TIMESTAMPTZ;
ALTER TABLE "mes"."production_processes" ADD COLUMN IF NOT EXISTS "tenant_id" UUID;

-- ============ mes.production_records ============
CREATE TABLE IF NOT EXISTS "mes"."production_records" (id UUID PRIMARY KEY DEFAULT gen_random_uuid());
ALTER TABLE "mes"."production_records" ADD COLUMN IF NOT EXISTS "organization_id" UUID NOT NULL;
ALTER TABLE "mes"."production_records" ADD COLUMN IF NOT EXISTS "order_id" UUID NOT NULL;
ALTER TABLE "mes"."production_records" ADD COLUMN IF NOT EXISTS "process_id" UUID;
ALTER TABLE "mes"."production_records" ADD COLUMN IF NOT EXISTS "process_name" VARCHAR(255);
ALTER TABLE "mes"."production_records" ADD COLUMN IF NOT EXISTS "route_step_id" UUID;
ALTER TABLE "mes"."production_records" ADD COLUMN IF NOT EXISTS "work_station_id" UUID;
ALTER TABLE "mes"."production_records" ADD COLUMN IF NOT EXISTS "work_station_name" VARCHAR(255);
ALTER TABLE "mes"."production_records" ADD COLUMN IF NOT EXISTS "operator" VARCHAR(255) NOT NULL;
ALTER TABLE "mes"."production_records" ADD COLUMN IF NOT EXISTS "operator_id" UUID;
ALTER TABLE "mes"."production_records" ADD COLUMN IF NOT EXISTS "team" VARCHAR(100);
ALTER TABLE "mes"."production_records" ADD COLUMN IF NOT EXISTS "batch_number" VARCHAR(100);
ALTER TABLE "mes"."production_records" ADD COLUMN IF NOT EXISTS "start_time" TIMESTAMPTZ NOT NULL;
ALTER TABLE "mes"."production_records" ADD COLUMN IF NOT EXISTS "end_time" TIMESTAMPTZ;
ALTER TABLE "mes"."production_records" ADD COLUMN IF NOT EXISTS "duration_minutes" DECIMAL(10,2);
ALTER TABLE "mes"."production_records" ADD COLUMN IF NOT EXISTS "planned_quantity" INTEGER;
ALTER TABLE "mes"."production_records" ADD COLUMN IF NOT EXISTS "completed_quantity" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "mes"."production_records" ADD COLUMN IF NOT EXISTS "good_quantity" INTEGER DEFAULT 0;
ALTER TABLE "mes"."production_records" ADD COLUMN IF NOT EXISTS "rejected_quantity" INTEGER DEFAULT 0;
ALTER TABLE "mes"."production_records" ADD COLUMN IF NOT EXISTS "scrapped_quantity" INTEGER DEFAULT 0;
ALTER TABLE "mes"."production_records" ADD COLUMN IF NOT EXISTS "rework_quantity" INTEGER DEFAULT 0;
ALTER TABLE "mes"."production_records" ADD COLUMN IF NOT EXISTS "yield_rate" DECIMAL(5,2);
ALTER TABLE "mes"."production_records" ADD COLUMN IF NOT EXISTS "efficiency_rate" DECIMAL(5,2);
ALTER TABLE "mes"."production_records" ADD COLUMN IF NOT EXISTS "quality_check_result" VARCHAR(20);
ALTER TABLE "mes"."production_records" ADD COLUMN IF NOT EXISTS "quality_check_notes" TEXT;
ALTER TABLE "mes"."production_records" ADD COLUMN IF NOT EXISTS "material_usage" JSONB;
ALTER TABLE "mes"."production_records" ADD COLUMN IF NOT EXISTS "tool_usage" JSONB;
ALTER TABLE "mes"."production_records" ADD COLUMN IF NOT EXISTS "parameters" JSONB;
ALTER TABLE "mes"."production_records" ADD COLUMN IF NOT EXISTS "deviations" TEXT;
ALTER TABLE "mes"."production_records" ADD COLUMN IF NOT EXISTS "issues" TEXT;
ALTER TABLE "mes"."production_records" ADD COLUMN IF NOT EXISTS "status" VARCHAR(20) NOT NULL DEFAULT 'in_progress';
ALTER TABLE "mes"."production_records" ADD COLUMN IF NOT EXISTS "approved_by" VARCHAR(255);
ALTER TABLE "mes"."production_records" ADD COLUMN IF NOT EXISTS "approved_at" TIMESTAMPTZ;
ALTER TABLE "mes"."production_records" ADD COLUMN IF NOT EXISTS "notes" TEXT;
ALTER TABLE "mes"."production_records" ADD COLUMN IF NOT EXISTS "attachments" JSONB;
ALTER TABLE "mes"."production_records" ADD COLUMN IF NOT EXISTS "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE "mes"."production_records" ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE "mes"."production_records" ADD COLUMN IF NOT EXISTS "created_by" UUID;
ALTER TABLE "mes"."production_records" ADD COLUMN IF NOT EXISTS "updated_by" UUID;
ALTER TABLE "mes"."production_records" ADD COLUMN IF NOT EXISTS "deleted_at" TIMESTAMPTZ;
ALTER TABLE "mes"."production_records" ADD COLUMN IF NOT EXISTS "tenant_id" UUID;

-- ============ mes.work_stations ============
CREATE TABLE IF NOT EXISTS "mes"."work_stations" (id UUID PRIMARY KEY DEFAULT gen_random_uuid());
ALTER TABLE "mes"."work_stations" ADD COLUMN IF NOT EXISTS "organization_id" UUID;
ALTER TABLE "mes"."work_stations" ADD COLUMN IF NOT EXISTS "station_no" VARCHAR(100);
ALTER TABLE "mes"."work_stations" ADD COLUMN IF NOT EXISTS "station_code" VARCHAR(100);
ALTER TABLE "mes"."work_stations" ADD COLUMN IF NOT EXISTS "workshop_id" UUID;
ALTER TABLE "mes"."work_stations" ADD COLUMN IF NOT EXISTS "station_name" VARCHAR(255) NOT NULL;
ALTER TABLE "mes"."work_stations" ADD COLUMN IF NOT EXISTS "station_type" VARCHAR(50);
ALTER TABLE "mes"."work_stations" ADD COLUMN IF NOT EXISTS "description" TEXT;
ALTER TABLE "mes"."work_stations" ADD COLUMN IF NOT EXISTS "location" VARCHAR(255);
ALTER TABLE "mes"."work_stations" ADD COLUMN IF NOT EXISTS "building" VARCHAR(100);
ALTER TABLE "mes"."work_stations" ADD COLUMN IF NOT EXISTS "floor" VARCHAR(50);
ALTER TABLE "mes"."work_stations" ADD COLUMN IF NOT EXISTS "area" VARCHAR(100);
ALTER TABLE "mes"."work_stations" ADD COLUMN IF NOT EXISTS "capacity" INTEGER DEFAULT 1;
ALTER TABLE "mes"."work_stations" ADD COLUMN IF NOT EXISTS "current_load" INTEGER DEFAULT 0;
ALTER TABLE "mes"."work_stations" ADD COLUMN IF NOT EXISTS "efficiency_percentage" DECIMAL(5,2) DEFAULT 100;
ALTER TABLE "mes"."work_stations" ADD COLUMN IF NOT EXISTS "supervisor" VARCHAR(255);
ALTER TABLE "mes"."work_stations" ADD COLUMN IF NOT EXISTS "supervisor_id" UUID;
ALTER TABLE "mes"."work_stations" ADD COLUMN IF NOT EXISTS "team" VARCHAR(100);
ALTER TABLE "mes"."work_stations" ADD COLUMN IF NOT EXISTS "equipment_id" UUID;
ALTER TABLE "mes"."work_stations" ADD COLUMN IF NOT EXISTS "process_id" UUID;
ALTER TABLE "mes"."work_stations" ADD COLUMN IF NOT EXISTS "equipment_ids" JSONB;
ALTER TABLE "mes"."work_stations" ADD COLUMN IF NOT EXISTS "available_skills" JSONB;
ALTER TABLE "mes"."work_stations" ADD COLUMN IF NOT EXISTS "available_tools" JSONB;
ALTER TABLE "mes"."work_stations" ADD COLUMN IF NOT EXISTS "status" VARCHAR(20) NOT NULL DEFAULT 'available';
ALTER TABLE "mes"."work_stations" ADD COLUMN IF NOT EXISTS "last_maintenance_date" DATE;
ALTER TABLE "mes"."work_stations" ADD COLUMN IF NOT EXISTS "next_maintenance_date" DATE;
ALTER TABLE "mes"."work_stations" ADD COLUMN IF NOT EXISTS "maintenance_frequency_days" INTEGER;
ALTER TABLE "mes"."work_stations" ADD COLUMN IF NOT EXISTS "operating_hours" JSONB;
ALTER TABLE "mes"."work_stations" ADD COLUMN IF NOT EXISTS "notes" TEXT;
ALTER TABLE "mes"."work_stations" ADD COLUMN IF NOT EXISTS "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE "mes"."work_stations" ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE "mes"."work_stations" ADD COLUMN IF NOT EXISTS "created_by" UUID;
ALTER TABLE "mes"."work_stations" ADD COLUMN IF NOT EXISTS "updated_by" UUID;
ALTER TABLE "mes"."work_stations" ADD COLUMN IF NOT EXISTS "deleted_at" TIMESTAMPTZ;
ALTER TABLE "mes"."work_stations" ADD COLUMN IF NOT EXISTS "tenant_id" UUID;

-- ============ finance.budgets（部门预算，operational.rs 契约）============
CREATE TABLE IF NOT EXISTS "finance"."budgets" (id UUID PRIMARY KEY DEFAULT gen_random_uuid());
ALTER TABLE "finance"."budgets" ADD COLUMN IF NOT EXISTS "tenant_id" UUID;
ALTER TABLE "finance"."budgets" ADD COLUMN IF NOT EXISTS "department_id" UUID;
ALTER TABLE "finance"."budgets" ADD COLUMN IF NOT EXISTS "budget_type" VARCHAR(50) NOT NULL;
ALTER TABLE "finance"."budgets" ADD COLUMN IF NOT EXISTS "fiscal_year" INTEGER NOT NULL;
ALTER TABLE "finance"."budgets" ADD COLUMN IF NOT EXISTS "total_budget" NUMERIC(15,2) NOT NULL DEFAULT 0;
ALTER TABLE "finance"."budgets" ADD COLUMN IF NOT EXISTS "used_amount" NUMERIC(15,2) NOT NULL DEFAULT 0;
ALTER TABLE "finance"."budgets" ADD COLUMN IF NOT EXISTS "remaining_amount" NUMERIC(15,2) NOT NULL DEFAULT 0;
ALTER TABLE "finance"."budgets" ADD COLUMN IF NOT EXISTS "usage_rate" NUMERIC(6,2) NOT NULL DEFAULT 0;
ALTER TABLE "finance"."budgets" ADD COLUMN IF NOT EXISTS "status" VARCHAR(20) NOT NULL DEFAULT 'active';
ALTER TABLE "finance"."budgets" ADD COLUMN IF NOT EXISTS "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE "finance"."budgets" ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE "finance"."budgets" ADD COLUMN IF NOT EXISTS "deleted_at" TIMESTAMPTZ;

-- ============ pm.budgets ============
CREATE TABLE IF NOT EXISTS "pm"."budgets" (id UUID PRIMARY KEY DEFAULT gen_random_uuid());
ALTER TABLE "pm"."budgets" ADD COLUMN IF NOT EXISTS "project_id" UUID NOT NULL;
ALTER TABLE "pm"."budgets" ADD COLUMN IF NOT EXISTS "budget_type" VARCHAR(50) NOT NULL;
ALTER TABLE "pm"."budgets" ADD COLUMN IF NOT EXISTS "planned_amount" NUMERIC(15,2) NOT NULL;
ALTER TABLE "pm"."budgets" ADD COLUMN IF NOT EXISTS "actual_amount" NUMERIC(15,2) DEFAULT 0;
ALTER TABLE "pm"."budgets" ADD COLUMN IF NOT EXISTS "currency" VARCHAR(10) NOT NULL DEFAULT 'CNY';
ALTER TABLE "pm"."budgets" ADD COLUMN IF NOT EXISTS "period" VARCHAR(20);
ALTER TABLE "pm"."budgets" ADD COLUMN IF NOT EXISTS "description" TEXT;
ALTER TABLE "pm"."budgets" ADD COLUMN IF NOT EXISTS "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE "pm"."budgets" ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE "pm"."budgets" ADD COLUMN IF NOT EXISTS "deleted_at" TIMESTAMPTZ;
ALTER TABLE "pm"."budgets" ADD COLUMN IF NOT EXISTS "tenant_id" UUID NOT NULL;


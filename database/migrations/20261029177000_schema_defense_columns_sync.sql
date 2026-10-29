-- schema_defense 服务级补列批次 [sync]
-- 来源：服务自建 DDL（svc/*/src + lib/*/src）与门禁同口径提取；迁移权威缺列补齐
-- 幂等：ALTER TABLE ADD COLUMN IF NOT EXISTS；仅补列与类型（created_at/updated_at 保留 DEFAULT CURRENT_TIMESTAMP），
-- 不含 NOT NULL 等约束（已有行安全，约束治理另行评估）；目标 schema 取自本地库 information_schema

-- integration.conversion_executions: +12 列
ALTER TABLE IF EXISTS "integration"."conversion_executions" ADD COLUMN IF NOT EXISTS "completed_at" TIMESTAMP;
ALTER TABLE IF EXISTS "integration"."conversion_executions" ADD COLUMN IF NOT EXISTS "error_message" TEXT;
ALTER TABLE IF EXISTS "integration"."conversion_executions" ADD COLUMN IF NOT EXISTS "retry_count" INT;
ALTER TABLE IF EXISTS "integration"."conversion_executions" ADD COLUMN IF NOT EXISTS "rule_code" VARCHAR(64);
ALTER TABLE IF EXISTS "integration"."conversion_executions" ADD COLUMN IF NOT EXISTS "rule_id" UUID;
ALTER TABLE IF EXISTS "integration"."conversion_executions" ADD COLUMN IF NOT EXISTS "source_data" JSONB;
ALTER TABLE IF EXISTS "integration"."conversion_executions" ADD COLUMN IF NOT EXISTS "source_record_id" VARCHAR(128);
ALTER TABLE IF EXISTS "integration"."conversion_executions" ADD COLUMN IF NOT EXISTS "started_at" TIMESTAMP;
ALTER TABLE IF EXISTS "integration"."conversion_executions" ADD COLUMN IF NOT EXISTS "status" VARCHAR(32);
ALTER TABLE IF EXISTS "integration"."conversion_executions" ADD COLUMN IF NOT EXISTS "target_data" JSONB;
ALTER TABLE IF EXISTS "integration"."conversion_executions" ADD COLUMN IF NOT EXISTS "target_record_id" VARCHAR(128);
ALTER TABLE IF EXISTS "integration"."conversion_executions" ADD COLUMN IF NOT EXISTS "tenant_id" UUID;

-- integration.conversion_rules: +20 列
ALTER TABLE IF EXISTS "integration"."conversion_rules" ADD COLUMN IF NOT EXISTS "code" VARCHAR(64);
ALTER TABLE IF EXISTS "integration"."conversion_rules" ADD COLUMN IF NOT EXISTS "created_at" TIMESTAMP;
ALTER TABLE IF EXISTS "integration"."conversion_rules" ADD COLUMN IF NOT EXISTS "description" TEXT;
ALTER TABLE IF EXISTS "integration"."conversion_rules" ADD COLUMN IF NOT EXISTS "field_mappings" JSONB;
ALTER TABLE IF EXISTS "integration"."conversion_rules" ADD COLUMN IF NOT EXISTS "is_enabled" BOOLEAN;
ALTER TABLE IF EXISTS "integration"."conversion_rules" ADD COLUMN IF NOT EXISTS "max_retries" INT;
ALTER TABLE IF EXISTS "integration"."conversion_rules" ADD COLUMN IF NOT EXISTS "name" VARCHAR(128);
ALTER TABLE IF EXISTS "integration"."conversion_rules" ADD COLUMN IF NOT EXISTS "priority" INT;
ALTER TABLE IF EXISTS "integration"."conversion_rules" ADD COLUMN IF NOT EXISTS "retry_interval_secs" INT;
ALTER TABLE IF EXISTS "integration"."conversion_rules" ADD COLUMN IF NOT EXISTS "source_entity" VARCHAR(64);
ALTER TABLE IF EXISTS "integration"."conversion_rules" ADD COLUMN IF NOT EXISTS "source_system" VARCHAR(32);
ALTER TABLE IF EXISTS "integration"."conversion_rules" ADD COLUMN IF NOT EXISTS "status" VARCHAR(32);
ALTER TABLE IF EXISTS "integration"."conversion_rules" ADD COLUMN IF NOT EXISTS "stop_on_failure" BOOLEAN;
ALTER TABLE IF EXISTS "integration"."conversion_rules" ADD COLUMN IF NOT EXISTS "target_entity" VARCHAR(64);
ALTER TABLE IF EXISTS "integration"."conversion_rules" ADD COLUMN IF NOT EXISTS "target_system" VARCHAR(32);
ALTER TABLE IF EXISTS "integration"."conversion_rules" ADD COLUMN IF NOT EXISTS "tenant_id" UUID;
ALTER TABLE IF EXISTS "integration"."conversion_rules" ADD COLUMN IF NOT EXISTS "transform_script" TEXT;
ALTER TABLE IF EXISTS "integration"."conversion_rules" ADD COLUMN IF NOT EXISTS "trigger_condition" JSONB;
ALTER TABLE IF EXISTS "integration"."conversion_rules" ADD COLUMN IF NOT EXISTS "trigger_type" VARCHAR(32);
ALTER TABLE IF EXISTS "integration"."conversion_rules" ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMP;

-- integration.crm_erp_sync: +14 列
ALTER TABLE IF EXISTS "integration"."crm_erp_sync" ADD COLUMN IF NOT EXISTS "created_at" TIMESTAMPTZ;
ALTER TABLE IF EXISTS "integration"."crm_erp_sync" ADD COLUMN IF NOT EXISTS "crm_opportunity_id" UUID;
ALTER TABLE IF EXISTS "integration"."crm_erp_sync" ADD COLUMN IF NOT EXISTS "customer_code" VARCHAR(64);
ALTER TABLE IF EXISTS "integration"."crm_erp_sync" ADD COLUMN IF NOT EXISTS "direction" VARCHAR(30);
ALTER TABLE IF EXISTS "integration"."crm_erp_sync" ADD COLUMN IF NOT EXISTS "last_synced_at" TIMESTAMPTZ;
ALTER TABLE IF EXISTS "integration"."crm_erp_sync" ADD COLUMN IF NOT EXISTS "max_retries" INT;
ALTER TABLE IF EXISTS "integration"."crm_erp_sync" ADD COLUMN IF NOT EXISTS "payload" JSONB;
ALTER TABLE IF EXISTS "integration"."crm_erp_sync" ADD COLUMN IF NOT EXISTS "result_payload" JSONB;
ALTER TABLE IF EXISTS "integration"."crm_erp_sync" ADD COLUMN IF NOT EXISTS "retry_count" INT;
ALTER TABLE IF EXISTS "integration"."crm_erp_sync" ADD COLUMN IF NOT EXISTS "sync_error" TEXT;
ALTER TABLE IF EXISTS "integration"."crm_erp_sync" ADD COLUMN IF NOT EXISTS "sync_status" VARCHAR(50);
ALTER TABLE IF EXISTS "integration"."crm_erp_sync" ADD COLUMN IF NOT EXISTS "sync_type" VARCHAR(50);
ALTER TABLE IF EXISTS "integration"."crm_erp_sync" ADD COLUMN IF NOT EXISTS "synced" BOOLEAN;
ALTER TABLE IF EXISTS "integration"."crm_erp_sync" ADD COLUMN IF NOT EXISTS "tenant_id" UUID;

-- integration.crm_scm_sync: +22 列
ALTER TABLE IF EXISTS "integration"."crm_scm_sync" ADD COLUMN IF NOT EXISTS "created_at" TIMESTAMPTZ;
ALTER TABLE IF EXISTS "integration"."crm_scm_sync" ADD COLUMN IF NOT EXISTS "crm_opportunity_id" UUID;
ALTER TABLE IF EXISTS "integration"."crm_scm_sync" ADD COLUMN IF NOT EXISTS "crm_product_id" UUID;
ALTER TABLE IF EXISTS "integration"."crm_scm_sync" ADD COLUMN IF NOT EXISTS "direction" VARCHAR(30);
ALTER TABLE IF EXISTS "integration"."crm_scm_sync" ADD COLUMN IF NOT EXISTS "last_synced_at" TIMESTAMPTZ;
ALTER TABLE IF EXISTS "integration"."crm_scm_sync" ADD COLUMN IF NOT EXISTS "max_retries" INT;
ALTER TABLE IF EXISTS "integration"."crm_scm_sync" ADD COLUMN IF NOT EXISTS "opportunity_no" VARCHAR(64);
ALTER TABLE IF EXISTS "integration"."crm_scm_sync" ADD COLUMN IF NOT EXISTS "payload" JSONB;
ALTER TABLE IF EXISTS "integration"."crm_scm_sync" ADD COLUMN IF NOT EXISTS "product_code" VARCHAR(64);
ALTER TABLE IF EXISTS "integration"."crm_scm_sync" ADD COLUMN IF NOT EXISTS "product_name" VARCHAR(256);
ALTER TABLE IF EXISTS "integration"."crm_scm_sync" ADD COLUMN IF NOT EXISTS "purchase_order_no" VARCHAR(64);
ALTER TABLE IF EXISTS "integration"."crm_scm_sync" ADD COLUMN IF NOT EXISTS "result_payload" JSONB;
ALTER TABLE IF EXISTS "integration"."crm_scm_sync" ADD COLUMN IF NOT EXISTS "retry_count" INT;
ALTER TABLE IF EXISTS "integration"."crm_scm_sync" ADD COLUMN IF NOT EXISTS "scm_purchase_order_id" UUID;
ALTER TABLE IF EXISTS "integration"."crm_scm_sync" ADD COLUMN IF NOT EXISTS "scm_supplier_id" UUID;
ALTER TABLE IF EXISTS "integration"."crm_scm_sync" ADD COLUMN IF NOT EXISTS "supplier_code" VARCHAR(64);
ALTER TABLE IF EXISTS "integration"."crm_scm_sync" ADD COLUMN IF NOT EXISTS "supplier_name" VARCHAR(256);
ALTER TABLE IF EXISTS "integration"."crm_scm_sync" ADD COLUMN IF NOT EXISTS "sync_error" TEXT;
ALTER TABLE IF EXISTS "integration"."crm_scm_sync" ADD COLUMN IF NOT EXISTS "sync_status" VARCHAR(50);
ALTER TABLE IF EXISTS "integration"."crm_scm_sync" ADD COLUMN IF NOT EXISTS "sync_type" VARCHAR(50);
ALTER TABLE IF EXISTS "integration"."crm_scm_sync" ADD COLUMN IF NOT EXISTS "synced" BOOLEAN;
ALTER TABLE IF EXISTS "integration"."crm_scm_sync" ADD COLUMN IF NOT EXISTS "tenant_id" UUID;

-- integration.erp_wms_sync: +14 列
ALTER TABLE IF EXISTS "integration"."erp_wms_sync" ADD COLUMN IF NOT EXISTS "created_at" TIMESTAMPTZ;
ALTER TABLE IF EXISTS "integration"."erp_wms_sync" ADD COLUMN IF NOT EXISTS "direction" VARCHAR(30);
ALTER TABLE IF EXISTS "integration"."erp_wms_sync" ADD COLUMN IF NOT EXISTS "last_synced_at" TIMESTAMPTZ;
ALTER TABLE IF EXISTS "integration"."erp_wms_sync" ADD COLUMN IF NOT EXISTS "max_retries" INT;
ALTER TABLE IF EXISTS "integration"."erp_wms_sync" ADD COLUMN IF NOT EXISTS "payload" JSONB;
ALTER TABLE IF EXISTS "integration"."erp_wms_sync" ADD COLUMN IF NOT EXISTS "product_name" VARCHAR(256);
ALTER TABLE IF EXISTS "integration"."erp_wms_sync" ADD COLUMN IF NOT EXISTS "result_payload" JSONB;
ALTER TABLE IF EXISTS "integration"."erp_wms_sync" ADD COLUMN IF NOT EXISTS "retry_count" INT;
ALTER TABLE IF EXISTS "integration"."erp_wms_sync" ADD COLUMN IF NOT EXISTS "sync_error" TEXT;
ALTER TABLE IF EXISTS "integration"."erp_wms_sync" ADD COLUMN IF NOT EXISTS "sync_status" VARCHAR(50);
ALTER TABLE IF EXISTS "integration"."erp_wms_sync" ADD COLUMN IF NOT EXISTS "sync_type" VARCHAR(50);
ALTER TABLE IF EXISTS "integration"."erp_wms_sync" ADD COLUMN IF NOT EXISTS "synced" BOOLEAN;
ALTER TABLE IF EXISTS "integration"."erp_wms_sync" ADD COLUMN IF NOT EXISTS "tenant_id" UUID;
ALTER TABLE IF EXISTS "integration"."erp_wms_sync" ADD COLUMN IF NOT EXISTS "wms_transaction_id" UUID;

-- integration.hrm_finance_sync: +14 列
ALTER TABLE IF EXISTS "integration"."hrm_finance_sync" ADD COLUMN IF NOT EXISTS "created_at" TIMESTAMPTZ;
ALTER TABLE IF EXISTS "integration"."hrm_finance_sync" ADD COLUMN IF NOT EXISTS "direction" VARCHAR(30);
ALTER TABLE IF EXISTS "integration"."hrm_finance_sync" ADD COLUMN IF NOT EXISTS "finance_payroll_id" UUID;
ALTER TABLE IF EXISTS "integration"."hrm_finance_sync" ADD COLUMN IF NOT EXISTS "hrm_employee_id" UUID;
ALTER TABLE IF EXISTS "integration"."hrm_finance_sync" ADD COLUMN IF NOT EXISTS "last_synced_at" TIMESTAMPTZ;
ALTER TABLE IF EXISTS "integration"."hrm_finance_sync" ADD COLUMN IF NOT EXISTS "max_retries" INT;
ALTER TABLE IF EXISTS "integration"."hrm_finance_sync" ADD COLUMN IF NOT EXISTS "payload" JSONB;
ALTER TABLE IF EXISTS "integration"."hrm_finance_sync" ADD COLUMN IF NOT EXISTS "result_payload" JSONB;
ALTER TABLE IF EXISTS "integration"."hrm_finance_sync" ADD COLUMN IF NOT EXISTS "retry_count" INT;
ALTER TABLE IF EXISTS "integration"."hrm_finance_sync" ADD COLUMN IF NOT EXISTS "sync_error" TEXT;
ALTER TABLE IF EXISTS "integration"."hrm_finance_sync" ADD COLUMN IF NOT EXISTS "sync_status" VARCHAR(50);
ALTER TABLE IF EXISTS "integration"."hrm_finance_sync" ADD COLUMN IF NOT EXISTS "sync_type" VARCHAR(50);
ALTER TABLE IF EXISTS "integration"."hrm_finance_sync" ADD COLUMN IF NOT EXISTS "synced" BOOLEAN;
ALTER TABLE IF EXISTS "integration"."hrm_finance_sync" ADD COLUMN IF NOT EXISTS "tenant_id" UUID;

-- public.conversion_executions: +12 列
ALTER TABLE IF EXISTS "public"."conversion_executions" ADD COLUMN IF NOT EXISTS "completed_at" TIMESTAMP;
ALTER TABLE IF EXISTS "public"."conversion_executions" ADD COLUMN IF NOT EXISTS "error_message" TEXT;
ALTER TABLE IF EXISTS "public"."conversion_executions" ADD COLUMN IF NOT EXISTS "retry_count" INT;
ALTER TABLE IF EXISTS "public"."conversion_executions" ADD COLUMN IF NOT EXISTS "rule_code" VARCHAR(64);
ALTER TABLE IF EXISTS "public"."conversion_executions" ADD COLUMN IF NOT EXISTS "rule_id" UUID;
ALTER TABLE IF EXISTS "public"."conversion_executions" ADD COLUMN IF NOT EXISTS "source_data" JSONB;
ALTER TABLE IF EXISTS "public"."conversion_executions" ADD COLUMN IF NOT EXISTS "source_record_id" VARCHAR(128);
ALTER TABLE IF EXISTS "public"."conversion_executions" ADD COLUMN IF NOT EXISTS "started_at" TIMESTAMP;
ALTER TABLE IF EXISTS "public"."conversion_executions" ADD COLUMN IF NOT EXISTS "status" VARCHAR(32);
ALTER TABLE IF EXISTS "public"."conversion_executions" ADD COLUMN IF NOT EXISTS "target_data" JSONB;
ALTER TABLE IF EXISTS "public"."conversion_executions" ADD COLUMN IF NOT EXISTS "target_record_id" VARCHAR(128);
ALTER TABLE IF EXISTS "public"."conversion_executions" ADD COLUMN IF NOT EXISTS "tenant_id" UUID;

-- public.conversion_rules: +20 列
ALTER TABLE IF EXISTS "public"."conversion_rules" ADD COLUMN IF NOT EXISTS "code" VARCHAR(64);
ALTER TABLE IF EXISTS "public"."conversion_rules" ADD COLUMN IF NOT EXISTS "created_at" TIMESTAMP;
ALTER TABLE IF EXISTS "public"."conversion_rules" ADD COLUMN IF NOT EXISTS "description" TEXT;
ALTER TABLE IF EXISTS "public"."conversion_rules" ADD COLUMN IF NOT EXISTS "field_mappings" JSONB;
ALTER TABLE IF EXISTS "public"."conversion_rules" ADD COLUMN IF NOT EXISTS "is_enabled" BOOLEAN;
ALTER TABLE IF EXISTS "public"."conversion_rules" ADD COLUMN IF NOT EXISTS "max_retries" INT;
ALTER TABLE IF EXISTS "public"."conversion_rules" ADD COLUMN IF NOT EXISTS "name" VARCHAR(128);
ALTER TABLE IF EXISTS "public"."conversion_rules" ADD COLUMN IF NOT EXISTS "priority" INT;
ALTER TABLE IF EXISTS "public"."conversion_rules" ADD COLUMN IF NOT EXISTS "retry_interval_secs" INT;
ALTER TABLE IF EXISTS "public"."conversion_rules" ADD COLUMN IF NOT EXISTS "source_entity" VARCHAR(64);
ALTER TABLE IF EXISTS "public"."conversion_rules" ADD COLUMN IF NOT EXISTS "source_system" VARCHAR(32);
ALTER TABLE IF EXISTS "public"."conversion_rules" ADD COLUMN IF NOT EXISTS "status" VARCHAR(32);
ALTER TABLE IF EXISTS "public"."conversion_rules" ADD COLUMN IF NOT EXISTS "stop_on_failure" BOOLEAN;
ALTER TABLE IF EXISTS "public"."conversion_rules" ADD COLUMN IF NOT EXISTS "target_entity" VARCHAR(64);
ALTER TABLE IF EXISTS "public"."conversion_rules" ADD COLUMN IF NOT EXISTS "target_system" VARCHAR(32);
ALTER TABLE IF EXISTS "public"."conversion_rules" ADD COLUMN IF NOT EXISTS "tenant_id" UUID;
ALTER TABLE IF EXISTS "public"."conversion_rules" ADD COLUMN IF NOT EXISTS "transform_script" TEXT;
ALTER TABLE IF EXISTS "public"."conversion_rules" ADD COLUMN IF NOT EXISTS "trigger_condition" JSONB;
ALTER TABLE IF EXISTS "public"."conversion_rules" ADD COLUMN IF NOT EXISTS "trigger_type" VARCHAR(32);
ALTER TABLE IF EXISTS "public"."conversion_rules" ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMP;

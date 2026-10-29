-- schema_defense 服务级补列批次 [pdm]
-- 来源：服务自建 DDL（svc/*/src + lib/*/src）与门禁同口径提取；迁移权威缺列补齐
-- 幂等：ALTER TABLE ADD COLUMN IF NOT EXISTS；仅补列与类型（created_at/updated_at 保留 DEFAULT CURRENT_TIMESTAMP），
-- 不含 NOT NULL 等约束（已有行安全，约束治理另行评估）；目标 schema 取自本地库 information_schema

-- pdm.pdm_bom_items: +9 列
ALTER TABLE IF EXISTS "pdm"."pdm_bom_items" ADD COLUMN IF NOT EXISTS "bom_id" UUID;
ALTER TABLE IF EXISTS "pdm"."pdm_bom_items" ADD COLUMN IF NOT EXISTS "loss_rate" DECIMAL(8,4);
ALTER TABLE IF EXISTS "pdm"."pdm_bom_items" ADD COLUMN IF NOT EXISTS "material_code" VARCHAR(64);
ALTER TABLE IF EXISTS "pdm"."pdm_bom_items" ADD COLUMN IF NOT EXISTS "material_id" UUID;
ALTER TABLE IF EXISTS "pdm"."pdm_bom_items" ADD COLUMN IF NOT EXISTS "material_name" VARCHAR(256);
ALTER TABLE IF EXISTS "pdm"."pdm_bom_items" ADD COLUMN IF NOT EXISTS "quantity" DECIMAL(18,4);
ALTER TABLE IF EXISTS "pdm"."pdm_bom_items" ADD COLUMN IF NOT EXISTS "sequence" INT;
ALTER TABLE IF EXISTS "pdm"."pdm_bom_items" ADD COLUMN IF NOT EXISTS "specification" VARCHAR(256);
ALTER TABLE IF EXISTS "pdm"."pdm_bom_items" ADD COLUMN IF NOT EXISTS "unit" VARCHAR(32);

-- pdm.pdm_boms: +8 列
ALTER TABLE IF EXISTS "pdm"."pdm_boms" ADD COLUMN IF NOT EXISTS "bom_no" VARCHAR(64);
ALTER TABLE IF EXISTS "pdm"."pdm_boms" ADD COLUMN IF NOT EXISTS "created_at" TIMESTAMP;
ALTER TABLE IF EXISTS "pdm"."pdm_boms" ADD COLUMN IF NOT EXISTS "description" TEXT;
ALTER TABLE IF EXISTS "pdm"."pdm_boms" ADD COLUMN IF NOT EXISTS "product_code" VARCHAR(64);
ALTER TABLE IF EXISTS "pdm"."pdm_boms" ADD COLUMN IF NOT EXISTS "product_id" UUID;
ALTER TABLE IF EXISTS "pdm"."pdm_boms" ADD COLUMN IF NOT EXISTS "product_name" VARCHAR(256);
ALTER TABLE IF EXISTS "pdm"."pdm_boms" ADD COLUMN IF NOT EXISTS "status" VARCHAR(32);
ALTER TABLE IF EXISTS "pdm"."pdm_boms" ADD COLUMN IF NOT EXISTS "version" VARCHAR(32);

-- pdm.pdm_change_notices: +6 列
ALTER TABLE IF EXISTS "pdm"."pdm_change_notices" ADD COLUMN IF NOT EXISTS "affected_items" JSONB;
ALTER TABLE IF EXISTS "pdm"."pdm_change_notices" ADD COLUMN IF NOT EXISTS "approved_at" TIMESTAMP;
ALTER TABLE IF EXISTS "pdm"."pdm_change_notices" ADD COLUMN IF NOT EXISTS "approver" VARCHAR(128);
ALTER TABLE IF EXISTS "pdm"."pdm_change_notices" ADD COLUMN IF NOT EXISTS "effective_date" TIMESTAMP;
ALTER TABLE IF EXISTS "pdm"."pdm_change_notices" ADD COLUMN IF NOT EXISTS "initiator" VARCHAR(128);
ALTER TABLE IF EXISTS "pdm"."pdm_change_notices" ADD COLUMN IF NOT EXISTS "reason" TEXT;

-- pdm.pdm_configurations: +9 列
ALTER TABLE IF EXISTS "pdm"."pdm_configurations" ADD COLUMN IF NOT EXISTS "config_items" JSONB;
ALTER TABLE IF EXISTS "pdm"."pdm_configurations" ADD COLUMN IF NOT EXISTS "config_no" VARCHAR(64);
ALTER TABLE IF EXISTS "pdm"."pdm_configurations" ADD COLUMN IF NOT EXISTS "created_at" TIMESTAMP;
ALTER TABLE IF EXISTS "pdm"."pdm_configurations" ADD COLUMN IF NOT EXISTS "created_by" VARCHAR(128);
ALTER TABLE IF EXISTS "pdm"."pdm_configurations" ADD COLUMN IF NOT EXISTS "description" TEXT;
ALTER TABLE IF EXISTS "pdm"."pdm_configurations" ADD COLUMN IF NOT EXISTS "name" VARCHAR(256);
ALTER TABLE IF EXISTS "pdm"."pdm_configurations" ADD COLUMN IF NOT EXISTS "product_id" UUID;
ALTER TABLE IF EXISTS "pdm"."pdm_configurations" ADD COLUMN IF NOT EXISTS "status" VARCHAR(32);
ALTER TABLE IF EXISTS "pdm"."pdm_configurations" ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMP;

-- pdm.pdm_document_versions: +20 列
ALTER TABLE IF EXISTS "pdm"."pdm_document_versions" ADD COLUMN IF NOT EXISTS "approved_by" VARCHAR(128);
ALTER TABLE IF EXISTS "pdm"."pdm_document_versions" ADD COLUMN IF NOT EXISTS "changes" TEXT[];
ALTER TABLE IF EXISTS "pdm"."pdm_document_versions" ADD COLUMN IF NOT EXISTS "created_at" TIMESTAMP;
ALTER TABLE IF EXISTS "pdm"."pdm_document_versions" ADD COLUMN IF NOT EXISTS "created_by" VARCHAR(128);
ALTER TABLE IF EXISTS "pdm"."pdm_document_versions" ADD COLUMN IF NOT EXISTS "created_by_name" VARCHAR(128);
ALTER TABLE IF EXISTS "pdm"."pdm_document_versions" ADD COLUMN IF NOT EXISTS "deleted_at" TIMESTAMP;
ALTER TABLE IF EXISTS "pdm"."pdm_document_versions" ADD COLUMN IF NOT EXISTS "description" TEXT;
ALTER TABLE IF EXISTS "pdm"."pdm_document_versions" ADD COLUMN IF NOT EXISTS "document_id" UUID;
ALTER TABLE IF EXISTS "pdm"."pdm_document_versions" ADD COLUMN IF NOT EXISTS "document_type" VARCHAR(64);
ALTER TABLE IF EXISTS "pdm"."pdm_document_versions" ADD COLUMN IF NOT EXISTS "file_content" BYTEA;
ALTER TABLE IF EXISTS "pdm"."pdm_document_versions" ADD COLUMN IF NOT EXISTS "file_type" VARCHAR(128);
ALTER TABLE IF EXISTS "pdm"."pdm_document_versions" ADD COLUMN IF NOT EXISTS "file_url" VARCHAR(1000);
ALTER TABLE IF EXISTS "pdm"."pdm_document_versions" ADD COLUMN IF NOT EXISTS "filesize" BIGINT;
ALTER TABLE IF EXISTS "pdm"."pdm_document_versions" ADD COLUMN IF NOT EXISTS "published_at" TIMESTAMP;
ALTER TABLE IF EXISTS "pdm"."pdm_document_versions" ADD COLUMN IF NOT EXISTS "reviewed_by" VARCHAR(128);
ALTER TABLE IF EXISTS "pdm"."pdm_document_versions" ADD COLUMN IF NOT EXISTS "status" VARCHAR(32);
ALTER TABLE IF EXISTS "pdm"."pdm_document_versions" ADD COLUMN IF NOT EXISTS "tenant_id" UUID;
ALTER TABLE IF EXISTS "pdm"."pdm_document_versions" ADD COLUMN IF NOT EXISTS "title" VARCHAR(256);
ALTER TABLE IF EXISTS "pdm"."pdm_document_versions" ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMP;
ALTER TABLE IF EXISTS "pdm"."pdm_document_versions" ADD COLUMN IF NOT EXISTS "version_number" VARCHAR(64);

-- pdm.pdm_documents: +12 列
ALTER TABLE IF EXISTS "pdm"."pdm_documents" ADD COLUMN IF NOT EXISTS "created_at" TIMESTAMP;
ALTER TABLE IF EXISTS "pdm"."pdm_documents" ADD COLUMN IF NOT EXISTS "created_by" VARCHAR(128);
ALTER TABLE IF EXISTS "pdm"."pdm_documents" ADD COLUMN IF NOT EXISTS "description" TEXT;
ALTER TABLE IF EXISTS "pdm"."pdm_documents" ADD COLUMN IF NOT EXISTS "document_no" VARCHAR(64);
ALTER TABLE IF EXISTS "pdm"."pdm_documents" ADD COLUMN IF NOT EXISTS "document_type" VARCHAR(64);
ALTER TABLE IF EXISTS "pdm"."pdm_documents" ADD COLUMN IF NOT EXISTS "file_path" VARCHAR(500);
ALTER TABLE IF EXISTS "pdm"."pdm_documents" ADD COLUMN IF NOT EXISTS "file_size" BIGINT;
ALTER TABLE IF EXISTS "pdm"."pdm_documents" ADD COLUMN IF NOT EXISTS "name" VARCHAR(256);
ALTER TABLE IF EXISTS "pdm"."pdm_documents" ADD COLUMN IF NOT EXISTS "status" VARCHAR(32);
ALTER TABLE IF EXISTS "pdm"."pdm_documents" ADD COLUMN IF NOT EXISTS "tenant_id" UUID;
ALTER TABLE IF EXISTS "pdm"."pdm_documents" ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMP;
ALTER TABLE IF EXISTS "pdm"."pdm_documents" ADD COLUMN IF NOT EXISTS "version" VARCHAR(32);

-- pdm.pdm_production_formulas: +8 列
ALTER TABLE IF EXISTS "pdm"."pdm_production_formulas" ADD COLUMN IF NOT EXISTS "created_at" TIMESTAMP;
ALTER TABLE IF EXISTS "pdm"."pdm_production_formulas" ADD COLUMN IF NOT EXISTS "description" TEXT;
ALTER TABLE IF EXISTS "pdm"."pdm_production_formulas" ADD COLUMN IF NOT EXISTS "formula_items" JSONB;
ALTER TABLE IF EXISTS "pdm"."pdm_production_formulas" ADD COLUMN IF NOT EXISTS "formula_no" VARCHAR(64);
ALTER TABLE IF EXISTS "pdm"."pdm_production_formulas" ADD COLUMN IF NOT EXISTS "name" VARCHAR(256);
ALTER TABLE IF EXISTS "pdm"."pdm_production_formulas" ADD COLUMN IF NOT EXISTS "product_id" UUID;
ALTER TABLE IF EXISTS "pdm"."pdm_production_formulas" ADD COLUMN IF NOT EXISTS "status" VARCHAR(32);
ALTER TABLE IF EXISTS "pdm"."pdm_production_formulas" ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMP;

-- pdm.pdm_production_processes: +9 列
ALTER TABLE IF EXISTS "pdm"."pdm_production_processes" ADD COLUMN IF NOT EXISTS "created_at" TIMESTAMP;
ALTER TABLE IF EXISTS "pdm"."pdm_production_processes" ADD COLUMN IF NOT EXISTS "description" TEXT;
ALTER TABLE IF EXISTS "pdm"."pdm_production_processes" ADD COLUMN IF NOT EXISTS "name" VARCHAR(256);
ALTER TABLE IF EXISTS "pdm"."pdm_production_processes" ADD COLUMN IF NOT EXISTS "process_no" VARCHAR(64);
ALTER TABLE IF EXISTS "pdm"."pdm_production_processes" ADD COLUMN IF NOT EXISTS "process_type" VARCHAR(64);
ALTER TABLE IF EXISTS "pdm"."pdm_production_processes" ADD COLUMN IF NOT EXISTS "standard_time" DECIMAL(10,2);
ALTER TABLE IF EXISTS "pdm"."pdm_production_processes" ADD COLUMN IF NOT EXISTS "status" VARCHAR(32);
ALTER TABLE IF EXISTS "pdm"."pdm_production_processes" ADD COLUMN IF NOT EXISTS "unit" VARCHAR(32);
ALTER TABLE IF EXISTS "pdm"."pdm_production_processes" ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMP;

-- pdm.pdm_project_phases: +10 列
ALTER TABLE IF EXISTS "pdm"."pdm_project_phases" ADD COLUMN IF NOT EXISTS "created_at" TIMESTAMP;
ALTER TABLE IF EXISTS "pdm"."pdm_project_phases" ADD COLUMN IF NOT EXISTS "deliverables" TEXT[];
ALTER TABLE IF EXISTS "pdm"."pdm_project_phases" ADD COLUMN IF NOT EXISTS "description" TEXT;
ALTER TABLE IF EXISTS "pdm"."pdm_project_phases" ADD COLUMN IF NOT EXISTS "end_date" TIMESTAMP;
ALTER TABLE IF EXISTS "pdm"."pdm_project_phases" ADD COLUMN IF NOT EXISTS "name" VARCHAR(256);
ALTER TABLE IF EXISTS "pdm"."pdm_project_phases" ADD COLUMN IF NOT EXISTS "phase" VARCHAR(64);
ALTER TABLE IF EXISTS "pdm"."pdm_project_phases" ADD COLUMN IF NOT EXISTS "project_id" UUID;
ALTER TABLE IF EXISTS "pdm"."pdm_project_phases" ADD COLUMN IF NOT EXISTS "start_date" TIMESTAMP;
ALTER TABLE IF EXISTS "pdm"."pdm_project_phases" ADD COLUMN IF NOT EXISTS "status" VARCHAR(32);
ALTER TABLE IF EXISTS "pdm"."pdm_project_phases" ADD COLUMN IF NOT EXISTS "tenant_id" UUID;

-- pdm.pdm_projects: +1 列
ALTER TABLE IF EXISTS "pdm"."pdm_projects" ADD COLUMN IF NOT EXISTS "deleted_at" TIMESTAMP;

-- pdm.pdm_versions: +10 列
ALTER TABLE IF EXISTS "pdm"."pdm_versions" ADD COLUMN IF NOT EXISTS "created_at" TIMESTAMP;
ALTER TABLE IF EXISTS "pdm"."pdm_versions" ADD COLUMN IF NOT EXISTS "created_by" VARCHAR(128);
ALTER TABLE IF EXISTS "pdm"."pdm_versions" ADD COLUMN IF NOT EXISTS "description" TEXT;
ALTER TABLE IF EXISTS "pdm"."pdm_versions" ADD COLUMN IF NOT EXISTS "status" VARCHAR(32);
ALTER TABLE IF EXISTS "pdm"."pdm_versions" ADD COLUMN IF NOT EXISTS "target_id" UUID;
ALTER TABLE IF EXISTS "pdm"."pdm_versions" ADD COLUMN IF NOT EXISTS "target_name" VARCHAR(256);
ALTER TABLE IF EXISTS "pdm"."pdm_versions" ADD COLUMN IF NOT EXISTS "target_type" VARCHAR(64);
ALTER TABLE IF EXISTS "pdm"."pdm_versions" ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMP;
ALTER TABLE IF EXISTS "pdm"."pdm_versions" ADD COLUMN IF NOT EXISTS "version_label" VARCHAR(32);
ALTER TABLE IF EXISTS "pdm"."pdm_versions" ADD COLUMN IF NOT EXISTS "version_no" VARCHAR(64);

-- pdm.pdm_workflow_instances: +10 列
ALTER TABLE IF EXISTS "pdm"."pdm_workflow_instances" ADD COLUMN IF NOT EXISTS "assignees" JSONB;
ALTER TABLE IF EXISTS "pdm"."pdm_workflow_instances" ADD COLUMN IF NOT EXISTS "created_at" TIMESTAMP;
ALTER TABLE IF EXISTS "pdm"."pdm_workflow_instances" ADD COLUMN IF NOT EXISTS "created_by" VARCHAR(128);
ALTER TABLE IF EXISTS "pdm"."pdm_workflow_instances" ADD COLUMN IF NOT EXISTS "current_step" VARCHAR(64);
ALTER TABLE IF EXISTS "pdm"."pdm_workflow_instances" ADD COLUMN IF NOT EXISTS "history" JSONB;
ALTER TABLE IF EXISTS "pdm"."pdm_workflow_instances" ADD COLUMN IF NOT EXISTS "status" VARCHAR(32);
ALTER TABLE IF EXISTS "pdm"."pdm_workflow_instances" ADD COLUMN IF NOT EXISTS "target_id" UUID;
ALTER TABLE IF EXISTS "pdm"."pdm_workflow_instances" ADD COLUMN IF NOT EXISTS "target_type" VARCHAR(64);
ALTER TABLE IF EXISTS "pdm"."pdm_workflow_instances" ADD COLUMN IF NOT EXISTS "workflow_id" UUID;
ALTER TABLE IF EXISTS "pdm"."pdm_workflow_instances" ADD COLUMN IF NOT EXISTS "workflow_name" VARCHAR(256);

-- pdm.pdm_workflows: +9 列
ALTER TABLE IF EXISTS "pdm"."pdm_workflows" ADD COLUMN IF NOT EXISTS "conditions" JSONB;
ALTER TABLE IF EXISTS "pdm"."pdm_workflows" ADD COLUMN IF NOT EXISTS "created_at" TIMESTAMP;
ALTER TABLE IF EXISTS "pdm"."pdm_workflows" ADD COLUMN IF NOT EXISTS "created_by" VARCHAR(128);
ALTER TABLE IF EXISTS "pdm"."pdm_workflows" ADD COLUMN IF NOT EXISTS "description" TEXT;
ALTER TABLE IF EXISTS "pdm"."pdm_workflows" ADD COLUMN IF NOT EXISTS "name" VARCHAR(256);
ALTER TABLE IF EXISTS "pdm"."pdm_workflows" ADD COLUMN IF NOT EXISTS "status" VARCHAR(32);
ALTER TABLE IF EXISTS "pdm"."pdm_workflows" ADD COLUMN IF NOT EXISTS "steps" JSONB;
ALTER TABLE IF EXISTS "pdm"."pdm_workflows" ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMP;
ALTER TABLE IF EXISTS "pdm"."pdm_workflows" ADD COLUMN IF NOT EXISTS "workflow_type" VARCHAR(64);

-- public.pdm_change_notices: +6 列
ALTER TABLE IF EXISTS "public"."pdm_change_notices" ADD COLUMN IF NOT EXISTS "affected_items" JSONB;
ALTER TABLE IF EXISTS "public"."pdm_change_notices" ADD COLUMN IF NOT EXISTS "approved_at" TIMESTAMP;
ALTER TABLE IF EXISTS "public"."pdm_change_notices" ADD COLUMN IF NOT EXISTS "approver" VARCHAR(128);
ALTER TABLE IF EXISTS "public"."pdm_change_notices" ADD COLUMN IF NOT EXISTS "effective_date" TIMESTAMP;
ALTER TABLE IF EXISTS "public"."pdm_change_notices" ADD COLUMN IF NOT EXISTS "initiator" VARCHAR(128);
ALTER TABLE IF EXISTS "public"."pdm_change_notices" ADD COLUMN IF NOT EXISTS "reason" TEXT;

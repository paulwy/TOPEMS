-- ============================================================================
-- 20261007000016 — 约束级收敛（二）：5433 空库重放 NOT NULL 缺口
-- ============================================================================
-- 第二轮约束对拍（0014/0015 后）剩余：5433 缺 40 条 NOT NULL
-- （core_users/core_workflow_*/wms.*/core_doc_*/_archive_core_* 等列，
--  5432 服务运行时已收紧、5433 迁移链建表未收紧）。
-- PK 名差异（pkey/pkey1/_archive 前缀镜像互换）为功能等价（同 p12 先例），
-- 不补；本迁移仅 SET NOT NULL（幂等，5433 空库安全、5432 no-op）。
-- ============================================================================

-- =============================================================================
-- 由 scripts/gen-missing-constraints-migration.py 生成（约束级系统性补链）
-- 基线: postgres://topems:topems_secret@localhost:5432/topems  目标: postgres://topems:topems_secret@127.0.0.1:5433/topems
-- 同表缺失约束: 47（PK 7 / FK 0 / UNIQUE 0 / CHECK 0 / NOT NULL 40）
-- 注: 本 PG（18.6 容器）不支持 ADD CONSTRAINT IF NOT EXISTS，
--     故用 DO $$ 块按 conname+conrelid 存在性检查实现幂等。
-- =============================================================================

ALTER TABLE "hrm"."initialization_logs" ALTER COLUMN "organization_id" SET NOT NULL;
ALTER TABLE "public"."_archive_core_doc_documents" ALTER COLUMN "id" SET NOT NULL;
ALTER TABLE "public"."_archive_core_doc_folders" ALTER COLUMN "id" SET NOT NULL;
ALTER TABLE "public"."_archive_core_doc_templates" ALTER COLUMN "id" SET NOT NULL;
ALTER TABLE "public"."_archive_core_workflow_instances" ALTER COLUMN "created_at" SET NOT NULL;
ALTER TABLE "public"."_archive_core_workflow_instances" ALTER COLUMN "id" SET NOT NULL;
ALTER TABLE "public"."_archive_core_workflow_instances" ALTER COLUMN "initiator_id" SET NOT NULL;
ALTER TABLE "public"."_archive_core_workflow_instances" ALTER COLUMN "tenant_id" SET NOT NULL;
ALTER TABLE "public"."_archive_core_workflow_instances" ALTER COLUMN "title" SET NOT NULL;
ALTER TABLE "public"."_archive_core_workflow_instances" ALTER COLUMN "updated_at" SET NOT NULL;
ALTER TABLE "public"."_archive_core_workflow_instances" ALTER COLUMN "workflow_id" SET NOT NULL;
ALTER TABLE "public"."core_doc_documents" ALTER COLUMN "id" SET NOT NULL;
ALTER TABLE "public"."core_doc_folders" ALTER COLUMN "id" SET NOT NULL;
ALTER TABLE "public"."core_doc_templates" ALTER COLUMN "id" SET NOT NULL;
ALTER TABLE "public"."core_tenant_users" ALTER COLUMN "email" SET NOT NULL;
ALTER TABLE "public"."core_tenant_users" ALTER COLUMN "id" SET NOT NULL;
ALTER TABLE "public"."core_tenant_users" ALTER COLUMN "tenant_id" SET NOT NULL;
ALTER TABLE "public"."core_tenant_users" ALTER COLUMN "user_id" SET NOT NULL;
ALTER TABLE "public"."core_users" ALTER COLUMN "email" SET NOT NULL;
ALTER TABLE "public"."core_users" ALTER COLUMN "id" SET NOT NULL;
ALTER TABLE "public"."core_users" ALTER COLUMN "password_hash" SET NOT NULL;
ALTER TABLE "public"."core_users" ALTER COLUMN "username" SET NOT NULL;
ALTER TABLE "public"."core_workflow_instances" ALTER COLUMN "created_at" SET NOT NULL;
ALTER TABLE "public"."core_workflow_instances" ALTER COLUMN "id" SET NOT NULL;
ALTER TABLE "public"."core_workflow_instances" ALTER COLUMN "updated_at" SET NOT NULL;
ALTER TABLE "public"."core_workflow_tasks" ALTER COLUMN "assignee_id" SET NOT NULL;
ALTER TABLE "public"."core_workflow_tasks" ALTER COLUMN "created_at" SET NOT NULL;
ALTER TABLE "public"."core_workflow_tasks" ALTER COLUMN "id" SET NOT NULL;
ALTER TABLE "public"."core_workflow_tasks" ALTER COLUMN "instance_id" SET NOT NULL;
ALTER TABLE "public"."core_workflow_tasks" ALTER COLUMN "node_id" SET NOT NULL;
ALTER TABLE "public"."core_workflow_versions" ALTER COLUMN "id" SET NOT NULL;
ALTER TABLE "wms"."audit_logs" ALTER COLUMN "organization_id" SET NOT NULL;
ALTER TABLE "wms"."inbound_order_items" ALTER COLUMN "organization_id" SET NOT NULL;
ALTER TABLE "wms"."inventory_alert_records" ALTER COLUMN "organization_id" SET NOT NULL;
ALTER TABLE "wms"."inventory_alert_rules" ALTER COLUMN "organization_id" SET NOT NULL;
ALTER TABLE "wms"."outbound_order_items" ALTER COLUMN "organization_id" SET NOT NULL;
ALTER TABLE "wms"."transfer_items" ALTER COLUMN "organization_id" SET NOT NULL;
ALTER TABLE "wms"."transfers" ALTER COLUMN "organization_id" SET NOT NULL;
ALTER TABLE "wms"."wave_pick_items" ALTER COLUMN "organization_id" SET NOT NULL;
ALTER TABLE "wms"."wave_picks" ALTER COLUMN "organization_id" SET NOT NULL;

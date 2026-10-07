-- ============================================================================
-- 20261007000017 — 约束级收敛（二）：5432 演进库 NOT NULL 欠账
-- ============================================================================
-- 第二轮约束对拍剩余：5432 缺 41 条 NOT NULL（5433 迁移链建表已收紧、
-- 5432 运行时 DDL 未收紧；经查全部目标列无 NULL 行 → SET NOT NULL 安全）。
-- 已剔除：PK 名差异（功能等价）与 permission_audit_logs_user_id_fkey
-- （5432 该表为运行时旧版形态 user_id varchar vs 5433 uuid，类型不匹配
-- 无法实现，登记为遗留）。
-- ============================================================================

-- =============================================================================
-- 由 scripts/gen-missing-constraints-migration.py 生成（约束级系统性补链）
-- 基线: postgres://topems:topems_secret@127.0.0.1:5433/topems  目标: postgres://topems:topems_secret@localhost:5432/topems
-- 同表缺失约束: 49（PK 7 / FK 1 / UNIQUE 0 / CHECK 0 / NOT NULL 41）
-- 注: 本 PG（18.6 容器）不支持 ADD CONSTRAINT IF NOT EXISTS，
--     故用 DO $$ 块按 conname+conrelid 存在性检查实现幂等。
-- =============================================================================

ALTER TABLE "hrm"."initialization_logs" ALTER COLUMN "tenant_id" SET NOT NULL;
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
ALTER TABLE "wms"."audit_logs" ALTER COLUMN "org_id" SET NOT NULL;
ALTER TABLE "wms"."inbound_order_items" ALTER COLUMN "org_id" SET NOT NULL;
ALTER TABLE "wms"."inventory_alert_records" ALTER COLUMN "org_id" SET NOT NULL;
ALTER TABLE "wms"."inventory_alert_rules" ALTER COLUMN "org_id" SET NOT NULL;
ALTER TABLE "wms"."labor_shifts" ALTER COLUMN "org_id" SET NOT NULL;
ALTER TABLE "wms"."outbound_order_items" ALTER COLUMN "org_id" SET NOT NULL;
ALTER TABLE "wms"."transfer_items" ALTER COLUMN "org_id" SET NOT NULL;
ALTER TABLE "wms"."transfers" ALTER COLUMN "org_id" SET NOT NULL;
ALTER TABLE "wms"."wave_pick_items" ALTER COLUMN "org_id" SET NOT NULL;
ALTER TABLE "wms"."wave_picks" ALTER COLUMN "org_id" SET NOT NULL;

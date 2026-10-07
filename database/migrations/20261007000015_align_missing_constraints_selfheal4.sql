-- ============================================================================
-- 20261007000015 — 约束级最终收敛（5432 演进库欠账补链）
-- ============================================================================
-- 背景（②重建验证约束级最终复核，反向对拍）:
--   * 5433 纯链态有/5432 演进库无的约束 97 条:
--       NOT NULL 72（5433 迁移链建表已收紧、5432 运行时 DDL 未收紧）
--       PK 7 / UNIQUE 7 / FK 6 / CHECK 5（ck_*_status_standard 反向差异等）
--   * 数据安全前置：mes.production_orders.order_no 为冗余编号列（业务用
--     order_number），5432 该表 9 行 order_no 全 NULL → 先 UPDATE 填充
--     （order_no = order_number）再 SET NOT NULL，避免收紧失败。
-- 本迁移（幂等，5432 补、5433 空表 UPDATE 0 行 + SET NOT NULL no-op）:
--   UPDATE 前置 + SET NOT NULL 直连 + PK/UNIQUE/FK/CHECK DO $$ 块幂等。
-- ============================================================================
UPDATE mes.production_orders SET order_no = order_number WHERE order_no IS NULL;

-- 前置：清理 core_user_roles 失效绑定（2 行 user_id 引用的 core_users 用户已不存在，
-- 孤儿引用使 ADD CONSTRAINT FK 校验失败；删除失效绑定为 FK 补链前置数据卫生修复）
DELETE FROM public.core_user_roles r WHERE NOT EXISTS (SELECT 1 FROM public.core_users u WHERE u.id = r.user_id);

-- =============================================================================
-- 由 scripts/gen-missing-constraints-migration.py 生成（约束级系统性补链）
-- 基线: postgres://topems:topems_secret@127.0.0.1:5433/topems  目标: postgres://topems:topems_secret@localhost:5432/topems
-- 同表缺失约束: 97（PK 7 / FK 6 / UNIQUE 7 / CHECK 5 / NOT NULL 72）
-- 注: 本 PG（18.6 容器）不支持 ADD CONSTRAINT IF NOT EXISTS，
--     故用 DO $$ 块按 conname+conrelid 存在性检查实现幂等。
-- =============================================================================

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ck_audit_logs_status_standard' AND conrelid = '"crm"."audit_logs"'::regclass) THEN
        ALTER TABLE "crm"."audit_logs" ADD CONSTRAINT "ck_audit_logs_status_standard" CHECK (((status IS NULL) OR ((status)::text = ANY ((ARRAY['active'::character varying, 'inactive'::character varying, 'archived'::character varying, 'success'::character varying, 'failure'::character varying])::text[]))));
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ck_erp_production_orders_status_standard' AND conrelid = '"erp"."erp_production_orders"'::regclass) THEN
        ALTER TABLE "erp"."erp_production_orders" ADD CONSTRAINT "ck_erp_production_orders_status_standard" CHECK (((status IS NULL) OR ((status)::text = ANY ((ARRAY['active'::character varying, 'inactive'::character varying, 'archived'::character varying, 'draft'::character varying, 'pending'::character varying, 'dispatched'::character varying, 'in_progress'::character varying, 'completed'::character varying, 'cancelled'::character varying, 'open'::character varying, 'new'::character varying])::text[]))));
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ck_financial_vouchers_status_standard' AND conrelid = '"erp"."financial_vouchers"'::regclass) THEN
        ALTER TABLE "erp"."financial_vouchers" ADD CONSTRAINT "ck_financial_vouchers_status_standard" CHECK (((status IS NULL) OR ((status)::text = ANY ((ARRAY['active'::character varying, 'inactive'::character varying, 'archived'::character varying, 'draft'::character varying, 'pending'::character varying, 'posted'::character varying])::text[]))));
    END IF;
END $$;
ALTER TABLE "hrm"."initialization_logs" ALTER COLUMN "tenant_id" SET NOT NULL;
ALTER TABLE "mes"."equipment" ALTER COLUMN "equipment_code" SET NOT NULL;
ALTER TABLE "mes"."equipment_maintenance_records" ALTER COLUMN "created_at" SET NOT NULL;
ALTER TABLE "mes"."equipment_maintenance_records" ALTER COLUMN "description" SET NOT NULL;
ALTER TABLE "mes"."equipment_maintenance_records" ALTER COLUMN "status" SET NOT NULL;
ALTER TABLE "mes"."equipment_maintenance_records" ALTER COLUMN "updated_at" SET NOT NULL;
ALTER TABLE "mes"."equipment_oee" ALTER COLUMN "created_at" SET NOT NULL;
ALTER TABLE "mes"."equipment_oee" ALTER COLUMN "updated_at" SET NOT NULL;
ALTER TABLE "mes"."production_orders" ALTER COLUMN "order_no" SET NOT NULL;
ALTER TABLE "mes"."production_orders" ALTER COLUMN "order_number" SET NOT NULL;
ALTER TABLE "mes"."production_processes" ALTER COLUMN "sequence" SET NOT NULL;
ALTER TABLE "mes"."production_records" ALTER COLUMN "completed_quantity" SET NOT NULL;
ALTER TABLE "mes"."production_records" ALTER COLUMN "created_at" SET NOT NULL;
ALTER TABLE "mes"."production_records" ALTER COLUMN "operator" SET NOT NULL;
ALTER TABLE "mes"."production_records" ALTER COLUMN "start_time" SET NOT NULL;
ALTER TABLE "mes"."production_records" ALTER COLUMN "updated_at" SET NOT NULL;
ALTER TABLE "mes"."teams" ALTER COLUMN "created_at" SET NOT NULL;
ALTER TABLE "mes"."teams" ALTER COLUMN "member_count" SET NOT NULL;
ALTER TABLE "mes"."teams" ALTER COLUMN "status" SET NOT NULL;
ALTER TABLE "mes"."teams" ALTER COLUMN "updated_at" SET NOT NULL;
ALTER TABLE "mes"."work_stations" ALTER COLUMN "created_at" SET NOT NULL;
ALTER TABLE "mes"."work_stations" ALTER COLUMN "station_name" SET NOT NULL;
ALTER TABLE "mes"."work_stations" ALTER COLUMN "status" SET NOT NULL;
ALTER TABLE "mes"."work_stations" ALTER COLUMN "updated_at" SET NOT NULL;
ALTER TABLE "public"."_archive_core_doc_documents" ALTER COLUMN "id" SET NOT NULL;
ALTER TABLE "public"."_archive_core_doc_folders" ALTER COLUMN "id" SET NOT NULL;
ALTER TABLE "public"."_archive_core_doc_templates" ALTER COLUMN "id" SET NOT NULL;
ALTER TABLE "public"."_archive_core_workflow_instances" ALTER COLUMN "created_at" SET NOT NULL;
ALTER TABLE "public"."_archive_core_workflow_instances" ALTER COLUMN "id" SET NOT NULL;
ALTER TABLE "public"."_archive_core_workflow_instances" ALTER COLUMN "initiator_id" SET NOT NULL;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE contype = 'p' AND conrelid = '"public"."_archive_core_workflow_instances"'::regclass) THEN
        ALTER TABLE "public"."_archive_core_workflow_instances" ADD CONSTRAINT "core_workflow_instances_pkey" PRIMARY KEY (id);
    END IF;
END $$;
ALTER TABLE "public"."_archive_core_workflow_instances" ALTER COLUMN "tenant_id" SET NOT NULL;
ALTER TABLE "public"."_archive_core_workflow_instances" ALTER COLUMN "title" SET NOT NULL;
ALTER TABLE "public"."_archive_core_workflow_instances" ALTER COLUMN "updated_at" SET NOT NULL;
ALTER TABLE "public"."_archive_core_workflow_instances" ALTER COLUMN "workflow_id" SET NOT NULL;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE contype = 'p' AND conrelid = '"public"."_archive_core_workflow_versions"'::regclass) THEN
        ALTER TABLE "public"."_archive_core_workflow_versions" ADD CONSTRAINT "core_workflow_versions_pkey_archive" PRIMARY KEY (id);
    END IF;
END $$;
ALTER TABLE "public"."core_doc_documents" ALTER COLUMN "id" SET NOT NULL;
ALTER TABLE "public"."core_doc_folders" ALTER COLUMN "id" SET NOT NULL;
ALTER TABLE "public"."core_doc_templates" ALTER COLUMN "id" SET NOT NULL;
ALTER TABLE "public"."core_menu_groups" ALTER COLUMN "code" SET NOT NULL;
ALTER TABLE "public"."core_menu_groups" ALTER COLUMN "name" SET NOT NULL;
ALTER TABLE "public"."core_menu_groups" ALTER COLUMN "status" SET NOT NULL;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'core_menu_groups_tenant_id_code_key' AND conrelid = '"public"."core_menu_groups"'::regclass) THEN
        ALTER TABLE "public"."core_menu_groups" ADD CONSTRAINT "core_menu_groups_tenant_id_code_key" UNIQUE (tenant_id, code);
    END IF;
END $$;
ALTER TABLE "public"."core_menu_groups" ALTER COLUMN "tenant_id" SET NOT NULL;
ALTER TABLE "public"."core_menus" ALTER COLUMN "code" SET NOT NULL;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'core_menus_group_id_fkey' AND conrelid = '"public"."core_menus"'::regclass) THEN
        ALTER TABLE "public"."core_menus" ADD CONSTRAINT "core_menus_group_id_fkey" FOREIGN KEY (group_id) REFERENCES core_menu_groups(id) ON DELETE CASCADE;
    END IF;
END $$;
ALTER TABLE "public"."core_menus" ALTER COLUMN "name" SET NOT NULL;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'core_menus_parent_id_fkey' AND conrelid = '"public"."core_menus"'::regclass) THEN
        ALTER TABLE "public"."core_menus" ADD CONSTRAINT "core_menus_parent_id_fkey" FOREIGN KEY (parent_id) REFERENCES core_menus(id) ON DELETE SET NULL;
    END IF;
END $$;
ALTER TABLE "public"."core_menus" ALTER COLUMN "status" SET NOT NULL;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'core_menus_tenant_id_code_key' AND conrelid = '"public"."core_menus"'::regclass) THEN
        ALTER TABLE "public"."core_menus" ADD CONSTRAINT "core_menus_tenant_id_code_key" UNIQUE (tenant_id, code);
    END IF;
END $$;
ALTER TABLE "public"."core_menus" ALTER COLUMN "tenant_id" SET NOT NULL;
ALTER TABLE "public"."core_roles" ALTER COLUMN "tenant_id" SET NOT NULL;
ALTER TABLE "public"."core_tenant_users" ALTER COLUMN "email" SET NOT NULL;
ALTER TABLE "public"."core_tenant_users" ALTER COLUMN "id" SET NOT NULL;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE contype = 'p' AND conrelid = '"public"."core_tenant_users"'::regclass) THEN
        ALTER TABLE "public"."core_tenant_users" ADD CONSTRAINT "core_tenant_users_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'core_tenant_users_tenant_id_email_key' AND conrelid = '"public"."core_tenant_users"'::regclass) THEN
        ALTER TABLE "public"."core_tenant_users" ADD CONSTRAINT "core_tenant_users_tenant_id_email_key" UNIQUE (tenant_id, email);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'core_tenant_users_tenant_id_fkey' AND conrelid = '"public"."core_tenant_users"'::regclass) THEN
        ALTER TABLE "public"."core_tenant_users" ADD CONSTRAINT "core_tenant_users_tenant_id_fkey" FOREIGN KEY (tenant_id) REFERENCES core_tenants(id) ON DELETE CASCADE;
    END IF;
END $$;
ALTER TABLE "public"."core_tenant_users" ALTER COLUMN "tenant_id" SET NOT NULL;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'core_tenant_users_tenant_id_user_id_key' AND conrelid = '"public"."core_tenant_users"'::regclass) THEN
        ALTER TABLE "public"."core_tenant_users" ADD CONSTRAINT "core_tenant_users_tenant_id_user_id_key" UNIQUE (tenant_id, user_id);
    END IF;
END $$;
ALTER TABLE "public"."core_tenant_users" ALTER COLUMN "user_id" SET NOT NULL;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'core_user_roles_user_id_fkey' AND conrelid = '"public"."core_user_roles"'::regclass) THEN
        ALTER TABLE "public"."core_user_roles" ADD CONSTRAINT "core_user_roles_user_id_fkey" FOREIGN KEY (user_id) REFERENCES core_users(id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'core_users_email_key' AND conrelid = '"public"."core_users"'::regclass) THEN
        ALTER TABLE "public"."core_users" ADD CONSTRAINT "core_users_email_key" UNIQUE (email);
    END IF;
END $$;
ALTER TABLE "public"."core_users" ALTER COLUMN "email" SET NOT NULL;
ALTER TABLE "public"."core_users" ALTER COLUMN "id" SET NOT NULL;
ALTER TABLE "public"."core_users" ALTER COLUMN "password_hash" SET NOT NULL;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE contype = 'p' AND conrelid = '"public"."core_users"'::regclass) THEN
        ALTER TABLE "public"."core_users" ADD CONSTRAINT "core_users_pkey" PRIMARY KEY (id);
    END IF;
END $$;
ALTER TABLE "public"."core_users" ALTER COLUMN "tenant_id" SET NOT NULL;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'core_users_username_key' AND conrelid = '"public"."core_users"'::regclass) THEN
        ALTER TABLE "public"."core_users" ADD CONSTRAINT "core_users_username_key" UNIQUE (username);
    END IF;
END $$;
ALTER TABLE "public"."core_users" ALTER COLUMN "username" SET NOT NULL;
ALTER TABLE "public"."core_workflow_instances" ALTER COLUMN "id" SET NOT NULL;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE contype = 'p' AND conrelid = '"public"."core_workflow_instances"'::regclass) THEN
        ALTER TABLE "public"."core_workflow_instances" ADD CONSTRAINT "core_workflow_instances_pkey1" PRIMARY KEY (id);
    END IF;
END $$;
ALTER TABLE "public"."core_workflow_tasks" ALTER COLUMN "assignee_id" SET NOT NULL;
ALTER TABLE "public"."core_workflow_tasks" ALTER COLUMN "created_at" SET NOT NULL;
ALTER TABLE "public"."core_workflow_tasks" ALTER COLUMN "id" SET NOT NULL;
ALTER TABLE "public"."core_workflow_tasks" ALTER COLUMN "instance_id" SET NOT NULL;
ALTER TABLE "public"."core_workflow_tasks" ALTER COLUMN "node_id" SET NOT NULL;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE contype = 'p' AND conrelid = '"public"."core_workflow_tasks"'::regclass) THEN
        ALTER TABLE "public"."core_workflow_tasks" ADD CONSTRAINT "core_workflow_tasks_pkey1" PRIMARY KEY (id);
    END IF;
END $$;
ALTER TABLE "public"."core_workflow_versions" ALTER COLUMN "id" SET NOT NULL;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE contype = 'p' AND conrelid = '"public"."core_workflow_versions"'::regclass) THEN
        ALTER TABLE "public"."core_workflow_versions" ADD CONSTRAINT "core_workflow_versions_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_action' AND conrelid = '"public"."permission_audit_logs"'::regclass) THEN
        ALTER TABLE "public"."permission_audit_logs" ADD CONSTRAINT "chk_action" CHECK (((action)::text = ANY ((ARRAY['create'::character varying, 'update'::character varying, 'delete'::character varying, 'activate'::character varying, 'deactivate'::character varying, 'role_change'::character varying])::text[])));
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_role' AND conrelid = '"public"."tenant_permissions"'::regclass) THEN
        ALTER TABLE "public"."tenant_permissions" ADD CONSTRAINT "chk_role" CHECK (((role)::text = ANY ((ARRAY['owner'::character varying, 'admin'::character varying, 'member'::character varying, 'viewer'::character varying])::text[])));
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'uk_tenant_user' AND conrelid = '"public"."tenant_permissions"'::regclass) THEN
        ALTER TABLE "public"."tenant_permissions" ADD CONSTRAINT "uk_tenant_user" UNIQUE (tenant_id, user_id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'inter_module_sync_tenant_id_fkey' AND conrelid = '"unified_core"."inter_module_sync"'::regclass) THEN
        ALTER TABLE "unified_core"."inter_module_sync" ADD CONSTRAINT "inter_module_sync_tenant_id_fkey" FOREIGN KEY (tenant_id) REFERENCES core_tenants(id) ON DELETE CASCADE;
    END IF;
END $$;
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

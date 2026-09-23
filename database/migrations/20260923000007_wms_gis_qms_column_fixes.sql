-- ============================================================
-- 20260923000007_wms_gis_qms_column_fixes.sql
-- 修复 wms + gis + qms + rs + communication + core + mobile 散表
-- SQL 列漂移。改名在代码侧完成（代码 SQL 改用真库已存在列），
-- 本迁移只补“表无此列”的列，全部 ADD COLUMN IF NOT EXISTS 幂等。
--
-- 改名（代码侧，无需 DDL）：
--   wms.transfers:        from_warehouse_id->source_warehouse_id,
--                         from_location_id->source_location_id,
--                         to_warehouse_id->destination_warehouse_id,
--                         to_location_id->destination_location_id,
--                         remarks->notes (SELECT/RETURNING 用 AS 别名回结构体字段)
--   wms.transfer_items:    status->transfer_status, remarks->notes
--   wms.inbound_orders:    received_at->received_date
--   qms.qa_corrective_actions: related_issue_id->issue_id
--   qms.qa_quality_inspections: test_result->result, conclusion->memo
--   communication.core_notification_templates: title->title_template,
--                         content->content_template (RETURNING 用 AS 别名)
--   public.permission_audit_logs: metadata->details
--   public.audit_logs (tests): resource->entity_type, resource_id->entity_id
-- ============================================================

-- ============ wms.transfer_items ============
-- 代码：inventory_item_id 作为 uuid FK 指向 wms.inventory_items.id（execute_transfer 扣减库存用），
--       quantity 为调拨数量；表仅有 requested_quantity/transferred_quantity/received_quantity，无裸 quantity。
ALTER TABLE wms.transfer_items ADD COLUMN IF NOT EXISTS inventory_item_id uuid;
ALTER TABLE wms.transfer_items ADD COLUMN IF NOT EXISTS quantity numeric;

-- ============ wms.outbound_orders ============
-- 代码：UPDATE ... SET is_synced_to_crm = TRUE（data_sync 同步 CRM 标记），表无此列。
ALTER TABLE wms.outbound_orders ADD COLUMN IF NOT EXISTS is_synced_to_crm boolean NOT NULL DEFAULT false;

-- ============ wms.stock_take_items ============
-- 代码：update_stock_take_item 按行计数状态写 status（pending/completed）；
--       表仅有 quality_status / adjustment_status，语义不匹配，补独立行级 status。
ALTER TABLE wms.stock_take_items ADD COLUMN IF NOT EXISTS status varchar;

-- ============ gis.warehouse_locations ============
-- 代码：INSERT/UPDATE description（位置描述），表无 description/remark/notes，补列。
ALTER TABLE gis.warehouse_locations ADD COLUMN IF NOT EXISTS description text;

-- ============ qms.qa_corrective_actions ============
-- 代码：INSERT ... related_issue_type（事件源 discriminator，如 'EHS_HAZARD'），表无此列。
ALTER TABLE qms.qa_corrective_actions ADD COLUMN IF NOT EXISTS related_issue_type text;

-- ============ qms.qa_ehs_hazards ============
-- 代码：INSERT ... related_inspection_id（关联触发该隐患的 QMS 检验），表无此列。
ALTER TABLE qms.qa_ehs_hazards ADD COLUMN IF NOT EXISTS related_inspection_id uuid;

-- ============ qms.qa_quality_inspections ============
-- 代码：UPDATE ... test_data（LIMS 检测原始数据 JSON），表无此列。
ALTER TABLE qms.qa_quality_inspections ADD COLUMN IF NOT EXISTS test_data jsonb;

-- ============ rs.formulas ============
-- 代码：INSERT ... process_params（工艺参数 JSON），rs.formulas 表无此列
--       （rs.formula_versions 已有 process_params，无需补）。
ALTER TABLE rs.formulas ADD COLUMN IF NOT EXISTS process_params jsonb;

-- ============ public.core_notification_templates ============
-- 代码：模板 CRUD 使用 priority(i32) / data(jsonb)，表仅有 title_template/content_template/description，
--       无 priority/data，补列。
ALTER TABLE public.core_notification_templates ADD COLUMN IF NOT EXISTS priority integer;
ALTER TABLE public.core_notification_templates ADD COLUMN IF NOT EXISTS data jsonb;

-- ============ core.knowledge_qa_history ============
-- 代码：update_qa_feedback 写 feedback(i32, 1/-1)，表无此列。
ALTER TABLE core.knowledge_qa_history ADD COLUMN IF NOT EXISTS feedback integer;

-- ============ mobile.shortcuts ============
-- 代码：INSERT ... tenant_id，表无此列；补 uuid NOT NULL，给存量行零值默认。
ALTER TABLE mobile.shortcuts ADD COLUMN IF NOT EXISTS tenant_id uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000';

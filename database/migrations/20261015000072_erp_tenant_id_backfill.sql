-- =============================================================================
-- erp 租户回填 zero（2026-10-15）
-- 背景：erp 写路径此前未落 tenant_id（表无默认值），历史行全 NULL 落入 RLS
--       `tenant_id IS NULL` 豁免区（任意租户上下文可见，跨租户隔离缺陷）。
-- 本轮修复：写路径已统一补 tenant_id（HTTP 事务级 current_setting / 事件 payload，
--      兜底 zero UUID）；此处将存量 NULL 行回填 zero —— 与超管/服务上下文
--      （RLS 设 nil 租户）写入语义一致，且收紧为仅零租户上下文可见。
-- =============================================================================

UPDATE erp.customers
   SET tenant_id = '00000000-0000-0000-0000-000000000000'
 WHERE tenant_id IS NULL;

UPDATE erp.audit_logs
   SET tenant_id = '00000000-0000-0000-0000-000000000000'
 WHERE tenant_id IS NULL;

UPDATE erp.sales_orders
   SET tenant_id = '00000000-0000-0000-0000-000000000000'
 WHERE tenant_id IS NULL;

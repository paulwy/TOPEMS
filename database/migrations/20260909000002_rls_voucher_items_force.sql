-- RLS 事件链隔离 · voucher_items FORCE
-- 事件侧 7 处 + HTTP 2 处写入已全部绑定 tenant_id，可安全 FORCE。
-- 关联迁移: 20260909000001_rls_event_chain_tenant.sql (加列 + 策略 + ENABLE)

ALTER TABLE erp.voucher_items FORCE ROW LEVEL SECURITY;

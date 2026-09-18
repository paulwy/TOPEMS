-- TOPEMS database migration 20260918000034
-- 补 5433 的 000033 缺口（000033 因 shared.audit_logs 缺失在 5433 整体回滚）：
--   1) wms.inbound_orders.warehouse_id 可空（5433 未执行）
--   2) bi/iam/scm/srm/wms audit_logs 补 entity_type（5433 未执行）
--   3) 5433 补建 shared.audit_logs 表（5432 已有则跳过）
-- 全部幂等。

ALTER TABLE wms.inbound_orders ALTER COLUMN warehouse_id DROP NOT NULL;

ALTER TABLE bi.audit_logs ADD COLUMN IF NOT EXISTS entity_type text;
ALTER TABLE iam.audit_logs ADD COLUMN IF NOT EXISTS entity_type text;
ALTER TABLE scm.audit_logs ADD COLUMN IF NOT EXISTS entity_type text;
ALTER TABLE srm.audit_logs ADD COLUMN IF NOT EXISTS entity_type text;
ALTER TABLE wms.audit_logs ADD COLUMN IF NOT EXISTS entity_type text;

CREATE TABLE IF NOT EXISTS shared.audit_logs (
    id uuid NOT NULL PRIMARY KEY,
    user_id uuid,
    action character varying NOT NULL,
    resource character varying,
    resource_id uuid,
    ip_address character varying,
    user_agent text,
    details jsonb,
    status character varying,
    error_message text,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    deleted_at timestamp with time zone,
    entity_type text
);

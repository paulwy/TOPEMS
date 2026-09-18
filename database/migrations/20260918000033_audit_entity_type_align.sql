-- TOPEMS database migration 20260918000033
-- wms.inbound_orders.warehouse_id：代码 DTO 为 Option<Uuid> 但表 NOT NULL（INSERT 传 NULL 失败）→ 改可空
-- audit_logs 批量补 entity_type（代码统一写审计日志引用该列，7 个 schema 缺）。
-- shared.audit_logs 在 5433 重建库不存在 → 先 CREATE TABLE IF NOT EXISTS 再补列（幂等，5432 已有则跳过）。

ALTER TABLE wms.inbound_orders ALTER COLUMN warehouse_id DROP NOT NULL;

ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS entity_type text;
ALTER TABLE scm.audit_logs ADD COLUMN IF NOT EXISTS entity_type text;
ALTER TABLE wms.audit_logs ADD COLUMN IF NOT EXISTS entity_type text;
ALTER TABLE iam.audit_logs ADD COLUMN IF NOT EXISTS entity_type text;
ALTER TABLE srm.audit_logs ADD COLUMN IF NOT EXISTS entity_type text;
ALTER TABLE bi.audit_logs ADD COLUMN IF NOT EXISTS entity_type text;

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

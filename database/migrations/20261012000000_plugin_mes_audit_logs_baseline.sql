-- 迁移链缺 plugin_mes.audit_logs 基线：真实环境表由运行时 schema_defense 创建
-- （lib/shared-db/src/audit.rs 统一 12 列插入服务，结构镜像 public.audit_logs 15 列），
-- 空库重建链无任何迁移创建它。
-- 20261013000000_align_runtime_contract_v2.sql 对其执行
-- ALTER TABLE ... DROP CONSTRAINT IF EXISTS ck_audit_logs_status_standard，
-- 表不存在时 DROP CONSTRAINT IF EXISTS 仍报错（IF EXISTS 仅覆盖约束不存在）→ 空库重建链必失败。
-- 本补丁版本 20261012000000 置于 20261013000000 之前补齐基线；已应用环境 CREATE IF NOT EXISTS 幂等跳过。
-- 约束 ck_audit_logs_status_standard 与真实环境一致（业务自由文本白名单冲突由 align 迁移随后 DROP 解决）。
-- 不启用 RLS：审计表需 topems_app 可写，与其它基础表初始态一致。
CREATE TABLE IF NOT EXISTS plugin_mes.audit_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid,
    action character varying(255) DEFAULT ''::character varying NOT NULL,
    entity_type character varying(50) DEFAULT ''::character varying NOT NULL,
    entity_id uuid,
    entity_ids jsonb,
    user_id uuid,
    user_name text,
    request_details jsonb,
    response_details jsonb,
    status character varying(20) DEFAULT 'success'::character varying NOT NULL,
    error_message text,
    ip_address character varying(45),
    user_agent text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    success boolean,
    CONSTRAINT audit_logs_pkey PRIMARY KEY (id),
    CONSTRAINT ck_audit_logs_status_standard CHECK (status IN ('active', 'inactive', 'archived'))
);
CREATE INDEX IF NOT EXISTS audit_logs_tenant_id_idx ON plugin_mes.audit_logs (tenant_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON plugin_mes.audit_logs (action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON plugin_mes.audit_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity_type ON plugin_mes.audit_logs (entity_type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON plugin_mes.audit_logs (user_id);

-- 000095: 写路径 body500 暴露的 DB 表/列修复（幂等，双库可重放）
-- 来源：深入冒烟 body"code":500 收敛（2026-09-20）

-- 1. unified_core.inter_module_sync（srm/wms 同步日志查询）
CREATE TABLE IF NOT EXISTS unified_core.inter_module_sync (
    id            uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id     uuid NOT NULL,
    sync_type     text,
    status        text,
    source_module text,
    source_id     text,
    source_code   text,
    target_id     text,
    target_code   text,
    operation     text,
    error_message text,
    retry_count   integer,
    executed_at   timestamptz,
    created_at    timestamptz NOT NULL DEFAULT NOW()
);

-- 2. qms.qa_alert_rules 补 tenant_id
-- 2026-09-21 防御化（空库重建链卡点）：qms.qa_alert_rules 由 000019 从 public 拷贝创建
-- （条件式），5433 空库重建时 public 侧不存在 → qms 表缺失；此处按 5432 权威 17 列重建
-- （5432 已存在 → IF NOT EXISTS 跳过），再补 tenant_id（幂等）。
CREATE TABLE IF NOT EXISTS qms.qa_alert_rules (
    id                uuid NOT NULL DEFAULT gen_random_uuid(),
    rule_name         varchar NOT NULL,
    alert_type        varchar NOT NULL,
    metric            varchar NOT NULL,
    condition         varchar NOT NULL,
    threshold         numeric NOT NULL,
    duration          integer,
    severity          varchar,
    status            varchar DEFAULT 'active',
    notification_type varchar,
    recipients        text,
    description       text,
    created_by        varchar,
    created_at        timestamptz NOT NULL DEFAULT now(),
    updated_at        timestamptz NOT NULL DEFAULT now(),
    deleted_at        timestamptz,
    tenant_id         uuid,
    PRIMARY KEY (id)
);
ALTER TABLE qms.qa_alert_rules ADD COLUMN IF NOT EXISTS tenant_id uuid;

-- 3. finance.finance_audit_rules_v52（audit-v52 引擎）
CREATE TABLE IF NOT EXISTS finance.finance_audit_rules_v52 (
    id          uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id   uuid,
    name        text,
    category    text,
    condition   text,
    severity    text,
    schedule    text,
    is_active   boolean DEFAULT TRUE,
    created_by  uuid,
    created_at  timestamptz DEFAULT NOW(),
    updated_at  timestamptz DEFAULT NOW(),
    deleted_at  timestamptz
);

-- 4. finance.core_finance_periods 补 period（open/close 周期路由）
ALTER TABLE finance.core_finance_periods ADD COLUMN IF NOT EXISTS period text;

-- 5. rs.document_relations（rd 文档关联）
CREATE TABLE IF NOT EXISTS rs.document_relations (
    id                  uuid PRIMARY KEY,
    entity_type         text,
    entity_id           uuid,
    doc_service_file_id text,
    doc_service_url     text,
    file_name           text,
    file_size           bigint,
    file_type           text,
    description         text,
    created_by          uuid,
    created_at          timestamptz,
    updated_at          timestamptz,
    deleted_at          timestamptz
);

-- 6. crm.customer_tags：代码按 tag 字符串 upsert，表原为 tag_id 语义 → tag_id 可空 + 补 tag 列
ALTER TABLE crm.customer_tags ALTER COLUMN tag_id DROP NOT NULL;
ALTER TABLE crm.customer_tags ADD COLUMN IF NOT EXISTS tag text;

-- 7. rs.experiments 补 deleted_at（rd 实验阶段推进软删）
ALTER TABLE rs.experiments ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

-- 8. erp.erp_master_data_audit_trail（主数据审计轨迹）
CREATE TABLE IF NOT EXISTS erp.erp_master_data_audit_trail (
    id             uuid PRIMARY KEY,
    master_data_id uuid,
    domain         text,
    action         text,
    source_service text,
    target_service text,
    changed_by     uuid,
    old_values     jsonb,
    new_values     jsonb,
    created_at     timestamptz
);

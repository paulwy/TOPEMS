-- 20260831191100_ehs_alerts.sql
-- EHS 试剂告警表（承接 integration LimsReagentAlert 跨域联动，替代原 public.qa_ehs_alerts 僵尸直写）
-- 幂等：IF NOT EXISTS
-- 说明：与 ehs.qa_ehs_hazards 表风格一致（ehs schema 无 tenant_id 列，按 schema/RLS 隔离）

CREATE TABLE IF NOT EXISTS ehs.qa_ehs_alerts (
    id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    alert_no      varchar(64)  NOT NULL,
    title         varchar(256) NOT NULL,
    alert_type    varchar(64),
    severity      varchar(32),
    description   text,
    status        varchar(32)  DEFAULT 'active',
    source_system varchar(64),
    source_id     uuid,
    created_at    timestamp WITHOUT TIME ZONE DEFAULT NOW(),
    updated_at    timestamp WITHOUT TIME ZONE DEFAULT NOW(),
    CONSTRAINT uq_qa_ehs_alerts_no UNIQUE (alert_no)
);

CREATE INDEX IF NOT EXISTS idx_qa_ehs_alerts_status ON ehs.qa_ehs_alerts(status);

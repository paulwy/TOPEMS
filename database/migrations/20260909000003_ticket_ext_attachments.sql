-- Ticket 扩展专项（P1 主题二⑥）：附件存储表
-- 与既有 RLS 策略 rls_tenant_isolation（宽松格式）对齐

CREATE TABLE IF NOT EXISTS ticket.ticket_attachments (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id   uuid NOT NULL,
    tenant_id   uuid NOT NULL,
    file_name   text NOT NULL,
    mime_type   text,
    file_size   bigint DEFAULT 0,
    file_type   text,
    file_data   bytea,
    created_by  uuid,
    created_at  timestamptz DEFAULT now(),
    updated_at  timestamptz DEFAULT now(),
    deleted_at  timestamptz
);

ALTER TABLE ticket.ticket_attachments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS rls_tenant_isolation ON ticket.ticket_attachments;
CREATE POLICY rls_tenant_isolation ON ticket.ticket_attachments
    USING (
        (current_setting('app.tenant_id'::text, true) IS NULL)
        OR (current_setting('app.tenant_id'::text, true) = '')
        OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000')
        OR (tenant_id IS NULL)
        OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)
    );

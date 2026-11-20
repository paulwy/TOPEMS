-- 20261120150000: ticket 7 张运行期表收口（W2-D2 第四个模块）
--
-- 背景：ticket.core_tickets / core_ticket_comments / core_ticket_activities /
-- core_ticket_sla_policies / core_ticket_sla_escalations / ticket_automation_rules /
-- ticket_knowledge_articles 由 svc/ticket/src/schema_defense.rs 在启动时建骨架、
-- 逐列 ADD COLUMN 维护。本迁移以 baseline+forward 库真实形状固化。
--
-- 与旧 TABLE_DEFS 的差异（以 live 为准）：
--   * 7 张表都有 deleted_at；sla_policies/automation_rules 还有 name_en；
--   * core_tickets.ticket_no 线上可空，tenant_id 等列有常量默认值；
--   * 子表 comments/activities/sla_escalations 的 RLS 走 EXISTS core_tickets 父单判定，
--     不是直接比较自身 tenant_id；
--   * 7 张表全部 ENABLE + FORCE RLS。
--
-- 幂等：CREATE TABLE/INDEX IF NOT EXISTS；策略先 DROP IF EXISTS 再建。
-- 不删除数据、不改已有列类型。

CREATE SCHEMA IF NOT EXISTS ticket;

CREATE TABLE IF NOT EXISTS ticket.core_tickets (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    deleted_at timestamptz,
    assignee_id uuid,
    closed_at timestamptz,
    created_at timestamptz DEFAULT now() NOT NULL,
    description text,
    metadata jsonb,
    reporter_id uuid,
    resolved_at timestamptz,
    severity text DEFAULT 'medium'::text NOT NULL,
    sla_due_at timestamptz,
    source_business_id text,
    source_service text DEFAULT ''::text NOT NULL,
    status text DEFAULT 'open'::text NOT NULL,
    tags text[],
    tenant_id uuid DEFAULT '00000000-0000-0000-0000-000000000001'::uuid NOT NULL,
    ticket_no text,
    ticket_type text DEFAULT 'incident'::text NOT NULL,
    title text DEFAULT ''::text NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL,
    CONSTRAINT core_tickets_pkey PRIMARY KEY (id),
    CONSTRAINT core_tickets_ticket_no_key UNIQUE (ticket_no)
);

CREATE TABLE IF NOT EXISTS ticket.core_ticket_comments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    deleted_at timestamptz,
    content text DEFAULT ''::text NOT NULL,
    created_at timestamptz DEFAULT now() NOT NULL,
    is_internal boolean DEFAULT false NOT NULL,
    tenant_id uuid DEFAULT '00000000-0000-0000-0000-000000000001'::uuid NOT NULL,
    ticket_id uuid DEFAULT '00000000-0000-0000-0000-000000000000'::uuid NOT NULL,
    user_id uuid DEFAULT '00000000-0000-0000-0000-000000000000'::uuid NOT NULL,
    user_name text,
    CONSTRAINT core_ticket_comments_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS ticket.core_ticket_activities (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    deleted_at timestamptz,
    action text DEFAULT ''::text NOT NULL,
    created_at timestamptz DEFAULT now() NOT NULL,
    from_value text,
    tenant_id uuid DEFAULT '00000000-0000-0000-0000-000000000001'::uuid NOT NULL,
    ticket_id uuid DEFAULT '00000000-0000-0000-0000-000000000000'::uuid NOT NULL,
    to_value text,
    user_id uuid,
    CONSTRAINT core_ticket_activities_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS ticket.core_ticket_sla_policies (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    deleted_at timestamptz,
    name_en varchar,
    business_hours_end text,
    business_hours_start text,
    created_at timestamptz DEFAULT now() NOT NULL,
    description text,
    escalation_hours_1 double precision,
    escalation_hours_2 double precision,
    escalation_hours_3 double precision,
    escalation_levels integer DEFAULT 3 NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    is_default boolean DEFAULT false NOT NULL,
    name text DEFAULT ''::text NOT NULL,
    resolution_hours double precision DEFAULT 72 NOT NULL,
    response_hours double precision DEFAULT 8 NOT NULL,
    severity text,
    tenant_id uuid DEFAULT '00000000-0000-0000-0000-000000000001'::uuid NOT NULL,
    ticket_type text,
    updated_at timestamptz DEFAULT now() NOT NULL,
    weekend_excluded boolean DEFAULT false NOT NULL,
    working_hours_only boolean DEFAULT false NOT NULL,
    CONSTRAINT core_ticket_sla_policies_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS ticket.core_ticket_sla_escalations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    deleted_at timestamptz,
    created_at timestamptz DEFAULT now() NOT NULL,
    escalated_to uuid,
    escalation_time timestamptz DEFAULT now() NOT NULL,
    level integer DEFAULT 1 NOT NULL,
    reason text,
    tenant_id uuid DEFAULT '00000000-0000-0000-0000-000000000001'::uuid NOT NULL,
    ticket_id uuid DEFAULT '00000000-0000-0000-0000-000000000000'::uuid NOT NULL,
    CONSTRAINT core_ticket_sla_escalations_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS ticket.ticket_automation_rules (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    deleted_at timestamptz,
    name_en varchar,
    action_type text NOT NULL,
    action_value text NOT NULL,
    condition_field text NOT NULL,
    condition_value text NOT NULL,
    created_at timestamptz DEFAULT now() NOT NULL,
    description text,
    enabled boolean DEFAULT true NOT NULL,
    name text NOT NULL,
    priority integer DEFAULT 100 NOT NULL,
    tenant_id uuid NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL,
    CONSTRAINT ticket_automation_rules_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS ticket.ticket_knowledge_articles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    deleted_at timestamptz,
    category text,
    content text NOT NULL,
    created_at timestamptz DEFAULT now() NOT NULL,
    keywords text[] DEFAULT '{}'::text[] NOT NULL,
    tenant_id uuid NOT NULL,
    title text NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL,
    CONSTRAINT ticket_knowledge_articles_pkey PRIMARY KEY (id)
);

CREATE INDEX IF NOT EXISTS idx_core_tickets_sla
    ON ticket.core_tickets USING btree (sla_due_at) WHERE (sla_due_at IS NOT NULL);
CREATE INDEX IF NOT EXISTS idx_core_tickets_source
    ON ticket.core_tickets USING btree (source_service, source_business_id);
CREATE INDEX IF NOT EXISTS idx_core_tickets_tenant_status
    ON ticket.core_tickets USING btree (tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_core_ticket_comments_ticket
    ON ticket.core_ticket_comments USING btree (ticket_id, created_at);
CREATE INDEX IF NOT EXISTS idx_core_ticket_activities_ticket
    ON ticket.core_ticket_activities USING btree (ticket_id, created_at);
CREATE INDEX IF NOT EXISTS idx_core_ticket_sla_policies_tenant
    ON ticket.core_ticket_sla_policies USING btree (tenant_id, is_active);
CREATE INDEX IF NOT EXISTS idx_core_ticket_sla_escalations_ticket
    ON ticket.core_ticket_sla_escalations USING btree (ticket_id, level);

ALTER TABLE ticket.core_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket.core_tickets FORCE ROW LEVEL SECURITY;
ALTER TABLE ticket.core_ticket_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket.core_ticket_comments FORCE ROW LEVEL SECURITY;
ALTER TABLE ticket.core_ticket_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket.core_ticket_activities FORCE ROW LEVEL SECURITY;
ALTER TABLE ticket.core_ticket_sla_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket.core_ticket_sla_policies FORCE ROW LEVEL SECURITY;
ALTER TABLE ticket.core_ticket_sla_escalations ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket.core_ticket_sla_escalations FORCE ROW LEVEL SECURITY;
ALTER TABLE ticket.ticket_automation_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket.ticket_automation_rules FORCE ROW LEVEL SECURITY;
ALTER TABLE ticket.ticket_knowledge_articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket.ticket_knowledge_articles FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS rls_tenant_isolation ON ticket.core_tickets;
CREATE POLICY rls_tenant_isolation ON ticket.core_tickets
USING (
    COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text
    OR tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid
)
WITH CHECK (
    COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text
    OR tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid
);

DROP POLICY IF EXISTS rls_tenant_isolation ON ticket.core_ticket_comments;
CREATE POLICY rls_tenant_isolation ON ticket.core_ticket_comments
USING (
    COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text
    OR EXISTS (
        SELECT 1
        FROM ticket.core_tickets p
        WHERE p.id = ticket.core_ticket_comments.ticket_id
          AND p.tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid
    )
)
WITH CHECK (
    COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text
    OR EXISTS (
        SELECT 1
        FROM ticket.core_tickets p
        WHERE p.id = ticket.core_ticket_comments.ticket_id
          AND p.tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid
    )
);

DROP POLICY IF EXISTS rls_tenant_isolation ON ticket.core_ticket_activities;
CREATE POLICY rls_tenant_isolation ON ticket.core_ticket_activities
USING (
    COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text
    OR EXISTS (
        SELECT 1
        FROM ticket.core_tickets p
        WHERE p.id = ticket.core_ticket_activities.ticket_id
          AND p.tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid
    )
)
WITH CHECK (
    COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text
    OR EXISTS (
        SELECT 1
        FROM ticket.core_tickets p
        WHERE p.id = ticket.core_ticket_activities.ticket_id
          AND p.tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid
    )
);

DROP POLICY IF EXISTS rls_tenant_isolation ON ticket.core_ticket_sla_policies;
CREATE POLICY rls_tenant_isolation ON ticket.core_ticket_sla_policies
USING (
    COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text
    OR tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid
)
WITH CHECK (
    COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text
    OR tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid
);

DROP POLICY IF EXISTS rls_tenant_isolation ON ticket.core_ticket_sla_escalations;
CREATE POLICY rls_tenant_isolation ON ticket.core_ticket_sla_escalations
USING (
    COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text
    OR EXISTS (
        SELECT 1
        FROM ticket.core_tickets p
        WHERE p.id = ticket.core_ticket_sla_escalations.ticket_id
          AND p.tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid
    )
)
WITH CHECK (
    COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text
    OR EXISTS (
        SELECT 1
        FROM ticket.core_tickets p
        WHERE p.id = ticket.core_ticket_sla_escalations.ticket_id
          AND p.tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid
    )
);

DROP POLICY IF EXISTS rls_tenant_isolation ON ticket.ticket_automation_rules;
CREATE POLICY rls_tenant_isolation ON ticket.ticket_automation_rules
USING (
    COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text
    OR tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid
)
WITH CHECK (
    COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text
    OR tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid
);

DROP POLICY IF EXISTS rls_tenant_isolation ON ticket.ticket_knowledge_articles;
CREATE POLICY rls_tenant_isolation ON ticket.ticket_knowledge_articles
USING (
    COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text
    OR tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid
)
WITH CHECK (
    COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text
    OR tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid
);

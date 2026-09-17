-- ============================================================
-- mobile OA 业务表建表（模块化单体嵌入模式补全）
-- 背景：svc/mobile 独立部署时代建表依赖手动/init 流程，从未纳入
-- 迁移体系；5433 容器库重建后 mobile.oa_* 系列表缺失，
-- 而 20260910000008_rls_full_coverage.sql 仅做 RLS 覆盖（引用表
-- 需先存在）。本迁移补齐建表 + RLS 策略，与 RLS 覆盖口径一致。
-- 执行：scripts/migrate.sh run --service database（owner 连接）
-- ============================================================

-- ---------- oa_announcements ----------
CREATE TABLE IF NOT EXISTS mobile.oa_announcements (
    id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id    text NOT NULL,
    title        text NOT NULL,
    content      text NOT NULL,
    priority     text NOT NULL DEFAULT 'normal',
    author       text,
    author_name  text,
    published_at timestamptz NOT NULL DEFAULT now(),
    created_at   timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE mobile.oa_announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE mobile.oa_announcements FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS rls_tenant_isolation ON mobile.oa_announcements;
CREATE POLICY rls_tenant_isolation ON mobile.oa_announcements
    FOR ALL
    USING (current_setting('app.tenant_id', true) IS NULL OR current_setting('app.tenant_id', true) = '' OR tenant_id IS NULL OR tenant_id = NULLIF(current_setting('app.tenant_id', true), ''))
    WITH CHECK (current_setting('app.tenant_id', true) IS NULL OR current_setting('app.tenant_id', true) = '' OR tenant_id IS NULL OR tenant_id = NULLIF(current_setting('app.tenant_id', true), ''));

-- ---------- oa_announcement_reads ----------
CREATE TABLE IF NOT EXISTS mobile.oa_announcement_reads (
    announcement_id uuid NOT NULL REFERENCES mobile.oa_announcements(id) ON DELETE CASCADE,
    user_id         text NOT NULL,
    created_at      timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (announcement_id, user_id)
);

ALTER TABLE mobile.oa_announcement_reads ENABLE ROW LEVEL SECURITY;
ALTER TABLE mobile.oa_announcement_reads FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS rls_tenant_isolation ON mobile.oa_announcement_reads;
CREATE POLICY rls_tenant_isolation ON mobile.oa_announcement_reads
    FOR ALL
    USING (current_setting('app.tenant_id', true) IS NULL OR current_setting('app.tenant_id', true) = '' OR tenant_id IS NULL OR true)
    WITH CHECK (current_setting('app.tenant_id', true) IS NULL OR current_setting('app.tenant_id', true) = '' OR tenant_id IS NULL OR true);

-- ---------- oa_meetings ----------
CREATE TABLE IF NOT EXISTS mobile.oa_meetings (
    id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id      text NOT NULL,
    title          text NOT NULL,
    description    text,
    type           text NOT NULL DEFAULT 'video',
    status         text NOT NULL DEFAULT 'scheduled',
    start_time     timestamptz NOT NULL,
    end_time       timestamptz NOT NULL,
    location       text,
    video_url      text,
    organizer      text,
    organizer_name text,
    attendees      jsonb,
    created_at     timestamptz NOT NULL DEFAULT now(),
    updated_at     timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE mobile.oa_meetings ENABLE ROW LEVEL SECURITY;
ALTER TABLE mobile.oa_meetings FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS rls_tenant_isolation ON mobile.oa_meetings;
CREATE POLICY rls_tenant_isolation ON mobile.oa_meetings
    FOR ALL
    USING (current_setting('app.tenant_id', true) IS NULL OR current_setting('app.tenant_id', true) = '' OR tenant_id IS NULL OR tenant_id = NULLIF(current_setting('app.tenant_id', true), ''))
    WITH CHECK (current_setting('app.tenant_id', true) IS NULL OR current_setting('app.tenant_id', true) = '' OR tenant_id IS NULL OR tenant_id = NULLIF(current_setting('app.tenant_id', true), ''));

-- ---------- oa_calendar_events ----------
CREATE TABLE IF NOT EXISTS mobile.oa_calendar_events (
    id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id        text NOT NULL,
    title            text NOT NULL,
    description      text,
    type             text NOT NULL DEFAULT 'meeting',
    start_time       timestamptz NOT NULL,
    end_time         timestamptz NOT NULL,
    all_day          boolean NOT NULL DEFAULT false,
    location         text,
    is_reminder      boolean NOT NULL DEFAULT false,
    reminder_minutes integer,
    color            text,
    created_at       timestamptz NOT NULL DEFAULT now(),
    updated_at       timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE mobile.oa_calendar_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE mobile.oa_calendar_events FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS rls_tenant_isolation ON mobile.oa_calendar_events;
CREATE POLICY rls_tenant_isolation ON mobile.oa_calendar_events
    FOR ALL
    USING (current_setting('app.tenant_id', true) IS NULL OR current_setting('app.tenant_id', true) = '' OR tenant_id IS NULL OR tenant_id = NULLIF(current_setting('app.tenant_id', true), ''))
    WITH CHECK (current_setting('app.tenant_id', true) IS NULL OR current_setting('app.tenant_id', true) = '' OR tenant_id IS NULL OR tenant_id = NULLIF(current_setting('app.tenant_id', true), ''));

-- ---------- oa_tasks ----------
CREATE TABLE IF NOT EXISTS mobile.oa_tasks (
    id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id     text NOT NULL,
    title         text NOT NULL,
    description   text,
    priority      text NOT NULL DEFAULT 'medium',
    status        text NOT NULL DEFAULT 'todo',
    assignee      text,
    assignee_name text,
    creator       text,
    creator_name  text,
    due_date      timestamptz,
    completed_at  timestamptz,
    tags          jsonb,
    project_id    text,
    created_at    timestamptz NOT NULL DEFAULT now(),
    updated_at    timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE mobile.oa_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE mobile.oa_tasks FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS rls_tenant_isolation ON mobile.oa_tasks;
CREATE POLICY rls_tenant_isolation ON mobile.oa_tasks
    FOR ALL
    USING (current_setting('app.tenant_id', true) IS NULL OR current_setting('app.tenant_id', true) = '' OR tenant_id IS NULL OR tenant_id = NULLIF(current_setting('app.tenant_id', true), ''))
    WITH CHECK (current_setting('app.tenant_id', true) IS NULL OR current_setting('app.tenant_id', true) = '' OR tenant_id IS NULL OR tenant_id = NULLIF(current_setting('app.tenant_id', true), ''));

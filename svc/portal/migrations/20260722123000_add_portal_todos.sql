-- Portal Todos Migration
-- 门户本地待办表

SET search_path TO portal;

-- 待办事项表
CREATE TABLE IF NOT EXISTS portal_todos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    user_id VARCHAR(100) NOT NULL,
    title VARCHAR(200) NOT NULL,
    service_code VARCHAR(50) NOT NULL DEFAULT 'portal',
    service_name VARCHAR(100),
    due_date DATE,
    priority VARCHAR(20) NOT NULL DEFAULT 'medium',
    completed BOOLEAN NOT NULL DEFAULT FALSE,
    todo_type VARCHAR(20) NOT NULL DEFAULT 'personal',
    link_url VARCHAR(500),
    description TEXT,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    deleted_at TIMESTAMPTZ
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_todos_tenant ON portal.portal_todos(tenant_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_todos_user ON portal.portal_todos(user_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_todos_completed ON portal.portal_todos(user_id, completed) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_todos_due_date ON portal.portal_todos(user_id, due_date) WHERE deleted_at IS NULL;

-- 启用行级安全
ALTER TABLE portal_todos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "portal_todos_tenant_isolation" ON portal_todos
    USING (tenant_id = current_setting('app.tenant_id')::uuid);

RESET search_path;

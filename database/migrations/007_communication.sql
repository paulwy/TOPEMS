CREATE TABLE IF NOT EXISTS core_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    title VARCHAR(256) NOT NULL,
    content TEXT,
    notification_type VARCHAR(64) DEFAULT 'info',
    is_read BOOLEAN DEFAULT FALSE,
    is_archived BOOLEAN DEFAULT FALSE,
    priority INTEGER DEFAULT 0,
    data JSONB,
    tenant_id UUID NOT NULL,
    created_at timestamptz DEFAULT NOW(),
    read_at timestamptz
);

CREATE TABLE IF NOT EXISTS core_notification_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(128) NOT NULL,
    title_template VARCHAR(256) NOT NULL,
    content_template TEXT NOT NULL,
    notification_type VARCHAR(64) DEFAULT 'info',
    description TEXT,
    created_by UUID,
    tenant_id UUID NOT NULL,
    created_at timestamptz DEFAULT NOW(),
    updated_at timestamptz DEFAULT NOW(),
    deleted_at timestamptz
);

CREATE TABLE IF NOT EXISTS core_chat_rooms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(128),
    room_type VARCHAR(32) DEFAULT 'private',
    creator_id UUID NOT NULL,
    tenant_id UUID NOT NULL,
    created_at timestamptz DEFAULT NOW(),
    updated_at timestamptz DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS core_chat_members (
    room_id UUID NOT NULL REFERENCES core_chat_rooms(id),
    user_id UUID NOT NULL,
    role VARCHAR(32) DEFAULT 'member',
    tenant_id UUID NOT NULL,
    joined_at timestamptz DEFAULT NOW(),
    PRIMARY KEY (room_id, user_id)
);

CREATE TABLE IF NOT EXISTS core_chat_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id UUID NOT NULL REFERENCES core_chat_rooms(id),
    sender_id UUID NOT NULL,
    sender_name VARCHAR(128),
    message_type VARCHAR(32) DEFAULT 'text',
    content TEXT NOT NULL,
    file_url VARCHAR(512),
    is_recalled BOOLEAN DEFAULT FALSE,
    tenant_id UUID NOT NULL,
    created_at timestamptz DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS core_emails (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    from_email VARCHAR(256) NOT NULL,
    to_email VARCHAR(256) NOT NULL,
    subject VARCHAR(512),
    body TEXT,
    html_body TEXT,
    cc TEXT[],
    bcc TEXT[],
    is_read BOOLEAN DEFAULT FALSE,
    tenant_id UUID NOT NULL,
    sent_at timestamptz,
    read_at timestamptz,
    deleted_at timestamptz,
    created_at timestamptz DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS core_email_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(128) NOT NULL,
    subject_template VARCHAR(512) NOT NULL,
    body_template TEXT NOT NULL,
    description TEXT,
    tenant_id UUID NOT NULL,
    created_at timestamptz DEFAULT NOW(),
    updated_at timestamptz DEFAULT NOW(),
    deleted_at timestamptz
);

CREATE TABLE IF NOT EXISTS core_email_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    from_email VARCHAR(256) NOT NULL,
    to_email VARCHAR(256) NOT NULL,
    subject VARCHAR(512),
    body TEXT,
    html_body TEXT,
    cc TEXT[],
    bcc TEXT[],
    attempts INTEGER DEFAULT 0,
    max_attempts INTEGER DEFAULT 3,
    status VARCHAR(32) DEFAULT 'pending',
    error_message TEXT,
    tenant_id UUID NOT NULL,
    created_at timestamptz DEFAULT NOW(),
    updated_at timestamptz DEFAULT NOW(),
    sent_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_core_notifications_user ON core_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_core_notifications_tenant ON core_notifications(tenant_id);
CREATE INDEX IF NOT EXISTS idx_core_chat_rooms_members ON core_chat_members(user_id);
CREATE INDEX IF NOT EXISTS idx_core_chat_members_tenant ON core_chat_members(tenant_id);
CREATE INDEX IF NOT EXISTS idx_core_chat_messages_room ON core_chat_messages(room_id);
CREATE INDEX IF NOT EXISTS idx_core_chat_messages_tenant ON core_chat_messages(tenant_id);
CREATE INDEX IF NOT EXISTS idx_core_emails_to ON core_emails(to_email);
CREATE INDEX IF NOT EXISTS idx_core_emails_tenant ON core_emails(tenant_id);
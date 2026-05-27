CREATE TABLE IF NOT EXISTS chat_rooms (
    id UUID PRIMARY KEY,
    name VARCHAR(255),
    room_type VARCHAR(20) NOT NULL,
    members JSONB NOT NULL,
    created_by VARCHAR(100) NOT NULL,
    last_message TEXT,
    last_message_time TIMESTAMP,
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL
);

CREATE TABLE IF NOT EXISTS chat_messages (
    id UUID PRIMARY KEY,
    chat_id UUID NOT NULL REFERENCES chat_rooms(id) ON DELETE CASCADE,
    sender_id VARCHAR(100) NOT NULL,
    sender_name VARCHAR(100) NOT NULL,
    message_type VARCHAR(20) NOT NULL,
    content TEXT NOT NULL,
    file_url VARCHAR(500),
    file_name VARCHAR(255),
    created_at TIMESTAMP NOT NULL,
    is_read BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS project_groups (
    id UUID PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    project_id UUID,
    members JSONB NOT NULL,
    created_by VARCHAR(100) NOT NULL,
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL
);

CREATE TABLE IF NOT EXISTS chat_message_attachments (
    id UUID PRIMARY KEY,
    message_id UUID NOT NULL REFERENCES chat_messages(id) ON DELETE CASCADE,
    file_url VARCHAR(500) NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_type VARCHAR(50),
    file_size BIGINT,
    created_at TIMESTAMP NOT NULL
);

CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY,
    user_id VARCHAR(100) NOT NULL,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    notification_type VARCHAR(50) NOT NULL,
    related_id UUID,
    related_type VARCHAR(50),
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_chat_messages_chat_id ON chat_messages(chat_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);

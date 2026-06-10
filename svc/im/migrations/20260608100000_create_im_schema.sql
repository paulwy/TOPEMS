-- IM 服务数据库迁移脚本
-- 创建 im schema
CREATE SCHEMA IF NOT EXISTS im;

-- 创建聊天室表
CREATE TABLE IF NOT EXISTS im.chat_rooms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL DEFAULT gen_random_uuid(),
    name VARCHAR(255),
    room_type VARCHAR(20) NOT NULL,
    members JSONB NOT NULL,
    created_by VARCHAR(100) NOT NULL,
    last_message TEXT,
    last_message_time TIMESTAMP,
    is_muted BOOLEAN NOT NULL DEFAULT FALSE,
    is_pinned BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP
);

-- 创建聊天室成员表
CREATE TABLE IF NOT EXISTS im.chat_room_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL DEFAULT gen_random_uuid(),
    chat_room_id UUID NOT NULL REFERENCES im.chat_rooms(id) ON DELETE CASCADE,
    user_id VARCHAR(100) NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'member',
    joined_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_read_at TIMESTAMP,
    deleted_at TIMESTAMP,
    UNIQUE(chat_room_id, user_id)
);

-- 创建消息表
CREATE TABLE IF NOT EXISTS im.messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL DEFAULT gen_random_uuid(),
    chat_room_id UUID REFERENCES im.chat_rooms(id) ON DELETE CASCADE,
    sender_id VARCHAR(100) NOT NULL,
    sender_name VARCHAR(100) NOT NULL,
    receiver_id VARCHAR(100),
    message_type VARCHAR(20) NOT NULL,
    content TEXT NOT NULL,
    file_url VARCHAR(500),
    file_name VARCHAR(255),
    file_size BIGINT,
    reply_to_id UUID REFERENCES im.messages(id) ON DELETE SET NULL,
    forwarded_from_id UUID REFERENCES im.messages(id) ON DELETE SET NULL,
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    is_edited BOOLEAN NOT NULL DEFAULT FALSE,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP
);

-- 创建消息已读回执表
CREATE TABLE IF NOT EXISTS im.message_read_receipts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL DEFAULT gen_random_uuid(),
    message_id UUID NOT NULL REFERENCES im.messages(id) ON DELETE CASCADE,
    user_id VARCHAR(100) NOT NULL,
    read_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP,
    UNIQUE(message_id, user_id)
);

-- 创建联系人表
CREATE TABLE IF NOT EXISTS im.contacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL DEFAULT gen_random_uuid(),
    user_id VARCHAR(100) NOT NULL,
    contact_user_id VARCHAR(100) NOT NULL,
    contact_name VARCHAR(100) NOT NULL,
    contact_avatar VARCHAR(500),
    alias VARCHAR(100),
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    is_blocked BOOLEAN NOT NULL DEFAULT FALSE,
    group_id UUID REFERENCES im.contact_groups(id) ON DELETE SET NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP,
    UNIQUE(user_id, contact_user_id)
);

-- 创建文件传输表
CREATE TABLE IF NOT EXISTS im.file_transfers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL DEFAULT gen_random_uuid(),
    file_name VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    file_size BIGINT NOT NULL,
    content_type VARCHAR(100) NOT NULL,
    uploader_id VARCHAR(100) NOT NULL,
    uploader_name VARCHAR(100) NOT NULL,
    chat_room_id UUID REFERENCES im.chat_rooms(id) ON DELETE SET NULL,
    message_id UUID REFERENCES im.messages(id) ON DELETE SET NULL,
    is_shared BOOLEAN NOT NULL DEFAULT FALSE,
    share_link VARCHAR(100),
    download_count BIGINT NOT NULL DEFAULT 0,
    expires_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP
);

-- 创建用户状态表
CREATE TABLE IF NOT EXISTS im.user_status (
    user_id VARCHAR(100) PRIMARY KEY,
    organization_id UUID NOT NULL DEFAULT gen_random_uuid(),
    is_online BOOLEAN NOT NULL DEFAULT FALSE,
    status_type VARCHAR(20) NOT NULL DEFAULT 'offline',
    status_message VARCHAR(255),
    last_seen TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP
);

-- 创建审计日志表
CREATE TABLE IF NOT EXISTS im.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL DEFAULT gen_random_uuid(),
    user_id VARCHAR(100) NOT NULL,
    action VARCHAR(50) NOT NULL,
    resource_type VARCHAR(50) NOT NULL,
    resource_id UUID,
    details JSONB NOT NULL,
    ip_address VARCHAR(50),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP
);

-- 创建项目群组表
CREATE TABLE IF NOT EXISTS im.project_groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    project_id UUID,
    members JSONB NOT NULL,
    created_by VARCHAR(100) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP
);

-- 创建通知表
CREATE TABLE IF NOT EXISTS im.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL DEFAULT gen_random_uuid(),
    user_id VARCHAR(100) NOT NULL,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    notification_type VARCHAR(50) NOT NULL,
    related_id UUID,
    related_type VARCHAR(50),
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP
);

-- 创建好友表
CREATE TABLE IF NOT EXISTS im.friends (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL DEFAULT gen_random_uuid(),
    user_id VARCHAR(100) NOT NULL,
    friend_id VARCHAR(100) NOT NULL,
    friend_name VARCHAR(100) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP,
    UNIQUE(user_id, friend_id)
);

-- 创建联系人分组表
CREATE TABLE IF NOT EXISTS im.contact_groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL DEFAULT gen_random_uuid(),
    user_id VARCHAR(100) NOT NULL,
    name VARCHAR(100) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP
);

-- 创建联系人分组成员表
CREATE TABLE IF NOT EXISTS im.contact_group_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL DEFAULT gen_random_uuid(),
    group_id UUID NOT NULL REFERENCES im.contact_groups(id) ON DELETE CASCADE,
    user_id VARCHAR(100) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP
);

-- 创建索引
-- 聊天室索引
CREATE INDEX IF NOT EXISTS idx_chat_rooms_organization_id ON im.chat_rooms(organization_id);
CREATE INDEX IF NOT EXISTS idx_chat_rooms_created_by ON im.chat_rooms(created_by);
CREATE INDEX IF NOT EXISTS idx_chat_rooms_deleted_at ON im.chat_rooms(deleted_at);

-- 聊天室成员索引
CREATE INDEX IF NOT EXISTS idx_chat_room_members_organization_id ON im.chat_room_members(organization_id);
CREATE INDEX IF NOT EXISTS idx_chat_room_members_chat_room_id ON im.chat_room_members(chat_room_id);
CREATE INDEX IF NOT EXISTS idx_chat_room_members_user_id ON im.chat_room_members(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_room_members_deleted_at ON im.chat_room_members(deleted_at);

-- 消息索引
CREATE INDEX IF NOT EXISTS idx_messages_organization_id ON im.messages(organization_id);
CREATE INDEX IF NOT EXISTS idx_messages_chat_room_id ON im.messages(chat_room_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON im.messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_receiver_id ON im.messages(receiver_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON im.messages(created_at);
CREATE INDEX IF NOT EXISTS idx_messages_is_read ON im.messages(is_read);
CREATE INDEX IF NOT EXISTS idx_messages_deleted_at ON im.messages(deleted_at);

-- 消息已读回执索引
CREATE INDEX IF NOT EXISTS idx_message_read_receipts_organization_id ON im.message_read_receipts(organization_id);
CREATE INDEX IF NOT EXISTS idx_message_read_receipts_message_id ON im.message_read_receipts(message_id);
CREATE INDEX IF NOT EXISTS idx_message_read_receipts_user_id ON im.message_read_receipts(user_id);
CREATE INDEX IF NOT EXISTS idx_message_read_receipts_deleted_at ON im.message_read_receipts(deleted_at);

-- 联系人索引
CREATE INDEX IF NOT EXISTS idx_contacts_organization_id ON im.contacts(organization_id);
CREATE INDEX IF NOT EXISTS idx_contacts_user_id ON im.contacts(user_id);
CREATE INDEX IF NOT EXISTS idx_contacts_contact_user_id ON im.contacts(contact_user_id);
CREATE INDEX IF NOT EXISTS idx_contacts_is_blocked ON im.contacts(is_blocked);
CREATE INDEX IF NOT EXISTS idx_contacts_deleted_at ON im.contacts(deleted_at);

-- 文件传输索引
CREATE INDEX IF NOT EXISTS idx_file_transfers_organization_id ON im.file_transfers(organization_id);
CREATE INDEX IF NOT EXISTS idx_file_transfers_uploader_id ON im.file_transfers(uploader_id);
CREATE INDEX IF NOT EXISTS idx_file_transfers_chat_room_id ON im.file_transfers(chat_room_id);
CREATE INDEX IF NOT EXISTS idx_file_transfers_created_at ON im.file_transfers(created_at);
CREATE INDEX IF NOT EXISTS idx_file_transfers_deleted_at ON im.file_transfers(deleted_at);

-- 用户状态索引
CREATE INDEX IF NOT EXISTS idx_user_status_organization_id ON im.user_status(organization_id);
CREATE INDEX IF NOT EXISTS idx_user_status_is_online ON im.user_status(is_online);
CREATE INDEX IF NOT EXISTS idx_user_status_deleted_at ON im.user_status(deleted_at);

-- 审计日志索引
CREATE INDEX IF NOT EXISTS idx_audit_logs_organization_id ON im.audit_logs(organization_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON im.audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON im.audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON im.audit_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_audit_logs_deleted_at ON im.audit_logs(deleted_at);

-- 项目群组索引
CREATE INDEX IF NOT EXISTS idx_project_groups_organization_id ON im.project_groups(organization_id);
CREATE INDEX IF NOT EXISTS idx_project_groups_deleted_at ON im.project_groups(deleted_at);

-- 通知索引
CREATE INDEX IF NOT EXISTS idx_notifications_organization_id ON im.notifications(organization_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON im.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON im.notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_deleted_at ON im.notifications(deleted_at);

-- 好友索引
CREATE INDEX IF NOT EXISTS idx_friends_organization_id ON im.friends(organization_id);
CREATE INDEX IF NOT EXISTS idx_friends_user_id ON im.friends(user_id);
CREATE INDEX IF NOT EXISTS idx_friends_status ON im.friends(status);
CREATE INDEX IF NOT EXISTS idx_friends_deleted_at ON im.friends(deleted_at);

-- 联系人分组索引
CREATE INDEX IF NOT EXISTS idx_contact_groups_organization_id ON im.contact_groups(organization_id);
CREATE INDEX IF NOT EXISTS idx_contact_groups_user_id ON im.contact_groups(user_id);
CREATE INDEX IF NOT EXISTS idx_contact_groups_deleted_at ON im.contact_groups(deleted_at);

-- 联系人分组成员索引
CREATE INDEX IF NOT EXISTS idx_contact_group_members_organization_id ON im.contact_group_members(organization_id);
CREATE INDEX IF NOT EXISTS idx_contact_group_members_group_id ON im.contact_group_members(group_id);
CREATE INDEX IF NOT EXISTS idx_contact_group_members_deleted_at ON im.contact_group_members(deleted_at);
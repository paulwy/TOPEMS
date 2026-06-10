-- 添加个人中心相关功能的数据库迁移

-- 为用户表添加头像字段
ALTER TABLE IF EXISTS iam.users 
ADD COLUMN IF NOT EXISTS avatar_url VARCHAR(500);

-- 创建用户偏好设置表
CREATE TABLE IF NOT EXISTS iam.user_preferences (
    user_id UUID PRIMARY KEY REFERENCES iam.users(id) ON DELETE CASCADE,
    notification_settings JSONB DEFAULT '{"email_enabled": true, "system_enabled": true, "workflow_enabled": true, "document_enabled": true, "security_enabled": true}'::JSONB,
    shortcuts JSONB DEFAULT '[]'::JSONB,
    language VARCHAR(10) DEFAULT 'zh-CN',
    timezone VARCHAR(50) DEFAULT 'Asia/Shanghai',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 创建用户访问日志表（用于记录用户活动）
CREATE TABLE IF NOT EXISTS iam.user_access_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES iam.users(id) ON DELETE CASCADE,
    username VARCHAR(50) NOT NULL,
    action VARCHAR(100) NOT NULL,
    resource VARCHAR(100),
    resource_id UUID,
    ip_address INET,
    user_agent TEXT,
    success BOOLEAN DEFAULT TRUE,
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_user_preferences_user_id ON iam.user_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_user_access_logs_user_id ON iam.user_access_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_user_access_logs_created_at ON iam.user_access_logs(created_at);

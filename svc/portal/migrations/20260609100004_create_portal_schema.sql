-- Portal Schema Migration
-- 门户服务

-- Create schema
CREATE SCHEMA IF NOT EXISTS portal;

-- Set search path
SET search_path TO portal;

-- ==================== 门户配置表 ====================

-- 门户配置表
CREATE TABLE IF NOT EXISTS portal_configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    config_key VARCHAR(100) NOT NULL UNIQUE,
    config_value TEXT,
    config_type VARCHAR(50) NOT NULL DEFAULT 'string',
    description TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==================== 门户菜单表 ====================

-- 门户菜单表
CREATE TABLE IF NOT EXISTS portal_menus (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    menu_code VARCHAR(50) NOT NULL UNIQUE,
    menu_name VARCHAR(100) NOT NULL,
    menu_type VARCHAR(20) NOT NULL DEFAULT 'link',
    parent_id UUID REFERENCES portal.portal_menus(id),
    path VARCHAR(200),
    icon VARCHAR(50),
    sort_order INTEGER NOT NULL DEFAULT 0,
    is_visible BOOLEAN NOT NULL DEFAULT TRUE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    permissions JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

-- ==================== 门户布局表 ====================

-- 门户布局表
CREATE TABLE IF NOT EXISTS portal_layouts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    layout_name VARCHAR(100) NOT NULL,
    layout_type VARCHAR(50) NOT NULL,
    layout_config JSONB,
    is_default BOOLEAN NOT NULL DEFAULT FALSE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

-- ==================== 用户偏好表 ====================

-- 用户偏好表
CREATE TABLE IF NOT EXISTS user_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR(100) NOT NULL,
    preference_key VARCHAR(100) NOT NULL,
    preference_value JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, preference_key)
);

-- ==================== 门户公告表 ====================

-- 门户公告表
CREATE TABLE IF NOT EXISTS portal_announcements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(200) NOT NULL,
    content TEXT NOT NULL,
    announcement_type VARCHAR(50) NOT NULL DEFAULT 'general',
    priority INTEGER NOT NULL DEFAULT 0,
    publish_date TIMESTAMPTZ NOT NULL,
    expire_date TIMESTAMPTZ,
    status VARCHAR(20) NOT NULL DEFAULT 'draft',
    author VARCHAR(100),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

-- ==================== 门户访问日志表 ====================

-- 门户访问日志表
CREATE TABLE IF NOT EXISTS portal_access_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR(100),
    session_id VARCHAR(100),
    access_time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ip_address VARCHAR(50),
    user_agent VARCHAR(200),
    access_path VARCHAR(200),
    access_method VARCHAR(10),
    response_status INTEGER,
    response_time INTEGER,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==================== 索引创建 ====================

CREATE INDEX IF NOT EXISTS idx_portal_configs_key ON portal.portal_configs(config_key);
CREATE INDEX IF NOT EXISTS idx_portal_menus_code ON portal.portal_menus(menu_code);
CREATE INDEX IF NOT EXISTS idx_portal_menus_parent ON portal.portal_menus(parent_id);
CREATE INDEX IF NOT EXISTS idx_user_preferences_user ON portal.user_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_portal_announcements_status ON portal.portal_announcements(status);
CREATE INDEX IF NOT EXISTS idx_portal_announcements_publish ON portal.portal_announcements(publish_date);
CREATE INDEX IF NOT EXISTS idx_portal_access_logs_user ON portal.portal_access_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_portal_access_logs_time ON portal.portal_access_logs(access_time);

-- Reset search path
RESET search_path;
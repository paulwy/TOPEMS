-- Mobile Service Idempotency Migration
-- 为 mobile_push_notifications 表添加幂等性支持
-- 通过 (source_type, source_id) 部分唯一索引实现 ON CONFLICT DO NOTHING

-- ============================================================================
-- 1. 确保 mobile_push_notifications 表存在
-- ============================================================================
-- 该表被 event_handlers/mod.rs 中的 create_push_notification 引用。
-- 使用 CREATE TABLE IF NOT EXISTS 以兼容并行任务可能创建该表的情况。
CREATE TABLE IF NOT EXISTS mobile_push_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    notification_type VARCHAR(50) NOT NULL,
    title VARCHAR(200) NOT NULL,
    content TEXT,
    priority VARCHAR(20) NOT NULL DEFAULT 'normal',
    source_type VARCHAR(50),
    source_id UUID,
    target_user VARCHAR(100) NOT NULL DEFAULT 'all',
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    push_time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    tenant_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 兼容性补列：如果表已存在但缺少某些列，则补充
ALTER TABLE mobile_push_notifications ADD COLUMN IF NOT EXISTS notification_type VARCHAR(50);
ALTER TABLE mobile_push_notifications ADD COLUMN IF NOT EXISTS title VARCHAR(200);
ALTER TABLE mobile_push_notifications ADD COLUMN IF NOT EXISTS content TEXT;
ALTER TABLE mobile_push_notifications ADD COLUMN IF NOT EXISTS priority VARCHAR(20) NOT NULL DEFAULT 'normal';
ALTER TABLE mobile_push_notifications ADD COLUMN IF NOT EXISTS source_type VARCHAR(50);
ALTER TABLE mobile_push_notifications ADD COLUMN IF NOT EXISTS source_id UUID;
ALTER TABLE mobile_push_notifications ADD COLUMN IF NOT EXISTS target_user VARCHAR(100) NOT NULL DEFAULT 'all';
ALTER TABLE mobile_push_notifications ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'pending';
ALTER TABLE mobile_push_notifications ADD COLUMN IF NOT EXISTS push_time TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE mobile_push_notifications ADD COLUMN IF NOT EXISTS tenant_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000';

-- ============================================================================
-- 2. 添加部分唯一索引以支持 ON CONFLICT (source_type, source_id) DO NOTHING
-- ============================================================================
CREATE UNIQUE INDEX IF NOT EXISTS idx_mobile_push_notifications_source_unique
ON mobile_push_notifications(source_type, source_id)
WHERE source_type IS NOT NULL AND source_id IS NOT NULL;

-- 辅助索引：按类型/状态查询
CREATE INDEX IF NOT EXISTS idx_mobile_push_notifications_type
ON mobile_push_notifications(notification_type);
CREATE INDEX IF NOT EXISTS idx_mobile_push_notifications_status
ON mobile_push_notifications(status);
CREATE INDEX IF NOT EXISTS idx_mobile_push_notifications_tenant
ON mobile_push_notifications(tenant_id);

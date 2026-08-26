-- V456: 审计日志数据库存储扩展
-- 为 permission_audit_logs 表添加 metadata 字段，支持审计日志模块的完整功能

-- 添加 metadata 字段（JSONB 类型，存储额外元数据）
ALTER TABLE permission_audit_logs
    ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}'::jsonb;

-- 添加 metadata 索引（GIN 索引，支持 JSONB 查询）
CREATE INDEX IF NOT EXISTS idx_audit_logs_metadata ON permission_audit_logs USING GIN (metadata);

-- 添加复合索引（tenant_id + changed_at DESC，优化按租户和时间查询）
CREATE INDEX IF NOT EXISTS idx_audit_logs_tenant_changed_at
    ON permission_audit_logs(tenant_id, changed_at DESC);

-- 添加复合索引（user_id + changed_at DESC，优化按用户和时间查询）
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_changed_at
    ON permission_audit_logs(user_id, changed_at DESC);

-- 注释
COMMENT ON COLUMN permission_audit_logs.metadata IS '额外元数据，JSONB格式';
COMMENT ON INDEX idx_audit_logs_metadata IS '审计日志元数据GIN索引';
COMMENT ON INDEX idx_audit_logs_tenant_changed_at IS '租户+时间复合索引';
COMMENT ON INDEX idx_audit_logs_user_changed_at IS '用户+时间复合索引';

-- 增量同步调度器状态字段
-- 为 integration.erp_connections 表添加同步状态跟踪字段
-- 用于支持重试机制、失败熔断、同步状态跟踪

-- 添加 last_sync_status 字段（同步状态：success/failed）
ALTER TABLE integration.erp_connections
ADD COLUMN IF NOT EXISTS last_sync_status VARCHAR(20);

-- 添加 last_sync_error 字段（最后一次同步错误信息）
ALTER TABLE integration.erp_connections
ADD COLUMN IF NOT EXISTS last_sync_error TEXT;

-- 添加 consecutive_failures 字段（连续失败次数，用于熔断）
ALTER TABLE integration.erp_connections
ADD COLUMN IF NOT EXISTS consecutive_failures INTEGER NOT NULL DEFAULT 0;

-- 添加 last_failure_at 字段（最后一次失败时间，用于熔断冷却）
ALTER TABLE integration.erp_connections
ADD COLUMN IF NOT EXISTS last_failure_at TIMESTAMP WITHOUT TIME ZONE;

-- 添加索引，加速熔断状态查询
CREATE INDEX IF NOT EXISTS idx_erp_connections_failures
ON integration.erp_connections (consecutive_failures, last_failure_at);

-- 添加索引，加速同步状态查询
CREATE INDEX IF NOT EXISTS idx_erp_connections_sync_status
ON integration.erp_connections (last_sync_status, last_sync_at);

-- 注释
COMMENT ON COLUMN integration.erp_connections.last_sync_status IS '最后一次同步状态（success/failed）';
COMMENT ON COLUMN integration.erp_connections.last_sync_error IS '最后一次同步错误信息（截断到500字符）';
COMMENT ON COLUMN integration.erp_connections.consecutive_failures IS '连续失败次数，超过5次触发熔断';
COMMENT ON COLUMN integration.erp_connections.last_failure_at IS '最后一次失败时间，用于熔断冷却（30分钟）';

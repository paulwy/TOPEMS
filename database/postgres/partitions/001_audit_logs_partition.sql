-- 审计日志表按月分区示例
-- 文件: 001_audit_logs_partition.sql
-- 说明: 将审计日志表转换为按月分区的分区表

-- ==============================================================================
-- 1. 创建分区表
-- ==============================================================================

CREATE TABLE IF NOT EXISTS core_infra.audit_logs_partitioned (
    id UUID NOT NULL DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    user_id UUID,
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(100),
    resource_id VARCHAR(100),
    details JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    PRIMARY KEY (id, created_at)
) PARTITION BY RANGE (created_at);

-- ==============================================================================
-- 2. 创建索引
-- ==============================================================================

CREATE INDEX idx_audit_logs_tenant_created ON core_infra.audit_logs_partitioned
    (tenant_id, created_at);

CREATE INDEX idx_audit_logs_user ON core_infra.audit_logs_partitioned
    (user_id);

CREATE INDEX idx_audit_logs_action ON core_infra.audit_logs_partitioned
    (action, created_at);

CREATE INDEX idx_audit_logs_resource ON core_infra.audit_logs_partitioned
    (resource_type, resource_id);

-- ==============================================================================
-- 3. 创建未来 12 个月的分区（2026年7月 - 2027年6月）
-- ==============================================================================

-- 2026年
CREATE TABLE audit_logs_2026_07 PARTITION OF core_infra.audit_logs_partitioned
    FOR VALUES FROM ('2026-07-01') TO ('2026-08-01');

CREATE TABLE audit_logs_2026_08 PARTITION OF core_infra.audit_logs_partitioned
    FOR VALUES FROM ('2026-08-01') TO ('2026-09-01');

CREATE TABLE audit_logs_2026_09 PARTITION OF core_infra.audit_logs_partitioned
    FOR VALUES FROM ('2026-09-01') TO ('2026-10-01');

CREATE TABLE audit_logs_2026_10 PARTITION OF core_infra.audit_logs_partitioned
    FOR VALUES FROM ('2026-10-01') TO ('2026-11-01');

CREATE TABLE audit_logs_2026_11 PARTITION OF core_infra.audit_logs_partitioned
    FOR VALUES FROM ('2026-11-01') TO ('2026-12-01');

CREATE TABLE audit_logs_2026_12 PARTITION OF core_infra.audit_logs_partitioned
    FOR VALUES FROM ('2026-12-01') TO ('2027-01-01');

-- 2027年
CREATE TABLE audit_logs_2027_01 PARTITION OF core_infra.audit_logs_partitioned
    FOR VALUES FROM ('2027-01-01') TO ('2027-02-01');

CREATE TABLE audit_logs_2027_02 PARTITION OF core_infra.audit_logs_partitioned
    FOR VALUES FROM ('2027-02-01') TO ('2027-03-01');

CREATE TABLE audit_logs_2027_03 PARTITION OF core_infra.audit_logs_partitioned
    FOR VALUES FROM ('2027-03-01') TO ('2027-04-01');

CREATE TABLE audit_logs_2027_04 PARTITION OF core_infra.audit_logs_partitioned
    FOR VALUES FROM ('2027-04-01') TO ('2027-05-01');

CREATE TABLE audit_logs_2027_05 PARTITION OF core_infra.audit_logs_partitioned
    FOR VALUES FROM ('2027-05-01') TO ('2027-06-01');

CREATE TABLE audit_logs_2027_06 PARTITION OF core_infra.audit_logs_partitioned
    FOR VALUES FROM ('2027-06-01') TO ('2027-07-01');

-- ==============================================================================
-- 4. 数据迁移（可选）
-- ==============================================================================

-- 如果存在旧的 audit_logs 表，迁移数据到分区表
-- 注意：根据实际情况调整表名和字段

-- 方法 1: 直接插入（适用于数据量不大的情况）
-- INSERT INTO core_infra.audit_logs_partitioned
-- SELECT * FROM core_infra.audit_logs;

-- 方法 2: 分批迁移（推荐用于大数据量）
-- DO $$
-- DECLARE
--     batch_start TIMESTAMP;
--     batch_end TIMESTAMP;
-- BEGIN
--     batch_start := '2026-01-01';
--     WHILE batch_start < NOW() LOOP
--         batch_end := batch_start + INTERVAL '1 month';
--         INSERT INTO core_infra.audit_logs_partitioned
--         SELECT * FROM core_infra.audit_logs
--         WHERE created_at >= batch_start AND created_at < batch_end;
--         batch_start := batch_end;
--         COMMIT;
--     END LOOP;
-- END $$;

-- ==============================================================================
-- 5. 创建视图（便于应用程序切换）
-- ==============================================================================

-- 创建视图指向新分区表，应用程序可以逐步切换
CREATE OR REPLACE VIEW core_infra.audit_logs_v AS
SELECT * FROM core_infra.audit_logs_partitioned;

-- ==============================================================================
-- 6. 授权
-- ==============================================================================

GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA core_infra TO topems;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA core_infra TO topems;

-- ==============================================================================
-- 7. 注释
-- ==============================================================================

COMMENT ON TABLE core_infra.audit_logs_partitioned IS '审计日志表（按月分区）';
COMMENT ON COLUMN core_infra.audit_logs_partitioned.id IS '主键 UUID';
COMMENT ON COLUMN core_infra.audit_logs_partitioned.tenant_id IS '租户 ID';
COMMENT ON COLUMN core_infra.audit_logs_partitioned.user_id IS '用户 ID';
COMMENT ON COLUMN core_infra.audit_logs_partitioned.action IS '操作类型';
COMMENT ON COLUMN core_infra.audit_logs_partitioned.resource_type IS '资源类型';
COMMENT ON COLUMN core_infra.audit_logs_partitioned.resource_id IS '资源 ID';
COMMENT ON COLUMN core_infra.audit_logs_partitioned.details IS '详细信息 JSONB';
COMMENT ON COLUMN core_infra.audit_logs_partitioned.ip_address IS 'IP 地址';
COMMENT ON COLUMN core_infra.audit_logs_partitioned.user_agent IS '用户代理';
COMMENT ON COLUMN core_infra.audit_logs_partitioned.created_at IS '创建时间（分区键）';

-- ==============================================================================
-- 8. 验证
-- ==============================================================================

-- 查看分区表定义
SELECT
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE tablename LIKE 'audit_logs_%'
ORDER BY tablename;

-- 验证分区裁剪
EXPLAIN (ANALYZE, BUFFERS)
SELECT * FROM core_infra.audit_logs_partitioned
WHERE created_at >= '2026-07-01' AND created_at < '2026-08-01'
LIMIT 10;
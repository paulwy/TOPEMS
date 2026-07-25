#!/bin/bash
# TOPEMS 数据库初始化脚本
# 用于在PostgreSQL中创建所有必要的schema和表结构

set -e

echo "========================================"
echo "TOPEMS 数据库初始化脚本"
echo "========================================"

# 数据库连接参数
DB_HOST=${DB_HOST:-localhost}
DB_PORT=${DB_PORT:-5432}
DB_NAME=${DB_NAME:-topems}
DB_USER=${DB_USER:-topems}
DB_PASSWORD=${DB_PASSWORD:-topems_secret}

# 导出密码
export PGPASSWORD=$DB_PASSWORD

echo "连接到数据库: $DB_HOST:$DB_PORT/$DB_NAME"

# 测试连接
psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "SELECT version();" > /dev/null 2>&1 || {
    echo "错误: 无法连接到数据库"
    exit 1
}

echo "✓ 数据库连接成功"

# ==================== 创建 Schema ====================

echo ""
echo "创建 Schema..."

# 共享Schema（包含审计日志等公共表）
psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" << 'EOF'
-- 创建共享schema（包含公共表）
CREATE SCHEMA IF NOT EXISTS shared;

-- 审计日志表
CREATE TABLE IF NOT EXISTS shared.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    action VARCHAR(100) NOT NULL,
    resource VARCHAR(100) NOT NULL,
    resource_id UUID,
    user_id UUID,
    details JSONB,
    status VARCHAR(50) NOT NULL,
    error_message TEXT,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON shared.audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource ON shared.audit_logs(resource);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource_id ON shared.audit_logs(resource_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON shared.audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON shared.audit_logs(created_at DESC);

-- 权限配置表
CREATE TABLE IF NOT EXISTS shared.module_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    module VARCHAR(100) NOT NULL,
    permission VARCHAR(100) NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(module, permission)
);

-- 角色权限表
CREATE TABLE IF NOT EXISTS shared.role_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    role_id UUID NOT NULL,
    module VARCHAR(100) NOT NULL,
    permission VARCHAR(100) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(role_id, module, permission)
);

-- 数据字典表
CREATE TABLE IF NOT EXISTS shared.data_dict (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category VARCHAR(100) NOT NULL,
    code VARCHAR(100) NOT NULL,
    name VARCHAR(200) NOT NULL,
    value TEXT,
    sort_order INT DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(category, code)
);

-- 序号表
CREATE TABLE IF NOT EXISTS shared.sequence (
    name VARCHAR(100) PRIMARY KEY,
    current_value BIGINT NOT NULL DEFAULT 0,
    increment_by INT NOT NULL DEFAULT 1,
    max_value BIGINT NOT NULL DEFAULT 9223372036854775807,
    cycle BOOLEAN NOT NULL DEFAULT FALSE
);

-- 初始化序号
INSERT INTO shared.sequence (name, current_value, increment_by, max_value, cycle)
VALUES ('global', 0, 1, 9223372036854775807, FALSE)
ON CONFLICT (name) DO NOTHING;

EOF

echo "✓ 共享Schema创建完成"

# ==================== 业务Schema ====================

echo ""
echo "创建业务Schema..."

SCHEMAS=(
    "iam"
    "erp"
    "hrm"
    "crm"
    "pm"
    "rs"
    "scm"
    "srm"
    "wms"
    "mes"
    "qms"
    "lims"
    "ehs"
    "gis"
    "ai"
    "im"
    "mobile"
    "bi"
    "doc"
    "file"
    "mail"
    "flow"
    "pdm"
    "portal"
    "report"
    "notification"
    "integration"
)

for schema in "${SCHEMAS[@]}"; do
    echo "  创建 schema: $schema"
    psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "CREATE SCHEMA IF NOT EXISTS $schema;"
done

echo "✓ 业务Schema创建完成"

# ==================== 设置默认权限 ====================

echo ""
echo "设置默认权限..."

psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" << 'EOF'
-- 授予用户对所有schema的权限
GRANT USAGE ON SCHEMA shared TO topems;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA shared TO topems;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA shared TO topems;

-- 为每个业务schema授予权限
DO $$
DECLARE
    schema_name TEXT;
BEGIN
    FOR schema_name IN
        SELECT schema_name FROM information_schema.schemata
        WHERE schema_name NOT IN ('pg_catalog', 'information_schema', 'public')
    LOOP
        EXECUTE format('GRANT USAGE ON SCHEMA %I TO topems', schema_name);
        EXECUTE format('GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA %I TO topems', schema_name);
        EXECUTE format('GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA %I TO topems', schema_name);
    END LOOP;
END $$;
EOF

echo "✓ 权限设置完成"

# ==================== 初始化数据字典 ====================

echo ""
echo "初始化数据字典..."

psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" << 'EOF'
-- 状态枚举
INSERT INTO shared.data_dict (category, code, name, value, sort_order) VALUES
('status', 'active', '激活', 'active', 1),
('status', 'inactive', '未激活', 'inactive', 2),
('status', 'pending', '待处理', 'pending', 3),
('status', 'approved', '已批准', 'approved', 4),
('status', 'rejected', '已拒绝', 'rejected', 5),
('status', 'deleted', '已删除', 'deleted', 6),
ON CONFLICT (category, code) DO NOTHING;

-- 是/否
INSERT INTO shared.data_dict (category, code, name, value, sort_order) VALUES
('boolean', 'yes', '是', 'true', 1),
('boolean', 'no', '否', 'false', 2),
ON CONFLICT (category, code) DO NOTHING;

-- 性别
INSERT INTO shared.data_dict (category, code, name, value, sort_order) VALUES
('gender', 'male', '男', 'male', 1),
('gender', 'female', '女', 'female', 2),
('gender', 'unknown', '未知', 'unknown', 3),
ON CONFLICT (category, code) DO NOTHING;

-- 风险等级
INSERT INTO shared.data_dict (category, code, name, value, sort_order) VALUES
('risk_level', 'low', '低风险', 'low', 1),
('risk_level', 'medium', '中风险', 'medium', 2),
('risk_level', 'high', '高风险', 'high', 3),
('risk_level', 'critical', '极高风险', 'critical', 4),
ON CONFLICT (category, code) DO NOTHING;

-- 优先级
INSERT INTO shared.data_dict (category, code, name, value, sort_order) VALUES
('priority', 'low', '低', 'low', 1),
('priority', 'medium', '中', 'medium', 2),
('priority', 'high', '高', 'high', 3),
('priority', 'urgent', '紧急', 'urgent', 4),
ON CONFLICT (category, code) DO NOTHING;

-- 审批状态
INSERT INTO shared.data_dict (category, code, name, value, sort_order) VALUES
('approval_status', 'draft', '草稿', 'draft', 1),
('approval_status', 'pending', '待审批', 'pending', 2),
('approval_status', 'approved', '已批准', 'approved', 3),
('approval_status', 'rejected', '已拒绝', 'rejected', 4),
('approval_status', 'returned', '已退回', 'returned', 5),
ON CONFLICT (category, code) DO NOTHING;
EOF

echo "✓ 数据字典初始化完成"

# ==================== 创建扩展 ====================

echo ""
echo "创建PostgreSQL扩展..."

psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" << 'EOF'
-- 创建必要的扩展
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";  -- 用于模糊搜索

-- 为审计日志表创建GIN索引以支持JSONB查询
CREATE INDEX IF NOT EXISTS idx_audit_logs_details ON shared.audit_logs USING GIN (details);
EOF

echo "✓ PostgreSQL扩展创建完成"

echo ""
echo "========================================"
echo "数据库初始化完成！"
echo "========================================"
echo ""
echo "下一步："
echo "1. 运行各服务的迁移脚本创建表结构"
echo "2. 启动应用程序"
echo ""

# 清理
unset PGPASSWORD

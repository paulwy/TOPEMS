#!/bin/bash

echo "=========================================="
echo "  TOPEMS 数据库初始化脚本"
echo "=========================================="
echo ""

# 检查 PostgreSQL 是否运行
echo "🔍 检查 PostgreSQL 服务..."
if ! nc -z localhost 5432 2>/dev/null; then
    echo "❌ PostgreSQL 未运行，请先启动: brew services start postgresql@16"
    exit 1
fi
echo "✅ PostgreSQL 运行正常"
echo ""

# PostgreSQL bin 目录
PG_BIN="/opt/homebrew/Cellar/postgresql@16/16.14/bin"
PSQL="${PG_BIN}/psql"
CREATEDB="${PG_BIN}/createdb"
CREATEUSER="${PG_BIN}/createuser"

# 设置环境变量
export PGHOST=localhost
export PGPORT=5432
export PGUSER=$(whoami)

# 创建 topems 用户（如果不存在）
echo "👤 创建数据库用户..."
$CREATEUSER -s topems 2>/dev/null || echo "   用户 topems 已存在"
echo ""

# 设置 topems 用户密码
echo "🔑 设置用户密码..."
export PGPASSWORD=topems_secret
$PSQL -U topems -d postgres -c "ALTER USER topems WITH PASSWORD 'topems_secret';" 2>/dev/null || echo "   密码设置可能失败，但继续..."
unset PGPASSWORD
echo ""

# 创建 topems 数据库（如果不存在）
echo "📦 创建数据库..."
$CREATEDB -O topems topems 2>/dev/null || echo "   数据库 topems 已存在"
echo ""

# 为 topems 用户授予权限
echo "🔐 授予 schema 权限..."
export PGPASSWORD=topems_secret
$PSQL -U topems -d topems -c "GRANT ALL PRIVILEGES ON SCHEMA iam TO topems;" 2>/dev/null
$PSQL -U topems -d topems -c "GRANT ALL PRIVILEGES ON SCHEMA public TO topems;" 2>/dev/null
$PSQL -U topems -d topems -c "GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA iam TO topems;" 2>/dev/null
$PSQL -U topems -d topems -c "GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA iam TO topems;" 2>/dev/null
unset PGPASSWORD
echo ""

echo "=========================================="
echo "  ✅ 数据库初始化完成！"
echo "=========================================="
echo ""
echo "📋 数据库信息："
echo "   • 数据库名: topems"
echo "   • 用户名: topems"
echo "   • 密码: topems_secret"
echo "   • 端口: 5432"
echo ""

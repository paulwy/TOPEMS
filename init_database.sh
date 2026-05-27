#!/bin/bash
# TOPEMS 数据库初始化脚本

# 获取脚本所在目录
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "=============================================="
echo "      TOPEMS 数据库初始化"
echo "=============================================="
echo ""

# 检查 PostgreSQL 是否安装
if ! command -v psql &> /dev/null; then
    echo "❌ PostgreSQL 未安装，请先安装 PostgreSQL"
    exit 1
fi

echo "✅ PostgreSQL 已安装"

# 检查 PostgreSQL 是否运行
if ! pg_isready &> /dev/null; then
    echo "⚠️  PostgreSQL 未运行，正在启动..."
    if command -v brew &> /dev/null; then
        brew services start postgresql@16 || brew services start postgresql
        sleep 3
    else
        echo "❌ 请手动启动 PostgreSQL"
        exit 1
    fi
fi

echo "✅ PostgreSQL 正在运行"

# 创建数据库
echo ""
echo "📊 创建数据库 topems..."
if ! psql -lqt | cut -d \| -f 1 | grep -qw topems; then
    createdb topems || {
        echo "⚠️  数据库可能已存在或创建失败，继续执行"
    }
else
    echo "ℹ️  数据库 topems 已存在"
fi

# 创建用户
echo ""
echo "👤 创建数据库用户..."
psql -d postgres -c "CREATE USER IF NOT EXISTS topems WITH PASSWORD 'topems_secret';" 2> /dev/null || {
    echo "⚠️  用户可能已存在"
}

# 授权
echo ""
echo "🔑 授予权限..."
psql -d postgres -c "GRANT ALL PRIVILEGES ON DATABASE topems TO topems;" 2> /dev/null || {
    echo "⚠️  授权可能已存在"
}

# 初始化表结构
echo ""
echo "📋 初始化数据库表结构..."
if [ -f "infrastructure/docker/init.sql" ]; then
    psql -d topems -f "infrastructure/docker/init.sql"
else
    echo "❌ 找不到初始化脚本: infrastructure/docker/init.sql"
    exit 1
fi

echo ""
echo "=============================================="
echo "      数据库初始化完成！"
echo "=============================================="
echo ""
echo "📝 默认测试账号："
echo "   管理员: admin / admin123"
echo ""
echo "🚀 现在可以运行 ./start.sh 启动所有服务"
echo ""

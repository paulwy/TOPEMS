#!/bin/bash

# TOPEMS 数据库初始化脚本
# 用于创建数据库、用户和授予权限

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo "=============================================="
echo "  TOPEMS 数据库初始化"
echo "=============================================="
echo ""

# 检查 PostgreSQL 是否运行
echo "🔍 检查 PostgreSQL 服务..."
if ! command -v psql &> /dev/null; then
    echo -e "${RED}错误:${NC} PostgreSQL 客户端未安装"
    exit 1
fi

# 尝试连接数据库
echo "📦 检查数据库连接..."
if ! psql -lqt > /dev/null 2>&1; then
    echo -e "${YELLOW}警告:${NC} 无法连接到 PostgreSQL"
    echo "请确保 PostgreSQL 正在运行"
    exit 1
fi

echo -e "${GREEN}✅${NC} PostgreSQL 连接正常"
echo ""

# 创建用户
echo "👤 创建数据库用户..."
psql -d postgres -c "CREATE USER IF NOT EXISTS topems WITH PASSWORD 'topems_secret';" 2>/dev/null

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅${NC} 用户 topems 已创建"
else
    echo -e "${YELLOW}⚠️${NC} 用户 topems 可能已存在，继续..."
fi

# 创建数据库
echo "📦 创建数据库..."
psql -d postgres -c "CREATE DATABASE IF NOT EXISTS topems OWNER topems;" 2>/dev/null

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅${NC} 数据库 topems 已创建"
else
    echo -e "${YELLOW}⚠️${NC} 数据库 topems 可能已存在，继续..."
fi

# 授予权限
echo "🔐 授予权限..."
psql -d topems -c "GRANT ALL PRIVILEGES ON SCHEMA public TO topems;" 2>/dev/null
psql -d topems -c "GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO topems;" 2>/dev/null
psql -d topems -c "GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO topems;" 2>/dev/null

echo -e "${GREEN}✅${NC} 权限已授予"
echo ""
echo "=============================================="
echo "  数据库初始化完成！"
echo "=============================================="
echo ""
echo "数据库信息："
echo "  数据库名: topems"
echo "  用户名:   topems"
echo "  密码:     topems_secret"
echo "  端口:     5432"
echo ""
echo "连接字符串:"
echo "  postgres://topems:topems_secret@localhost:5432/topems"
echo ""

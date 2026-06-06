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

# 初始化权限表结构
echo "🔐 初始化权限管理表结构..."
PERMISSION_SCHEMA_FILE="../platform/topems-iam/backend/db/permission_schema.sql"

if [ -f "$PERMISSION_SCHEMA_FILE" ]; then
    psql -d topems -U topems -f "$PERMISSION_SCHEMA_FILE" > /dev/null 2>&1
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅${NC} 权限表结构已创建"
    else
        echo -e "${YELLOW}⚠️${NC} 权限表结构可能已存在，继续..."
    fi
else
    echo -e "${YELLOW}⚠️${NC} 权限表结构文件不存在: $PERMISSION_SCHEMA_FILE"
    echo "请确保文件路径正确"
fi

# 初始化权限数据
echo "🔑 初始化权限和角色数据..."
PERMISSION_SEED_FILE="../platform/topems-iam/backend/db/permission_seed.sql"

if [ -f "$PERMISSION_SEED_FILE" ]; then
    psql -d topems -U topems -f "$PERMISSION_SEED_FILE" > /dev/null 2>&1
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅${NC} 权限和角色数据已初始化"
    else
        echo -e "${YELLOW}⚠️${NC} 权限数据可能已存在，继续..."
    fi
else
    echo -e "${YELLOW}⚠️${NC} 权限种子文件不存在: $PERMISSION_SEED_FILE"
    echo "请确保文件路径正确"
fi

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
echo "权限管理："
echo "  默认角色: admin, developer, manager, user, guest"
echo "  默认权限: 70+ 个权限已初始化"
echo ""
echo "系统账号："
echo "  默认超级管理员: admin / admin123"
echo "  其他用户需通过管理员创建"
echo ""
echo "⚠️ 安全提示:"
echo "  - 首次登录后请立即修改默认密码"
echo "  - 建议定期更换密码"
echo ""
echo "连接字符串:"
echo "  postgres://topems:topems_secret@localhost:5432/topems"
echo ""

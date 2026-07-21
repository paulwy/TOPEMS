#!/bin/bash
# TOPEMS 部署验证脚本
# 位置: /opt/topems/scripts/health_check.sh
# 使用: ./scripts/health_check.sh

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 检测 docker compose 命令
detect_docker_compose() {
    if command -v docker-compose &>/dev/null; then
        echo "docker-compose"
    else
        echo "docker compose"
    fi
}

DC=$(detect_docker_compose)

# 打印带颜色的消息
print_ok() {
    echo -e "${GREEN}✅ OK${NC} - $1"
}

print_fail() {
    echo -e "${RED}❌ FAILED${NC} - $1"
}

print_info() {
    echo -e "${YELLOW}ℹ INFO${NC} - $1"
}

echo "=========================================="
echo "  TOPEMS 部署健康检查"
echo "=========================================="
echo ""

# 1. 检查 Docker 服务（可选，支持本地运行模式）
echo "1. 检查 Docker 服务..."
if docker info > /dev/null 2>&1; then
    print_ok "Docker 服务运行正常"
else
    print_info "Docker 服务未运行，检查本地服务模式..."
fi

# 2. 检查容器状态（可选，支持本地运行模式）
echo ""
echo "2. 检查容器状态..."
RUNNING_CONTAINERS=$(docker ps --filter "name=topems-" --filter "status=running" -q 2>/dev/null | wc -l | tr -d ' ' || echo "0")
TOTAL_CONTAINERS=$(docker ps -a --filter "name=topems-" -q 2>/dev/null | wc -l | tr -d ' ' || echo "0")

if [ "$RUNNING_CONTAINERS" -ge 2 ]; then
    print_ok "运行中的容器: $RUNNING_CONTAINERS/$TOTAL_CONTAINERS"
elif [ "$RUNNING_CONTAINERS" -eq 0 ] && [ "$TOTAL_CONTAINERS" -eq 0 ]; then
    print_info "无 Docker 容器，检查本地服务模式..."
else
    print_fail "容器数量异常: $RUNNING_CONTAINERS/$TOTAL_CONTAINERS"
fi

# 3. 检查数据库连接（支持 Docker 和本地模式）
echo ""
echo "3. 检查数据库连接..."
if docker exec topems-postgres pg_isready -U topems > /dev/null 2>&1; then
    print_ok "PostgreSQL 运行正常 (Docker)"
elif psql -h localhost -U "$USER" -d "postgres" -c "SELECT 1;" > /dev/null 2>&1; then
    print_ok "PostgreSQL 运行正常 (本地)"
else
    print_fail "PostgreSQL 连接失败"
fi

# 4. 检查 Redis 连接（支持 Docker 和本地模式）
echo ""
echo "4. 检查 Redis 连接..."
if docker exec topems-redis redis-cli ping > /dev/null 2>&1; then
    print_ok "Redis 运行正常 (Docker)"
elif redis-cli ping > /dev/null 2>&1; then
    print_ok "Redis 运行正常 (本地)"
else
    print_fail "Redis 连接失败"
fi

# 5. 检查核心服务健康 (IAM)
echo ""
echo "5. 检查 IAM 服务..."
IAM_HEALTH=$(curl -s http://localhost:8000/health 2>/dev/null | jq -r '.status' 2>/dev/null || echo "failed")
if [ "$IAM_HEALTH" = "ok" ] || [ "$IAM_HEALTH" = "healthy" ]; then
    print_ok "IAM 服务健康"
else
    print_fail "IAM 服务异常"
fi

# 6. 检查 HRM 服务健康
echo ""
echo "6. 检查 HRM 服务..."
HRM_HEALTH=$(curl -s http://localhost:8020/health 2>/dev/null | jq -r '.status' 2>/dev/null || echo "failed")
if [ "$HRM_HEALTH" = "ok" ] || [ "$HRM_HEALTH" = "healthy" ]; then
    print_ok "HRM 服务健康"
else
    print_fail "HRM 服务异常"
fi

# 7. 检查 ERP 服务健康
echo ""
echo "7. 检查 ERP 服务..."
ERP_HEALTH=$(curl -s http://localhost:8010/health 2>/dev/null | jq -r '.status' 2>/dev/null || echo "failed")
if [ "$ERP_HEALTH" = "ok" ] || [ "$ERP_HEALTH" = "healthy" ]; then
    print_ok "ERP 服务健康"
else
    print_fail "ERP 服务异常"
fi

# 8. 检查 Web 服务
echo ""
echo "8. 检查 Web 服务..."
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000 2>/dev/null || echo "000")
if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "304" ]; then
    print_ok "Web 服务正常 (HTTP $HTTP_CODE)"
else
    print_fail "Web 服务异常 (HTTP $HTTP_CODE)"
fi

# 9. 检查数据库连接 (本地)
echo ""
echo "9. 检查数据库数据..."

# 检测数据库连接方式
detect_db_exec() {
    if docker ps --filter "name=topems-postgres" --format "{{.Names}}" 2>/dev/null | grep -q topems-postgres; then
        echo "docker exec -i topems-postgres"
    elif command -v psql &>/dev/null; then
        echo "psql -h localhost -U $USER"
    else
        echo ""
    fi
}

DB_EXEC=$(detect_db_exec)

if [ -n "$DB_EXEC" ]; then
    # 表数量
    TABLE_COUNT=$($DB_EXEC -d topems -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';" 2>/dev/null | xargs || echo "0")
    if [ "$TABLE_COUNT" -ge 10 ]; then
        print_ok "数据库表数量正常 ( $TABLE_COUNT 个表)"
    else
        print_fail "数据库表数量异常 ( $TABLE_COUNT 个表)"
    fi
else
    print_info "跳过数据库数据检查（无法连接数据库）"
fi

# 10. 测试管理员登录
echo ""
echo "10. 测试管理员登录..."
LOGIN_RESULT=$(curl -s -X POST http://localhost:8000/api/core/iam/auth/login \
    -H "Content-Type: application/json" \
    -d '{"username":"admin","password":"admin123"}' 2>/dev/null)

LOGIN_SUCCESS=$(echo "$LOGIN_RESULT" | jq -r '.success' 2>/dev/null || echo "false")
if [ "$LOGIN_SUCCESS" = "true" ]; then
    print_ok "管理员登录成功"
    
    # 获取 Token
    TOKEN=$(echo "$LOGIN_RESULT" | jq -r '.data.token' 2>/dev/null)
    PERM_LIST=$(echo "$LOGIN_RESULT" | jq -r '.data.permissions | length' 2>/dev/null || echo "0")
    print_info "管理员拥有 $PERM_LIST 个权限"
else
    print_fail "管理员登录失败"
fi

echo ""
echo "=========================================="
echo "  健康检查完成"
echo "=========================================="

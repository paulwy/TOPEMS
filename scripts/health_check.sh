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

# 1. 检查 Docker 服务
echo "1. 检查 Docker 服务..."
if docker info > /dev/null 2>&1; then
    print_ok "Docker 服务运行正常"
else
    print_fail "Docker 服务未运行"
    exit 1
fi

# 2. 检查容器状态
echo ""
echo "2. 检查容器状态..."
RUNNING_CONTAINERS=$(docker-compose ps --filter "status=running" | grep -c "Up" || true)
TOTAL_CONTAINERS=$(docker-compose ps | grep -c "topems-" || true)

if [ "$RUNNING_CONTAINERS" -ge 4 ]; then
    print_ok "运行中的容器: $RUNNING_CONTAINERS/$TOTAL_CONTAINERS"
else
    print_fail "容器数量异常: $RUNNING_CONTAINERS/$TOTAL_CONTAINERS"
fi

# 3. 检查数据库连接
echo ""
echo "3. 检查数据库连接..."
if docker-compose exec -T postgres pg_isready -U topems > /dev/null 2>&1; then
    print_ok "PostgreSQL 运行正常"
else
    print_fail "PostgreSQL 连接失败"
fi

# 4. 检查 Redis 连接
echo ""
echo "4. 检查 Redis 连接..."
if docker-compose exec -T redis redis-cli ping > /dev/null 2>&1; then
    print_ok "Redis 运行正常"
else
    print_fail "Redis 连接失败"
fi

# 5. 检查 Core 服务健康
echo ""
echo "5. 检查 Core 服务..."
CORE_HEALTH=$(curl -s http://localhost:8000/health 2>/dev/null | jq -r '.status' || echo "failed")
if [ "$CORE_HEALTH" = "healthy" ]; then
    print_ok "Core 服务健康"
else
    print_fail "Core 服务异常"
fi

# 6. 检查 PM 服务健康
echo ""
echo "6. 检查 PM 服务..."
PM_HEALTH=$(curl -s http://localhost:8001/health 2>/dev/null | jq -r '.status' || echo "failed")
if [ "$PM_HEALTH" = "healthy" ]; then
    print_ok "PM 服务健康"
else
    print_fail "PM 服务异常"
fi

# 7. 检查 HRM 服务健康
echo ""
echo "7. 检查 HRM 服务..."
HRM_HEALTH=$(curl -s http://localhost:8011/health 2>/dev/null | jq -r '.status' || echo "failed")
if [ "$HRM_HEALTH" = "healthy" ]; then
    print_ok "HRM 服务健康"
else
    print_fail "HRM 服务异常"
fi

# 8. 检查 Web 服务
echo ""
echo "8. 检查 Web 服务..."
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000 2>/dev/null || echo "000")
if [ "$HTTP_CODE" = "200" ]; then
    print_ok "Web 服务正常 (HTTP $HTTP_CODE)"
else
    print_fail "Web 服务异常 (HTTP $HTTP_CODE)"
fi

# 9. 检查数据库数据
echo ""
echo "9. 检查数据库数据..."

# 权限数量
PERM_COUNT=$(docker-compose exec -T postgres psql -U topems -d topems -t -c "SELECT COUNT(*) FROM core_permissions;" 2>/dev/null | xargs || echo "0")
if [ "$PERM_COUNT" -ge 60 ]; then
    print_ok "权限数据完整 ( $PERM_COUNT 个权限)"
else
    print_fail "权限数据异常 ( $PERM_COUNT 个权限)"
fi

# 角色数量
ROLE_COUNT=$(docker-compose exec -T postgres psql -U topems -d topems -t -c "SELECT COUNT(*) FROM core_roles;" 2>/dev/null | xargs || echo "0")
if [ "$ROLE_COUNT" -ge 5 ]; then
    print_ok "角色数据完整 ( $ROLE_COUNT 个角色)"
else
    print_fail "角色数据异常 ( $ROLE_COUNT 个角色)"
fi

# 用户数量
USER_COUNT=$(docker-compose exec -T postgres psql -U topems -d topems -t -c "SELECT COUNT(*) FROM core_users;" 2>/dev/null | xargs || echo "0")
if [ "$USER_COUNT" -ge 1 ]; then
    print_ok "用户数据完整 ( $USER_COUNT 个用户)"
else
    print_fail "用户数据异常 ( $USER_COUNT 个用户)"
fi

# 10. 测试管理员登录
echo ""
echo "10. 测试管理员登录..."
LOGIN_RESULT=$(curl -s -X POST http://localhost:8000/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"username":"admin","password":"admin123"}' 2>/dev/null)

LOGIN_SUCCESS=$(echo $LOGIN_RESULT | jq -r '.success' || echo "false")
if [ "$LOGIN_SUCCESS" = "true" ]; then
    print_ok "管理员登录成功"
    
    # 获取 Token
    TOKEN=$(echo $LOGIN_RESULT | jq -r '.data.token')
    PERM_LIST=$(echo $LOGIN_RESULT | jq -r '.data.permissions | length')
    print_info "管理员拥有 $PERM_LIST 个权限"
else
    print_fail "管理员登录失败"
fi

echo ""
echo "=========================================="
echo "  健康检查完成"
echo "=========================================="

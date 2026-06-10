#!/bin/bash
# HRM API 端到端测试脚本
# 依赖: curl, jq (可选)

set -e

HRM_BASE_URL="${HRM_BASE_URL:-http://localhost:8011}"
TOKEN=""

echo "=========================================="
echo "TOPEMS HRM API 端到端测试"
echo "=========================================="
echo "测试地址: $HRM_BASE_URL"
echo ""

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

pass() { echo -e "${GREEN}[PASS]${NC} $1"; }
fail() { echo -e "${RED}[FAIL]${NC} $1"; }
warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
info() { echo "[INFO] $1"; }

# 1. 健康检查
echo ""
echo "--- 1. 健康检查 ---"
response=$(curl -s -w "\n%{http_code}" "$HRM_BASE_URL/health")
http_code=$(echo "$response" | tail -1)
body=$(echo "$response" | head -n -1)

if [ "$http_code" = "200" ]; then
    pass "健康检查成功 (HTTP $http_code)"
    echo "$body" | jq -r '.message' 2>/dev/null || echo "$body"
else
    fail "健康检查失败 (HTTP $http_code)"
    echo "$body"
fi

# 2. OpenAPI 文档
echo ""
echo "--- 2. OpenAPI 文档 ---"
response=$(curl -s -w "\n%{http_code}" "$HRM_BASE_URL/api-docs/openapi.json")
http_code=$(echo "$response" | tail -1)

if [ "$http_code" = "200" ]; then
    pass "OpenAPI 文档可访问 (HTTP $http_code)"
else
    fail "OpenAPI 文档不可访问 (HTTP $http_code)"
fi

# 3. 员工列表 (无需认证)
echo ""
echo "--- 3. 员工列表 (无需认证) ---"
response=$(curl -s -w "\n%{http_code}" "$HRM_BASE_URL/api/v1/employees")
http_code=$(echo "$response" | tail -1)
body=$(echo "$response" | head -n -1)

if [ "$http_code" = "401" ]; then
    pass "需要认证 (HTTP $http_code)"
elif [ "$http_code" = "200" ]; then
    pass "员工列表成功 (HTTP $http_code)"
    total=$(echo "$body" | jq -r '.data.total' 2>/dev/null || echo "N/A")
    info "总员工数: $total"
else
    fail "员工列表失败 (HTTP $http_code)"
fi

# 4. 获取指标
echo ""
echo "--- 4. 服务指标 ---"
response=$(curl -s -w "\n%{http_code}" "$HRM_BASE_URL/api/v1/metrics")
http_code=$(echo "$response" | tail -1)
body=$(echo "$response" | head -n -1)

if [ "$http_code" = "200" ]; then
    pass "服务指标获取成功 (HTTP $http_code)"
    uptime=$(echo "$body" | jq -r '.data.uptime_formatted' 2>/dev/null || echo "N/A")
    info "服务运行时间: $uptime"
else
    fail "服务指标获取失败 (HTTP $http_code)"
fi

# 5. 详细健康检查
echo ""
echo "--- 5. 详细健康检查 ---"
response=$(curl -s -w "\n%{http_code}" "$HRM_BASE_URL/api/v1/health/detailed")
http_code=$(echo "$response" | tail -1)
body=$(echo "$response" | head -n -1)

if [ "$http_code" = "200" ]; then
    pass "详细健康检查成功 (HTTP $http_code)"
    db_status=$(echo "$body" | jq -r '.data.dependencies[0].status' 2>/dev/null || echo "N/A")
    info "数据库状态: $db_status"
else
    fail "详细健康检查失败 (HTTP $http_code)"
fi

# 6. 测试缓存 (Redis/InMemory)
echo ""
echo "--- 6. 缓存功能 ---"
# 获取员工详情 (如果存在)
response=$(curl -s "$HRM_BASE_URL/api/v1/employees" 2>/dev/null || echo "")
first_id=$(echo "$response" | jq -r '.data.items[0].id' 2>/dev/null || echo "")

if [ -n "$first_id" ] && [ "$first_id" != "null" ]; then
    info "测试员工ID: $first_id"

    # 第一次请求 (应该从数据库获取)
    time1=$(curl -s -w "%{time_total}" -o /dev/null "$HRM_BASE_URL/api/v1/employees/$first_id")
    info "第一次请求耗时: ${time1}s"

    # 第二次请求 (如果缓存工作，应该更快)
    time2=$(curl -s -w "%{time_total}" -o /dev/null "$HRM_BASE_URL/api/v1/employees/$first_id")
    info "第二次请求耗时: ${time2}s"

    if (( $(echo "$time2 < $time1" | bc -l 2>/dev/null || echo "0") )); then
        pass "缓存可能生效 (第二次请求更快)"
    else
        warn "缓存效果不明显"
    fi
else
    warn "没有员工数据可测试缓存"
fi

echo ""
echo "=========================================="
echo "测试完成"
echo "=========================================="

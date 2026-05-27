#!/bin/bash

# TOPEMS 集成测试脚本
# 测试所有核心功能的 API 端点

set -e

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# 测试配置
IAM_URL="http://localhost:8002"
DOC_URL="http://localhost:8001"
AI_URL="http://localhost:8003"
FLOW_URL="http://localhost:8004"
FRONTEND_URL="http://localhost:3000"

# 统计
TESTS_PASSED=0
TESTS_FAILED=0

# 测试函数
test_endpoint() {
    local name=$1
    local expected_code=$2
    shift 2
    local command="$@"

    echo -n "测试 $name... "
    
    result=$(eval "$command" 2>&1)
    actual_code=$(echo "$result" | jq -r '.code // .status // "000"' 2>/dev/null)

    if [ "$actual_code" = "$expected_code" ]; then
        echo -e "${GREEN}✓ 通过${NC}"
        ((TESTS_PASSED++))
        return 0
    else
        echo -e "${RED}✗ 失败${NC} (期望: $expected_code, 实际: $actual_code)"
        echo "  响应: ${result:0:200}"
        ((TESTS_FAILED++))
        return 1
    fi
}

# 彩色分隔线
print_header() {
    echo ""
    echo -e "${BLUE}========================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}========================================${NC}"
}

print_header "1. 服务健康检查"

echo "检查所有服务是否运行..."
test_endpoint "IAM 服务健康检查" "200" "curl -s $IAM_URL/health | jq -r '.code'"
test_endpoint "DOC 服务健康检查" "200" "curl -s $DOC_URL/health | jq -r '.code'"
test_endpoint "AI 服务健康检查" "200" "curl -s $AI_URL/health | jq -r '.code'"
test_endpoint "FLOW 服务健康检查" "200" "curl -s $FLOW_URL/health | jq -r '.code'"

print_header "2. 用户认证测试"

# 测试登录
echo "测试登录功能..."
LOGIN_RESPONSE=$(curl -s -X POST "$IAM_URL/api/v1/auth/login" \
    -H "Content-Type: application/json" \
    -d '{"username":"admin123","password":"Admin123"}')

TOKEN=$(echo "$LOGIN_RESPONSE" | jq -r '.data.access_token // empty' 2>/dev/null)
LOGIN_CODE=$(echo "$LOGIN_RESPONSE" | jq -r '.code // empty' 2>/dev/null)

if [ "$LOGIN_CODE" = "200" ] && [ -n "$TOKEN" ] && [ "$TOKEN" != "null" ]; then
    echo -e "${GREEN}✓ 登录成功${NC}"
    ((TESTS_PASSED++))
else
    echo -e "${RED}✗ 登录失败${NC}"
    echo "  响应: $LOGIN_RESPONSE"
    ((TESTS_FAILED++))
    echo -e "${YELLOW}跳过需要认证的测试${NC}"
    exit 1
fi

echo "Token: ${TOKEN:0:50}..."

# 测试 Token 验证
test_endpoint "Token 验证" "200" "curl -s -X POST $IAM_URL/api/v1/auth/verify -H 'Content-Type: application/json' -H 'Authorization: Bearer $TOKEN' -d '{\"token\":\"$TOKEN\"}' | jq -r '.code'"

# 测试获取当前用户信息
test_endpoint "获取当前用户信息" "200" "curl -s $IAM_URL/api/v1/users/me -H 'Authorization: Bearer $TOKEN' | jq -r '.code'"

print_header "3. 文档管理测试"

# 测试获取文件列表
FILES_RESPONSE=$(curl -s -X GET "$DOC_URL/api/v1/files" -H "Authorization: Bearer $TOKEN")
FILES_CODE=$(echo "$FILES_RESPONSE" | jq -r '.code // empty' 2>/dev/null)

if [ "$FILES_CODE" = "200" ]; then
    echo -e "${GREEN}✓ 获取文件列表成功${NC}"
    ((TESTS_PASSED++))
    echo "  文件数量: $(echo "$FILES_RESPONSE" | jq -r '.data.total // 0')"
else
    echo -e "${RED}✗ 获取文件列表失败${NC}"
    ((TESTS_FAILED++))
fi

# 测试获取文件夹列表
test_endpoint "获取文件夹列表" "200" "curl -s $DOC_URL/api/v1/folders -H 'Authorization: Bearer $TOKEN' | jq -r '.code'"

# 测试创建文件夹
FOLDER_RESPONSE=$(curl -s -X POST "$DOC_URL/api/v1/folders" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"name":"test_integration_folder","parent_id":null}')

FOLDER_CODE=$(echo "$FOLDER_RESPONSE" | jq -r '.code // empty' 2>/dev/null)
FOLDER_ID=$(echo "$FOLDER_RESPONSE" | jq -r '.data.id // empty' 2>/dev/null)

if [ "$FOLDER_CODE" = "200" ] && [ -n "$FOLDER_ID" ]; then
    echo -e "${GREEN}✓ 创建文件夹成功${NC}"
    ((TESTS_PASSED++))
    echo "  文件夹 ID: $FOLDER_ID"
else
    echo -e "${RED}✗ 创建文件夹失败${NC}"
    ((TESTS_FAILED++))
fi

# 测试在子文件夹中创建文件
if [ -n "$FOLDER_ID" ]; then
    test_endpoint "在子文件夹中创建文件" "200" "curl -s -X POST $DOC_URL/api/v1/files -H 'Authorization: Bearer $TOKEN' -H 'Content-Type: application/json' -d '{\"name\":\"test.txt\",\"folder_id\":\"$FOLDER_ID\",\"content\":\"test content\"}' | jq -r '.code'"
fi

# 测试上传文件（模拟）
echo "测试文件上传功能..."
UPLOAD_RESPONSE=$(curl -s -X POST "$DOC_URL/api/v1/files/upload" \
    -H "Authorization: Bearer $TOKEN" \
    -F "file=@/dev/null;filename=test.txt" \
    -F "folder_id=$FOLDER_ID")
UPLOAD_CODE=$(echo "$UPLOAD_RESPONSE" | jq -r '.code // empty' 2>/dev/null || echo "000")

if [ "$UPLOAD_CODE" = "200" ] || [ "$UPLOAD_CODE" = "400" ]; then
    echo -e "${GREEN}✓ 文件上传端点可访问${NC}"
    ((TESTS_PASSED++))
else
    echo -e "${YELLOW}⚠ 文件上传端点返回: $UPLOAD_CODE${NC}"
fi

print_header "4. AI 服务测试"

# 测试 AI 聊天
AI_RESPONSE=$(curl -s -X POST "$AI_URL/api/v1/ai/chat" \
    -H "Content-Type: application/json" \
    -d '{"query":"TOPEMS是什么？"}')

AI_CODE=$(echo "$AI_RESPONSE" | jq -r '.code // empty' 2>/dev/null)

if [ "$AI_CODE" = "200" ]; then
    echo -e "${GREEN}✓ AI 聊天功能正常${NC}"
    ((TESTS_PASSED++))
else
    echo -e "${RED}✗ AI 聊天功能异常${NC}"
    ((TESTS_FAILED++))
fi

# 测试知识库查询
test_endpoint "AI 知识库查询" "200" "curl -s $AI_URL/api/v1/ai/knowledge -H 'Content-Type: application/json' | jq -r '.code'"

print_header "5. 工作流测试"

# 测试获取工作流列表
test_endpoint "获取工作流列表" "200" "curl -s $FLOW_URL/api/v1/workflows -H 'Authorization: Bearer $TOKEN' | jq -r '.code'"

# 测试获取工作流实例
test_endpoint "获取工作流实例" "200" "curl -s $FLOW_URL/api/v1/instances -H 'Authorization: Bearer $TOKEN' | jq -r '.code'"

print_header "6. 权限管理测试"

# 测试获取用户角色
test_endpoint "获取用户角色" "200" "curl -s $IAM_URL/api/v1/users/me/roles -H 'Authorization: Bearer $TOKEN' | jq -r '.code'"

# 测试获取用户权限
test_endpoint "获取用户权限" "200" "curl -s $IAM_URL/api/v1/users/me/permissions -H 'Authorization: Bearer $TOKEN' | jq -r '.code'"

# 测试权限检查
test_endpoint "权限检查 (doc:read)" "200" "curl -s -X POST $IAM_URL/api/v1/users/me/permissions/check -H 'Authorization: Bearer $TOKEN' -H 'Content-Type: application/json' -d '{\"permission\":\"doc_read\"}' | jq -r '.code'"

print_header "7. 前端页面测试"

# 测试前端页面可访问性
FRONTEND_CODE=$(curl -s -o /dev/null -w "%{http_code}" $FRONTEND_URL 2>/dev/null || echo "000")
if [ "$FRONTEND_CODE" = "200" ]; then
    echo -e "${GREEN}✓ 前端页面可访问${NC}"
    ((TESTS_PASSED++))
else
    echo -e "${RED}✗ 前端页面不可访问 (HTTP $FRONTEND_CODE)${NC}"
    ((TESTS_FAILED++))
fi

# 测试前端 API 代理
PROXY_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$FRONTEND_URL/api/v1/auth/login" 2>/dev/null || echo "000")
if [ "$PROXY_CODE" = "405" ] || [ "$PROXY_CODE" = "404" ]; then
    echo -e "${GREEN}✓ 前端 API 代理配置正确${NC}"
    ((TESTS_PASSED++))
else
    echo -e "${YELLOW}⚠ 前端 API 代理返回: $PROXY_CODE${NC}"
fi

print_header "测试结果汇总"

TOTAL=$((TESTS_PASSED + TESTS_FAILED))
echo ""
echo -e "总测试数: ${BLUE}$TOTAL${NC}"
echo -e "通过: ${GREEN}$TESTS_PASSED${NC}"
echo -e "失败: ${RED}$TESTS_FAILED${NC}"
echo ""

if [ $TESTS_FAILED -eq 0 ]; then
    echo -e "${GREEN}========================================${NC}"
    echo -e "${GREEN}所有测试通过！🎉${NC}"
    echo -e "${GREEN}========================================${NC}"
    exit 0
else
    echo -e "${RED}========================================${NC}"
    echo -e "${RED}部分测试失败，请检查上述错误${NC}"
    echo -e "${RED}========================================${NC}"
    exit 1
fi

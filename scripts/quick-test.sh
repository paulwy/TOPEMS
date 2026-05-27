#!/bin/bash

# TOPEMS 快速集成测试
# 验证所有核心功能

set -e

echo "========================================"
echo "TOPEMS 集成测试"
echo "========================================"
echo ""

# 1. 服务健康检查
echo "1️⃣ 检查服务状态..."
echo ""

services=(
    "8002:IAM"
    "8001:DOC"
    "8003:AI"
    "8004:FLOW"
)

for service in "${services[@]}"; do
    IFS=':' read -r port name <<< "$service"
    echo -n "  $name 服务 (端口 $port)... "
    
    if curl -sf "http://localhost:$port/health" > /dev/null 2>&1; then
        echo "✅ 运行中"
    else
        echo "❌ 未运行"
    fi
done

echo ""
echo "2️⃣ 测试用户认证..."
echo ""

# 登录测试
echo "  登录测试 (admin123/Admin123)..."
LOGIN_RESPONSE=$(curl -s -X POST "http://localhost:8002/api/v1/auth/login" \
    -H "Content-Type: application/json" \
    -d '{"username":"admin123","password":"Admin123"}')

TOKEN=$(echo "$LOGIN_RESPONSE" | grep -o '"access_token":"[^"]*' | cut -d'"' -f4)

if [ -n "$TOKEN" ]; then
    echo "  ✅ 登录成功"
    echo "     Token: ${TOKEN:0:40}..."
else
    echo "  ❌ 登录失败"
    echo "     响应: $LOGIN_RESPONSE"
    exit 1
fi

echo ""
echo "3️⃣ 测试文档管理..."
echo ""

# 获取文件列表
echo "  获取文件列表..."
FILES=$(curl -s "http://localhost:8001/api/v1/files" \
    -H "Authorization: Bearer $TOKEN")

FILES_COUNT=$(echo "$FILES" | grep -o '"total":[0-9]*' | cut -d':' -f2)

if [ -n "$FILES_COUNT" ]; then
    echo "  ✅ 获取成功 (共 $FILES_COUNT 个文件)"
else
    echo "  ❌ 获取失败"
fi

# 创建文件夹
echo ""
echo "  创建测试文件夹..."
FOLDER=$(curl -s -X POST "http://localhost:8001/api/v1/folders" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"name":"integration_test_folder","parent_id":null}')

FOLDER_ID=$(echo "$FOLDER" | grep -o '"id":"[^"]*' | head -1 | cut -d'"' -f4)

if [ -n "$FOLDER_ID" ]; then
    echo "  ✅ 文件夹创建成功 (ID: $FOLDER_ID)"
else
    echo "  ❌ 文件夹创建失败"
    echo "     响应: $FOLDER"
fi

echo ""
echo "4️⃣ 测试 AI 服务..."
echo ""

# AI 聊天测试
echo "  AI 聊天测试..."
AI_RESPONSE=$(curl -s -X POST "http://localhost:8003/api/v1/ai/chat" \
    -H "Content-Type: application/json" \
    -d '{"query":"你好"}')

if echo "$AI_RESPONSE" | grep -q '"code":200'; then
    echo "  ✅ AI 服务正常"
else
    echo "  ❌ AI 服务异常"
fi

echo ""
echo "5️⃣ 测试工作流服务..."
echo ""

# 获取工作流列表
echo "  获取工作流列表..."
WF=$(curl -s "http://localhost:8004/api/v1/workflows" \
    -H "Authorization: Bearer $TOKEN")

if echo "$WF" | grep -q '"code"'; then
    echo "  ✅ 工作流服务正常"
else
    echo "  ❌ 工作流服务异常"
fi

echo ""
echo "6️⃣ 检查前端页面..."
echo ""

# 前端页面测试
FRONTEND_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:3000" 2>/dev/null || echo "000")

if [ "$FRONTEND_STATUS" = "200" ]; then
    echo "  ✅ 前端页面可访问 (HTTP $FRONTEND_STATUS)"
else
    echo "  ⚠️  前端页面返回 HTTP $FRONTEND_STATUS"
fi

echo ""
echo "========================================"
echo "测试完成！"
echo "========================================"
echo ""
echo "访问地址："
echo "  🌐 前端应用: http://localhost:3000"
echo "  🔐 IAM API:  http://localhost:8002"
echo "  📄 DOC API:  http://localhost:8001"
echo "  🤖 AI API:   http://localhost:8003"
echo "  ⚙️  FLOW API: http://localhost:8004"
echo ""

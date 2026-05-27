#!/bin/bash

echo "==================================="
echo "  TOPEMS 平台 API 测试脚本 v2.2"
echo "==================================="
echo ""

GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

# 测试服务健康状态
test_health() {
    echo -e "${BLUE}[测试 1/8]${NC} 测试服务健康状态..."
    
    # IAM 健康检查
    IAM_STATUS=$(curl -s http://localhost:8002/health | jq -r '.success')
    if [ "$IAM_STATUS" = "true" ]; then
        echo -e "  - IAM:     ${GREEN}✓${NC} 正常"
    else
        echo -e "  - IAM:     ${RED}✗${NC} 异常"
    fi
    
    # DOC 健康检查
    DOC_STATUS=$(curl -s http://localhost:8001/health | jq -r '.success')
    if [ "$DOC_STATUS" = "true" ]; then
        echo -e "  - DOC:     ${GREEN}✓${NC} 正常"
    else
        echo -e "  - DOC:     ${RED}✗${NC} 异常"
    fi
    
    # AI 健康检查
    AI_STATUS=$(curl -s http://localhost:8004/health | jq -r '.success')
    if [ "$AI_STATUS" = "true" ]; then
        echo -e "  - AI:      ${GREEN}✓${NC} 正常"
    else
        echo -e "  - AI:      ${RED}✗${NC} 异常"
    fi
    
    # RS 健康检查
    RS_STATUS=$(curl -s http://localhost:8005/health | jq -r '.success')
    if [ "$RS_STATUS" = "true" ]; then
        echo -e "  - RS:      ${GREEN}✓${NC} 正常"
    else
        echo -e "  - RS:      ${RED}✗${NC} 异常"
    fi
}

# 测试用户认证
test_auth() {
    echo -e "${BLUE}[测试 2/8]${NC} 测试用户认证..."
    
    TOKEN=$(curl -s -X POST "http://localhost:8002/api/v1/auth/login" \
        -H "Content-Type: application/json" \
        -d '{"username":"admin123","password":"Admin123"}' | jq -r '.data.access_token')
    
    if [ "$TOKEN" != "null" ] && [ -n "$TOKEN" ]; then
        echo -e "  - 登录:    ${GREEN}✓${NC} 成功"
        echo "$TOKEN" > /tmp/topems_token.txt
    else
        echo -e "  - 登录:    ${RED}✗${NC} 失败"
    fi
}

# 测试文档管理
test_doc() {
    echo -e "${BLUE}[测试 3/8]${NC} 测试文档管理..."
    
    TOKEN=$(cat /tmp/topems_token.txt)
    
    # 创建文件夹
    FOLDER=$(curl -s -X POST "http://localhost:8001/api/v1/folders" \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer $TOKEN" \
        -d '{"name":"测试文件夹","parent_id":null}')
    
    FOLDER_ID=$(echo "$FOLDER" | jq -r '.data.id')
    
    if [ "$FOLDER_ID" != "null" ]; then
        echo -e "  - 创建文件夹: ${GREEN}✓${NC} 成功 (ID: $FOLDER_ID)"
    else
        echo -e "  - 创建文件夹: ${RED}✗${NC} 失败"
    fi
    
    # 获取文件列表
    FILES=$(curl -s "http://localhost:8001/api/v1/folders/$FOLDER_ID/files" \
        -H "Authorization: Bearer $TOKEN" | jq -r '.success')
    
    if [ "$FILES" = "true" ]; then
        echo -e "  - 获取文件列表: ${GREEN}✓${NC} 成功"
    else
        echo -e "  - 获取文件列表: ${RED}✗${NC} 失败"
    fi
}

# 测试 RS 项目管理
test_rs_project() {
    echo -e "${BLUE}[测试 4/8]${NC} 测试 RS 项目管理..."
    
    # 获取项目列表
    PROJECTS=$(curl -s http://localhost:8005/api/v1/projects | jq -r '.success')
    
    if [ "$PROJECTS" = "true" ]; then
        echo -e "  - 获取项目列表: ${GREEN}✓${NC} 成功"
    else
        echo -e "  - 获取项目列表: ${RED}✗${NC} 失败"
    fi
    
    # 创建项目
    NEW_PROJECT=$(curl -s -X POST http://localhost:8005/api/v1/projects \
        -H "Content-Type: application/json" \
        -d '{
            "name": "API测试项目",
            "code": "RS-TEST-001",
            "project_type": "research",
            "leader": "测试员",
            "start_date": "2026-06-01T00:00:00Z"
        }' | jq -r '.success')
    
    if [ "$NEW_PROJECT" = "true" ]; then
        echo -e "  - 创建项目: ${GREEN}✓${NC} 成功"
    else
        echo -e "  - 创建项目: ${RED}✗${NC} 失败"
    fi
}

# 测试 RS 配方管理
test_rs_formula() {
    echo -e "${BLUE}[测试 5/8]${NC} 测试 RS 配方管理..."
    
    # 获取配方列表
    FORMULAS=$(curl -s http://localhost:8005/api/v1/formulas | jq -r '.success')
    
    if [ "$FORMULAS" = "true" ]; then
        echo -e "  - 获取配方列表: ${GREEN}✓${NC} 成功"
    else
        echo -e "  - 获取配方列表: ${RED}✗${NC} 失败"
    fi
}

# 测试 RS 试验管理
test_rs_experiment() {
    echo -e "${BLUE}[测试 6/8]${NC} 测试 RS 试验管理..."
    
    # 获取试验列表
    EXPERIMENTS=$(curl -s http://localhost:8005/api/v1/experiments | jq -r '.success')
    
    if [ "$EXPERIMENTS" = "true" ]; then
        echo -e "  - 获取试验列表: ${GREEN}✓${NC} 成功"
    else
        echo -e "  - 获取试验列表: ${RED}✗${NC} 失败"
    fi
}

# 测试前端页面
test_frontend() {
    echo -e "${BLUE}[测试 7/8]${NC} 测试前端页面..."
    
    FRONTEND=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000)
    
    if [ "$FRONTEND" = "200" ]; then
        echo -e "  - 前端页面: ${GREEN}✓${NC} 正常"
    else
        echo -e "  - 前端页面: ${RED}✗${NC} 异常 (HTTP $FRONTEND)"
    fi
}

# 测试跨域请求
test_cors() {
    echo -e "${BLUE}[测试 8/8]${NC} 测试跨域请求..."
    
    CORS=$(curl -s -I "http://localhost:8005/health" | grep -i "access-control" | head -n 1)
    
    if [ -n "$CORS" ]; then
        echo -e "  - CORS:     ${GREEN}✓${NC} 已配置"
    else
        echo -e "  - CORS:     ${YELLOW}⚠${NC} 未配置或未检测到"
    fi
}

# 运行所有测试
echo ""
test_health
echo ""
test_auth
echo ""
test_doc
echo ""
test_rs_project
echo ""
test_rs_formula
echo ""
test_rs_experiment
echo ""
test_frontend
echo ""
test_cors

echo ""
echo "==================================="
echo -e "${GREEN}✓ 测试完成！${NC}"
echo "==================================="

#!/bin/bash

# TOPEMS 系统全面测试脚本
# 功能：检查所有服务的端口、健康状态、Docker 容器状态

echo "=============================================="
echo "   TOPEMS System Comprehensive Test"
echo "=============================================="
echo ""

# 颜色定义
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 服务配置列表 - 使用英文名称避免shell问题
SERVICES=(
    "PostgreSQL:5432"
    "Redis:6379"
    "IAM Service:8000"
    "Doc Service:8001"
    "Flow Service:8006"
    "Notification Service:8003"
    "Integration Service:8004"
    "Portal Service:8005"
    "ERP Service:8010"
    "HRM Service:8011"
    "CRM Service:8012"
    "AI Service:8013"
    "RS Service:8020"
    "LIMS Service:8022"
    "PDM Service:8023"
    "MES Service:8030"
    "QMS Service:8031"
    "EHS Service:8032"
    "SCM Service:8040"
    "SRM Service:8041"
    "WMS Service:8042"
    "GIS Service:8050"
    "IM Service:8051"
    "BI Service:8052"
    "Report Service:8053"
    "Mail Service:8054"
    "Mobile Service:8055"
)

# 统计变量
total_services=${#SERVICES[@]}
success_count=0
failure_count=0
warning_count=0

echo -e "${BLUE}1. Docker Container Status${NC}"
echo "----------------------------------------------"
if command -v docker &> /dev/null; then
    if docker info &> /dev/null; then
        echo -e "${GREEN}✓ Docker daemon is running${NC}"
        echo ""
        echo "Running containers:"
        docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" || true
    else
        echo -e "${YELLOW}⚠ Docker daemon is not running${NC}"
    fi
else
    echo -e "${YELLOW}⚠ Docker not installed or not in PATH${NC}"
fi
echo ""

echo -e "${BLUE}2. Network Port Listening Status${NC}"
echo "----------------------------------------------"
for service_entry in "${SERVICES[@]}"; do
    IFS=':' read -r service port <<< "$service_entry"
    echo -n "Checking ${service} (port ${port})... "
    
    # 检查端口是否被监听
    if command -v lsof &> /dev/null; then
        if lsof -ti :$port &> /dev/null; then
            echo -e "${GREEN}✓ Port is listening${NC}"
            success_count=$((success_count + 1))
        else
            echo -e "${RED}✗ Port is not listening${NC}"
            failure_count=$((failure_count + 1))
        fi
    elif command -v netstat &> /dev/null; then
        if netstat -tuln | grep ":${port} " &> /dev/null; then
            echo -e "${GREEN}✓ Port is listening${NC}"
            success_count=$((success_count + 1))
        else
            echo -e "${RED}✗ Port is not listening${NC}"
            failure_count=$((failure_count + 1))
        fi
    else
        echo -e "${YELLOW}⚠ Cannot check (lsof/netstat unavailable)${NC}"
        warning_count=$((warning_count + 1))
    fi
done
echo ""

echo -e "${BLUE}3. Service Health Endpoint Tests${NC}"
echo "----------------------------------------------"
for service_entry in "${SERVICES[@]}"; do
    IFS=':' read -r service port <<< "$service_entry"
    
    # 跳过数据库服务，它们没有 HTTP 健康端点
    if [[ "$service" == "PostgreSQL" || "$service" == "Redis" ]]; then
        continue
    fi
    
    echo -n "Checking ${service} health endpoint... "
    
    if command -v curl &> /dev/null; then
        response=$(curl -s -o /dev/null -w "%{http_code}" -m 2 "http://localhost:${port}/health" 2>/dev/null || echo "000")
        if [ "$response" = "200" ] || [ "$response" = "204" ]; then
            echo -e "${GREEN}✓ Health check passed (HTTP ${response})${NC}"
            success_count=$((success_count + 1))
        else
            echo -e "${RED}✗ Health check failed (HTTP ${response})${NC}"
            failure_count=$((failure_count + 1))
        fi
    else
        echo -e "${YELLOW}⚠ Cannot check (curl unavailable)${NC}"
        warning_count=$((warning_count + 1))
    fi
done
echo ""

echo -e "${BLUE}4. Frontend Environment${NC}"
echo "----------------------------------------------"
if [ -d "frontend" ]; then
    cd frontend
    if [ -f "package.json" ]; then
        echo -e "${GREEN}✓ Frontend project exists${NC}"
        
        if command -v npm &> /dev/null; then
            echo -e "${GREEN}✓ npm is installed${NC}"
        else
            echo -e "${YELLOW}⚠ npm is not installed${NC}"
        fi
    fi
    cd ..
else
    echo -e "${YELLOW}⚠ Frontend directory not found${NC}"
fi
echo ""

echo -e "${BLUE}5. Backend Service Directories${NC}"
echo "----------------------------------------------"
if [ -d "services" ]; then
    echo -e "${GREEN}✓ Service directory exists${NC}"
    service_count=$(ls services/ 2>/dev/null | wc -l | tr -d ' ')
    echo -e "${GREEN}✓ Found ${service_count} service directories${NC}"
else
    echo -e "${YELLOW}⚠ Service directory not found${NC}"
fi
echo ""

echo "=============================================="
echo -e "${BLUE}Test Summary${NC}"
echo "=============================================="
echo -e "Total checks: ${total_services}"
echo -e "${GREEN}Success: ${success_count}${NC}"
echo -e "${RED}Failure: ${failure_count}${NC}"
echo -e "${YELLOW}Warning: ${warning_count}${NC}"
echo "=============================================="

if [ $failure_count -eq 0 ]; then
    echo -e "${GREEN}✓ All checks passed!${NC}"
    exit 0
else
    echo -e "${YELLOW}⚠ Some checks failed, please see details above${NC}"
    exit 1
fi

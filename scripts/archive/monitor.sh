#!/bin/bash

# TOPEMS 服务监控脚本
# 用于监控所有后端服务和基础设施的运行状态

SERVICES=(
    "IAM:8000"
    "PM:8001"
    "NOTIFICATION:8002"
    "PORTAL:8003"
    "FLOW:8004"
    "INTEGRATION:8005"
    "ERP:8010"
    "HRM:8011"
    "CRM:8012"
    "RS:8020"
    "LIMS:8022"
    "PDM:8023"
    "DOC:8024"
    "MES:8030"
    "QMS:8031"
    "EHS:8032"
    "SCM:8040"
    "SRM:8041"
    "WMS:8042"
    "FILE:8050"
    "MAIL:8051"
    "IM:8052"
    "GIS:8053"
    "BI:8060"
    "REPORT:8061"
    "AI:8062"
    "MOBILE:8070"
)

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo ""
echo "=========================================="
echo "    TOPEMS 服务监控 Dashboard"
echo "=========================================="
echo ""

# 检查数据库状态
echo "${YELLOW}[数据库状态]${NC}"
echo "--------------"

# PostgreSQL
if lsof -i :5432 -s TCP:LISTEN >/dev/null 2>&1; then
    echo "✓ PostgreSQL: ${GREEN}运行中 (端口 5432 监听)${NC}"
else
    echo "✗ PostgreSQL: ${RED}未运行${NC}"
fi

# Redis
if lsof -i :6379 -s TCP:LISTEN >/dev/null 2>&1; then
    echo "✓ Redis: ${GREEN}运行中 (端口 6379 监听)${NC}"
else
    echo "✗ Redis: ${RED}未运行${NC}"
fi

echo ""
echo "${YELLOW}[后端服务状态]${NC}"
echo "--------------"

UP_COUNT=0
DOWN_COUNT=0

for service in "${SERVICES[@]}"; do
    NAME=$(echo "$service" | cut -d':' -f1)
    PORT=$(echo "$service" | cut -d':' -f2)
    
    if lsof -i :"$PORT" -s TCP:LISTEN >/dev/null 2>&1; then
        RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:"$PORT"/health 2>/dev/null)
        if [ "$RESPONSE" = "200" ]; then
            echo "✓ ${NAME}:${PORT} ${GREEN}(正常)${NC}"
        else
            echo "~ ${NAME}:${PORT} ${YELLOW}(端口监听，但健康检查异常)${NC}"
        fi
        UP_COUNT=$((UP_COUNT + 1))
    else
        echo "✗ ${NAME}:${PORT} ${RED}(未运行)${NC}"
        DOWN_COUNT=$((DOWN_COUNT + 1))
    fi
done

echo ""
echo "${YELLOW}[前端服务状态]${NC}"
echo "--------------"

# 前端服务
if curl -s -o /dev/null -w "%{http_code}" http://localhost:3000 >/dev/null 2>&1; then
    echo "✓ 前端服务: ${GREEN}运行中 (http://localhost:3000)${NC}"
else
    echo "✗ 前端服务: ${RED}未运行${NC}"
    DOWN_COUNT=$((DOWN_COUNT + 1))
fi

echo ""
echo "=========================================="
echo "  总计: ${GREEN}${UP_COUNT}${NC} 个服务运行中, ${RED}${DOWN_COUNT}${NC} 个服务异常"
echo "=========================================="
echo ""
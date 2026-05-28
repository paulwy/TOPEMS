#!/bin/bash

echo "=================================================="
echo "TOPEMS 服务启动脚本"
echo "=================================================="
echo ""

# 启动目录
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
TOPEMS_DIR="$(dirname "$SCRIPT_DIR")"

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# 检查数据库
echo -e "${YELLOW}检查 Docker 数据库服务...${NC}"
if ! docker ps | grep -q postgres; then
    echo -e "${YELLOW}启动 PostgreSQL 容器...${NC}"
    cd "$TOPEMS_DIR/infrastructure/docker" && docker-compose up -d
    sleep 5
fi

echo ""
echo -e "${GREEN}启动后端服务...${NC}"
echo ""

# 启动所有后端服务（后台运行）
services=(
    "topems-iam:platform/topems-iam/backend:8002"
    "topems-doc:platform/topems-doc/backend:8001"
    "topems-ai:services/topems-ai/backend:8003"
    "topems-flow:platform/topems-flow/backend:8004"
    "topems-rs:services/topems-rs/backend:8005"
    "topems-lims:services/topems-lims/backend:8006"
)

for service_info in "${services[@]}"; do
    IFS=':' read -r name path port <<< "$service_info"
    echo -e "${GREEN}启动 $name (端口: $port)...${NC}"
    cd "$TOPEMS_DIR/$path" && cargo run > "/tmp/topems-${name}.log" 2>&1 &
    sleep 2
done

echo ""
echo -e "${GREEN}等待所有服务启动...${NC}"
sleep 8

echo ""
echo -e "${GREEN}==================================================${NC}"
echo -e "${GREEN}服务状态检查${NC}"
echo -e "${GREEN}==================================================${NC}"
echo ""

# 检查所有服务
lsof -i :8001 -i :8002 -i :8003 -i :8004 -i :8005 -i :8006 2>/dev/null | grep LISTEN | while read line; do
    port=$(echo "$line" | awk '{print $9}' | cut -d':' -f2)
    echo -e "✅ 端口 $port - $(echo "$line" | awk '{print $1}')"
done

echo ""
echo -e "${GREEN}所有服务已启动！${NC}"
echo ""
echo "查看日志命令："
echo "  tail -f /tmp/topems-<服务名>.log"
echo ""
echo "测试命令："
echo "  python3 $SCRIPT_DIR/test_api.py"
echo ""

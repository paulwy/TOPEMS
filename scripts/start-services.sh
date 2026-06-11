#!/bin/bash
# TOPEMS 服务启动脚本
# 用于统一管理所有服务的启动和停止

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 停止本地 PostgreSQL（如果运行）
echo -e "${YELLOW}检查并停止本地 PostgreSQL...${NC}"
pkill -f postgres 2>/dev/null || true
sleep 2

# 停止并移除旧容器
echo -e "${YELLOW}停止并移除旧容器...${NC}"
cd /Users/air/TOPEMS/docker
docker-compose down -v --remove-orphans 2>/dev/null || true

# 创建网络（如果不存在）
echo -e "${YELLOW}创建 Docker 网络...${NC}"
docker network create topems-network 2>/dev/null || true

# 启动数据库服务
echo -e "${YELLOW}启动数据库服务...${NC}"
cd /Users/air/TOPEMS/docker
POSTGRES_USER=topems POSTGRES_PASSWORD=topems_secret POSTGRES_DB=topems docker-compose up -d postgres redis

# 等待数据库启动
echo -e "${YELLOW}等待数据库启动...${NC}"
MAX_RETRIES=30
RETRY=0
while [ $RETRY -lt $MAX_RETRIES ]; do
    if docker exec topems-postgres pg_isready -U topems -d topems > /dev/null 2>&1; then
        echo -e "${GREEN}✓ 数据库连接成功${NC}"
        break
    fi
    RETRY=$((RETRY + 1))
    echo -e "${YELLOW}等待数据库... ($RETRY/$MAX_RETRIES)${NC}"
    sleep 1
done

if [ $RETRY -eq $MAX_RETRIES ]; then
    echo -e "${RED}✗ 数据库启动超时${NC}"
    exit 1
fi

# 验证时区配置
echo -e "${YELLOW}验证时区配置...${NC}"
TIMEZONE=$(docker exec topems-postgres psql -U topems -d topems -c "SHOW TimeZone;" -t -A)
echo -e "${GREEN}✓ 数据库时区: $TIMEZONE${NC}"

# 启动各个服务
echo -e "${YELLOW}启动 File 服务...${NC}"
cd /Users/air/TOPEMS/svc/file
DATABASE_URL="postgres://topems:topems_secret@localhost:5432/topems" SERVER_PORT=8055 nohup cargo run --release > /tmp/file-service.log 2>&1 &
FILE_PID=$!
echo -e "${GREEN}✓ File 服务已启动 (PID: $FILE_PID)${NC}"

# 等待 File 服务启动
sleep 5
if curl -s http://localhost:8055/health > /dev/null; then
    echo -e "${GREEN}✓ File 服务健康检查通过${NC}"
else
    echo -e "${RED}✗ File 服务启动失败${NC}"
    cat /tmp/file-service.log
    exit 1
fi

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}所有服务已成功启动！${NC}"
echo -e "${GREEN}========================================${NC}"
echo -e ""
echo -e "${YELLOW}服务状态:${NC}"
echo -e "  PostgreSQL: localhost:5432"
echo -e "  Redis: localhost:6379"
echo -e "  File Service: http://localhost:8055"
echo -e ""
echo -e "${YELLOW}日志文件:${NC}"
echo -e "  File Service: /tmp/file-service.log"
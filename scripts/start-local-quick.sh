#!/bin/bash

# TOPEMS 改进版快速本地启动脚本
# 自动检测并启动所有服务

cd "$(dirname "$0")/.."

# 设置颜色
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 设置环境变量
export JWT_SECRET="topems-jwt-secret"
export REFRESH_SECRET="topems-refresh-secret"
export JWT_EXPIRY_HOURS="24"
export RUST_LOG="info"
export DATABASE_URL="postgres://topems:topems_secret@localhost:5432/topems"
export CORS_ORIGINS="http://localhost:3000,http://localhost:5173,http://localhost:3001"

echo -e "${BLUE}==============================================${NC}"
echo -e "${BLUE}  TOPEMS 快速本地启动${NC}"
echo -e "${BLUE}==============================================${NC}"
echo ""

# 函数：检查端口是否被占用
check_port() {
  local port=$1
  if lsof -i :$port -sTCP:LISTEN >/dev/null 2>&1; then
    return 0
  else
    return 1
  fi
}

# 函数：检查PostgreSQL容器
check_postgres() {
  if docker ps --format "{{.Names}}" 2>/dev/null | grep -q "topems-postgres"; then
    echo -e "${GREEN}✅${NC} PostgreSQL 容器运行中"
    return 0
  else
    echo -e "${RED}❌${NC} PostgreSQL 容器未运行"
    return 1
  fi
}

# 函数：检查Redis容器
check_redis() {
  if docker ps --format "{{.Names}}" 2>/dev/null | grep -q "topems-redis"; then
    echo -e "${GREEN}✅${NC} Redis 容器运行中"
    return 0
  else
    echo -e "${RED}❌${NC} Redis 容器未运行"
    return 1
  fi
}

echo -e "${BLUE}==============================================${NC}"
echo -e "${BLUE}  检查环境${NC}"
echo -e "${BLUE}==============================================${NC}"
echo ""

# 检查数据库和Redis
check_postgres
check_redis

echo ""

# 检查服务端口
echo -e "${BLUE}检查服务端口：${NC}"
echo ""

# 检查所有服务端口
declare -A SERVICES=(
  [8001]="DOC (文档管理)"
  [8002]="IAM (身份认证)"
  [8003]="AI (人工智能)"
  [8004]="FLOW (工作流)"
  [8005]="RS (研发项目)"
  [8006]="LIMS (实验室)"
  [8009]="ERP (企业资源)"
  [8010]="HRM (人力资源)"
  [8011]="GIS (地理信息)"
  [8012]="QMS (质量管理)"
  [8015]="PDM (产品数据)"
  [8016]="EHS (环境安全)"
  [8017]="IM (即时通讯)"
  [8018]="SRM (供应商)"
)

# 收集运行状态
declare -A SERVICE_STATUS=()
for PORT in "${!SERVICES[@]}"; do
  if check_port $PORT; then
    SERVICE_STATUS[$PORT]="running"
  else
    SERVICE_STATUS[$PORT]="stopped"
  fi
done

# 检查前端
FRONTEND_RUNNING=0
if check_port 3001 || check_port 5173; then
  FRONTEND_RUNNING=1
fi

echo ""
echo -e "${BLUE}==============================================${NC}"
echo -e "${BLUE}  服务状态${NC}"
echo -e "${BLUE}==============================================${NC}"
echo ""

# 按端口排序显示服务
for PORT in $(printf "%s\n" "${!SERVICES[@]}" | sort -n); do
  NAME=${SERVICES[$PORT]}
  STATUS=${SERVICE_STATUS[$PORT]}
  if [ "$STATUS" = "running" ]; then
    echo -e "${GREEN}✅${NC} $NAME ($PORT) 运行中"
  else
    echo -e "${YELLOW}⏳${NC} $NAME ($PORT) 未运行"
  fi
done

if [ $FRONTEND_RUNNING -eq 1 ]; then
  echo -e "${GREEN}✅${NC} Frontend (3001/5173) 运行中"
else
  echo -e "${YELLOW}⏳${NC} Frontend 未运行"
fi

echo ""
echo -e "${BLUE}==============================================${NC}"
echo -e "${BLUE}  启动服务${NC}"
echo -e "${BLUE}==============================================${NC}"
echo ""
echo -e "⚠️  请注意：${YELLOW}由于需要多个终端同时运行不同服务${NC}"
echo -e "   你需要手动在多个终端分别启动以下服务："
echo ""

echo -e "${BLUE}📦 终端 1 - IAM 服务${NC}"
if [ "${SERVICE_STATUS[8002]}" = "running" ]; then
  echo -e "  ${GREEN}✅ 已在运行${NC}"
else
  echo -e "  ${YELLOW}cd /Users/air/TOPEMS/platform/topems-iam/backend${NC}"
  echo -e "  ${YELLOW}./target/release/topems-iam${NC}"
fi
echo ""

echo -e "${BLUE}📄 终端 2 - DOC 服务${NC}"
if [ "${SERVICE_STATUS[8001]}" = "running" ]; then
  echo -e "  ${GREEN}✅ 已在运行${NC}"
else
  echo -e "  ${YELLOW}cd /Users/air/TOPEMS/platform/topems-doc/backend${NC}"
  echo -e "  ${YELLOW}./target/release/topems-doc${NC}"
fi
echo ""

echo -e "${BLUE}🤖 终端 3 - AI 服务${NC}"
if [ "${SERVICE_STATUS[8003]}" = "running" ]; then
  echo -e "  ${GREEN}✅ 已在运行${NC}"
else
  echo -e "  ${YELLOW}cd /Users/air/TOPEMS/services/topems-ai/backend${NC}"
  echo -e "  ${YELLOW}./target/release/topems-ai${NC}"
fi
echo ""

echo -e "${BLUE}🔄 终端 4 - FLOW 服务${NC}"
if [ "${SERVICE_STATUS[8004]}" = "running" ]; then
  echo -e "  ${GREEN}✅ 已在运行${NC}"
else
  echo -e "  ${YELLOW}cd /Users/air/TOPEMS/platform/topems-flow/backend${NC}"
  echo -e "  ${YELLOW}./target/release/topems-flow${NC}"
fi
echo ""

echo -e "${BLUE}🧪 终端 5 - RS 服务${NC}"
if [ "${SERVICE_STATUS[8005]}" = "running" ]; then
  echo -e "  ${GREEN}✅ 已在运行${NC}"
else
  echo -e "  ${YELLOW}cd /Users/air/TOPEMS/services/topems-rs/backend${NC}"
  echo -e "  ${YELLOW}./target/release/topems-rs${NC}"
fi
echo ""

echo -e "${BLUE}🔬 终端 6 - LIMS 服务${NC}"
if [ "${SERVICE_STATUS[8006]}" = "running" ]; then
  echo -e "  ${GREEN}✅ 已在运行${NC}"
else
  echo -e "  ${YELLOW}cd /Users/air/TOPEMS/services/topems-lims/backend${NC}"
  echo -e "  ${YELLOW}./target/release/topems-lims${NC}"
fi
echo ""

echo -e "${BLUE}🌐 终端 7 - 前端服务${NC}"
if [ $FRONTEND_RUNNING -eq 1 ]; then
  echo -e "  ${GREEN}✅ 已在运行${NC}"
else
  echo -e "  ${YELLOW}cd /Users/air/TOPEMS/frontend${NC}"
  echo -e "  ${YELLOW}npm run dev${NC}"
fi
echo ""

echo -e "${BLUE}==============================================${NC}"
echo -e "${BLUE}  访问地址${NC}"
echo -e "${BLUE}==============================================${NC}"
echo ""

if [ $FRONTEND_RUNNING -eq 1 ]; then
  echo -e "🚀 ${GREEN}前端应用：http://localhost:3001/${NC}"
else
  echo -e "🚀 ${YELLOW}启动前端后访问：http://localhost:3001/${NC}"
fi
echo ""
echo -e "${BLUE}🔑 登录账号：${NC}"
echo -e "   - 管理员：admin / admin123"
echo -e "   - 普通用户：user / user123"
echo -e "   - 访客：guest / guest123"
echo ""

# 询问是否在当前终端启动前端
if [ $FRONTEND_RUNNING -eq 0 ]; then
  read -p "是否在当前终端启动前端 (Y/n)? " choice
  case "$choice" in
    n|N )
      echo ""
      echo "好的，请按照上面的说明在多个终端分别启动服务"
      ;;
    * )
      echo ""
      echo -e "${BLUE}🚀 启动前端...${NC}"
      cd /Users/air/TOPEMS/frontend
      npm run dev
      ;;
  esac
else
  echo -e "${GREEN}✅ 所有核心服务已在运行！${NC}"
fi

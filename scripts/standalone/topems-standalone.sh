#!/bin/bash

# TOPEMS 非Docker方案启动脚本
# 特性:
# - 直接启动所有后端服务
# - 支持环境变量配置
# - 服务依赖管理
# - 健康检查和状态报告

set -e

# 获取项目根目录
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$(dirname "$SCRIPT_DIR")")"
cd "$PROJECT_ROOT"

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

info() { echo -e "${BLUE}[INFO]${NC} $1"; }
success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
error() { echo -e "${RED}[ERROR]${NC} $1"; }

# 加载配置文件
load_config() {
  # 加载端口配置
  if [ -f "$PROJECT_ROOT/config/ports.env" ]; then
    source "$PROJECT_ROOT/config/ports.env"
    info "已加载端口配置"
  else
    warning "端口配置文件不存在，使用默认端口"
  fi
  
  # 加载环境变量
  if [ -f "$PROJECT_ROOT/config/standalone.env" ]; then
    source "$PROJECT_ROOT/config/standalone.env"
    info "已加载环境变量配置"
  else
    # 设置默认环境变量
    export DATABASE_URL="postgres://topems:topems_secret@localhost:5432/topems"
    export REDIS_URL="redis://:topems_redis_secret@localhost:6379"
    export OLLAMA_HOST="http://localhost:11434"
    export JWT_SECRET="topems-jwt-secret-key-must-be-at-least-32-characters-long-for-hs256"
    export REFRESH_SECRET="topems-refresh-secret-key-must-be-at-least-32-characters-long"
    export CORS_ORIGINS="http://localhost:3000,http://localhost:8000"
    info "使用默认环境变量"
  fi
}

# 检查数据库
check_database() {
  info "检查数据库连接..."
  
  # 检查PostgreSQL
  if psql -U topems -d topems -c "SELECT 1" >/dev/null 2>&1; then
    success "PostgreSQL 连接正常"
  else
    error "PostgreSQL 连接失败"
    exit 1
  fi
  
  # 检查Redis
  if redis-cli -a topems_redis_secret ping | grep -q PONG; then
    success "Redis 连接正常"
  else
    error "Redis 连接失败"
    exit 1
  fi
}

# 检查Ollama（可选）
check_ollama() {
  info "检查AI服务..."
  
  if curl -s http://localhost:11434/api/tags >/dev/null 2>&1; then
    success "Ollama 服务正常"
  else
    warning "Ollama 服务未运行，AI功能将受限"
  fi
}

# 停止所有服务
stop_all() {
  info "停止所有服务..."
  
  # 停止后端服务
  services=(
    "iam" "notification" "portal" "flow" "integration"
    "erp" "hrm" "crm" "rs" "doc" "lims" "pdm"
    "mes" "qms" "ehs" "scm" "srm" "wms"
    "file" "mail" "im" "gis" "bi" "report" "ai" "mobile"
  )
  
  for service in "${services[@]}"; do
    pkill -f "topems-$service" 2>/dev/null || true
    pkill -f "cargo run.*$service" 2>/dev/null || true
  done
  
  # 停止前端服务
  pkill -f "npm run dev" 2>/dev/null || true
  
  success "所有服务已停止"
}

# 启动单个服务
start_service() {
  local name="$1"
  local port="$2"
  
  info "启动 $name 服务 (端口 $port)..."
  
  # 检查端口是否被占用
  if lsof -Pi ":$port" -sTCP:LISTEN -t >/dev/null 2>&1; then
    warning "端口 $port 已被占用，跳过 $name 服务"
    return
  fi
  
  # 创建日志目录
  mkdir -p "$PROJECT_ROOT/logs"
  
  # 启动服务
  cd "$PROJECT_ROOT/svc/$name"
  SERVER_PORT="$port" RUST_LOG=info cargo run --quiet > "$PROJECT_ROOT/logs/$name.log" 2>&1 &
  
  # 等待服务启动
  local attempts=0
  while [ $attempts -lt 30 ]; do
    if curl -s "http://localhost:$port/health" >/dev/null 2>&1; then
      success "$name 服务启动成功"
      return
    fi
    attempts=$((attempts + 1))
    sleep 1
  done
  
  warning "$name 服务启动超时或未响应"
}

# 启动核心服务
start_core() {
  info "启动核心服务..."
  
  local core_services=(
    "iam:${IAM_PORT:-8000}"
    "notification:${NOTIFICATION_PORT:-8004}"
    "portal:${PORTAL_PORT:-8005}"
    "flow:${FLOW_PORT:-8006}"
    "integration:${INTEGRATION_PORT:-8007}"
  )
  
  for service in "${core_services[@]}"; do
    name=$(echo "$service" | cut -d':' -f1)
    port=$(echo "$service" | cut -d':' -f2)
    start_service "$name" "$port"
  done
}

# 启动ERP服务
start_erp() {
  info "启动ERP服务..."
  
  local erp_services=(
    "erp:${ERP_PORT:-8010}"
    "hrm:${HRM_PORT:-8012}"
    "crm:${CRM_PORT:-8013}"
  )
  
  for service in "${erp_services[@]}"; do
    name=$(echo "$service" | cut -d':' -f1)
    port=$(echo "$service" | cut -d':' -f2)
    start_service "$name" "$port"
  done
}

# 启动PLM服务
start_plm() {
  info "启动PLM服务..."
  
  local plm_services=(
    "rs:${RS_PORT:-8020}"
    "doc:${DOC_PORT:-8028}"
    "lims:${LIMS_PORT:-8022}"
    "pdm:${PDM_PORT:-8023}"
  )
  
  for service in "${plm_services[@]}"; do
    name=$(echo "$service" | cut -d':' -f1)
    port=$(echo "$service" | cut -d':' -f2)
    start_service "$name" "$port"
  done
}

# 启动MES服务
start_mes() {
  info "启动MES服务..."
  
  local mes_services=(
    "mes:${MES_PORT:-8030}"
    "qms:${QMS_PORT:-8031}"
    "ehs:${EHS_PORT:-8032}"
  )
  
  for service in "${mes_services[@]}"; do
    name=$(echo "$service" | cut -d':' -f1)
    port=$(echo "$service" | cut -d':' -f2)
    start_service "$name" "$port"
  done
}

# 启动SCM服务
start_scm() {
  info "启动SCM服务..."
  
  local scm_services=(
    "scm:${SCM_PORT:-8040}"
    "srm:${SRM_PORT:-8041}"
    "wms:${WMS_PORT:-8042}"
  )
  
  for service in "${scm_services[@]}"; do
    name=$(echo "$service" | cut -d':' -f1)
    port=$(echo "$service" | cut -d':' -f2)
    start_service "$name" "$port"
  done
}

# 启动基础设施服务
start_infra() {
  info "启动基础设施服务..."
  
  local infra_services=(
    "file:${FILE_PORT:-8050}"
    "mail:${MAIL_PORT:-8051}"
    "im:${IM_PORT:-8052}"
    "gis:${GIS_PORT:-8053}"
  )
  
  for service in "${infra_services[@]}"; do
    name=$(echo "$service" | cut -d':' -f1)
    port=$(echo "$service" | cut -d':' -f2)
    start_service "$name" "$port"
  done
}

# 启动数据分析服务
start_analytics() {
  info "启动数据分析服务..."
  
  local analytics_services=(
    "bi:${BI_PORT:-8060}"
    "report:${REPORT_PORT:-8061}"
    "ai:${AI_PORT:-8062}"
  )
  
  for service in "${analytics_services[@]}"; do
    name=$(echo "$service" | cut -d':' -f1)
    port=$(echo "$service" | cut -d':' -f2)
    start_service "$name" "$port"
  done
}

# 启动预留扩展服务
start_extension() {
  info "启动预留扩展服务..."
  
  local extension_services=(
    "mobile:${MOBILE_PORT:-8070}"
  )
  
  for service in "${extension_services[@]}"; do
    name=$(echo "$service" | cut -d':' -f1)
    port=$(echo "$service" | cut -d':' -f2)
    start_service "$name" "$port"
  done
}

# 启动前端服务
start_frontend() {
  info "启动前端服务..."
  
  if lsof -Pi ":${WEB_PORT:-3000}" -sTCP:LISTEN -t >/dev/null 2>&1; then
    warning "端口 ${WEB_PORT:-3000} 已被占用，跳过前端服务"
    return
  fi
  
  cd "$PROJECT_ROOT/apps/web"
  npm run dev > "$PROJECT_ROOT/logs/web.log" 2>&1 &
  
  # 等待前端启动
  local attempts=0
  while [ $attempts -lt 30 ]; do
    if curl -s "http://localhost:${WEB_PORT:-3000}" >/dev/null 2>&1; then
      success "前端服务启动成功"
      return
    fi
    attempts=$((attempts + 1))
    sleep 2
  done
  
  warning "前端服务启动超时"
}

# 显示状态
show_status() {
  info "服务状态检查..."
  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "              TOPEMS 服务状态                   "
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  
  # 数据库状态
  echo ""
  echo "📦 数据库:"
  if psql -U topems -d topems -c "SELECT 1" >/dev/null 2>&1; then
    echo "  ✅ PostgreSQL"
  else
    echo "  ❌ PostgreSQL"
  fi
  if redis-cli -a topems_redis_secret ping | grep -q PONG; then
    echo "  ✅ Redis"
  else
    echo "  ❌ Redis"
  fi
  
  # 服务状态
  local services=(
    "核心服务:iam:${IAM_PORT:-8000}"
    "核心服务:notification:${NOTIFICATION_PORT:-8004}"
    "核心服务:portal:${PORTAL_PORT:-8005}"
    "核心服务:flow:${FLOW_PORT:-8006}"
    "核心服务:integration:${INTEGRATION_PORT:-8007}"
    "ERP服务:erp:${ERP_PORT:-8010}"
    "ERP服务:hrm:${HRM_PORT:-8012}"
    "ERP服务:crm:${CRM_PORT:-8013}"
    "PLM服务:rs:${RS_PORT:-8020}"
    "PLM服务:doc:${DOC_PORT:-8028}"
    "PLM服务:lims:${LIMS_PORT:-8022}"
    "PLM服务:pdm:${PDM_PORT:-8023}"
    "MES服务:mes:${MES_PORT:-8030}"
    "MES服务:qms:${QMS_PORT:-8031}"
    "MES服务:ehs:${EHS_PORT:-8032}"
    "SCM服务:scm:${SCM_PORT:-8040}"
    "SCM服务:srm:${SRM_PORT:-8041}"
    "SCM服务:wms:${WMS_PORT:-8042}"
    "基础设施:file:${FILE_PORT:-8050}"
    "基础设施:mail:${MAIL_PORT:-8051}"
    "基础设施:im:${IM_PORT:-8052}"
    "基础设施:gis:${GIS_PORT:-8053}"
    "数据分析:bi:${BI_PORT:-8060}"
    "数据分析:report:${REPORT_PORT:-8061}"
    "数据分析:ai:${AI_PORT:-8062}"
    "预留扩展:mobile:${MOBILE_PORT:-8070}"
  )
  
  local current_module=""
  for service in "${services[@]}"; do
    module=$(echo "$service" | cut -d':' -f1)
    name=$(echo "$service" | cut -d':' -f2)
    port=$(echo "$service" | cut -d':' -f3)
    
    if [ "$module" != "$current_module" ]; then
      echo ""
      echo "$module:"
      current_module="$module"
    fi
    
    if lsof -Pi ":$port" -sTCP:LISTEN -t >/dev/null 2>&1; then
      if curl -s "http://localhost:$port/health" >/dev/null 2>&1; then
        echo "  ✅ $name (端口 $port)"
      else
        echo "  ⚠️ $name (端口 $port)"
      fi
    else
      echo "  ❌ $name (端口 $port)"
    fi
  done
  
  # 前端状态
  echo ""
  echo "🌐 前端服务:"
  if lsof -Pi ":${WEB_PORT:-3000}" -sTCP:LISTEN -t >/dev/null 2>&1; then
    echo "  ✅ Frontend (端口 ${WEB_PORT:-3000})"
  else
    echo "  ❌ Frontend"
  fi
  
  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
}

# 主入口
case "$1" in
  start)
    load_config
    check_database
    check_ollama
    start_core
    start_erp
    start_plm
    start_mes
    start_scm
    start_infra
    start_analytics
    start_extension
    start_frontend
    show_status
    ;;
  start-core)
    load_config
    check_database
    start_core
    show_status
    ;;
  start-backend)
    load_config
    check_database
    start_core
    start_erp
    start_plm
    start_mes
    start_scm
    start_infra
    start_analytics
    start_extension
    show_status
    ;;
  start-frontend)
    start_frontend
    show_status
    ;;
  stop)
    stop_all
    ;;
  status)
    load_config
    show_status
    ;;
  restart)
    stop_all
    "$0" start
    ;;
  *)
    echo "使用方法: $0 {start|start-core|start-backend|start-frontend|stop|status|restart}"
    echo ""
    echo "命令说明:"
    echo "  start           - 启动所有服务（数据库+后端+前端）"
    echo "  start-core      - 仅启动核心服务"
    echo "  start-backend   - 启动所有后端服务"
    echo "  start-frontend  - 仅启动前端服务"
    echo "  stop            - 停止所有服务"
    echo "  status          - 查看服务状态"
    echo "  restart         - 重启所有服务"
    exit 1
    ;;
esac
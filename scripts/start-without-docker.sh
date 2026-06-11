#!/bin/bash
# TOPEMS 无Docker启动脚本
# 用于在本地已安装PostgreSQL和Redis的环境中启动服务
# 前提条件：
#   1. PostgreSQL已安装并运行在 localhost:5432
#   2. Redis已安装并运行在 localhost:6379
#   3. 已创建数据库和用户：topems/topems_secret

set -e

# ================================================
# 配置常量
# ================================================
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
cd "$PROJECT_ROOT"

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

# 服务配置
CORE_SERVICES=(
  "iam:8000"
  "hrm:8011"
  "mail:8054"
  "file:8055"
  "doc:8001"
  "ai:8013"
)

ALL_SERVICES=(
  "iam:8000"
  "doc:8001"
  "pm:8024"
  "notification:8003"
  "integration:8004"
  "portal:8005"
  "flow:8006"
  "erp:8010"
  "hrm:8011"
  "crm:8012"
  "ai:8013"
  "rs:8020"
  "lims:8022"
  "pdm:8023"
  "mes:8030"
  "qms:8031"
  "ehs:8032"
  "scm:8040"
  "srm:8041"
  "wms:8042"
  "gis:8050"
  "im:8051"
  "bi:8052"
  "report:8053"
  "mail:8054"
)

# 数据库配置（可根据实际情况修改）
POSTGRES_HOST="${POSTGRES_HOST:-localhost}"
POSTGRES_PORT="${POSTGRES_PORT:-5432}"
POSTGRES_USER="${POSTGRES_USER:-topems}"
POSTGRES_PASSWORD="${POSTGRES_PASSWORD:-topems_secret}"
POSTGRES_DB="${POSTGRES_DB:-topems}"

REDIS_HOST="${REDIS_HOST:-localhost}"
REDIS_PORT="${REDIS_PORT:-6379}"

# ================================================
# 日志函数
# ================================================
log() { echo -e "${GREEN}[TOPEMS]${NC} $1"; }
log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }

# ================================================
# 工具函数
# ================================================

check_port() {
  local port=$1
  if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
    return 0
  else
    return 1
  fi
}

stop_port() {
  local port=$1
  local pids=$(lsof -ti:$port 2>/dev/null)
  if [ -n "$pids" ]; then
    log_info "停止端口 $port 上的进程..."
    kill -9 $pids 2>/dev/null || true
    sleep 1
  fi
}

wait_for_service() {
  local name=$1
  local port=$2
  local max_attempts=${3:-30}
  local health_path=${4:-"/health"}
  
  echo -n "  等待 $name 就绪"
  for i in $(seq 1 $max_attempts); do
    if curl -sf "http://localhost:$port$health_path" > /dev/null 2>&1; then
      echo -e " - ${GREEN}✅${NC}"
      return 0
    fi
    echo -n "."
    sleep 1
  done
  echo -e " - ${RED}❌ 超时${NC}"
  return 1
}

# ================================================
# 数据库检查
# ================================================
check_database() {
  log_info "检查本地数据库服务..."
  
  # 检查 PostgreSQL
  echo -n "  PostgreSQL (${POSTGRES_HOST}:${POSTGRES_PORT}): "
  if check_port $POSTGRES_PORT; then
    echo -e "${GREEN}✅ 运行中${NC}"
  else
    echo -e "${RED}❌ 未运行${NC}"
    log_error "PostgreSQL 未在端口 ${POSTGRES_PORT} 运行"
    log_error "请先启动 PostgreSQL 服务"
    log_error "  macOS: brew services start postgresql"
    log_error "  Ubuntu: sudo systemctl start postgresql"
    exit 1
  fi
  
  # 检查 Redis
  echo -n "  Redis (${REDIS_HOST}:${REDIS_PORT}): "
  if check_port $REDIS_PORT; then
    echo -e "${GREEN}✅ 运行中${NC}"
  else
    echo -e "${RED}❌ 未运行${NC}"
    log_error "Redis 未在端口 ${REDIS_PORT} 运行"
    log_error "请先启动 Redis 服务"
    log_error "  macOS: brew services start redis"
    log_error "  Ubuntu: sudo systemctl start redis"
    exit 1
  fi
  
  # 验证数据库连接
  log_info "验证数据库连接..."
  local db_url="postgres://${POSTGRES_USER}:${POSTGRES_PASSWORD}@${POSTGRES_HOST}:${POSTGRES_PORT}/${POSTGRES_DB}"
  
  if command -v psql >/dev/null 2>&1; then
    if PGPASSWORD="${POSTGRES_PASSWORD}" psql -h "${POSTGRES_HOST}" -p "${POSTGRES_PORT}" -U "${POSTGRES_USER}" -d "${POSTGRES_DB}" -c "SELECT 1" >/dev/null 2>&1; then
      log_success "数据库连接验证成功"
    else
      log_error "数据库连接验证失败"
      log_error "请检查数据库配置或创建用户/数据库"
      log_error "  创建命令: createdb -U postgres topems && createuser -U postgres topems -P"
      exit 1
    fi
  else
    log_warn "psql 命令未找到，跳过数据库连接验证"
  fi
}

# ================================================
# 服务管理
# ================================================
start_service() {
  local name=$1
  local port=$2
  
  local svc_dir="$PROJECT_ROOT/svc/$name"
  if [ ! -d "$svc_dir" ]; then
    log_error "服务目录不存在: $svc_dir"
    return 1
  fi
  
  stop_port $port
  
  mkdir -p "$PROJECT_ROOT/logs"
  
  export DATABASE_URL="postgres://${POSTGRES_USER}:${POSTGRES_PASSWORD}@${POSTGRES_HOST}:${POSTGRES_PORT}/${POSTGRES_DB}"
  export REDIS_URL="redis://${REDIS_HOST}:${REDIS_PORT}"
  export JWT_SECRET="${JWT_SECRET:-topems-jwt-secret-key-must-be-at-least-32-characters-long-for-hs256}"
  export REFRESH_SECRET="${REFRESH_SECRET:-topems-jwt-refresh-secret-key-must-be-at-least-32-characters-long}"
  export SERVER_PORT=$port
  export RUST_LOG=info
  
  if [ "$name" = "mail" ]; then
    export SMTP_HOST="${SMTP_HOST:-smtp.163.com}"
    export SMTP_PORT="${SMTP_PORT:-465}"
    export SMTP_USERNAME="${SMTP_USERNAME:-topmap@163.com}"
    export SMTP_PASSWORD="${SMTP_PASSWORD:-BMyf23ZqRburuhCv}"
    export SMTP_FROM_ADDRESS="${SMTP_FROM_ADDRESS:-topmap@163.com}"
  fi
  
  if [ "$name" = "file" ]; then
    export STORAGE_LOCAL_PATH="./storage/files"
    export SERVER_PORT=8055
  fi
  
  if [ "$name" = "ai" ]; then
    export FILE_SERVICE_URL="http://localhost:8055"
    export OLLAMA_MODEL="${OLLAMA_MODEL:-qwen2.5:7b-instruct}"
  fi
  
  if [ "$name" = "doc" ]; then
    export FILE_SERVICE_URL="http://localhost:8055"
    export STORAGE_BACKEND="remote"
  fi
  
  log_info "启动 $name 服务 (端口 $port)..."
  cd "$svc_dir"
  cargo run --quiet 2>&1 | tee -a "$PROJECT_ROOT/logs/$name.log" &
  local pid=$!
  
  for i in {1..30}; do
    if check_port $port; then
      log_success "$name 服务启动成功 (PID: $pid)"
      cd "$PROJECT_ROOT"
      return 0
    fi
    sleep 1
  done
  
  log_error "$name 服务启动失败，查看日志: tail -f logs/$name.log"
  cd "$PROJECT_ROOT"
  return 1
}

stop_service() {
  local name=$1
  local port=$2
  
  log_info "停止 $name 服务..."
  stop_port $port
  log_success "$name 服务已停止"
}

status_service() {
  local name=$1
  local port=$2
  
  if check_port $port; then
    local pid=$(lsof -ti:$port)
    echo -e "  ${GREEN}✅${NC} $name (端口 $port) 运行中 (PID: $pid)"
    return 0
  else
    echo -e "  ${RED}❌${NC} $name (端口 $port) 未运行"
    return 1
  fi
}

# ================================================
# 命令处理
# ================================================

cmd_start_core() {
  log_info "🚀 启动核心服务（无Docker模式）"
  
  check_database
  
  for service in "${CORE_SERVICES[@]}"; do
    name=$(echo "$service" | cut -d':' -f1)
    port=$(echo "$service" | cut -d':' -f2)
    
    start_service "$name" "$port"
    wait_for_service "$name" "$port"
  done
  
  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "              核心服务状态                      "
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  
  local success=0
  local total=0
  
  for service in "${CORE_SERVICES[@]}"; do
    name=$(echo "$service" | cut -d':' -f1)
    port=$(echo "$service" | cut -d':' -f2)
    total=$((total + 1))
    
    if check_port $port; then
      echo -e "  ✅ $name (http://localhost:$port)"
      success=$((success + 1))
    else
      echo -e "  ❌ $name (端口 $port)"
    fi
  done
  
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  
  if [ "$success" -eq "$total" ]; then
    log_success "所有核心服务已成功启动！"
    echo ""
    echo "访问地址："
    for service in "${CORE_SERVICES[@]}"; do
      name=$(echo "$service" | cut -d':' -f1)
      port=$(echo "$service" | cut -d':' -f2)
      echo "  - $name: http://localhost:$port"
    done
  fi
}

cmd_start_all() {
  log_info "🚀 启动所有服务（无Docker模式）"
  
  check_database
  
  log_info "启动核心服务..."
  for service in "${CORE_SERVICES[@]}"; do
    name=$(echo "$service" | cut -d':' -f1)
    port=$(echo "$service" | cut -d':' -f2)
    start_service "$name" "$port"
    wait_for_service "$name" "$port"
  done
  
  log_info "启动其他服务..."
  for service in "${ALL_SERVICES[@]}"; do
    name=$(echo "$service" | cut -d':' -f1)
    port=$(echo "$service" | cut -d':' -f2)
    
    if echo "${CORE_SERVICES[@]}" | grep -q "$name:"; then
      continue
    fi
    
    start_service "$name" "$port"
  done
  
  cmd_status
}

cmd_stop() {
  log_info "⏹️ 停止所有服务"
  
  for service in "${ALL_SERVICES[@]}"; do
    name=$(echo "$service" | cut -d':' -f1)
    port=$(echo "$service" | cut -d':' -f2)
    stop_port $port
  done
  
  stop_port 8055
  
  log_success "所有服务已停止"
}

cmd_status() {
  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "              TOPEMS 服务状态                   "
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  
  echo -n "  PostgreSQL: "
  if check_port $POSTGRES_PORT; then
    echo -e "${GREEN}✅ 运行中${NC}"
  else
    echo -e "${RED}❌ 未运行${NC}"
  fi
  
  echo -n "  Redis: "
  if check_port $REDIS_PORT; then
    echo -e "${GREEN}✅ 运行中${NC}"
  else
    echo -e "${RED}❌ 未运行${NC}"
  fi
  
  echo ""
  echo "  核心服务:"
  for service in "${CORE_SERVICES[@]}"; do
    name=$(echo "$service" | cut -d':' -f1)
    port=$(echo "$service" | cut -d':' -f2)
    status_service "$name" "$port"
  done
  
  echo ""
  echo "  其他服务:"
  for service in "${ALL_SERVICES[@]}"; do
    name=$(echo "$service" | cut -d':' -f1)
    port=$(echo "$service" | cut -d':' -f2)
    
    if echo "${CORE_SERVICES[@]}" | grep -q "$name:"; then
      continue
    fi
    
    status_service "$name" "$port"
  done
  
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
}

cmd_logs() {
  if [ -z "$2" ]; then
    log_error "请指定服务名"
    echo "用法: $0 logs <服务名> [行数]"
    return 1
  fi
  
  local name=$2
  local lines=${3:-50}
  
  if [ -f "$PROJECT_ROOT/logs/$name.log" ]; then
    tail -n $lines "$PROJECT_ROOT/logs/$name.log"
  else
    log_error "日志文件不存在: logs/$name.log"
    return 1
  fi
}

cmd_help() {
  echo "TOPEMS 无Docker启动脚本"
  echo ""
  echo "前提条件:"
  echo "  1. PostgreSQL 已安装并运行在 localhost:5432"
  echo "  2. Redis 已安装并运行在 localhost:6379"
  echo "  3. 已创建数据库用户: topems/topems_secret"
  echo ""
  echo "环境变量配置（可选）:"
  echo "  POSTGRES_HOST     - PostgreSQL主机 (默认: localhost)"
  echo "  POSTGRES_PORT     - PostgreSQL端口 (默认: 5432)"
  echo "  POSTGRES_USER     - PostgreSQL用户名 (默认: topems)"
  echo "  POSTGRES_PASSWORD - PostgreSQL密码 (默认: topems_secret)"
  echo "  POSTGRES_DB       - PostgreSQL数据库名 (默认: topems)"
  echo "  REDIS_HOST        - Redis主机 (默认: localhost)"
  echo "  REDIS_PORT        - Redis端口 (默认: 6379)"
  echo ""
  echo "用法: $0 <命令> [选项]"
  echo ""
  echo "命令列表:"
  echo ""
  echo "  服务管理:"
  echo "    start           启动核心服务 (IAM, HRM, Mail, File, Doc, AI)"
  echo "    start-all       启动所有服务"
  echo "    stop            停止所有服务"
  echo "    status          查看服务状态"
  echo "    logs <服务名>   查看服务日志"
  echo ""
  echo "  帮助:"
  echo "    help            显示此帮助信息"
  echo ""
  echo "示例:"
  echo "  $0 start                    # 启动核心服务"
  echo "  $0 start-all                # 启动所有服务"
  echo "  $0 status                   # 查看服务状态"
  echo "  $0 logs hrm 100             # 查看 HRM 最近 100 行日志"
  echo "  $0 stop                     # 停止所有服务"
  echo ""
  echo "数据库初始化命令（首次使用）:"
  echo "  createdb -U postgres topems"
  echo "  createuser -U postgres topems -P"
  echo "  psql -U postgres -d topems -c \"ALTER USER topems WITH PASSWORD 'topems_secret';\""
}

# ================================================
# 主入口
# ================================================
case "${1:-help}" in
  start)
    cmd_start_core
    ;;
  start-all)
    cmd_start_all
    ;;
  stop)
    cmd_stop
    ;;
  status)
    cmd_status
    ;;
  logs)
    cmd_logs "$@"
    ;;
  help|--help|-h)
    cmd_help
    ;;
  *)
    log_error "未知命令: $1"
    cmd_help
    exit 1
    ;;
esac
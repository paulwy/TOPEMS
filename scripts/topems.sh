#!/bin/bash
# TOPEMS 统一服务管理脚本
# 用于管理 TOPEMS 所有服务的启动、停止、编译、部署等操作

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
  "pm:8002"
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

# 检查端口是否被占用
check_port() {
  local port=$1
  if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
    return 0  # 端口已被占用
  else
    return 1  # 端口可用
  fi
}

# 停止指定端口的服务
stop_port() {
  local port=$1
  local pids=$(lsof -ti:$port 2>/dev/null)
  if [ -n "$pids" ]; then
    log_info "停止端口 $port 上的进程..."
    kill -9 $pids 2>/dev/null || true
    sleep 1
  fi
}

# 等待服务启动
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
# 数据库管理
# ================================================
ensure_docker_db() {
  log_info "检查数据库服务..."
  
  # 创建网络
  if ! docker network ls | grep -q "topems-network"; then
    log_info "创建 Docker 网络..."
    docker network create topems-network >/dev/null
  fi
  
  # 检查并启动数据库容器
  cd "$PROJECT_ROOT/docker"
  
  # 确保环境变量文件存在
  if [ ! -f .env ]; then
    cat > .env << EOF
POSTGRES_USER=topems
POSTGRES_PASSWORD=topems_secret
POSTGRES_DB=topems
REDIS_PASSWORD=topems_redis_secret
TZ=UTC
PGTZ=UTC
EOF
  fi
  
  # 启动数据库服务
  if ! docker ps --format '{{.Names}}' | grep -E '^(topems-postgres|topems-redis)$' > /dev/null 2>&1; then
    log_info "启动数据库容器..."
    docker-compose up -d postgres redis
    sleep 5
  fi
  
  # 等待数据库就绪
  log_info "等待数据库就绪..."
  for i in {1..30}; do
    if docker exec topems-postgres pg_isready -U topems -d topems > /dev/null 2>&1; then
      log_success "数据库就绪"
      break
    fi
    sleep 1
  done
  
  cd "$PROJECT_ROOT"
}

# ================================================
# 服务管理
# ================================================
start_service() {
  local name=$1
  local port=$2
  
  # 检查服务目录
  local svc_dir="$PROJECT_ROOT/svc/$name"
  if [ ! -d "$svc_dir" ]; then
    log_error "服务目录不存在: $svc_dir"
    return 1
  fi
  
  # 停止旧服务
  stop_port $port
  
  # 创建日志目录
  mkdir -p "$PROJECT_ROOT/logs"
  
  # 设置环境变量
  export DATABASE_URL="postgres://topems:topems_secret@localhost:5432/topems"
  export JWT_SECRET="${JWT_SECRET:-topems-jwt-secret-key-must-be-at-least-32-characters-long-for-hs256}"
  export REFRESH_SECRET="${REFRESH_SECRET:-topems-jwt-refresh-secret-key-must-be-at-least-32-characters-long}"
  export SERVER_PORT=$port
  export RUST_LOG=info
  
  # 特殊服务配置
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
  
  # 启动服务
  log_info "启动 $name 服务 (端口 $port)..."
  cd "$svc_dir"
  cargo run --quiet 2>&1 | tee -a "$PROJECT_ROOT/logs/$name.log" &
  local pid=$!
  
  # 等待端口监听
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

build_service() {
  local name=$1
  
  local svc_dir="$PROJECT_ROOT/svc/$name"
  if [ ! -d "$svc_dir" ]; then
    log_error "服务目录不存在: $svc_dir"
    return 1
  fi
  
  log_info "编译 $name 服务..."
  cd "$svc_dir"
  
  if cargo build --release --quiet 2>&1; then
    log_success "$name 编译成功"
    cd "$PROJECT_ROOT"
    return 0
  else
    log_error "$name 编译失败"
    cd "$PROJECT_ROOT"
    return 1
  fi
}

# ================================================
# 命令处理
# ================================================

cmd_start_core() {
  log_info "🚀 启动核心服务"
  
  # 确保数据库运行
  ensure_docker_db
  
  # 启动核心服务
  for service in "${CORE_SERVICES[@]}"; do
    name=$(echo "$service" | cut -d':' -f1)
    port=$(echo "$service" | cut -d':' -f2)
    
    start_service "$name" "$port"
    wait_for_service "$name" "$port"
  done
  
  # 显示状态
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
  log_info "🚀 启动所有服务"
  
  # 确保数据库运行
  ensure_docker_db
  
  # 先启动核心服务
  log_info "启动核心服务..."
  for service in "${CORE_SERVICES[@]}"; do
    name=$(echo "$service" | cut -d':' -f1)
    port=$(echo "$service" | cut -d':' -f2)
    start_service "$name" "$port"
    wait_for_service "$name" "$port"
  done
  
  # 启动其他服务
  log_info "启动其他服务..."
  for service in "${ALL_SERVICES[@]}"; do
    name=$(echo "$service" | cut -d':' -f1)
    port=$(echo "$service" | cut -d':' -f2)
    
    # 跳过核心服务（已启动）
    if echo "${CORE_SERVICES[@]}" | grep -q "$name:"; then
      continue
    fi
    
    start_service "$name" "$port"
  done
  
  # 显示状态
  cmd_status
}

cmd_stop() {
  log_info "⏹️ 停止所有服务"
  
  # 停止所有服务
  for service in "${ALL_SERVICES[@]}"; do
    name=$(echo "$service" | cut -d':' -f1)
    port=$(echo "$service" | cut -d':' -f2)
    stop_port $port
  done
  
  # 停止 File 服务
  stop_port 8055
  
  log_success "所有服务已停止"
}

cmd_stop_db() {
  log_info "⏹️ 停止数据库容器"
  
  cd "$PROJECT_ROOT/docker"
  docker-compose down 2>/dev/null || true
  cd "$PROJECT_ROOT"
  
  log_success "数据库容器已停止"
}

cmd_status() {
  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "              TOPEMS 服务状态                   "
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  
  # 数据库状态
  echo -n "  数据库: "
  if docker ps --format '{{.Names}}' | grep -q "topems-postgres"; then
    echo -e "${GREEN}✅ 运行中${NC}"
  else
    echo -e "${RED}❌ 未运行${NC}"
  fi
  
  # 核心服务状态
  echo ""
  echo "  核心服务:"
  for service in "${CORE_SERVICES[@]}"; do
    name=$(echo "$service" | cut -d':' -f1)
    port=$(echo "$service" | cut -d':' -f2)
    status_service "$name" "$port"
  done
  
  # 其他服务状态
  echo ""
  echo "  其他服务:"
  local count=0
  for service in "${ALL_SERVICES[@]}"; do
    name=$(echo "$service" | cut -d':' -f1)
    port=$(echo "$service" | cut -d':' -f2)
    
    # 跳过核心服务
    if echo "${CORE_SERVICES[@]}" | grep -q "$name:"; then
      continue
    fi
    
    status_service "$name" "$port"
    count=$((count + 1))
  done
  
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
}

cmd_build() {
  log_info "🔨 编译服务"
  
  if [ -z "$2" ]; then
    # 编译所有服务
    log_info "编译所有服务..."
    local success=0
    local total=0
    
    for service in "${ALL_SERVICES[@]}"; do
      name=$(echo "$service" | cut -d':' -f1)
      total=$((total + 1))
      
      if build_service "$name"; then
        success=$((success + 1))
      fi
    done
    
    echo ""
    log_info "编译完成: $success/$total"
    
    if [ "$success" -ne "$total" ]; then
      exit 1
    fi
  else
    # 编译指定服务
    build_service "$2"
  fi
}

cmd_check() {
  log_info "🔍 检查服务编译状态"
  
  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "              编译检查结果                       "
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  
  local success=0
  local total=0
  
  for service in "${ALL_SERVICES[@]}"; do
    name=$(echo "$service" | cut -d':' -f1)
    total=$((total + 1))
    
    cd "$PROJECT_ROOT/svc/$name"
    if cargo check --quiet 2>&1; then
      echo -e "  ✅ $name"
      success=$((success + 1))
    else
      echo -e "  ❌ $name"
    fi
    cd "$PROJECT_ROOT"
  done
  
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  log_info "检查完成: $success/$total 服务编译通过"
  
  if [ "$success" -ne "$total" ]; then
    exit 1
  fi
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

cmd_clean() {
  log_info "🧹 清理资源"
  
  # 停止所有服务
  cmd_stop
  
  # 清理编译缓存
  log_info "清理编译缓存..."
  cargo clean 2>/dev/null || true
  
  # 清理日志
  log_info "清理日志文件..."
  rm -f "$PROJECT_ROOT/logs/"*.log 2>/dev/null || true
  
  log_success "清理完成"
}

cmd_help() {
  echo "TOPEMS 统一服务管理脚本"
  echo ""
  echo "用法: $0 <命令> [选项]"
  echo ""
  echo "命令列表:"
  echo ""
  echo "  服务管理:"
  echo "    start           启动核心服务 (IAM, HRM, Mail, File)"
  echo "    start-all       启动所有服务"
  echo "    stop            停止所有服务"
  echo "    stop-db         停止数据库容器"
  echo "    status          查看服务状态"
  echo "    logs <服务名>   查看服务日志"
  echo ""
  echo "  编译管理:"
  echo "    build [服务名]  编译服务（默认编译所有）"
  echo "    check           检查所有服务编译状态"
  echo ""
  echo "  系统管理:"
  echo "    clean           清理编译缓存和日志"
  echo "    help            显示此帮助信息"
  echo ""
  echo "示例:"
  echo "  $0 start                    # 启动核心服务"
  echo "  $0 start-all                # 启动所有服务"
  echo "  $0 status                   # 查看服务状态"
  echo "  $0 build iam                # 编译 IAM 服务"
  echo "  $0 logs hrm 100             # 查看 HRM 最近 100 行日志"
  echo "  $0 stop                     # 停止所有服务"
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
  stop-db)
    cmd_stop_db
    ;;
  status)
    cmd_status
    ;;
  build)
    cmd_build "$@"
    ;;
  check)
    cmd_check
    ;;
  logs)
    cmd_logs "$@"
    ;;
  clean)
    cmd_clean
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
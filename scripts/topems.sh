#!/bin/bash

# TOPEMS 统一启动脚本
# 特性:
# - 支持Docker和非Docker两种方案
# - 支持编译、测试、启动单一服务
# - 自动检测环境
# - 提供清晰的命令选择

set -e

# 获取项目根目录
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
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

# 服务列表
SERVICES=(
  "iam:8000"
  "notification:8004"
  "portal:8005"
  "flow:8006"
  "integration:8007"
  "erp:8010"
  "hrm:8012"
  "crm:8013"
  "rs:8020"
  "doc:8021"
  "lims:8022"
  "pdm:8023"
  "mes:8030"
  "qms:8031"
  "ehs:8032"
  "scm:8040"
  "srm:8041"
  "wms:8042"
  "file:8050"
  "mail:8051"
  "im:8052"
  "gis:8053"
  "bi:8060"
  "report:8061"
  "ai:8062"
  "mobile:8070"
)

# 检测当前使用的方案
detect_mode() {
  if docker info >/dev/null 2>&1 && docker compose version >/dev/null 2>&1; then
    echo "docker"
  else
    echo "standalone"
  fi
}

# 启动单一服务
start_single_service() {
  local name="$1"
  local port=""
  
  # 查找服务端口
  for service in "${SERVICES[@]}"; do
    s_name=$(echo "$service" | cut -d':' -f1)
    s_port=$(echo "$service" | cut -d':' -f2)
    if [ "$s_name" == "$name" ]; then
      port="$s_port"
      break
    fi
  done
  
  if [ -z "$port" ]; then
    error "未知服务: $name"
    echo "可用服务:"
    for service in "${SERVICES[@]}"; do
      echo "  - $(echo "$service" | cut -d':' -f1)"
    done
    exit 1
  fi
  
  # 检查服务目录
  if [ ! -d "$PROJECT_ROOT/svc/$name" ]; then
    error "服务目录不存在: svc/$name"
    exit 1
  fi
  
  # 清理端口
  lsof -ti ":$port" | xargs -r kill -9 2>/dev/null || true
  
  info "启动 $name 服务 (端口 $port)..."
  
  # 设置环境变量
  export DATABASE_URL="postgres://topems:topems_secret@localhost:5432/topems"
  export REDIS_URL="redis://:topems_redis_secret@localhost:6379"
  export JWT_SECRET="topems-jwt-secret-key-must-be-at-least-32-characters-long-for-hs256"
  export JWT_REFRESH_SECRET="topems-refresh-secret-key-must-be-at-least-32-characters-long-for-hs256"
  export REFRESH_SECRET="topems-refresh-secret-key-must-be-at-least-32-characters-long-for-hs256"
  export CORS_ORIGINS="http://localhost:3000,http://localhost:8000"
  export SERVER_PORT="$port"
  export RUST_LOG=info
  
  # 启动服务
  mkdir -p "$PROJECT_ROOT/logs"
  cd "$PROJECT_ROOT/svc/$name"
  cargo run --quiet > "$PROJECT_ROOT/logs/$name.log" 2>&1 &
  
  # 等待服务启动
  local attempts=0
  while [ $attempts -lt 30 ]; do
    if curl -s "http://localhost:$port/health" >/dev/null 2>&1; then
      success "$name 服务启动成功"
      echo "访问地址: http://localhost:$port"
      return
    fi
    attempts=$((attempts + 1))
    sleep 1
  done
  
  warning "$name 服务启动超时"
  echo "查看日志: tail -f $PROJECT_ROOT/logs/$name.log"
}

# 停止单一服务
stop_single_service() {
  local name="$1"
  local port=""
  
  # 查找服务端口
  for service in "${SERVICES[@]}"; do
    s_name=$(echo "$service" | cut -d':' -f1)
    s_port=$(echo "$service" | cut -d':' -f2)
    if [ "$s_name" == "$name" ]; then
      port="$s_port"
      break
    fi
  done
  
  if [ -z "$port" ]; then
    error "未知服务: $name"
    exit 1
  fi
  
  info "停止 $name 服务..."
  lsof -ti ":$port" | xargs -r kill -9 2>/dev/null || true
  success "$name 服务已停止"
}

# 重启单一服务
restart_single_service() {
  local name="$1"
  
  info "重启 $name 服务..."
  stop_single_service "$name"
  sleep 2
  start_single_service "$name"
}

# 查看服务日志
view_logs() {
  local name="$1"
  local lines="${2:-100}"
  
  mkdir -p "$PROJECT_ROOT/logs"
  
  if [ -z "$name" ]; then
    info "查看所有服务日志..."
    for service in "${SERVICES[@]}"; do
      s_name=$(echo "$service" | cut -d':' -f1)
      log_file="$PROJECT_ROOT/logs/$s_name.log"
      if [ -f "$log_file" ]; then
        echo ""
        echo "=== $s_name ==="
        tail -n "$lines" "$log_file"
      fi
    done
    return
  fi
  
  # 检查服务是否存在
  local found=0
  for service in "${SERVICES[@]}"; do
    s_name=$(echo "$service" | cut -d':' -f1)
    if [ "$s_name" == "$name" ]; then
      found=1
      break
    fi
  done
  
  if [ $found -eq 0 ]; then
    error "未知服务: $name"
    exit 1
  fi
  
  log_file="$PROJECT_ROOT/logs/$name.log"
  if [ -f "$log_file" ]; then
    info "查看 $name 服务日志 (最近 $lines 行)..."
    tail -n "$lines" "$log_file"
    echo ""
    echo "实时查看日志: tail -f $log_file"
  else
    warning "日志文件不存在: $log_file"
  fi
}

# 环境变量管理
manage_env() {
  local action="$1"
  
  case "$action" in
    show)
      info "当前环境变量配置:"
      echo ""
      echo "数据库连接:"
      echo "  DATABASE_URL: ${DATABASE_URL:-postgres://topems:topems_secret@localhost:5432/topems}"
      echo ""
      echo "Redis连接:"
      echo "  REDIS_URL: ${REDIS_URL:-redis://:topems_redis_secret@localhost:6379}"
      echo ""
      echo "安全配置:"
      echo "  JWT_SECRET: ${JWT_SECRET:-topems-jwt-secret-key-must-be-at-least-32-characters-long-for-hs256}"
      echo ""
      echo "服务配置:"
      echo "  CORS_ORIGINS: ${CORS_ORIGINS:-http://localhost:3000,http://localhost:8000}"
      echo "  RUST_LOG: ${RUST_LOG:-info}"
      ;;
    export)
      info "导出环境变量到文件..."
      local env_file="${2:-.env}"
      cat > "$env_file" << EOF
# TOPEMS 环境变量配置
DATABASE_URL=postgres://topems:topems_secret@localhost:5432/topems
REDIS_URL=redis://:topems_redis_secret@localhost:6379
JWT_SECRET=topems-jwt-secret-key-must-be-at-least-32-characters-long-for-hs256
CORS_ORIGINS=http://localhost:3000,http://localhost:8000
RUST_LOG=info
EOF
      success "环境变量已导出到 $env_file"
      ;;
    load)
      local env_file="${2:-.env}"
      if [ -f "$env_file" ]; then
        info "从 $env_file 加载环境变量..."
        export $(cat "$env_file" | grep -v '^#' | xargs)
        success "环境变量加载完成"
      else
        error "文件不存在: $env_file"
        exit 1
      fi
      ;;
    *)
      error "未知操作: $action"
      echo "可用操作: show, export, load"
      exit 1
      ;;
  esac
}

# 编译服务
build_service() {
  local name="$1"
  
  if [ -z "$name" ]; then
    # 编译所有服务
    info "编译所有服务..."
    cargo build --workspace --release
    success "所有服务编译完成"
    return
  fi
  
  # 编译单一服务
  if [ ! -d "$PROJECT_ROOT/svc/$name" ]; then
    error "服务目录不存在: svc/$name"
    exit 1
  fi
  
  info "编译 $name 服务..."
  cargo build --manifest-path "svc/$name/Cargo.toml" --release
  
  if [ $? -eq 0 ]; then
    success "$name 服务编译完成"
  else
    error "$name 服务编译失败"
    exit 1
  fi
}

# 运行测试
run_tests() {
  local type="$1"
  
  case "$type" in
    all)
      info "运行完整测试套件..."
      bash "$SCRIPT_DIR/run-tests.sh" all
      ;;
    unit)
      info "运行单元测试..."
      bash "$SCRIPT_DIR/run-tests.sh" unit
      ;;
    integration)
      info "运行集成测试..."
      bash "$SCRIPT_DIR/run-tests.sh" integration
      ;;
    coverage)
      info "生成测试覆盖率报告..."
      bash "$SCRIPT_DIR/run-tests.sh" coverage
      ;;
    lint)
      info "运行静态分析..."
      bash "$SCRIPT_DIR/run-tests.sh" lint
      ;;
    *)
      error "未知测试类型: $type"
      echo "可用测试类型: all, unit, integration, coverage, lint"
      exit 1
      ;;
  esac
}

# 显示服务列表
list_services() {
  echo "可用服务列表:"
  echo ""
  echo "核心服务:"
  for service in "${SERVICES[@]}"; do
    name=$(echo "$service" | cut -d':' -f1)
    port=$(echo "$service" | cut -d':' -f2)
    
    if [[ "iam notification portal flow integration" == *"$name"* ]]; then
      echo "  - $name ($port)"
    fi
  done
  
  echo ""
  echo "ERP服务:"
  for service in "${SERVICES[@]}"; do
    name=$(echo "$service" | cut -d':' -f1)
    port=$(echo "$service" | cut -d':' -f2)
    
    if [[ "erp hrm crm" == *"$name"* ]]; then
      echo "  - $name ($port)"
    fi
  done
  
  echo ""
  echo "PLM服务:"
  for service in "${SERVICES[@]}"; do
    name=$(echo "$service" | cut -d':' -f1)
    port=$(echo "$service" | cut -d':' -f2)
    
    if [[ "rs doc lims pdm" == *"$name"* ]]; then
      echo "  - $name ($port)"
    fi
  done
  
  echo ""
  echo "其他服务:"
  for service in "${SERVICES[@]}"; do
    name=$(echo "$service" | cut -d':' -f1)
    port=$(echo "$service" | cut -d':' -f2)
    
    if [[ "iam notification portal flow integration erp hrm crm rs doc lims pdm" != *"$name"* ]]; then
      echo "  - $name ($port)"
    fi
  done
}

# 显示帮助信息
show_help() {
  echo "TOPEMS 统一启动脚本"
  echo ""
  echo "使用方法: $0 <命令> [参数]"
  echo ""
  echo "=== 服务管理 ==="
  echo "  start           - 启动所有服务（自动检测方案）"
  echo "  start-docker    - 使用Docker方案启动"
  echo "  start-standalone - 使用非Docker方案启动"
  echo "  start-service <服务名> - 启动单一服务"
  echo "  stop            - 停止所有服务"
  echo "  stop-service <服务名> - 停止单一服务"
  echo "  restart-service <服务名> - 重启单一服务"
  echo "  logs            - 查看所有服务日志"
  echo "  logs <服务名>   - 查看指定服务日志"
  echo "  status          - 查看服务状态"
  echo "  list            - 列出所有服务"
  echo ""
  echo "=== 编译构建 ==="
  echo "  build           - 编译所有服务"
  echo "  build <服务名>  - 编译单一服务"
  echo ""
  echo "=== 测试 ==="
  echo "  test            - 运行所有测试"
  echo "  test unit       - 运行单元测试"
  echo "  test integration - 运行集成测试"
  echo "  test coverage   - 生成覆盖率报告"
  echo "  test lint       - 运行静态分析"
  echo ""
  echo "=== AI模型管理 ==="
  echo "  ai <命令>       - AI模型管理（start/stop/pull/test等）"
  echo ""
  echo "=== 依赖安装 ==="
  echo "  install         - 安装依赖（非Docker方案）"
  echo "  install-db      - 仅安装数据库"
  echo "  install-dev     - 仅安装开发环境"
  echo ""
  echo "=== 环境变量管理 ==="
  echo "  env show        - 显示当前环境变量"
  echo "  env export      - 导出环境变量到文件"
  echo "  env load        - 从文件加载环境变量"
  echo ""
  echo "=== 帮助 ==="
  echo "  help            - 显示此帮助信息"
  echo ""
  echo "方案对比:"
  echo "  Docker方案:      一键启动，环境隔离，资源占用中等"
  echo "  非Docker方案:    资源占用低，需要手动安装依赖"
}

# 主入口
case "$1" in
  start)
    mode=$(detect_mode)
    info "检测到环境: $mode"
    if [ "$mode" == "docker" ]; then
      "$SCRIPT_DIR/docker/topems-docker.sh" start
    else
      "$SCRIPT_DIR/standalone/topems-standalone.sh" start
    fi
    ;;
  start-docker)
    "$SCRIPT_DIR/docker/topems-docker.sh" start
    ;;
  start-standalone)
    "$SCRIPT_DIR/standalone/topems-standalone.sh" start
    ;;
  start-service)
    if [ -z "$2" ]; then
      error "请指定服务名"
      list_services
      exit 1
    fi
    start_single_service "$2"
    ;;
  stop)
    mode=$(detect_mode)
    if [ "$mode" == "docker" ]; then
      "$SCRIPT_DIR/docker/topems-docker.sh" stop
    else
      "$SCRIPT_DIR/standalone/topems-standalone.sh" stop
    fi
    ;;
  stop-service)
    if [ -z "$2" ]; then
      error "请指定服务名"
      exit 1
    fi
    stop_single_service "$2"
    ;;
  restart-service)
    if [ -z "$2" ]; then
      error "请指定服务名"
      list_services
      exit 1
    fi
    restart_single_service "$2"
    ;;
  logs)
    view_logs "$2" "$3"
    ;;
  status)
    mode=$(detect_mode)
    if [ "$mode" == "docker" ]; then
      "$SCRIPT_DIR/docker/topems-docker.sh" status
    else
      "$SCRIPT_DIR/standalone/topems-standalone.sh" status
    fi
    ;;
  list)
    list_services
    ;;
  build)
    build_service "$2"
    ;;
  test)
    run_tests "${2:-all}"
    ;;
  ai)
    shift
    "$SCRIPT_DIR/standalone/ai-models.sh" "$@"
    ;;
  install)
    "$SCRIPT_DIR/standalone/install-deps.sh" all
    ;;
  install-db)
    "$SCRIPT_DIR/standalone/install-deps.sh" db
    ;;
  install-dev)
    "$SCRIPT_DIR/standalone/install-deps.sh" dev
    ;;
  env)
    if [ -z "$2" ]; then
      error "请指定操作: show, export, load"
      exit 1
    fi
    manage_env "$2" "$3"
    ;;
  help)
    show_help
    ;;
  *)
    show_help
    exit 1
    ;;
esac
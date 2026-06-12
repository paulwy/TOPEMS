#!/bin/bash

# TOPEMS 统一启动脚本
# 特性:
# - 支持Docker和非Docker两种方案
# - 支持编译、测试、启动单一服务
# - 自动检测环境
# - 提供清晰的命令选择
# - 支持从任意目录调用

set -e

# =============================================
# 自动检测脚本自身位置
# =============================================
# 获取脚本的真实绝对路径（兼容被其他脚本调用的情况）
resolve_script_path() {
    local source="${BASH_SOURCE[0]}"
    local cwd="${PWD}"
    
    # 如果是相对路径，尝试多种方式解析
    if [[ "$source" != /* ]]; then
        # 方式1: 从当前工作目录解析
        local full_path="$cwd/$source"
        if [[ -f "$full_path" ]]; then
            echo "$(cd "$(dirname "$full_path")" && pwd)/$(basename "$full_path")"
            return
        fi
        
        # 方式2: 从脚本所在目录解析（基于调用链）
        local resolved=""
        # 检查常见的脚本位置
        local common_paths=(
            "$cwd/../scripts/topems.sh"
            "$cwd/../../scripts/topems.sh"
            "$cwd/../../../scripts/topems.sh"
        )
        for path in "${common_paths[@]}"; do
            local resolved_path="$(cd "$(dirname "$path")" 2>/dev/null && pwd)/$(basename "$path")"
            if [[ -f "$resolved_path" ]]; then
                echo "$resolved_path"
                return
            fi
        done
        
        # 方式3: 向上搜索 scripts 目录
        local search_dir="$cwd"
        for i in {1..5}; do
            if [[ -f "$search_dir/scripts/topems.sh" ]]; then
                echo "$search_dir/scripts/topems.sh"
                return
            fi
            search_dir="$(dirname "$search_dir")"
        done
    fi
    
    # 如果已经是绝对路径
    if [[ -f "$source" ]]; then
        echo "$source"
        return
    fi
    
    echo "$source"
}

# 获取项目根目录
SCRIPT_PATH="$(resolve_script_path)"
SCRIPT_DIR="$(dirname "$SCRIPT_PATH")"
PROJECT_ROOT="$SCRIPT_DIR"

# 向上查找包含 Cargo.toml 的目录作为项目根目录
while [[ "$PROJECT_ROOT" != "/" && "$PROJECT_ROOT" != "" ]]; do
    if [[ -f "$PROJECT_ROOT/Cargo.toml" ]]; then
        break
    fi
    PROJECT_ROOT="$(dirname "$PROJECT_ROOT")"
done

# 如果没找到，回退到脚本所在目录的上级目录
if [[ ! -f "$PROJECT_ROOT/Cargo.toml" ]]; then
    PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
fi

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

# 服务列表 (按端口规划 v3.0 - 避开8021端口)
SERVICES=(
  # 核心服务 (8000-8009)
  "iam:8000"
  "pm:8001"
  "notification:8002"
  "portal:8003"
  "flow:8004"
  "integration:8005"
  # ERP/财务 (8010-8019)
  "erp:8010"
  "hrm:8011"
  "crm:8012"
  # PLM/研发 (8020-8029 - 避开8021)
  "rs:8020"
  "lims:8022"
  "pdm:8023"
  "doc:8024"
  # MES/生产 (8030-8039)
  "mes:8030"
  "qms:8031"
  "ehs:8032"
  # SCM/供应链 (8040-8049)
  "scm:8040"
  "srm:8041"
  "wms:8042"
  # 基础设施 (8050-8059)
  "file:8050"
  "mail:8051"
  "im:8052"
  "gis:8053"
  # 数据分析 (8060-8069)
  "bi:8060"
  "report:8061"
  "ai:8062"
  # 扩展服务 (8070-8079)
  "mobile:8070"
)

# 检测当前使用的方案
# 默认使用非Docker方案（无外网环境）
detect_mode() {
  echo "local"
}

# 设置环境变量
set_env_vars() {
  export DATABASE_URL="postgres://topems:topems_secret@localhost:5432/topems"
  export REDIS_URL="redis://:topems_redis_secret@localhost:6379"
  export JWT_SECRET="topems-jwt-secret-key-must-be-at-least-32-characters-long-for-hs256"
  export JWT_REFRESH_SECRET="topems-refresh-secret-key-must-be-at-least-32-characters-long"
  export REFRESH_SECRET="topems-refresh-secret-key-must-be-at-least-32-characters-long"
  export CORS_ORIGINS="http://localhost:3000,http://localhost:8000"
  export RUST_LOG=info
}

# 启动前端
start_frontend() {
  info "启动前端服务..."
  
  # 检查前端目录
  if [ ! -d "$PROJECT_ROOT/apps/web" ]; then
    warning "前端目录不存在: apps/web"
    return 1
  fi
  
  # 检查端口是否被占用
  if lsof -ti ":3000" >/dev/null 2>&1; then
    # 检查是否是vite进程
    if pgrep -f "node.*vite" >/dev/null 2>&1 || pgrep -f "vite.*apps/web" >/dev/null 2>&1; then
      success "前端服务已在运行 (端口 3000)"
      return 0
    else
      warning "端口 3000 被其他进程占用，跳过前端启动"
      return 0
    fi
  fi
  
  # 检查 node_modules
  if [ ! -d "$PROJECT_ROOT/apps/web/node_modules" ]; then
    info "安装前端依赖..."
    cd "$PROJECT_ROOT/apps/web"
    npm install >/dev/null 2>&1 || {
      error "前端依赖安装失败"
      return 1
    }
  fi
  
  # 启动前端
  cd "$PROJECT_ROOT/apps/web"
  nohup npm run dev > "$PROJECT_ROOT/logs/frontend.log" 2>&1 &
  
  # 等待启动
  for i in {1..20}; do
    if curl -s -o /dev/null -w "%{http_code}" http://localhost:3000 | grep -q "200"; then
      success "前端服务启动成功 (端口 3000)"
      return 0
    fi
    sleep 1
  done
  
  warning "前端服务可能启动中，请检查 logs/frontend.log"
  return 0
}

# 停止前端
stop_frontend() {
  info "停止前端服务..."
  pkill -f "vite.*apps/web" >/dev/null 2>&1 || true
  lsof -ti ":3000" | xargs -r kill -9 2>/dev/null || true
  success "前端服务已停止"
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
  set_env_vars
  export SERVER_PORT="$port"
  
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
  
  # 核心服务 (8000-8009)
  echo "核心服务:"
  for service in "${SERVICES[@]}"; do
    name=$(echo "$service" | cut -d':' -f1)
    port=$(echo "$service" | cut -d':' -f2)
    if [[ "$port" -ge 8000 && "$port" -le 8009 ]]; then
      echo "  - $name ($port)"
    fi
  done
  
  # ERP/财务 (8010-8019)
  echo ""
  echo "ERP服务:"
  for service in "${SERVICES[@]}"; do
    name=$(echo "$service" | cut -d':' -f1)
    port=$(echo "$service" | cut -d':' -f2)
    if [[ "$port" -ge 8010 && "$port" -le 8019 ]]; then
      echo "  - $name ($port)"
    fi
  done
  
  # PLM/研发 (8020-8029)
  echo ""
  echo "PLM服务:"
  for service in "${SERVICES[@]}"; do
    name=$(echo "$service" | cut -d':' -f1)
    port=$(echo "$service" | cut -d':' -f2)
    if [[ "$port" -ge 8020 && "$port" -le 8029 ]]; then
      echo "  - $name ($port)"
    fi
  done
  
  # MES/生产 (8030-8039)
  echo ""
  echo "MES服务:"
  for service in "${SERVICES[@]}"; do
    name=$(echo "$service" | cut -d':' -f1)
    port=$(echo "$service" | cut -d':' -f2)
    if [[ "$port" -ge 8030 && "$port" -le 8039 ]]; then
      echo "  - $name ($port)"
    fi
  done
  
  # SCM/供应链 (8040-8049)
  echo ""
  echo "SCM服务:"
  for service in "${SERVICES[@]}"; do
    name=$(echo "$service" | cut -d':' -f1)
    port=$(echo "$service" | cut -d':' -f2)
    if [[ "$port" -ge 8040 && "$port" -le 8049 ]]; then
      echo "  - $name ($port)"
    fi
  done
  
  # 基础设施 (8050-8059)
  echo ""
  echo "基础设施服务:"
  for service in "${SERVICES[@]}"; do
    name=$(echo "$service" | cut -d':' -f1)
    port=$(echo "$service" | cut -d':' -f2)
    if [[ "$port" -ge 8050 && "$port" -le 8059 ]]; then
      echo "  - $name ($port)"
    fi
  done
  
  # 数据分析 (8060-8069)
  echo ""
  echo "数据分析服务:"
  for service in "${SERVICES[@]}"; do
    name=$(echo "$service" | cut -d':' -f1)
    port=$(echo "$service" | cut -d':' -f2)
    if [[ "$port" -ge 8060 && "$port" -le 8069 ]]; then
      echo "  - $name ($port)"
    fi
  done
  
  # 扩展服务 (8070-8079)
  echo ""
  echo "扩展服务:"
  for service in "${SERVICES[@]}"; do
    name=$(echo "$service" | cut -d':' -f1)
    port=$(echo "$service" | cut -d':' -f2)
    if [[ "$port" -ge 8070 && "$port" -le 8079 ]]; then
      echo "  - $name ($port)"
    fi
  done
}

# 启动核心服务（优化：仅启动必要服务）
start_core_services() {
  local release_mode="${1:-false}"
  
  info "启动核心服务（优化模式）..."
  echo ""
  echo "核心服务: iam, pm, notification, portal, flow, integration"
  echo "预计内存占用: ~200 MB"
  echo ""
  
  # 核心服务列表（端口规划 v4.0）
  local core_services=("iam:8000" "pm:8001" "notification:8002" "portal:8003" "flow:8004" "integration:8005")
  
  # 设置环境变量
  set_env_vars
  
  for service in "${core_services[@]}"; do
    local name=$(echo "$service" | cut -d':' -f1)
    local port=$(echo "$service" | cut -d':' -f2)
    
    if lsof -i ":$port" >/dev/null 2>&1; then
      warning "$name 已在端口 $port 运行"
    else
      if [ "$release_mode" == "true" ]; then
        "$SCRIPT_DIR/topems-standalone.sh" start-service "$name" "$port" release
      else
        "$SCRIPT_DIR/topems-standalone.sh" start-service "$name" "$port"
      fi
    fi
  done
  
  echo ""
  success "核心服务启动完成"
  echo ""
  echo "访问地址:"
  echo "  - Portal: http://localhost:8003"
  echo "  - IAM API: http://localhost:8000"
  echo "  - Notification API: http://localhost:8002"
  echo "  - PM API: http://localhost:8001"
  echo "  - Flow API: http://localhost:8004"
  echo "  - Integration API: http://localhost:8005"
}

# 启动模块服务
start_module_services() {
  local module="$1"
  local release_mode="${2:-false}"
  local services=""
  
  case "$module" in
    core)
      services="iam:8000 pm:8001 notification:8002 portal:8003 flow:8004 integration:8005"
      ;;
    erp)
      services="erp:8010 hrm:8011 crm:8012"
      ;;
    plm)
      services="rs:8020 lims:8022 pdm:8023 doc:8024"
      ;;
    mes)
      services="mes:8030 qms:8031 ehs:8032"
      ;;
    scm)
      services="scm:8040 srm:8041 wms:8042"
      ;;
    infra)
      services="file:8050 mail:8051 im:8052 gis:8053"
      ;;
    analytics)
      services="bi:8060 report:8061 ai:8062"
      ;;
    *)
      error "未知模块: $module"
      echo "可用模块: core, erp, plm, mes, scm, infra, analytics"
      exit 1
      ;;
  esac
  
  info "启动 $module 模块服务..."
  echo ""
  echo "服务列表: $services"
  echo ""
  
  set_env_vars
  
  local service_array=($services)
  
  for service in "${service_array[@]}"; do
    local name=$(echo "$service" | cut -d':' -f1)
    local port=$(echo "$service" | cut -d':' -f2)
    
    if lsof -i ":$port" >/dev/null 2>&1; then
      warning "$name 已在端口 $port 运行"
      continue
    fi
    
    info "启动 $name 服务..."
    mkdir -p "$PROJECT_ROOT/logs"
    
    if [ "$release_mode" == "true" ]; then
      cargo run --release --manifest-path "svc/$name/Cargo.toml" > "$PROJECT_ROOT/logs/$name.log" 2>&1 &
    else
      cargo run --manifest-path "svc/$name/Cargo.toml" > "$PROJECT_ROOT/logs/$name.log" 2>&1 &
    fi
    
    sleep 1
  done
  
  echo ""
  success "$module 模块服务启动完成"
}

# 构建服务
build_service() {
  local service_name="${1:-all}"
  
  info "编译服务..."
  
  if [ "$service_name" == "all" ]; then
    info "编译所有服务（Release模式）..."
    cargo build --workspace --release
  elif [ -d "svc/$service_name" ]; then
    info "编译 $service_name 服务..."
    cargo build --release --manifest-path "svc/$service_name/Cargo.toml"
  else
    error "服务 $service_name 不存在"
    exit 1
  fi
  
  success "编译完成"
}

# 运行测试
run_tests() {
  local test_type="${1:-all}"
  
  info "运行测试..."
  
  case "$test_type" in
    all)
      info "运行完整测试套件..."
      cargo test --workspace
      ;;
    unit)
      info "运行单元测试..."
      cargo test --workspace --test '*_unit*'
      ;;
    integration)
      info "运行集成测试..."
      cargo test --workspace --test '*_integration*'
      ;;
    coverage)
      info "生成测试覆盖率报告..."
      cargo llvm-cov run --workspace
      cargo llvm-cov report --lcov --output-path lcov.info
      ;;
    lint)
      info "运行静态分析..."
      cargo clippy --workspace -- -D warnings
      ;;
    *)
      error "未知测试类型: $test_type"
      echo "可用类型: all, unit, integration, coverage, lint"
      exit 1
      ;;
  esac
  
  if [ $? -eq 0 ]; then
    success "测试完成"
  else
    error "测试失败"
    exit 1
  fi
}

# 显示帮助信息
show_help() {
  echo "TOPEMS 统一启动脚本"
  echo ""
  echo "使用方法: $0 <命令> [参数]"
  echo ""
  echo "=== 服务管理 ==="
  echo "  start           - 启动所有服务（后端+前端，无需Docker）"
  echo "  start-core      - 启动核心服务+前端（推荐开发环境）"
  echo "  start-module <模块> - 启动指定模块+前端"
  echo "  start-service <服务> - 启动单一服务"
  echo "  start-frontend  - 仅启动前端服务"
  echo "  start-docker    - 使用Docker模式（需要Docker环境）"
  echo ""
  echo "=== 停止服务 ==="
  echo "  stop            - 停止所有后端服务"
  echo "  stop-frontend   - 停止前端服务"
  echo "  stop-service <服务名> - 停止单一服务"
  echo "  restart-service <服务名> - 重启单一服务"
  echo ""
  echo "=== 日志与状态 ==="
  echo "  logs            - 查看所有服务日志"
  echo "  logs <服务名>   - 查看指定服务日志"
  echo "  status          - 查看服务状态"
  echo "  list            - 列出所有服务"
  echo ""
  echo "=== 编译构建 ==="
  echo "  build           - 编译所有服务（Release模式）"
  echo "  build <服务名>  - 编译单一服务"
  echo "  build-debug     - 编译所有服务（Debug模式）"
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
  echo "  install         - 安装依赖（本地模式）"
  echo "  install-db      - 仅安装数据库"
  echo "  install-dev     - 仅安装开发环境"
  echo "  setup-db        - 初始化数据库（启动PostgreSQL+创建用户+运行迁移）"
  echo ""
  echo "=== 环境变量管理 ==="
  echo "  env show        - 显示当前环境变量"
  echo "  env export      - 导出环境变量到文件"
  echo "  env load        - 从文件加载环境变量"
  echo ""
  echo "=== 帮助 ==="
  echo "  help            - 显示此帮助信息"
  echo ""
  echo "启动模式说明:"
  echo "  ★ 本地模式（缺省）: 直接运行服务进程，资源占用低，适合开发/内网环境"
  echo "    命令: start, start-core, start-module, start-local"
  echo ""
  echo "  ◆ Docker模式: 容器化部署，环境隔离，需要外网下载镜像"
  echo "    命令: start-docker"
  echo ""
  echo "优化建议:"
  echo "  开发环境: 使用 start-core 或 start-module 仅启动需要的服务"
  echo "  内网环境: 使用 start-local 强制本地模式"
  echo "  生产环境: 使用 build 编译 Release 版本"
}

# 主入口
case "$1" in
  setup-db)
    info "初始化数据库..."
    "$SCRIPT_DIR/setup-db.sh"
    ;;
  start)
    mode=$(detect_mode)
    info "检测到环境: $mode"
    # 启动后端服务
    if [ "$mode" == "docker" ]; then
      "$SCRIPT_DIR/docker/topems-docker.sh" start
    else
      "$SCRIPT_DIR/topems-standalone.sh" start
    fi
    # 启动前端
    start_frontend
    ;;
  start-frontend)
    start_frontend
    ;;
  stop-frontend)
    stop_frontend
    ;;
  start-docker)
    "$SCRIPT_DIR/docker/topems-docker.sh" start
    ;;
  start-local)
    "$SCRIPT_DIR/topems-standalone.sh" start
    ;;
  start-core)
    start_core_services "$2"
    start_frontend
    ;;
  start-module)
    if [ -z "$2" ]; then
      error "请指定模块名"
      echo "可用模块: core, erp, plm, mes, scm, infra, analytics"
      exit 1
    fi
    start_module_services "$2" "$3"
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
      "$SCRIPT_DIR/topems-standalone.sh" stop
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
      "$SCRIPT_DIR/topems-standalone.sh" status
    fi
    ;;
  list)
    list_services
    ;;
  build)
    build_service "$2"
    ;;
  build-debug)
    info "编译所有服务（Debug模式）..."
    cargo build --workspace
    success "所有服务编译完成（Debug模式）"
    ;;
  test)
    run_tests "${2:-all}"
    ;;
  ai)
    shift
    "$SCRIPT_DIR/ai-models.sh" "$@"
    ;;
  install)
    "$SCRIPT_DIR/install-deps.sh" all
    ;;
  install-db)
    "$SCRIPT_DIR/install-deps.sh" db
    ;;
  install-dev)
    "$SCRIPT_DIR/install-deps.sh" dev
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
#!/bin/bash
# shellcheck disable=SC2034
# =============================================
# TOPEMS 本地一键启动脚本（默认部署方式）
# =============================================
# 用法：
#   ./scripts/start-local.sh              # 启动全部（前端 + 后端）
#   ./scripts/start-local.sh frontend     # 仅启动前端
#   ./scripts/start-local.sh backend      # 仅启动后端
#   ./scripts/start-local.sh db           # 启动本地数据库（macOS）
#   ./scripts/start-local.sh install      # 安装所有依赖
#   ./scripts/start-local.sh stop         # 停止所有服务
#   ./scripts/start-local.sh status       # 查看服务状态

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$(dirname "$SCRIPT_DIR")")"
cd "$PROJECT_ROOT"

# 颜色
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

info()    { echo -e "${BLUE}[INFO]${NC} $1"; }
success() { echo -e "${GREEN}[✓]${NC} $1"; }
warn()    { echo -e "${YELLOW}[!]${NC} $1"; }
error()   { echo -e "${RED}[✗]${NC} $1"; }

# =================================================
# 加载 .env（如果存在）
# =================================================
if [ -f "$PROJECT_ROOT/.env" ]; then
  set -a
  # shellcheck disable=SC1091
  source "$PROJECT_ROOT/.env"
  set +a
  info "已加载 .env"
else
  warn "未找到 .env，使用默认配置（.env.example 可作为参考）"
fi

# =================================================
# 工具函数
# =================================================
check_command() {
  if ! command -v "$1" >/dev/null 2>&1; then
    error "未找到命令: $1。请先安装 $2"
    return 1
  fi
}

check_port() { lsof -Pi ":$1" -sTCP:LISTEN -t >/dev/null 2>&1; }

# =================================================
# 数据库连接健康检查
# =================================================
check_db_health() {
  local max_connections=100
  local warning_threshold=80
  local critical_threshold=95
  
  if ! command -v psql >/dev/null 2>&1; then
    return 0
  fi

  local current_connections
  current_connections=$(psql -h localhost -p 5432 -U topems -d topems -t -A -c "SELECT count(*) FROM pg_stat_activity;" 2>/dev/null)
  
  if [ -z "$current_connections" ]; then
    warn "无法连接到 PostgreSQL，跳过连接检查"
    return 0
  fi

  local current_max
  current_max=$(psql -h localhost -p 5432 -U topems -d topems -t -A -c "SHOW max_connections;" 2>/dev/null)
  current_max=${current_max:-$max_connections}

  local usage_percent=$((current_connections * 100 / current_max))

  info "数据库连接状态: ${current_connections}/${current_max} (${usage_percent}%)"

  if [ "$current_connections" -ge "$critical_threshold" ]; then
    error "数据库连接数接近或已达上限 (${current_connections}/${current_max})！"
    warn "自动终止空闲连接以恢复可用连接..."
    
    local idle_connections
    idle_connections=$(psql -h localhost -p 5432 -U topems -d topems -t -A -c "
      SELECT count(*) FROM pg_stat_activity WHERE state = 'idle' AND pid <> pg_backend_pid();
    " 2>/dev/null)
    
    if [ -n "$idle_connections" ] && [ "$idle_connections" -gt 0 ]; then
      psql -h localhost -p 5432 -U topems -d topems -c "
        SELECT pg_terminate_backend(pid) 
        FROM pg_stat_activity 
        WHERE state = 'idle' AND pid <> pg_backend_pid();
      " >/dev/null 2>&1
      success "已终止 ${idle_connections} 个空闲连接"
    fi
    
    success "建议: 考虑增加 max_connections 或检查服务连接配置"
  elif [ "$current_connections" -ge "$warning_threshold" ]; then
    warn "数据库连接数较高 (${current_connections}/${current_max})，注意可能的连接泄漏"
  fi
}

# =================================================
# 步骤 1：环境检查
# =================================================
check_env() {
  info "检查环境依赖..."
  local missing=0

  check_command "node"      "Node.js 18+"   || missing=1
  check_command "pnpm"      "pnpm 8+"       || missing=1
  check_command "cargo"     "Rust 1.76+"    || missing=1
  check_command "psql"      "PostgreSQL 16+" || warn "psql 未找到，将使用 pg_isready 检查"
  check_command "redis-cli" "Redis 7+"      || warn "redis-cli 未找到，可选"

  if [ "$missing" -eq 1 ]; then
    error "缺少必要依赖，请先安装后再运行"
    exit 1
  fi

  success "环境检查通过"
}

# =================================================
# 步骤 2：本地数据库（macOS Homebrew）
# =================================================
start_db() {
  info "启动本地数据库 (PostgreSQL & Redis)..."

  if check_port 5432; then
    success "PostgreSQL (5432) 已在运行"
  else
    if command -v brew >/dev/null 2>&1; then
      info "使用 Homebrew 启动 PostgreSQL..."
      brew services start postgresql@16 2>/dev/null || brew services start postgresql 2>/dev/null || warn "无法启动 PostgreSQL，请手动启动"
    else
      warn "未安装 Homebrew，请手动启动 PostgreSQL"
    fi
  fi

  if check_port 6379; then
    success "Redis (6379) 已在运行"
  else
    if command -v brew >/dev/null 2>&1; then
      info "使用 Homebrew 启动 Redis..."
      brew services start redis 2>/dev/null || warn "无法启动 Redis，请手动启动"
    fi
  fi

  # 创建数据库（如果不存在）
  if command -v createdb >/dev/null 2>&1; then
    if ! psql -U postgres -lqt 2>/dev/null | cut -d \| -f 1 | grep -qw topems; then
      info "创建 topems 数据库..."
      createdb topems 2>/dev/null || warn "无法自动创建 topems 数据库（可能已存在或权限不足）"
    else
      success "topems 数据库已存在"
    fi
  fi

  # 检查数据库连接健康状态
  sleep 2
  check_db_health
}

# =================================================
# 步骤 3：安装依赖
# =================================================
install_deps() {
  info "安装依赖..."
  if [ ! -d "$PROJECT_ROOT/node_modules" ]; then
    info "安装 npm 依赖（pnpm workspace）..."
    pnpm install
  else
    success "npm 依赖已安装"
  fi

  if [ ! -d "$PROJECT_ROOT/apps/web/node_modules" ]; then
    pnpm install
  fi

  # Cargo workspace 检查（只编译核心服务）
  if [ ! -f "$PROJECT_ROOT/target/release/topems-unified-core" ]; then
    info "编译 Rust 核心服务（首次会需要较长时间）..."
    (cd "$PROJECT_ROOT" && SQLX_OFFLINE=true cargo build --release --bin topems-unified-core 2>&1) || warn "Rust 编译失败，请检查 Rust 工具链"
  else
    success "Rust 核心服务已编译"
  fi
}

# =================================================
# 步骤 4：启动后端
# =================================================
start_backend() {
  local mode="${1:-standalone}"

  if [ "$mode" = "monolith" ]; then
    info "启动后端 (模块化单体, 端口 8099)..."

    if check_port 8099; then
      success "topems-server (8099) 已在运行"
      return 0
    fi

    if [ -x "$PROJECT_ROOT/scripts/run_monolith.sh" ]; then
      "$PROJECT_ROOT/scripts/run_monolith.sh" &
      success "模块化单体后端启动完成 (PID: $!)"
      info "等待服务启动 (约 3 分钟)..."
    else
      warn "未找到 scripts/run_monolith.sh，跳过后端启动"
    fi
  else
    info "启动后端 (unified-core, 端口 8000)..."

    if check_port 8000; then
      success "unified-core (8000) 已在运行"
      return 0
    fi

    if [ -x "$SCRIPT_DIR/../topems.sh" ]; then
      "$SCRIPT_DIR/../topems.sh" start iam
      success "后端启动完成"
    else
      warn "未找到 scripts/topems.sh，跳过后端启动"
    fi
  fi
}

# =================================================
# 步骤 5：清理前端缓存（可选）
# =================================================
clean_frontend_cache() {
  local force="${1:-false}"
  
  if [ "$force" = "force" ]; then
    info "强制清理前端缓存..."
  else
    info "检查前端缓存状态..."
  fi

  # Vite 预构建缓存
  local vite_cache="$PROJECT_ROOT/apps/web/node_modules/.vite"
  if [ -d "$vite_cache" ]; then
    if [ "$force" = "force" ] || [ -f "$vite_cache/deps/_metadata.json" ]; then
      if [ "$force" = "force" ] || ! grep -q '"hash":' "$vite_cache/deps/_metadata.json" 2>/dev/null; then
        info "清理 Vite 预构建缓存..."
        rm -rf "$vite_cache"
        success "Vite 缓存已清理，下次启动将重新预构建依赖"
      else
        success "Vite 缓存状态正常"
      fi
    fi
  else
    success "Vite 缓存不存在（将在首次启动时创建）"
  fi

  # pnpm 硬链接缓存检查
  local pnpm_store="$PROJECT_ROOT/node_modules/.pnpm"
  if [ -d "$pnpm_store" ]; then
    local cache_size
    cache_size=$(du -sh "$pnpm_store" 2>/dev/null | cut -f1)
    success "pnpm 存储大小: ${cache_size:-未知}"
  fi
}

# =================================================
# 步骤 6：启动前端
# =================================================
start_frontend() {
  local mode="${1:-standalone}"

  info "启动前端 (topems-portal 3000)..."

  # 自动检测并清理损坏的 Vite 缓存
  clean_frontend_cache
  
  # Web 主应用
  if check_port 3000; then
    success "topems-portal (3000) 已在运行"
  else
    mkdir -p "$PROJECT_ROOT/logs"
    info "启动 topems-portal (3000)..."
    if [ "$mode" = "monolith" ]; then
      info "  模块化单体模式: VITE_MONOLITH=1"
      (cd "$PROJECT_ROOT" && nohup VITE_MONOLITH=1 pnpm dev:web > "$PROJECT_ROOT/logs/web.log" 2>&1 &) || warn "无法启动 topems-portal"
    else
      (cd "$PROJECT_ROOT" && nohup pnpm dev:web > "$PROJECT_ROOT/logs/web.log" 2>&1 &) || warn "无法启动 topems-portal"
    fi
    sleep 2
  fi

  success "前端启动完成"
}

# =================================================
# 步骤 6：显示状态
# =================================================
show_status() {
  echo ""
  info "=== 核心服务状态 ==="
  printf "  %-20s %-10s %s\n" "服务" "端口" "状态"
  printf "  %-20s %-10s %s\n" "----" "----" "----"
  for entry in "PostgreSQL:5432" "Redis:6379" "Unified Core:8000" "Web Portal:3000" "Core Module:3001"; do
    name="${entry%:*}"
    port="${entry#*:}"
    if check_port "$port"; then
      printf "  ${GREEN}✓${NC}  %-18s %-10s %s\n" "$name" "$port" "运行中"
    else
      printf "  ${YELLOW}✗${NC}  %-18s %-10s %s\n" "$name" "$port" "未运行"
    fi
  done

  echo ""
  info "=== 业务微服务状态 ==="
  printf "  %-20s %-10s %-15s %s\n" "服务" "端口" "状态" "启动命令"
  printf "  %-20s %-10s %-15s %s\n" "----" "----" "------" "--------"
  local biz_services="scm:8040 wms:8041 srm:8042 mes:8030 finance:8011 erp:8010 crm:8029"
  local stopped_services=""
  for entry in $biz_services; do
    name="${entry%:*}"
    port="${entry#*:}"
    if check_port "$port"; then
      printf "  ${GREEN}✓${NC}  %-18s %-10s %-15s %s\n" "$name" "$port" "运行中" ""
    else
      printf "  ${YELLOW}✗${NC}  %-18s %-10s %-15s %s\n" "$name" "$port" "未运行" "topems start $name"
      stopped_services="$stopped_services $name"
    fi
  done

  if [ -n "$stopped_services" ]; then
    echo ""
    warn "部分业务微服务未运行。启动方式:"
    echo "  单独启动: ./scripts/topems.sh start <服务名>"
    echo "  全量启动: ./scripts/topems.sh start-all"
  fi

  echo ""
  info "=== 数据库状态 ==="
  check_db_health

  echo ""
  info "=== 访问地址 ==="
  echo "  Web Portal:    http://localhost:3000"
  echo "  Core Module:   http://localhost:3001"
  echo "  API Gateway:   http://localhost:8000"
  echo "  API Health:    http://localhost:8000/health"
  echo ""
  info "默认账号: admin / admin123"
  echo ""
  info "日志文件:"
  echo "  Web:    tail -f $PROJECT_ROOT/logs/web.log"
  echo "  Core:   tail -f $PROJECT_ROOT/logs/core.log"
  echo "  后端:   ./scripts/topems.sh logs iam"
}

# =================================================
# 主流程
# =================================================
cmd="${1:-all}"

case "$cmd" in
  install)
    check_env
    install_deps
    success "依赖安装完成"
    ;;
  db)
    start_db
    ;;
  backend)
    check_env
    start_backend
    ;;
  frontend)
    check_env
    start_frontend
    ;;
  clean)
    clean_frontend_cache "force"
    info "清理 Rust SQL 缓存..."
    if [ -d "$PROJECT_ROOT/.sqlx" ]; then
      rm -rf "$PROJECT_ROOT/.sqlx"
      success "Rust SQL 离线缓存已清理"
      warn "如需重新生成，请运行: ./scripts/dev/sqlx-prepare.sh"
    else
      success "Rust SQL 缓存不存在"
    fi
    ;;
  cache)
    clean_frontend_cache
    ;;
  db-check)
    info "检查数据库健康状态..."
    check_db_health
    ;;
  stop)
    info "停止所有 TOPEMS 服务..."
    "$SCRIPT_DIR/../topems.sh" stop-all 2>/dev/null || true
    pkill -f "vite" 2>/dev/null || true
    success "已停止"
    ;;
  status)
    show_status
    ;;
  all|monolith|"")
    check_env
    install_deps
    start_db
    start_backend "monolith"
    sleep 30  # 等待模块化单体服务启动
    start_frontend "monolith"
    sleep 3
    show_status
    ;;
  help|--help|-h)
    cat <<EOF
TOPEMS 本地一键启动脚本（默认部署方式）

用法:
  ./scripts/start-local.sh              # 启动全部（前端 + 后端）
  ./scripts/start-local.sh frontend     # 仅启动前端
  ./scripts/start-local.sh backend      # 仅启动后端
  ./scripts/start-local.sh db           # 启动本地数据库（macOS）
  ./scripts/start-local.sh install      # 安装所有依赖
  ./scripts/start-local.sh clean        # 清理所有缓存（Vite + SQLx）
  ./scripts/start-local.sh cache        # 检查缓存状态
  ./scripts/start-local.sh db-check     # 检查数据库连接状态
  ./scripts/start-local.sh stop         # 停止所有服务
  ./scripts/start-local.sh status       # 查看服务状态
  ./scripts/start-local.sh help         # 查看帮助

说明:
  - clean:     强制清理 Vite 预构建缓存和 Rust SQL 离线缓存
  - cache:     检查缓存状态，仅在损坏时自动清理
  - db-check:  检查数据库连接数，超过阈值自动清理空闲连接
  - 启动流程:  启动数据库时自动检查连接状态
  - 前端启动时会自动检查 Vite 缓存，损坏则自动清理

默认部署方式: 本地进程（无 Docker）
EOF
    ;;
  *)
    error "未知命令: $cmd"
    echo "运行 \"./scripts/start-local.sh help\" 查看帮助"
    exit 1
    ;;
esac

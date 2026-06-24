#!/bin/bash
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
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
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

  # Cargo workspace 检查
  if [ ! -d "$PROJECT_ROOT/target" ]; then
    info "编译 Rust workspace（首次会需要较长时间）..."
    (cd "$PROJECT_ROOT" && cargo build --workspace) || warn "Rust 编译失败，请检查 Rust 工具链"
  else
    success "Rust target 目录已存在"
  fi
}

# =================================================
# 步骤 4：启动后端
# =================================================
start_backend() {
  info "启动后端 (unified-core, 端口 8000)..."

  if check_port 8000; then
    success "unified-core (8000) 已在运行"
    return 0
  fi

  if [ -x "$SCRIPT_DIR/topems.sh" ]; then
    "$SCRIPT_DIR/topems.sh" start iam
    success "后端启动完成"
  else
    warn "未找到 scripts/topems.sh，跳过后端启动"
  fi
}

# =================================================
# 步骤 5：启动前端
# =================================================
start_frontend() {
  info "启动前端 (topems-core 3001 + topems-portal 3000)..."

  # Core 模块
  if check_port 3001; then
    success "topems-core (3001) 已在运行"
  else
    info "启动 topems-core (3001)..."
    (cd "$PROJECT_ROOT" && nohup pnpm dev:core > "$PROJECT_ROOT/logs/core.log" 2>&1 &) || warn "无法启动 topems-core"
    sleep 2
  fi

  # Web 主应用
  if check_port 3000; then
    success "topems-portal (3000) 已在运行"
  else
    mkdir -p "$PROJECT_ROOT/logs"
    info "启动 topems-portal (3000)..."
    (cd "$PROJECT_ROOT" && nohup pnpm dev:web > "$PROJECT_ROOT/logs/web.log" 2>&1 &) || warn "无法启动 topems-portal"
    sleep 2
  fi

  success "前端启动完成"
}

# =================================================
# 步骤 6：显示状态
# =================================================
show_status() {
  echo ""
  info "=== 服务状态 ==="
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
  stop)
    info "停止所有 TOPEMS 服务..."
    "$SCRIPT_DIR/topems.sh" stop-all 2>/dev/null || true
    pkill -f "vite" 2>/dev/null || true
    success "已停止"
    ;;
  status)
    show_status
    ;;
  all|"")
    check_env
    install_deps
    start_db
    start_backend
    sleep 2
    start_frontend
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
  ./scripts/start-local.sh stop         # 停止所有服务
  ./scripts/start-local.sh status       # 查看服务状态
  ./scripts/start-local.sh help         # 查看帮助

默认部署方式: 本地进程（无 Docker）
EOF
    ;;
  *)
    error "未知命令: $cmd"
    echo "运行 \"./scripts/start-local.sh help\" 查看帮助"
    exit 1
    ;;
esac

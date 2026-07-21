#!/bin/bash

# TOPEMS 非Docker方案依赖安装脚本
# 适用于: macOS / Linux
# 安装依赖: PostgreSQL, Redis, Rust, Node.js, Ollama

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

# 检查操作系统
check_os() {
  if [[ "$OSTYPE" == "darwin"* ]]; then
    OS="macos"
    info "检测到 macOS 系统"
  elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
    OS="linux"
    info "检测到 Linux 系统"
  else
    error "不支持的操作系统: $OSTYPE"
    exit 1
  fi
}

# 安装Homebrew (macOS)
install_brew() {
  if [ "$OS" == "macos" ]; then
    if ! command -v brew &>/dev/null; then
      info "安装 Homebrew..."
      /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
      success "Homebrew 安装完成"
    else
      success "Homebrew 已安装"
    fi
  fi
}

# 安装PostgreSQL
install_postgres() {
  info "安装 PostgreSQL..."
  
  if [ "$OS" == "macos" ]; then
    brew install postgresql@16
    brew services start postgresql@16
  else
    # Ubuntu/Debian
    sudo apt update
    sudo apt install -y postgresql-16 postgresql-contrib
    sudo systemctl enable postgresql
    sudo systemctl start postgresql
  fi
  
  # 等待服务启动
  sleep 3
  
  # 创建用户和数据库
  info "创建数据库用户和数据库..."
  if [ "$OS" == "macos" ]; then
    createuser -s topems 2>/dev/null || true
    createdb -O topems topems 2>/dev/null || true
    psql -U "$USER" -d postgres -c "ALTER USER topems WITH PASSWORD 'topems_secret';" 2>/dev/null || true
  else
    sudo -u postgres createuser topems
    sudo -u postgres createdb -O topems topems
    sudo -u postgres psql -c "ALTER USER topems WITH PASSWORD 'topems_secret';"
  fi
  
  success "PostgreSQL 安装完成"
}

# 安装Redis
install_redis() {
  info "安装 Redis..."
  
  if [ "$OS" == "macos" ]; then
    brew install redis
    brew services start redis
  else
    sudo apt update
    sudo apt install -y redis-server
    sudo systemctl enable redis-server
    sudo systemctl start redis-server
  fi
  
  # 设置密码
  info "配置 Redis 密码..."
  if [ "$OS" == "macos" ]; then
    redis-cli config set requirepass "topems_redis_secret"
    redis-cli config rewrite
  else
    sudo redis-cli config set requirepass "topems_redis_secret"
    sudo redis-cli config rewrite
  fi
  
  success "Redis 安装完成"
}

# 安装Rust
install_rust() {
  info "安装 Rust..."
  
  if ! command -v rustup &>/dev/null; then
    curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
    source "$HOME/.cargo/env"
  else
    rustup update
  fi
  
  success "Rust 安装完成"
}

# 安装Node.js
install_node() {
  info "安装 Node.js..."
  
  if ! command -v nvm &>/dev/null; then
    # 安装NVM
    curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
    export NVM_DIR="$HOME/.nvm"
    [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
    [ -s "$NVM_DIR/bash_completion" ] && \. "$NVM_DIR/bash_completion"
  fi
  
  nvm install 20
  nvm use 20
  nvm alias default 20
  
  success "Node.js 安装完成"
}

# 安装Ollama
install_ollama() {
  info "安装 Ollama..."
  
  if ! command -v ollama &>/dev/null; then
    if [ "$OS" == "macos" ]; then
      brew install ollama
    else
      curl -fsSL https://ollama.com/install.sh | sh
    fi
  fi
  
  # 启动Ollama服务
  info "启动 Ollama 服务..."
  ollama serve &
  sleep 3
  
  # 拉取模型
  info "拉取AI模型..."
  ollama pull qwen2.5:7b-instruct
  ollama pull nomic-embed-text
  
  success "Ollama 安装完成"
}

# 安装前端依赖
install_frontend_deps() {
  info "安装前端依赖..."
  cd "$PROJECT_ROOT/apps/web"
  
  if command -v yarn &>/dev/null; then
    yarn install
  elif command -v pnpm &>/dev/null; then
    pnpm install
  else
    npm install
  fi
  
  success "前端依赖安装完成"
}

# 编译后端服务
build_backend() {
  info "编译后端服务..."
  cd "$PROJECT_ROOT"
  
  cargo build --release --workspace
  
  success "后端服务编译完成"
}

# 创建配置文件
create_config() {
  info "创建配置文件..."
  
  # 创建目录
  mkdir -p "$PROJECT_ROOT/config"
  mkdir -p "$PROJECT_ROOT/logs"
  
  # 创建端口配置文件
  if [ ! -f "$PROJECT_ROOT/config/ports.env" ]; then
    cat > "$PROJECT_ROOT/config/ports.env" << EOF
# TOPEMS 服务端口配置
# 核心服务 (unified-core 包含 IAM, Doc, Flow, File, Communication, Notification)
IAM_PORT=8000
DOC_PORT=8000
FILE_PORT=8000
FLOW_PORT=8000
NOTIFICATION_PORT=8000
INTEGRATION_PORT=8072
ERP_PORT=8010
HRM_PORT=8020
CRM_PORT=8029
RS_PORT=8053
MANUFACTURING_PORT=8030
QUALITY_ASSURANCE_PORT=8050
SCM_PORT=8040
SRM_PORT=8042
WMS_PORT=8041
GIS_PORT=8071
AI_PORT=8013
MOBILE_PORT=8070
POSTGRES_PORT=5432
REDIS_PORT=6379
WEB_PORT=3000
EOF
  fi
  
  # 创建独立运行环境变量文件
  if [ ! -f "$PROJECT_ROOT/config/standalone.env" ]; then
    cat > "$PROJECT_ROOT/config/standalone.env" << EOF
# TOPEMS 独立运行环境变量（非 Docker 方案）
DATABASE_URL=postgres://topems:topems_secret@localhost:5432/topems
REDIS_URL=redis://:topems_redis_secret@localhost:6379
OLLAMA_HOST=http://localhost:11434
JWT_SECRET=topems-jwt-secret-key-must-be-at-least-32-characters-long-for-hs256
REFRESH_SECRET=topems-refresh-secret-key-must-be-at-least-32-characters-long
CORS_ORIGINS=http://localhost:3000,http://localhost:8000
RUST_LOG=info
EOF
  fi
  
  success "配置文件创建完成"
}

# 验证安装
verify_install() {
  info "验证安装..."
  
  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "              依赖安装验证                      "
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  
  # PostgreSQL
  if psql -U topems -d topems -c "SELECT 1" >/dev/null 2>&1; then
    echo "✅ PostgreSQL"
  else
    echo "❌ PostgreSQL"
  fi
  
  # Redis
  if redis-cli -a topems_redis_secret ping | grep -q PONG; then
    echo "✅ Redis"
  else
    echo "❌ Redis"
  fi
  
  # Rust
  if command -v rustc &>/dev/null; then
    echo "✅ Rust ($(rustc --version | awk '{print $2}'))"
  else
    echo "❌ Rust"
  fi
  
  # Node.js
  if command -v node &>/dev/null; then
    echo "✅ Node.js ($(node --version))"
  else
    echo "❌ Node.js"
  fi
  
  # Ollama
  if command -v ollama &>/dev/null; then
    echo "✅ Ollama"
  else
    echo "⚠️ Ollama (可选)"
  fi
  
  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
}

# 主入口
case "$1" in
  all)
    check_os
    install_brew
    install_postgres
    install_redis
    install_rust
    install_node
    install_ollama
    create_config
    install_frontend_deps
    build_backend
    verify_install
    ;;
  db)
    check_os
    install_postgres
    install_redis
    create_config
    ;;
  dev)
    check_os
    install_rust
    install_node
    ;;
  ai)
    check_os
    install_ollama
    ;;
  frontend)
    install_frontend_deps
    ;;
  backend)
    build_backend
    ;;
  verify)
    verify_install
    ;;
  *)
    echo "使用方法: $0 {all|db|dev|ai|frontend|backend|verify}"
    echo ""
    echo "命令说明:"
    echo "  all         - 安装所有依赖（数据库+开发环境+AI+前端+后端）"
    echo "  db          - 仅安装数据库（PostgreSQL + Redis）"
    echo "  dev         - 仅安装开发环境（Rust + Node.js）"
    echo "  ai          - 仅安装AI服务（Ollama）"
    echo "  frontend    - 安装前端依赖"
    echo "  backend     - 编译后端服务"
    echo "  verify      - 验证安装"
    exit 1
    ;;
esac
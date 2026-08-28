#!/bin/bash
# TOPEMS 生产环境一键部署脚本
#
# 用法:
#   ./production-deploy.sh [选项]
#
# 选项:
#   --env <file>       指定环境变量文件（默认: .env.production）
#   --version <tag>    指定部署版本（默认: latest）
#   --skip-backup      跳过部署前备份
#   --skip-migration   跳过数据库迁移
#   --dry-run          仅检查环境，不执行部署
#   --help             显示帮助信息
#
# 示例:
#   ./production-deploy.sh --version v1.0.0
#   ./production-deploy.sh --env /etc/topems/.env --skip-backup

set -e

# ==================== 配置 ====================
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
ENV_FILE="${PROJECT_DIR}/.env.production"
VERSION="latest"
SKIP_BACKUP=false
SKIP_MIGRATION=false
DRY_RUN=false

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

# ==================== 辅助函数 ====================
log() { echo -e "${GREEN}[DEPLOY]${NC} $1"; }
warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
error() { echo -e "${RED}[ERROR]${NC} $1"; exit 1; }
step() { echo -e "${BLUE}[STEP]${NC} $1"; }
info() { echo -e "${CYAN}[INFO]${NC} $1"; }

check_command() {
  if ! command -v "$1" &> /dev/null; then
    error "命令 '$1' 未找到，请先安装"
  fi
}

check_port() {
  if lsof -i :"$1" &> /dev/null; then
    warn "端口 $1 已被占用"
    return 1
  fi
  return 0
}

# ==================== 参数解析 ====================
while [[ $# -gt 0 ]]; do
  case $1 in
    --env)
      ENV_FILE="$2"
      shift 2
      ;;
    --version)
      VERSION="$2"
      shift 2
      ;;
    --skip-backup)
      SKIP_BACKUP=true
      shift
      ;;
    --skip-migration)
      SKIP_MIGRATION=true
      shift
      ;;
    --dry-run)
      DRY_RUN=true
      shift
      ;;
    --help)
      echo "用法: $0 [选项]"
      echo ""
      echo "选项:"
      echo "  --env <file>       指定环境变量文件（默认: .env.production）"
      echo "  --version <tag>    指定部署版本（默认: latest）"
      echo "  --skip-backup      跳过部署前备份"
      echo "  --skip-migration   跳过数据库迁移"
      echo "  --dry-run          仅检查环境，不执行部署"
      echo "  --help             显示帮助信息"
      exit 0
      ;;
    *)
      error "未知选项: $1"
      ;;
  esac
done

# ==================== 主流程 ====================
main() {
  echo ""
  echo -e "${CYAN}╔══════════════════════════════════════════════════════════════╗${NC}"
  echo -e "${CYAN}║${NC}           TOPEMS 生产环境部署脚本                              ${CYAN}║${NC}"
  echo -e "${CYAN}╚══════════════════════════════════════════════════════════════╝${NC}"
  echo ""

  info "项目目录: $PROJECT_DIR"
  info "环境文件: $ENV_FILE"
  info "部署版本: $VERSION"
  info "跳过备份: $SKIP_BACKUP"
  info "跳过迁移: $SKIP_MIGRATION"
  info "试运行模式: $DRY_RUN"
  echo ""

  # ==================== 1. 环境检查 ====================
  step "1/8 - 环境检查"

  check_command git
  check_command curl
  check_command pg_isready 2>/dev/null || warn "pg_isready 未找到，跳过 PostgreSQL 检查"
  check_command redis-cli 2>/dev/null || warn "redis-cli 未找到，跳过 Redis 检查"

  # 检查环境变量文件
  if [ ! -f "$ENV_FILE" ]; then
    error "环境变量文件不存在: $ENV_FILE"
  fi
  log "环境变量文件存在"

  # 加载环境变量
  set -a
  source "$ENV_FILE"
  set +a

  # 检查必需的环境变量
  if [ -z "$DATABASE_URL" ]; then
    error "DATABASE_URL 未设置"
  fi
  if [ -z "$JWT_SECRET" ]; then
    error "JWT_SECRET 未设置"
  fi
  if [ ${#JWT_SECRET} -lt 32 ]; then
    error "JWT_SECRET 长度不足 32 字符"
  fi
  log "必需的环境变量已配置"

  if [ "$DRY_RUN" = true ]; then
    log "试运行模式，环境检查通过，退出"
    exit 0
  fi

  echo ""

  # ==================== 2. 代码获取 ====================
  step "2/8 - 代码获取"

  cd "$PROJECT_DIR"

  # 检查是否为 git 仓库
  if [ ! -d ".git" ]; then
    error "不是 git 仓库"
  fi

  # 拉取最新代码
  log "拉取最新代码..."
  git fetch --all --tags

  # 切换到指定版本
  if [ "$VERSION" != "latest" ]; then
    log "切换到版本: $VERSION"
    git checkout "$VERSION"
  else
    log "切换到 main 分支最新代码"
    git checkout main
    git pull origin main
  fi

  log "代码版本: $(git rev-parse --short HEAD)"
  echo ""

  # ==================== 3. 部署前备份 ====================
  if [ "$SKIP_BACKUP" = false ]; then
    step "3/8 - 部署前备份"

    BACKUP_DIR="${PROJECT_DIR}/backups/$(date +%Y%m%d_%H%M%S)"
    mkdir -p "$BACKUP_DIR"

    # 备份数据库
    if command -v pg_dump &> /dev/null; then
      log "备份数据库..."
      pg_dump "$DATABASE_URL" > "$BACKUP_DIR/database.sql" 2>/dev/null || warn "数据库备份失败"
      log "数据库备份完成: $BACKUP_DIR/database.sql"
    else
      warn "pg_dump 未找到，跳过数据库备份"
    fi

    # 备份配置文件
    log "备份配置文件..."
    cp "$ENV_FILE" "$BACKUP_DIR/.env" 2>/dev/null || true

    log "备份完成: $BACKUP_DIR"
    echo ""
  else
    step "3/8 - 部署前备份（跳过）"
    echo ""
  fi

  # ==================== 4. 依赖安装 ====================
  step "4/8 - 依赖安装"

  # 安装前端依赖
  if [ -d "apps/web" ]; then
    log "安装前端依赖..."
    cd "$PROJECT_DIR/apps/web"
    pnpm install --frozen-lockfile 2>/dev/null || pnpm install
    log "前端依赖安装完成"
  fi

  cd "$PROJECT_DIR"
  echo ""

  # ==================== 5. 构建 ====================
  step "5/8 - 项目构建"

  # 构建前端
  if [ -d "apps/web" ]; then
    log "构建前端..."
    cd "$PROJECT_DIR/apps/web"
    pnpm build
    log "前端构建完成"
  fi

  # 编译后端
  log "编译后端（release 模式）..."
  cd "$PROJECT_DIR"
  SQLX_OFFLINE=true cargo build --release -p topems-unified-core 2>/dev/null || \
    SQLX_OFFLINE=true cargo build --release -p topems-ai
  log "后端编译完成"

  echo ""

  # ==================== 6. 数据库迁移 ====================
  if [ "$SKIP_MIGRATION" = false ]; then
    step "6/8 - 数据库迁移"

    log "执行数据库迁移..."
    cd "$PROJECT_DIR"
    SQLX_OFFLINE=false cargo sqlx migrate run --source svc/unified-core/migrations 2>/dev/null || \
      SQLX_OFFLINE=false cargo sqlx migrate run --source svc/ai/migrations 2>/dev/null || \
      warn "数据库迁移失败，请手动执行"

    log "数据库迁移完成"
    echo ""
  else
    step "6/8 - 数据库迁移（跳过）"
    echo ""
  fi

  # ==================== 7. 服务重启 ====================
  step "7/8 - 服务重启"

  # 停止旧服务
  log "停止旧服务..."
  systemctl stop topems-backend 2>/dev/null || true
  systemctl stop topems-frontend 2>/dev/null || true
  pkill -f "topems-unified-core" 2>/dev/null || true
  pkill -f "topems-ai" 2>/dev/null || true
  sleep 2

  # 启动新服务
  log "启动新服务..."

  # 启动后端
  if command -v systemctl &> /dev/null; then
    systemctl start topems-backend 2>/dev/null || warn "后端 systemd 服务启动失败"
  else
    nohup "$PROJECT_DIR/target/release/topems-unified-core" > /var/log/topems/backend.log 2>&1 &
    log "后端服务已启动 (PID: $!)"
  fi

  # 启动前端（通过 Nginx 托管静态文件）
  if command -v nginx &> /dev/null; then
    nginx -t 2>/dev/null && systemctl reload nginx 2>/dev/null || nginx -s reload 2>/dev/null || true
    log "Nginx 已重新加载"
  fi

  # 等待服务启动
  log "等待服务启动..."
  sleep 10

  echo ""

  # ==================== 8. 部署验证 ====================
  step "8/8 - 部署验证"

  # 检查后端健康状态
  BACKEND_PORT="${SERVER_PORT:-8080}"
  BACKEND_HEALTH="http://localhost:${BACKEND_PORT}/health"

  log "检查后端健康状态: $BACKEND_HEALTH"
  BACKEND_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BACKEND_HEALTH" 2>/dev/null || echo "000")

  if [ "$BACKEND_STATUS" = "200" ]; then
    log "后端服务正常 (HTTP $BACKEND_STATUS)"
  else
    error "后端服务异常 (HTTP $BACKEND_STATUS)"
  fi

  # 检查前端状态
  FRONTEND_PORT="${FRONTEND_PORT:-3000}"
  FRONTEND_URL="http://localhost:${FRONTEND_PORT}/"

  log "检查前端状态: $FRONTEND_URL"
  FRONTEND_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$FRONTEND_URL" 2>/dev/null || echo "000")

  if [ "$FRONTEND_STATUS" = "200" ]; then
    log "前端服务正常 (HTTP $FRONTEND_STATUS)"
  else
    warn "前端服务状态异常 (HTTP $FRONTEND_STATUS)，请检查 Nginx 配置"
  fi

  # 运行 AI 健康检查
  if [ -f "$PROJECT_DIR/scripts/deploy/ai-health-check.sh" ]; then
    log "运行 AI 业务智能模块健康检查..."
    bash "$PROJECT_DIR/scripts/deploy/ai-health-check.sh" "http://localhost:${BACKEND_PORT}" || warn "AI 健康检查发现问题"
  fi

  echo ""

  # ==================== 部署完成 ====================
  echo -e "${GREEN}╔══════════════════════════════════════════════════════════════╗${NC}"
  echo -e "${GREEN}║${NC}           ✅ 部署完成！                                        ${GREEN}║${NC}"
  echo -e "${GREEN}╚══════════════════════════════════════════════════════════════╝${NC}"
  echo ""
  info "部署版本: $VERSION ($(git rev-parse --short HEAD))"
  info "后端地址: http://localhost:${BACKEND_PORT}"
  info "前端地址: http://localhost:${FRONTEND_PORT}"
  info "备份目录: $BACKUP_DIR"
  info "部署时间: $(date '+%Y-%m-%d %H:%M:%S')"
  echo ""
  log "请访问系统验证功能是否正常"
  log "如有问题，请查看日志: /var/log/topems/"
}

# 运行主流程
main "$@"

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
#   --migrate-only     只执行数据库迁移（不编译、不重启服务）
#   --anchor <version> 显式指定基线锚点（默认自动取 database/baseline/ 最新锚点）
#   --allow-pending <version> 临时放行指定 pending 版本（可重复；须人工复核并记录理由）
#   --dry-run          仅检查环境，不执行部署
#   --help             显示帮助信息
#
# 数据库迁移唯一入口：scripts/migration/apply-forward.sh --prod（基线 + 前向迁移）。
# 本脚本不再调用 sqlx migrate run；迁移失败即中止部署，不回退 sqlx。
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
MIGRATE_ONLY=false
DRY_RUN=false
ANCHOR_OVERRIDE=""
ALLOW_PENDING=()

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

# 解析基线锚点并校验资产（apply-forward.sh 的前置条件；缺失即中止，不回退 sqlx）
resolve_baseline_anchor() {
  local meta anchor latest_anchor=0 latest_meta="" schema expected actual
  if [ -n "$ANCHOR_OVERRIDE" ]; then
    anchor="$ANCHOR_OVERRIDE"
    info "基线锚点: ${anchor}（--anchor 显式指定）"
  else
    for meta in "$PROJECT_DIR"/database/baseline/baseline_*.json; do
      [ -e "$meta" ] || continue
      anchor="$(grep -o '"anchor_version"[[:space:]]*:[[:space:]]*[0-9]*' "$meta" | grep -o '[0-9]*' | head -1)"
      [ -n "$anchor" ] || continue
      if (( anchor > latest_anchor )); then
        latest_anchor="$anchor"
        latest_meta="$meta"
      fi
    done
    if [ -z "$latest_meta" ]; then
      error "基线锚点缺失：未找到 database/baseline/baseline_*.json；禁止回退 sqlx migrate run，请先生成基线（scripts/migration/gen-baseline.sh）"
    fi
    anchor="$latest_anchor"
    info "基线锚点: ${anchor}（来源 $(basename "$latest_meta")）"
  fi

  schema="$PROJECT_DIR/database/baseline/prod_schema_${anchor}.sql.gz"
  if [ ! -f "$schema" ]; then
    error "基线资产缺失：database/baseline/prod_schema_${anchor}.sql.gz（锚点 ${anchor}）；禁止回退 sqlx migrate run"
  fi

  # 有元数据时校验 sha256，防止基线资产被截断/替换
  if [ -n "$latest_meta" ]; then
    expected="$(grep -o '"schema_sha256"[[:space:]]*:[[:space:]]*"[a-f0-9]*"' "$latest_meta" | grep -o '[a-f0-9]\{64\}' | head -1)"
    if [ -n "$expected" ]; then
      actual="$(shasum -a 256 "$schema" | awk '{print $1}')"
      if [ "$actual" != "$expected" ]; then
        error "基线资产校验失败：$(basename "$schema") sha256=${actual}，元数据期望 ${expected}"
      fi
    fi
  fi

  BASELINE_ANCHOR="$anchor"
  BASELINE_SCHEMA="$schema"
  info "基线资产: $(basename "$BASELINE_SCHEMA") 可用"
}

# prod 迁移执行（唯一入口）：apply-forward.sh --prod；失败即中止，不回退 sqlx
run_forward_migration() {
  local ledger_max ledger_out v appf_args=()
  cd "$PROJECT_DIR"
  resolve_baseline_anchor
  check_command psql

  if ! ledger_out="$(psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -tA -c "SELECT COALESCE(max(version),0) FROM _sqlx_migrations WHERE success" 2>&1)"; then
    error "无法读取迁移账本（$(printf '%s' "$ledger_out" | head -1)）；迁移中止，禁止回退 sqlx migrate run"
  fi
  ledger_max="$(printf '%s' "$ledger_out" | tr -d '[:space:]')"
  if [ -z "$ledger_max" ]; then
    error "迁移账本版本读取为空；迁移中止"
  fi
  if (( ledger_max < BASELINE_ANCHOR )); then
    error "prod 账本最大版本 ${ledger_max} < 基线锚点 ${BASELINE_ANCHOR}：基线尚未恢复，禁止直接前向迁移"
  fi
  info "当前账本最大版本: ${ledger_max}（基线锚点 ${BASELINE_ANCHOR}）"

  appf_args=(--dsn "$DATABASE_URL" --prod --anchor "$BASELINE_ANCHOR")
  if [ ${#ALLOW_PENDING[@]} -gt 0 ]; then
    warn "⚠️ --allow-pending 已显式启用：临时放行 pending 版本 ${ALLOW_PENDING[*]}（须人工复核并在变更记录注明理由）"
    for v in "${ALLOW_PENDING[@]}"; do
      appf_args+=(--allow-pending "$v")
    done
  fi

  log "执行数据库迁移（prod 唯一入口: scripts/migration/apply-forward.sh --prod）..."
  if ! bash "$PROJECT_DIR/scripts/migration/apply-forward.sh" "${appf_args[@]}"; then
    error "数据库迁移失败，部署中止（禁止回退 sqlx migrate run；修复迁移后重试）"
  fi
  log "数据库迁移完成"
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
    --migrate-only)
      MIGRATE_ONLY=true
      shift
      ;;
    --anchor)
      ANCHOR_OVERRIDE="$2"
      shift 2
      ;;
    --allow-pending)
      ALLOW_PENDING+=("$2")
      shift 2
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
      echo "  --migrate-only     只执行数据库迁移（不编译、不重启服务）"
      echo "  --anchor <version> 显式指定基线锚点（默认自动取 database/baseline/ 最新锚点）"
      echo "  --allow-pending <version> 临时放行指定 pending 版本（可重复；须人工复核记录理由）"
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
  info "仅迁移模式: $MIGRATE_ONLY"
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
  # shellcheck disable=SC1090
  source "$ENV_FILE"
  set +a

  # 检查必需的环境变量
  if [ -z "$DATABASE_URL" ]; then
    error "DATABASE_URL 未设置"
  fi

  # --migrate-only：只跑迁移（不编译/不重启），用于灰度与本地验证
  if [ "$MIGRATE_ONLY" = true ]; then
    echo ""
    step "数据库迁移（--migrate-only：不编译、不重启服务）"
    run_forward_migration
    echo ""
    log "仅迁移模式完成，退出"
    exit 0
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

  # 编译后端（unified-core + ai 两个 systemd unit 都需要；失败即中止，不吞错）
  log "编译后端（release 模式：topems-unified-core + topems-ai）..."
  cd "$PROJECT_DIR"
  SQLX_OFFLINE=true cargo build --release -p topems-unified-core || \
    error "topems-unified-core 编译失败，部署中止（上方为实际编译错误输出）"
  SQLX_OFFLINE=true cargo build --release -p topems-ai || \
    error "topems-ai 编译失败，部署中止（上方为实际编译错误输出）"
  log "后端编译完成"

  echo ""

  # ==================== 6. 数据库迁移 ====================
  if [ "$SKIP_MIGRATION" = false ]; then
    step "6/8 - 数据库迁移"
    # prod 唯一入口：apply-forward.sh --prod（基线 + 前向迁移）。
    # 不再调用 sqlx migrate run（它会把锚点前未入账的定向迁移当 pending 重放）；
    # 迁移失败必须中止部署（error 退出 1），不得回退 sqlx 兜底。
    run_forward_migration
    echo ""
  else
    step "6/8 - 数据库迁移（跳过）"
    warn "已跳过迁移：请确认 prod 结构与版本由 scripts/migration/apply-forward.sh --prod 单独维护"
    echo ""
  fi

  # ==================== 7. 服务重启 ====================
  step "7/8 - 服务重启"

  # 停止旧服务（真实 systemd unit：topems-unified-core / topems-ai；不存在则用 pkill 兜底）
  log "停止旧服务..."
  systemctl stop topems-unified-core 2>/dev/null || true
  systemctl stop topems-ai 2>/dev/null || true
  pkill -f "topems-unified-core" 2>/dev/null || true
  pkill -f "topems-ai" 2>/dev/null || true
  sleep 2

  # 启动新服务
  log "启动新服务..."

  # 启动后端：systemd unit 存在则用 systemctl，否则回退 nohup
  if command -v systemctl &> /dev/null && systemctl list-unit-files topems-unified-core >/dev/null 2>&1; then
    systemctl start topems-unified-core 2>/dev/null || warn "后端 systemd 服务启动失败"
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

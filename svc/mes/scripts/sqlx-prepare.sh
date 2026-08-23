#!/usr/bin/env bash
set -eo pipefail

MES_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PROJECT_ROOT="$(cd "$MES_DIR/../.." && pwd)"

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[0;33m'; BLUE='\033[0;34m'; NC='\033[0m'
log()  { echo -e "${BLUE}[mes-sqlx]${NC} $*"; }
warn() { echo -e "${YELLOW}[mes-sqlx][warn]${NC} $*"; }
ok()   { echo -e "${GREEN}[mes-sqlx][ok]${NC} $*"; }
err()  { echo -e "${RED}[mes-sqlx][err]${NC} $*" >&2; }

PG_USER="topems"
PG_PASS="topems"
PG_DB="topems_mes"
PG_PORT="5435"
DATABASE_URL="postgres://${PG_USER}:${PG_PASS}@localhost:${PG_PORT}/${PG_DB}"
export DATABASE_URL

log "Project Root : $PROJECT_ROOT"
log "MES Dir       : $MES_DIR"
log "DATABASE_URL  : $DATABASE_URL"
echo ""

if ! command -v docker >/dev/null 2>&1; then
  err "docker 命令未找到，请先安装并启动 Docker Desktop"
  exit 2
fi

COMPOSE_CMD=""
if docker compose version >/dev/null 2>&1; then
  COMPOSE_CMD="docker compose"
elif command -v docker-compose >/dev/null 2>&1; then
  COMPOSE_CMD="docker-compose"
else
  err "未找到 docker compose 插件或 docker-compose 命令，请安装 Docker Compose"
  exit 2
fi
log "Using compose: $COMPOSE_CMD"

if ! command -v cargo >/dev/null 2>&1; then
  err "cargo 未安装，请先安装 Rust: https://rustup.rs"
  exit 2
fi

if ! cargo sqlx --version >/dev/null 2>&1; then
  warn "sqlx-cli 未安装，正在自动安装 (postgres + rustls) ..."
  cargo install sqlx-cli --no-default-features --features postgres,rustls
fi

COMPOSE_FILE="$MES_DIR/docker-compose.yaml"
log "启动 PostgreSQL 16 (端口 $PG_PORT) ..."
(cd "$MES_DIR" && $COMPOSE_CMD -f "$COMPOSE_FILE" up -d)

log "等待 PostgreSQL 就绪 ..."
MAX_RETRIES=30
RETRY=0
while [ $RETRY -lt $MAX_RETRIES ]; do
  set +e
  (cd "$MES_DIR" && $COMPOSE_CMD -f "$COMPOSE_FILE" exec -T postgres \
    pg_isready -U "$PG_USER" -d "$PG_DB") >/dev/null 2>&1
  RC=$?
  set -e
  if [ $RC -eq 0 ]; then
    ok "PostgreSQL 已就绪"
    break
  fi
  RETRY=$((RETRY + 1))
  log "  重试 $RETRY/$MAX_RETRIES ..."
  sleep 2
done
if [ $RETRY -ge $MAX_RETRIES ]; then
  err "PostgreSQL 超时未就绪，请检查：$COMPOSE_CMD -f $COMPOSE_FILE logs"
  exit 1
fi

MIGRATIONS_DIR="$MES_DIR/migrations"
if [ -d "$MIGRATIONS_DIR" ] && [ -n "$(ls -A "$MIGRATIONS_DIR" 2>/dev/null)" ]; then
  log "执行 MES crate 内 sqlx 迁移 ($MIGRATIONS_DIR) ..."
  (cd "$PROJECT_ROOT" && cargo sqlx migrate run --database-url "$DATABASE_URL" --source "$MIGRATIONS_DIR")
  ok "迁移完成"
else
  warn "MES crate 无 migrations/ 目录 ($MIGRATIONS_DIR)，跳过 migrate run"
  warn "  如使用 workspace 统一 database/migrations/，请确认 DB 已有完整 schema 再 prepare"
fi

echo ""
log "执行 cargo sqlx prepare -p topems-mes --tests ..."
BEFORE=""
if [ -d "$PROJECT_ROOT/.sqlx" ]; then
  BEFORE=$(cd "$PROJECT_ROOT" && find .sqlx -name "*.json" | wc -l | tr -d ' ')
fi

(cd "$PROJECT_ROOT" && cargo sqlx prepare -p topems-mes --tests --database-url "$DATABASE_URL")

AFTER=0
if [ -d "$PROJECT_ROOT/.sqlx" ]; then
  AFTER=$(cd "$PROJECT_ROOT" && find .sqlx -name "*.json" | wc -l | tr -d ' ')
fi

NEW=$((AFTER - BEFORE))
if [ "$NEW" -lt 0 ]; then NEW=0; fi

echo ""
ok "完成！根目录 .sqlx/ 共 $AFTER 个 JSON 缓存（本次新增约 $NEW 个）"
log "请检查并提交变更："
echo "    cd $PROJECT_ROOT"
echo "    git add .sqlx"
echo "    git status"
echo ""
log "可选：停止并清理本地 PG："
echo "    (cd $MES_DIR && $COMPOSE_CMD -f $COMPOSE_FILE down -v)"

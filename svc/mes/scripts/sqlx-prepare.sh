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

# ---- V288: init 脚本前置 + schema 预创建 ----
# 背景：migrations 20260716+ 引用裸 schema (iam/hrm/wms/mobile/rs) 和
# 运行时由服务 schema_defense.rs 建的基础表 (iam.users/iam.roles 等)，
# 但 fresh PG 容器只有 public schema。先跑 init 脚本建基础表 + 预创建
# 全部 schema，再跑 migrations 做增量补丁。
#
# 顺序关键：01_rebuild 会 DROP 裸 schema (iam/hrm/...) 再建 plugin_*，
# 所以 000_create_schemas 必须在 01_rebuild 之后跑，补回被 DROP 的裸 schema。
INIT_DIR="$PROJECT_ROOT/database/init"
MIGRATIONS_DIR="$PROJECT_ROOT/database/migrations"

psql_exec() {
  (cd "$MES_DIR" && $COMPOSE_CMD -f "$COMPOSE_FILE" exec -T postgres \
    psql -U "$PG_USER" -d "$PG_DB" -v ON_ERROR_STOP=0)
}

if [ -d "$INIT_DIR" ]; then
  log "执行 database/init/ 脚本（建 schema + 基础表）..."
  for f in 01_rebuild_database.sql 02_create_plugin_tables.sql \
           03_init_permissions.sql 04_create_scm_wms_srm_tables.sql \
           05_mobile_init.sql 06_create_shared_schema.sql; do
    if [ -f "$INIT_DIR/$f" ]; then
      log "  执行 $f ..."
      cat "$INIT_DIR/$f" | psql_exec >/dev/null 2>&1 \
        || warn "  $f 部分失败（预期，继续）"
    fi
  done
  ok "init 脚本执行完成"
fi

# 000_create_schemas 补回被 01_rebuild DROP 的裸 schema (iam/hrm/wms/...)
if [ -f "$MIGRATIONS_DIR/000_create_schemas.sql" ]; then
  log "执行 000_create_schemas.sql（补建裸 schema）..."
  cat "$MIGRATIONS_DIR/000_create_schemas.sql" | psql_exec >/dev/null 2>&1 \
    || warn "  000_create_schemas 部分失败（预期，继续）"
  ok "schema 预创建完成"
fi

if [ -d "$MIGRATIONS_DIR" ] && [ -n "$(ls -A "$MIGRATIONS_DIR" 2>/dev/null)" ]; then
  log "执行 workspace 统一 sqlx 迁移 ($MIGRATIONS_DIR) ..."
  # V288: migrations 部分会因裸 schema 基础表缺失而失败（iam.users 等
  # 运行时由服务建表），用 || warn 不阻塞 prepare（init 脚本已建大部分表）
  (cd "$PROJECT_ROOT" && cargo sqlx migrate run --database-url "$DATABASE_URL" --source "$MIGRATIONS_DIR") \
    && ok "迁移完成" \
    || warn "迁移部分失败（预期：裸 schema 基础表由服务运行时建），继续 prepare"
else
  warn "未找到 migrations/ 目录，跳过 migrate run"
fi

echo ""
log "执行 cargo sqlx prepare --workspace -- --tests -p topems-mes ..."
BEFORE=""
if [ -d "$PROJECT_ROOT/.sqlx" ]; then
  BEFORE=$(cd "$PROJECT_ROOT" && find .sqlx -name "*.json" | wc -l | tr -d ' ')
fi

(cd "$PROJECT_ROOT" && cargo sqlx prepare --workspace --database-url "$DATABASE_URL" -- --tests -p topems-mes)

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

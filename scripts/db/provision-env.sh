#!/usr/bin/env bash
# =============================================================================
# 环境供给入口（基线即唯一供给入口）
#
# 流程：建库（不存在时）→ 恢复基线快照（schema + ledger）→
#       apply-forward.sh 只应用 version > anchor → 终态校验（账本/表数/锚点/指纹）。
#
# 为什么不再全链 `sqlx migrate run`：历史链存在断点（如 20261005000004 依赖
# public.qa_lab_tasks，而该表由更晚的 20261007000009 才创建），从零重放必然失败；
# 且会把 <= 锚点的定向迁移当作 pending 重放。基线与前向迁移是唯一受支持路径。
#
# 环境语义（同一流程，仅默认库名/DSN 差异）：
#   --env dev          → 默认库 topems_dev
#   --env test         → 默认库 topems_test
#   --env staging      → 默认库 topems_staging
#   --env prod-replica → 默认库 topems_prod_replica（本地/灾备副本；迁移按 --prod 守卫）
#
# 用法：
#   bash scripts/db/provision-env.sh --env test --dsn "postgresql://user@127.0.0.1:5432/topems_test"
#   bash scripts/db/provision-env.sh --env dev --db topems_dev
#   bash scripts/db/provision-env.sh --env prod-replica --db topems_prod_replica \
#     --prod-ssh <user>@<prod-host>
#
# 选项：
#   --env NAME         dev|test|staging|prod-replica（默认 dev）
#   --dsn DSN          目标 DSN（与 --db 二选一）
#   --db NAME          目标库名（未给时取 --env 默认库名）
#   --anchor VERSION   覆盖基线锚点（必须存在 baseline_VERSION.json 且 sha256 校验通过）
#   --force-nonempty   显式允许覆盖已非空库（会 DROP + CREATE；打印 ⚠️ WARN；prod 形态不可用）
#   --skip-prod-fingerprint  跳过与 prod 的 10 张核心表指纹比对（仅 dev/test/staging 可跳过）
#   --prod-ssh USER@HOST      prod 只读比对入口（ssh 执行 psql -d topems_prod）
#   --prod-dsn DSN            prod 只读比对入口（二选一）
#   --prod-db NAME            prod 库名（默认 topems_prod）
#   -h|--help          显示帮助
#
# 退出码：0 成功；1 失败（含守卫拒绝/校验不通过/资产或探测失败）。
# fail-closed：任何探测失败、sha256 不匹配、账本/锚点/表数校验失败都非零退出；
# 绝不回退到 sqlx migrate run。
# =============================================================================
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
BASELINE_DIR="$ROOT/database/baseline"

ENV_NAME="dev"
DSN=""
DB=""
ANCHOR_OVERRIDE=""
FORCE_NONEMPTY=0
SKIP_FP=0
PROD_SSH=""
PROD_DSN=""
PROD_DB="topems_prod"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

info() { echo -e "${BLUE}[PROVISION]${NC} $*"; }
ok() { echo -e "${GREEN}✓${NC} $*"; }
warn() { echo -e "${YELLOW}⚠️  WARN${NC} $*"; }
die() { echo -e "${RED}✗ $*${NC}" >&2; exit 1; }

while [[ $# -gt 0 ]]; do
  case "$1" in
    --env) ENV_NAME="$2"; shift 2 ;;
    --dsn) DSN="$2"; shift 2 ;;
    --db) DB="$2"; shift 2 ;;
    --anchor) ANCHOR_OVERRIDE="$2"; shift 2 ;;
    --force-nonempty) FORCE_NONEMPTY=1; shift ;;
    --skip-prod-fingerprint) SKIP_FP=1; shift ;;
    --prod-ssh) PROD_SSH="$2"; shift 2 ;;
    --prod-dsn) PROD_DSN="$2"; shift 2 ;;
    --prod-db) PROD_DB="$2"; shift 2 ;;
    -h|--help) sed -n '2,45p' "$0"; exit 0 ;;
    *) echo "未知参数: $1" >&2; exit 2 ;;
  esac
done

case "$ENV_NAME" in
  dev) DEFAULT_DB="topems_dev" ;;
  test) DEFAULT_DB="topems_test" ;;
  staging) DEFAULT_DB="topems_staging" ;;
  prod-replica) DEFAULT_DB="topems_prod_replica" ;;
  *) die "--env 仅支持 dev|test|staging|prod-replica（收到 ${ENV_NAME}）" ;;
esac

if [[ -n "$DSN" && -n "$DB" ]]; then
  die "--dsn 与 --db 只能二选一"
fi
if [[ -z "$DSN" ]]; then
  DB="${DB:-$DEFAULT_DB}"
fi
if [[ -z "$DSN" && ! "$DB" =~ ^[A-Za-z0-9_]+$ ]]; then
  die "库名仅允许字母/数字/下划线：${DB}"
fi

sha256_of() {
  if command -v shasum >/dev/null 2>&1; then
    shasum -a 256 "$1" | awk '{print $1}'
  else
    sha256sum "$1" | awk '{print $1}'
  fi
}

# ── 解析目标连接与库名 ─────────────────────────────────────────────────────
if [[ -n "$DSN" ]]; then
  BASE_DSN="${DSN%%\?*}"
  QUERY=""
  [[ "$DSN" == *\?* ]] && QUERY="?${DSN#*\?}"
  DB="${BASE_DSN##*/}"
  [[ -n "$DB" && "$DB" != "postgres" ]] || die "DSN 必须指向目标业务库（不能是 postgres 维护库）"
  REST="${DSN#*://}"
  REST="${REST#*@}"
  HOST_PART="${REST%%/*}"
  TARGET_HOST="${HOST_PART%%:*}"
  TARGET_PSQL=(psql "$DSN")
  ADMIN_DSN="${BASE_DSN%/*}/postgres${QUERY}"
  ADMIN_PSQL=(psql "$ADMIN_DSN")
else
  TARGET_HOST="${PGHOST:-/tmp}"
  TARGET_PSQL=(psql -h "$TARGET_HOST" -U "${PGUSER:-air}" -d "$DB")
  ADMIN_PSQL=(psql -h "$TARGET_HOST" -U "${PGUSER:-air}" -d postgres)
fi
DB_LC="$(printf '%s' "$DB" | tr '[:upper:]' '[:lower:]')"
HOST_LC="$(printf '%s' "$TARGET_HOST" | tr '[:upper:]' '[:lower:]')"

# ── prod 特征 fail-closed（复用 setup-db 口径，restore 也绝不指向真 prod） ──
if [[ "$DB_LC" == "topems_prod" ]] || [[ "$HOST_LC" =~ 192\.168\.110\.115|xingzhai ]]; then
  die "目标命中 prod 特征（db=${DB} host=${TARGET_HOST}）；本脚本只允许本地/副本库，prod 禁止执行 restore/DDL"
fi
if [[ "$HOST_LC" =~ prod ]]; then
  die "目标 host 含 prod 特征（${TARGET_HOST}）；拒绝执行（fail-closed）"
fi
if [[ "$ENV_NAME" == "prod-replica" ]]; then
  [[ "$DB_LC" =~ replica ]] || die "--env prod-replica 要求库名含 replica（收到 ${DB}），避免误指 prod"
elif [[ "$DB_LC" =~ (^|_)(prod|production)(_|$) ]]; then
  die "目标库名命中 prod 特征（${DB}）；如确为本地副本请显式 --env prod-replica 且库名含 replica"
fi

# ── 解析基线（元数据 → 资产 → sha256） ─────────────────────────────────────
meta_get() { node -e 'const m=require(process.argv[1]);console.log(m[process.argv[2]]??"")' "$1" "$2"; }

if [[ -n "$ANCHOR_OVERRIDE" ]]; then
  [[ "$ANCHOR_OVERRIDE" =~ ^[0-9]{14}$ ]] || die "--anchor 必须为 14 位版本号：${ANCHOR_OVERRIDE}"
  META_FILE="$BASELINE_DIR/baseline_${ANCHOR_OVERRIDE}.json"
  [[ -f "$META_FILE" ]] || die "--anchor ${ANCHOR_OVERRIDE} 缺少元数据 ${META_FILE}，无法校验 sha256"
else
  META_FILE=""
  LATEST=0
  for f in "$BASELINE_DIR"/baseline_*.json; do
    [[ -e "$f" ]] || continue
    v="$(meta_get "$f" anchor_version)"
    [[ "$v" =~ ^[0-9]{14}$ ]] || continue
    if (( 10#$v > 10#$LATEST )); then LATEST="$v"; META_FILE="$f"; fi
  done
  [[ -n "$META_FILE" ]] || die "基线元数据缺失：database/baseline/baseline_*.json"
fi

ANCHOR="$(meta_get "$META_FILE" anchor_version)"
[[ "$ANCHOR" =~ ^[0-9]{14}$ ]] || die "基线锚点非法：${ANCHOR}"
SCHEMA_FILE="$BASELINE_DIR/$(meta_get "$META_FILE" schema_file)"
LEDGER_FILE="$BASELINE_DIR/$(meta_get "$META_FILE" ledger_file)"
SCHEMA_SHA="$(meta_get "$META_FILE" schema_sha256)"
LEDGER_SHA="$(meta_get "$META_FILE" ledger_sha256)"
META_TABLES="$(meta_get "$META_FILE" table_count)"
META_ROWS="$(meta_get "$META_FILE" ledger_rows)"

[[ -f "$SCHEMA_FILE" ]] || die "基线资产缺失：${SCHEMA_FILE}"
[[ -f "$LEDGER_FILE" ]] || die "基线资产缺失：${LEDGER_FILE}"
ACT_SCHEMA_SHA="$(sha256_of "$SCHEMA_FILE")"
ACT_LEDGER_SHA="$(sha256_of "$LEDGER_FILE")"
[[ "$ACT_SCHEMA_SHA" == "$SCHEMA_SHA" ]] || die "基线 schema sha256 不匹配：${ACT_SCHEMA_SHA} ≠ ${SCHEMA_SHA}"
[[ "$ACT_LEDGER_SHA" == "$LEDGER_SHA" ]] || die "基线 ledger sha256 不匹配：${ACT_LEDGER_SHA} ≠ ${LEDGER_SHA}"

info "env=${ENV_NAME} db=${DB} host=${TARGET_HOST} anchor=${ANCHOR}"
info "基线资产校验通过：$(basename "$SCHEMA_FILE") / $(basename "$LEDGER_FILE")（表 ${META_TABLES}，账本 ${META_ROWS}）"

# ── 建库 / 非空守卫 ─────────────────────────────────────────────────────────
exists="$("${ADMIN_PSQL[@]}" -X -q -v ON_ERROR_STOP=1 -tAc \
  "SELECT 1 FROM pg_database WHERE datname='${DB}'" 2>/dev/null)" \
  || die "无法连接维护库/查询 pg_database（连接或权限失败，fail-closed）"

if [[ -z "$exists" ]]; then
  info "目标库不存在，创建：${DB}"
  "${ADMIN_PSQL[@]}" -X -q -v ON_ERROR_STOP=1 -c "CREATE DATABASE \"${DB}\"" \
    || die "创建数据库失败：${DB}（权限不足或实例不可写）"
  ok "已创建 ${DB}"
else
  info "目标库已存在：${DB}，执行非空探测"
  if ! TABLES="$("${TARGET_PSQL[@]}" -X -q -v ON_ERROR_STOP=1 -tAc \
      "SELECT count(*) FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE c.relkind IN ('r','p') AND n.nspname NOT IN ('pg_catalog','information_schema','pg_toast')" 2>&1)"; then
    die "非空探测失败（连接/权限/超时，fail-closed）：$(printf '%s' "$TABLES" | head -1)"
  fi
  TABLES="${TABLES//[^0-9]/}"; TABLES="${TABLES:-0}"
  LEDGER_MAX=0
  LEDGER_ROWS=0
  if ! EXISTS_TBL="$("${TARGET_PSQL[@]}" -X -q -v ON_ERROR_STOP=1 -tAc \
      "SELECT COALESCE(to_regclass('public._sqlx_migrations')::text,'')" 2>&1)"; then
    die "账本探测失败（fail-closed）：$(printf '%s' "$EXISTS_TBL" | head -1)"
  fi
  if [[ -n "$(printf '%s' "$EXISTS_TBL" | tr -d '[:space:]')" ]]; then
    LEDGER_ROWS="$("${TARGET_PSQL[@]}" -X -q -v ON_ERROR_STOP=1 -tAc \
      "SELECT count(*) FROM public._sqlx_migrations WHERE success" 2>/dev/null)" \
      || die "读取账本记录失败（fail-closed）"
    LEDGER_MAX="$("${TARGET_PSQL[@]}" -X -q -v ON_ERROR_STOP=1 -tAc \
      "SELECT COALESCE(max(version),0) FROM public._sqlx_migrations WHERE success" 2>/dev/null)" \
      || die "读取账本最大版本失败（fail-closed）"
    LEDGER_ROWS="${LEDGER_ROWS//[^0-9]/}"; LEDGER_ROWS="${LEDGER_ROWS:-0}"
    LEDGER_MAX="${LEDGER_MAX//[^0-9]/}"; LEDGER_MAX="${LEDGER_MAX:-0}"
  fi
  if (( TABLES > 0 )) || (( LEDGER_ROWS > 0 )); then
    if (( FORCE_NONEMPTY == 0 )); then
      echo -e "${RED}✗ 拒绝：目标库非空（restore 属覆盖写，需显式 --force-nonempty）${NC}" >&2
      echo "  库名        : ${DB} (${TARGET_HOST})" >&2
      echo "  已存在表数  : ${TABLES}" >&2
      echo "  账本        : 成功记录 ${LEDGER_ROWS} 条，最大版本 ${LEDGER_MAX}" >&2
      echo "  重复执行/已有库：确认要重建请显式 --force-nonempty（会 DROP + CREATE 并打印 WARN）。" >&2
      exit 1
    fi
    warn "--force-nonempty：覆盖非空库 ${DB}（表 ${TABLES} 账本 ${LEDGER_ROWS} 条 max ${LEDGER_MAX}）"
    "${ADMIN_PSQL[@]}" -X -q -v ON_ERROR_STOP=1 \
      -c "DROP DATABASE IF EXISTS \"${DB}\" WITH (FORCE)" \
      -c "CREATE DATABASE \"${DB}\"" \
      || die "重建数据库失败：${DB}"
    ok "已重建 ${DB}"
  else
    ok "目标库为空（表=0，无账本），继续恢复"
  fi
fi

# ── 恢复基线快照 ───────────────────────────────────────────────────────────
info "恢复基线 schema（约 ${META_TABLES} 张表）..."
gunzip -c "$SCHEMA_FILE" | "${TARGET_PSQL[@]}" -X -q -v ON_ERROR_STOP=1 \
  || die "schema 恢复失败（${SCHEMA_FILE}）"
info "恢复基线账本（${META_ROWS} 条）..."
"${TARGET_PSQL[@]}" -X -q -v ON_ERROR_STOP=1 -f "$LEDGER_FILE" \
  || die "账本恢复失败（${LEDGER_FILE}）"
ok "基线快照恢复完成"

# ── 恢复后锚点校验 ─────────────────────────────────────────────────────────
probe() { "${TARGET_PSQL[@]}" -X -q -v ON_ERROR_STOP=1 -tAc "$1" 2>/dev/null; }

TABLES_AFTER="$(probe "SELECT count(*) FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE c.relkind IN ('r','p') AND n.nspname NOT IN ('pg_catalog','information_schema','pg_toast')")" \
  || die "恢复后表数探测失败"
ROWS_AFTER="$(probe "SELECT count(*) FROM public._sqlx_migrations WHERE success")" || die "恢复后账本探测失败"
MAX_AFTER="$(probe "SELECT COALESCE(max(version),0) FROM public._sqlx_migrations WHERE success")" || die "恢复后最大版本探测失败"
ANCHOR_ROW="$(probe "SELECT count(*) FROM public._sqlx_migrations WHERE version=${ANCHOR} AND success")" || die "锚点记录探测失败"

[[ "$TABLES_AFTER" == "$META_TABLES" ]] || die "恢复后表数不符：${TABLES_AFTER} ≠ 元数据 ${META_TABLES}"
[[ "$ROWS_AFTER" == "$META_ROWS" ]] || die "恢复后账本条数不符：${ROWS_AFTER} ≠ 元数据 ${META_ROWS}"
[[ "$MAX_AFTER" == "$ANCHOR" ]] || die "恢复后账本最大版本不符：${MAX_AFTER} ≠ 锚点 ${ANCHOR}"
[[ "$ANCHOR_ROW" == "1" ]] || die "账本缺少锚点记录 version=${ANCHOR}（success=true）"
ok "锚点校验通过：表 ${TABLES_AFTER} / 账本 ${ROWS_AFTER} / max(version) ${MAX_AFTER}"

# ── 前向迁移（只应用 > anchor） ─────────────────────────────────────────────
info "前向迁移：apply-forward.sh --anchor ${ANCHOR}"
FORWARD_ARGS=(--anchor "$ANCHOR")
if [[ -n "$DSN" ]]; then
  FORWARD_ARGS+=(--dsn "$DSN")
else
  FORWARD_ARGS+=(--db "$DB")
fi
if [[ "$ENV_NAME" == "prod-replica" ]]; then
  FORWARD_ARGS+=(--prod)
fi
PGHOST="${TARGET_HOST}" PGUSER="${PGUSER:-air}" bash "$ROOT/scripts/migration/apply-forward.sh" "${FORWARD_ARGS[@]}" \
  || die "前向迁移失败（禁止回退 sqlx migrate run）"

ROWS_POST="$(probe "SELECT count(*) FROM public._sqlx_migrations WHERE success")" || die "前向后账本探测失败"
MAX_POST="$(probe "SELECT COALESCE(max(version),0) FROM public._sqlx_migrations WHERE success")" || die "前向后最大版本探测失败"
APPLIED=$(( ROWS_POST - ROWS_AFTER ))
TABLES_POST="$(probe "SELECT count(*) FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE c.relkind IN ('r','p') AND n.nspname NOT IN ('pg_catalog','information_schema','pg_toast')")" \
  || die "前向后表数探测失败"

(( TABLES_POST >= META_TABLES )) || die "前向后表数少于基线：${TABLES_POST} < ${META_TABLES}"
(( MAX_POST >= ANCHOR )) || die "前向后 max(version) 落后于锚点：${MAX_POST} < ${ANCHOR}"
if (( APPLIED == 0 )); then
  [[ "$MAX_POST" == "$ANCHOR" ]] || die "无前向迁移但 max(version)=${MAX_POST} ≠ 锚点 ${ANCHOR}"
fi
ok "前向完成：新增 ${APPLIED} 条；账本 ${ROWS_POST} 条；表 ${TABLES_POST}；max(version) ${MAX_POST}"

# ── 与 prod 的 10 张核心表结构指纹比对（只读） ─────────────────────────────
CORE_TABLES=(
  "public.core_users" "public.core_roles" "public.core_permissions" "public.core_tenants" "public.core_menus"
  "iam.core_users" "erp.customers" "mes.production_orders" "qms.qa_ehs_hazards" "lims.qa_lab_records"
)

fingerprint_sql() {
  local values="" pair s t
  for pair in "${CORE_TABLES[@]}"; do
    s="${pair%%.*}"; t="${pair#*.}"
    [[ -n "$values" ]] && values+=","
    values+="('${s}','${t}')"
  done
  cat <<SQL
SELECT x.s||'.'||x.t||'|'||
  (SELECT count(*) FROM information_schema.tables WHERE table_schema=x.s AND table_name=x.t)||'|'||
  coalesce((SELECT md5(string_agg(column_name||':'||data_type||':'||is_nullable||':'||coalesce(column_default,''), '|' ORDER BY ordinal_position))
            FROM information_schema.columns WHERE table_schema=x.s AND table_name=x.t),'')||'|'||
  coalesce((SELECT md5(string_agg(constraint_type||':'||constraint_name, '|' ORDER BY constraint_name))
            FROM information_schema.table_constraints WHERE table_schema=x.s AND table_name=x.t),'')
FROM (VALUES ${values}) AS x(s,t) ORDER BY 1
SQL
}

fp_local="$(fingerprint_sql)"
if [[ "$ENV_NAME" == "prod-replica" && "$SKIP_FP" == "1" ]]; then
  die "prod-replica 不允许 --skip-prod-fingerprint（必须与 prod 比对）"
fi
if (( SKIP_FP == 1 )); then
  warn "--skip-prod-fingerprint：跳过 10 张核心表指纹比对（不建议用于 prod-replica）"
  FP_STATUS="skipped"
elif [[ -n "$PROD_DSN" ]]; then
  info "核心表指纹比对：prod（--prod-dsn）"
  fp_prod="$(psql "$PROD_DSN" -X -q -v ON_ERROR_STOP=1 -tAc "$fp_local")" \
    || die "prod 指纹读取失败（--prod-dsn，只读）"
elif [[ -n "$PROD_SSH" ]]; then
  info "核心表指纹比对：prod（--prod-ssh ${PROD_SSH}）"
  fp_prod="$(ssh -o BatchMode=yes -o ConnectTimeout=8 "$PROD_SSH" \
    "PATH=/opt/homebrew/bin:\$PATH psql -d \"${PROD_DB}\" -X -q -v ON_ERROR_STOP=1 -tA" <<<"$fp_local")" \
    || die "prod 指纹读取失败（--prod-ssh，只读）"
else
  if [[ "$ENV_NAME" == "prod-replica" ]]; then
    die "prod-replica 必须提供 --prod-ssh 或 --prod-dsn 做 10 张核心表指纹比对"
  fi
  warn "未提供 --prod-ssh/--prod-dsn，跳过 10 张核心表 prod 指纹比对"
  FP_STATUS="skipped"
fi

if [[ "${FP_STATUS:-}" != "skipped" ]]; then
  fp_target="$(probe "$fp_local")" || die "目标库指纹读取失败"
  mismatch=0
  while IFS= read -r line; do
    [[ -z "$line" ]] && continue
    if ! grep -qxF "$line" <<<"$fp_prod"; then
      echo -e "${RED}✗ 指纹不一致：${line}${NC}" >&2
      mismatch=1
    fi
  done <<<"$fp_target"
  (( mismatch == 0 )) || die "10 张核心表结构指纹与 prod 不一致"
  ok "10 张核心表结构指纹与 prod 一致"
fi

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}环境供给完成：${ENV_NAME} / ${DB}${NC}"
echo -e "${GREEN}========================================${NC}"
echo "  基线锚点    : ${ANCHOR}"
echo "  表数        : ${TABLES_POST}（基线 ${META_TABLES}）"
echo "  账本        : ${ROWS_POST} 条（基线 ${META_ROWS} + 前向 ${APPLIED}）"
echo "  max(version): ${MAX_POST}"
exit 0
